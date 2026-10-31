import type { FeatureCollection, Point } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
// maplibre-gl 6 ships its worker next to itself and only looks for it when import.meta.url is blank
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useI18n } from '../i18n/useI18n.ts'
import { partyUrl } from '../lib/links.ts'
import { fmtPct } from '../lib/fmt.ts'
import { toWgs84, type MunicipalTopology } from '../lib/mapData.ts'
import { readableOn, scaleColor, topParty } from '../lib/mapLogic.ts'
import { share } from '../lib/stats.ts'
import type { Town } from '../lib/types.ts'

maplibregl.config.WORKER_URL = workerUrl

// The mounted map lives in a module value, not React state: setState from the mount effect re-runs it
export let live: maplibregl.Map | null = null

export type MapMode = 'leader' | 'turnout' | 'share'

// OSM's own link to the country, and the plain OSM tiles under the towns
const NATIONAL = { lng: 35.074, lat: 31.438, zoom: 8 }
// The country's corners, west, south, east, north, for the pan limit
const COUNTRY = [34.27, 29.49, 35.9, 33.34]
// OSM's own tiles, with their names only inside the country
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const NO_DATA = '#d4d4d9'
// Gaza's towns can't vote here: their towns and names stay off the map
const KEEP: maplibregl.FilterSpecification = ['has', 'keep']
// Where names start and where every town has one, and the big towns that also have one zoomed out
const LABEL_FROM = 6.9
const LABEL_ALL_FROM = 8.2
const MAJOR_CODES = [3000, 5000, 4000, 8300, 7900, 7400, 70, 9000]
// Every place gets a name once zoomed in; their names are in both i18n files, keyed by Hebrew
const PLACES: { name: string; en: string; lonlat: [number, number] }[] = [
  { name: `place_'ירושלים'`, en: 'Jerusalem', lonlat: [35.2137, 31.7683] },
  { name: `place_'תל אביב -יפו'`, en: 'Tel Aviv', lonlat: [34.7818, 32.0853] },
  { name: `place_'חיפה'`, en: 'Haifa', lonlat: [34.9896, 32.794] },
  { name: `place_'באר שבע'`, en: 'Beer Sheva', lonlat: [34.7913, 31.2518] },
  { name: `place_'ראשון לציון'`, en: 'Rishon LeZion', lonlat: [34.7925, 31.973] },
  { name: `place_'פתח תקווה'`, en: 'Petah Tikva', lonlat: [34.8878, 32.084] },
  { name: `place_'אשדוד'`, en: 'Ashdod', lonlat: [34.6405, 31.8014] },
  { name: `place_'נתניה'`, en: 'Netanya', lonlat: [34.8532, 32.3215] },
  { name: `place_'בני ברק'`, en: 'Bnei Brak', lonlat: [34.8338, 32.0807] },
  { name: `place_'חולון'`, en: 'Holon', lonlat: [34.771, 32.011] },
  { name: `place_'רמת גן'`, en: 'Ramat Gan', lonlat: [34.8146, 32.0684] },
  { name: `place_'אשקלון'`, en: 'Ashkelon', lonlat: [34.5715, 31.6688] },
  { name: `place_'רחובות'`, en: 'Rehovot', lonlat: [34.8113, 31.8928] },
  { name: `place_'בת ים'`, en: 'Bat Yam', lonlat: [34.7501, 32.017] },
  { name: `place_'בית שמש'`, en: 'Beit Shemesh', lonlat: [34.988, 31.745] },
  { name: `place_'כפר סבא'`, en: 'Kfar Saba', lonlat: [34.907, 32.175] },
  { name: `place_'הרצליה'`, en: 'Herzliya', lonlat: [34.8434, 32.1663] },
  { name: `place_'חדרה'`, en: 'Hadera', lonlat: [34.9198, 32.434] },
  { name: `place_'מודיעין-מכבים-רעות'`, en: 'Modiin', lonlat: [35.013, 31.897] },
  { name: `place_'נצרת'`, en: 'Nazareth', lonlat: [35.3033, 32.7021] },
  { name: `place_'עכו'`, en: 'Acre', lonlat: [35.0728, 32.9281] },
  { name: `place_'רמלה'`, en: 'Ramla', lonlat: [34.8713, 31.9288] },
  { name: `place_'לוד'`, en: 'Lod', lonlat: [34.8951, 31.9514] },
  { name: `place_'רהט'`, en: 'Rahat', lonlat: [34.7556, 31.3925] },
  { name: `place_'אילת'`, en: 'Eilat', lonlat: [34.9515, 29.5577] },
  { name: `place_'טבריה'`, en: 'Tiberias', lonlat: [35.5312, 32.794] },
  { name: `place_'צפת'`, en: 'Safed', lonlat: [35.496, 32.9646] },
  { name: `place_'עפולה'`, en: 'Afula', lonlat: [35.289, 32.607] },
  { name: `place_'קריית גת'`, en: 'Kiryat Gat', lonlat: [34.764, 31.61] },
  { name: `place_'דימונה'`, en: 'Dimona', lonlat: [35.033, 31.069] },
  { name: `place_'ערד'`, en: 'Arad', lonlat: [35.215, 31.259] },
  { name: `place_'ירוחם'`, en: 'Yeruham', lonlat: [34.923, 30.987] },
  { name: `place_'מצפה רמון'`, en: 'Mitzpe Ramon', lonlat: [34.801, 30.609] },
  { name: `place_'קריית שמונה'`, en: 'Kiryat Shmona', lonlat: [35.57, 33.207] },
  { name: `place_'נהריה'`, en: 'Nahariya', lonlat: [35.098, 33.006] },
  { name: `place_'כרמיאל'`, en: 'Karmiel', lonlat: [35.304, 32.918] },
  { name: `place_'שדרות'`, en: 'Sderot', lonlat: [34.595, 31.525] },
  { name: `place_'שפרעם'`, en: "Shefa-'Amr", lonlat: [35.169, 32.805] },
  { name: `place_'רמאללה'`, en: 'Ramallah', lonlat: [35.206, 31.903] },
  { name: `place_'בית לחם'`, en: 'Bethlehem', lonlat: [35.202, 31.706] },
  { name: `place_'חברון'`, en: 'Hebron', lonlat: [35.099, 31.532] },
  { name: `place_'יריחו'`, en: 'Jericho', lonlat: [35.444, 31.866] },
  { name: `place_'שכם'`, en: 'Nablus', lonlat: [35.261, 32.221] },

  { name: `place_"ג'נין"`, en: 'Jenin', lonlat: [35.296, 32.461] },
  { name: `place_'טולכרם'`, en: 'Tulkarm', lonlat: [35.012, 32.31] },
  { name: `place_'קלקיליה'`, en: 'Qalqilya', lonlat: [34.97, 32.19] },
]
type Row = { name: string; leader: string | null; leaderShare: number | null; turnout: number }

export function MapView({
  topo,
  labels,
  towns,
  party,
  onSelectTown,
}: {
  topo: MunicipalTopology
  labels: FeatureCollection<Point, { SETL_CODE: number }>
  towns: Town[]
  party: (key: string) => { key: string; name: string; color: string | undefined; slug?: string }
  onSelectTown: (code: number) => void
}) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<MapMode>('leader')
  const [tip, setTip] = useState<{ code: number; x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  // Set once the style has loaded and every source and layer is added, so the effects below are ordered after it
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const { geo, rows, gone } = useMemo(() => {
    const geo = toWgs84(topo)
    const rows = new Map<number, Row>()
    const gone = new Set<number>()
    // The strip's own bounding box, short of Egypt and inside the sea: Gaza's towns are all in it
    const gaza = new Set(
      geo.features
        .filter((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []).some((r) => r[0].some(([x, y]) => x > 34.18 && x < 34.6 && y > 31.2 && y < 31.62)))
        .map((f) => f.properties.SETL_CODE),
    )
    for (const tw of towns) {
      const v = tw.votes
      if (!v || v.voters <= 0) continue
      const top = topParty(tw)
      rows.set(tw.code, { name: tw.name, leader: top?.party ?? null, leaderShare: top?.share ?? null, turnout: share(v.voters, v.eligible) })
      // Gaza can't vote here, and its towns' name spots are Gaza's own
      if (gaza.has(tw.code)) gone.add(tw.code)
    }

    return { geo, rows, gone }
  }, [topo, towns])
  const names = useMemo(() => new Map(towns.map((tw) => [tw.code, { he: tw.name, en: tw.nameEn }])), [towns])
  // A town's name in the page's language, its English one where Kaplan has a name for its code;
  // the Hebrew one otherwise, as Kaplan's own map does for the few it has no English for
  const nameOf = useCallback((code: number, he: string) => (lang === 'en' ? (names.get(code)?.en ?? he) : he), [lang, names])
  // The town's name, or the larger place's where the town is one of its neighbourhoods
  const labelOf = useCallback((code: number) => {
    const he = rows.get(code)?.name
    if (!he) return null
    const n = lang === 'en' ? names.get(code) : undefined
    const own = n?.en ? PLACES.find((p) => p.en === n.en) : PLACES.find((p) => p.name === `place_'${he}'`)
    return own?.name.startsWith('place_') ? (lang === 'en' ? own.en : he) : (n?.en ?? he)
  }, [rows, names, lang])

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {},
        // The first style layer is always drawn: this plate is the page's colour, under everything
        layers: [{ id: 'plate', type: 'background', paint: { 'background-color': '#f2f2f0' } }],
      },
      center: { lng: NATIONAL.lng, lat: NATIONAL.lat },
      zoom: NATIONAL.zoom,
      attributionControl: { compact: true },
      // North stays up: a bearing left out starts MapLibre at -0.01°, which skews the outline
      bearing: 0,
      pitch: 0,
      minZoom: 0,
      maxZoom: 13,
      maxPitch: 0,
    })
    // A photo can be rotated, an outline cannot: north stays up
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation()
    // The frame's height settles only once the page has laid out, so maplibre's one resize at
    // construction stamps the canvas with a first, shorter height; this observer measures again
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    let watch: MutationObserver | undefined
    let dark: (() => void) | undefined
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => dark?.()
    // Fires as the map is constructed for the empty inline style, so it cannot be missed here
    m.once('style.load', () => {
      m.addSource('tiles', { type: 'raster', tiles: [TILES], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' })
      // The tiles under everything, the towns over them
      m.addLayer({ id: 'basemap', type: 'raster', source: 'tiles' })
      const bg = () => {
        // Same media query the theme uses (settings: light/dark/system)
        const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
        // Dark sinks the tiles toward the ground
        m.setPaintProperty('basemap', 'raster-brightness-max', dark ? 0.6 : 1)
        m.setPaintProperty('plate', 'background-color', dark ? '#141416' : '#f2f2f0')
        // Town borders, Kaplan's scheme: a 1px grey line over the fill. Dark flips it, since #d3d3d3
        // vanishes on dark fills and would only trace the grey towns
        // Guarded like the names below: bg() runs from style.load, before these layers are added
        const lines = [['towns-line', '#d3d3d3'], ['towns-hover', '#fff']] as const
        for (const [id, light] of lines) if (m.getLayer(id)) m.setPaintProperty(id, 'line-color', dark ? '#141416' : light)
        // As Kaplan's: black on a white halo on light fills. On dark fills, black or a white halo
        // would sit on the fill, so names are white on a dark halo, over every fill. Unguarded until
        // now, this threw on the first run and left the names MapLibre's default black in dark
        if (m.getLayer('labels')) {
          m.setPaintProperty('labels', 'text-color', dark ? '#f4f4f5' : '#000')
          m.setPaintProperty('labels', 'text-halo-color', dark ? '#1c1c1f' : '#fff')
          // On dark fills the towns are small and their edge is the fill colour too, so a 2px halo
          // swallowed "Tel Aviv" into the Likud fill; a wider one reads on both
          m.setPaintProperty('labels', 'text-halo-width', dark ? 1.1 : 1.6)
        }
      }
      live = m
      // The layers go in below, so run it once more after them: the first call runs before they exist
      bg()
      dark = bg
      scheme.addEventListener('change', onScheme)
      watch = new MutationObserver(bg)
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      // Pan limit: the country's corners, padded far enough out that maxBounds never forces a zoom back in
      m.setMaxBounds([
        [COUNTRY[0] - 8, COUNTRY[1] - 8],
        [COUNTRY[2] + 8, COUNTRY[3] + 8],
      ])
      // The towns source starts empty; the effects below set its data once React has handed over `map`
      // Town id = SETL_CODE, which is how the hover feature-state finds its feature
            m.addSource('towns', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'SETL_CODE' })
      m.addLayer({ id: 'towns', type: 'fill', source: 'towns', filter: KEEP, paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.82 } })
      m.addLayer({ id: 'towns-line', type: 'line', source: 'towns', filter: KEEP, paint: { 'line-color': '#d3d3d3', 'line-width': 1 } })
      // Hover emphasis, as on Kaplan: a thicker white line on top of the border
      m.addLayer({
        id: 'towns-hover',
        type: 'line',
        source: 'towns',
        filter: KEEP,
        // feature-state belongs in paint or layout only: `filter` rejects it
        paint: { 'line-color': '#fff', 'line-width': 3, 'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0] },
      })
      // Town names, a place's own where the town has one, so no name is drawn twice
      // Id = SETL_CODE, which the zoomed-out name rule reads (all the setFeatureState calls are on 'towns')
      m.addSource('labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'SETL_CODE' })
      m.addLayer({
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        filter: KEEP,
        minzoom: LABEL_FROM,
        layout: {
          'text-font': ['Noto Sans Regular'],
          'text-letter-spacing': 0.01,
          // A step, not a case: maplibre only allows zoom inside a top-level interpolate/step
          'text-size': ['step', ['zoom'], 13, LABEL_ALL_FROM, 15, LABEL_ALL_FROM + 2, 17],
          // Zoomed out only MAJOR_CODES are named, chosen in PLACES' order rather than by size: the
          // map must name a town the same way at every zoom
          'text-field': ['step', ['zoom'], ['case', ['in', ['get', 'SETL_CODE'], ['literal', MAJOR_CODES]], ['get', 'name'], ''], LABEL_ALL_FROM, ['get', 'name']],
          'text-max-width': 6,
          'text-padding': 4,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: { 'text-halo-width': 2 },
      })
      bg()
      // 'load' means the style's sources and layers are in and the worker is up, so the towns effect below applies
      m.once('load', () => setMap(m))
    })
    return () => {
      watch?.disconnect()
      ro.disconnect()
      scheme.removeEventListener('change', onScheme)
      live = null
      m.remove()
    }
  }, [geo])

  // The fill colour is a feature property, so a mode change only re-sends the data
  useEffect(() => {
    if (!map) return
    const color = (code: number): string => {
      const r = rows.get(code)
      if (!r) return NO_DATA
      if (mode === 'leader') return r.leader ? party(r.leader).color ?? NO_DATA : NO_DATA
      if (mode === 'turnout') return scaleColor(r.turnout, 0, 100)
      return r.leaderShare === null ? NO_DATA : scaleColor(r.leaderShare, 0, 100)
    }
    const data = { ...geo, features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, fill: color(f.properties.SETL_CODE), keep: !gone.has(f.properties.SETL_CODE) } })) }
    ;(map.getSource('towns') as maplibregl.GeoJSONSource).setData(data)
  }, [map, geo, mode, rows, party, gone])
  // The whole thing in the console, to copy back out
  useEffect(() => {
    map?.on('render', () => (window as unknown as { __m: unknown }).__m = map)
    if (map) (window as unknown as { __m: unknown }).__m = map
  }, [map])
  // Town names, hidden while the hover card is up so it is not read twice
  useEffect(() => {
    if (!map) return
    const features = labels.features.flatMap((f) => {
      const code = f.properties.SETL_CODE
      const name = labelOf(code)
      return name ? [{ ...f, properties: { ...f.properties, name, keep: !gone.has(code) } }] : []
    })
    ;(map.getSource('labels') as maplibregl.GeoJSONSource).setData({ ...labels, features })
  }, [map, labels, labelOf, gone])
  // The town under the cursor says whose name it is, its own or the place's
  useEffect(() => {
    for (const f of labels.features) if (labelOf(f.properties.SETL_CODE)) map?.setFeatureState({ source: 'labels', id: f.properties.SETL_CODE }, { on: tip?.code === f.properties.SETL_CODE })
  }, [map, labels, labelOf, tip])
  useEffect(() => {
    if (!map) return
    const codeOf = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) =>
      e.features?.[0]?.properties?.SETL_CODE as number | undefined
    // Hover state drives the towns-hover line; the source promotes SETL_CODE to the feature id
    const hovered = { id: null as number | null }
    const hover = (id: number | null) => {
      if (id === hovered.id) return
      if (hovered.id != null) map.setFeatureState({ source: 'towns', id: hovered.id }, { hover: false })
      hovered.id = id
      if (id != null) map.setFeatureState({ source: 'towns', id }, { hover: true })
    }
    const onMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const code = codeOf(e)
      const known = code != null && rows.has(code)
      hover(known ? code : null)
      map.getCanvas().style.cursor = known ? 'pointer' : ''
      setTip(known ? { code, x: e.point.x, y: e.point.y } : null)
    }
    const onLeave = () => {
      hover(null)
      map.getCanvas().style.cursor = ''
      setTip(null)
    }
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const code = codeOf(e)
      if (code != null && rows.has(code)) onSelectTown(code)
    }
    map.on('mousemove', 'towns', onMove)
    map.on('mouseleave', 'towns', onLeave)
    map.on('click', 'towns', onClick)
    return () => {
      map.off('mousemove', 'towns', onMove)
      map.off('mouseleave', 'towns', onLeave)
      map.off('click', 'towns', onClick)
    }
  }, [map, rows, onSelectTown])

  const active = tip ? rows.get(tip.code) : undefined
  const leaders = [...new Set([...rows.values()].map((r) => r.leader).filter((k): k is string => !!k))].sort((a, b) =>
    party(a).name.localeCompare(party(b).name, lang),
  )

  return (
    <section className="map card">
      <div className="map-bar">
        <div className="seg" role="group" aria-label={t('mapMode')}>
          {(['leader', 'turnout', 'share'] as const).map((k) => (
            <button key={k} type="button" className={mode === k ? 'on' : undefined} aria-pressed={mode === k} onClick={() => setMode(k)}>
              {t(`map_${k}`)}
            </button>
          ))}
        </div>
        {mode !== 'leader' && (
          <div className="map-legend" aria-label={t(mode === 'turnout' ? 'map_turnoutLegend' : 'map_shareLegend')} role="group">
            <span>{t(mode === 'turnout' ? 'map_turnoutLegend' : 'map_shareLegend')}</span>
            {[0, 25, 50, 75, 100].map((s) => (
              <span key={s} className="legend-item">
                <span className="swatch" style={{ background: scaleColor(s, 0, 100) }} aria-hidden="true" />
                {s}%
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="map-frame">
        <div className="maplibregl-map" ref={box} role="group" aria-label={`${t('mapMap')}: ${t(`map_${mode}`)}`} />
        {tip && active && (
          <div className="map-tip" style={{ left: tip.x, top: tip.y }} role="status">
            <strong>
              <Link to={`/town/${tip.code}`}>{nameOf(tip.code, active.name)}</Link>
            </strong>
            <span>{active.leader ? <Link to={partyUrl(party(active.leader))}>{party(active.leader).name}</Link> : t('mapNoData')}</span>
            {active.leaderShare != null && (
              <span>
                {t('colShare')}: {fmtPct(active.leaderShare)}
              </span>
            )}
            <span>
              {t('colTurnout')}: {fmtPct(active.turnout)}
            </span>
          </div>
        )}
      </div>
      <div className={mode === 'leader' ? 'map-legend map-leaders' : 'map-legend'} role="group" aria-label={t('mapMap')}>
        {mode === 'leader' ? (
          <>
            {leaders.map((k) => (
              <span key={k} className="legend-item">
                <span className="swatch" style={{ display: 'grid', placeItems: 'center', background: party(k).color }} aria-hidden="true">
                  <span style={{ width: 4, height: '60%', background: readableOn(party(k).color ?? '#999'), borderRadius: 1 }} />
                </span>
                <Link to={partyUrl(party(k))}>{party(k).name}</Link>
              </span>
            ))}
            <span className="legend-item">
              <span className="swatch" style={{ background: NO_DATA, boxShadow: 'inset 0 0 0 1px var(--hairline)' }} aria-hidden="true" />
              {t('mapNoData')}
            </span>
          </>
        ) : (
          <p className="map-note">{t('mapScaleNote')}</p>
        )}
      </div>
      {mode === 'leader' && <p className="map-note">{t('mapLeaderNote')}</p>}
    </section>
  )
}
