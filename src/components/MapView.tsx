import type { FeatureCollection, Geometry, Point } from 'geojson'
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
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const NO_DATA = '#d4d4d9'
// Where names start and where every town has one, and the big towns that also have one zoomed out
const LABEL_FROM = 6.9
const LABEL_ALL_FROM = 8.2
const MAJOR_CODES = [3000, 5000, 4000, 8300, 7900, 7400, 70, 9000]
// Every place gets a name once zoomed in; their names are in both i18n files, keyed by Hebrew
const PLACES: { name: string; lonlat: [number, number] }[] = [
  { name: `place_'ירושלים'`, lonlat: [35.2137, 31.7683] },
  { name: `place_'תל אביב -יפו'`, lonlat: [34.7818, 32.0853] },
  { name: `place_'חיפה'`, lonlat: [34.9896, 32.794] },
  { name: `place_'באר שבע'`, lonlat: [34.7913, 31.2518] },
  { name: `place_'ראשון לציון'`, lonlat: [34.7925, 31.973] },
  { name: `place_'פתח תקווה'`, lonlat: [34.8878, 32.084] },
  { name: `place_'אשדוד'`, lonlat: [34.6405, 31.8014] },
  { name: `place_'נתניה'`, lonlat: [34.8532, 32.3215] },
  { name: `place_'בני ברק'`, lonlat: [34.8338, 32.0807] },
  { name: `place_'חולון'`, lonlat: [34.771, 32.011] },
  { name: `place_'רמת גן'`, lonlat: [34.8146, 32.0684] },
  { name: `place_'אשקלון'`, lonlat: [34.5715, 31.6688] },
  { name: `place_'רחובות'`, lonlat: [34.8113, 31.8928] },
  { name: `place_'בת ים'`, lonlat: [34.7501, 32.017] },
  { name: `place_'בית שמש'`, lonlat: [34.988, 31.745] },
  { name: `place_'כפר סבא'`, lonlat: [34.907, 32.175] },
  { name: `place_'הרצליה'`, lonlat: [34.8434, 32.1663] },
  { name: `place_'חדרה'`, lonlat: [34.9198, 32.434] },
  { name: `place_'מודיעין-מכבים-רעות'`, lonlat: [35.013, 31.897] },
  { name: `place_'נצרת'`, lonlat: [35.3033, 32.7021] },
  { name: `place_'עכו'`, lonlat: [35.0728, 32.9281] },
  { name: `place_'רמלה'`, lonlat: [34.8713, 31.9288] },
  { name: `place_'לוד'`, lonlat: [34.8951, 31.9514] },
  { name: `place_'רהט'`, lonlat: [34.7556, 31.3925] },
  { name: `place_'אילת'`, lonlat: [34.9515, 29.5577] },
  { name: `place_'טבריה'`, lonlat: [35.5312, 32.794] },
  { name: `place_'צפת'`, lonlat: [35.496, 32.9646] },
  { name: `place_'עפולה'`, lonlat: [35.289, 32.607] },
  { name: `place_'קריית גת'`, lonlat: [34.764, 31.61] },
  { name: `place_'דימונה'`, lonlat: [35.033, 31.069] },
  { name: `place_'ערד'`, lonlat: [35.215, 31.259] },
  { name: `place_'ירוחם'`, lonlat: [34.923, 30.987] },
  { name: `place_'מצפה רמון'`, lonlat: [34.801, 30.609] },
  { name: `place_'קריית שמונה'`, lonlat: [35.57, 33.207] },
  { name: `place_'נהריה'`, lonlat: [35.098, 33.006] },
  { name: `place_'כרמיאל'`, lonlat: [35.304, 32.918] },
  { name: `place_'שדרות'`, lonlat: [34.595, 31.525] },
  { name: `place_'שפרעם'`, lonlat: [35.169, 32.805] },
  { name: `place_'רמאללה'`, lonlat: [35.206, 31.903] },
  { name: `place_'בית לחם'`, lonlat: [35.202, 31.706] },
  { name: `place_'חברון'`, lonlat: [35.099, 31.532] },
  { name: `place_'יריחו'`, lonlat: [35.444, 31.866] },
  { name: `place_'שכם'`, lonlat: [35.261, 32.221] },
  { name: `place_'עזה'`, lonlat: [34.4668, 31.5017] },
  { name: `place_'ג'נין'`, lonlat: [35.296, 32.461] },
  { name: `place_'טולכרם'`, lonlat: [35.012, 32.31] },
  { name: `place_'קלקיליה'`, lonlat: [34.97, 32.19] },
]
type Row = { name: string; leader: string | null; leaderShare: number | null; turnout: number }

export function MapView({
  topo,
  labels,
  country,
  towns,
  party,
  onSelectTown,
}: {
  topo: MunicipalTopology
  labels: FeatureCollection<Point, { SETL_CODE: number }>
  country: FeatureCollection<Geometry> | undefined
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
  const { geo, rows } = useMemo(() => {
    const geo = toWgs84(topo)
    const rows = new Map<number, Row>()
    for (const tw of towns) {
      const v = tw.votes
      if (!v || v.voters <= 0) continue
      const top = topParty(tw)
      rows.set(tw.code, { name: tw.name, leader: top?.party ?? null, leaderShare: top?.share ?? null, turnout: share(v.voters, v.eligible) })
    }
    return { geo, rows }
  }, [topo, towns])
  // A town's name in the page's language, its English one where Kaplan has a name for its code;
  // the Hebrew one otherwise, as Kaplan's own map does for the few it has no English for
  const nameOf = useCallback((code: number, he: string) => (lang === 'en' ? (towns.find((t) => t.code === code)?.nameEn ?? he) : he), [lang, towns])
  // A place's own name where the town has one, as Kaplan shows Yafo as Tel Aviv, else the town's
  const labelOf = useCallback((code: number) => {
    const he = rows.get(code)?.name
    if (!he) return null
    return PLACES.some((p) => p.name === `place_'${he}'`) ? nameOf(code, he) : he
  }, [rows, nameOf, lang])

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        // OSM's terms forbid bulk or app use of these tiles; upgrade to a self-hosted or paid tile provider if traffic grows
        sources: { osm: { type: 'raster', tiles: [TILES], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
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
      // Land and country outline are OSM's; a translucent white hides its busy fill where no town covers it
      m.addSource('land', { type: 'geojson', data: country ?? { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#fff', 'fill-opacity': 0.8 } })
      m.addLayer({ id: 'outline', type: 'line', source: 'land', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#6b7280', 'line-width': 1.5 } })
      const bg = () => {
        // Same media query the theme uses (settings: light/dark/system)
        const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
        // OSM tiles stay light in dark mode, so the land mask is dark instead of white
        m.setPaintProperty('land', 'fill-color', dark ? '#2a2a2e' : '#fff')
        m.setPaintProperty('outline', 'line-color', dark ? '#8a8a93' : '#6b7280')
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
      // Pan limit from the country, padded far enough out that maxBounds never forces a zoom back in
      const b = new maplibregl.LngLatBounds([NATIONAL.lng, NATIONAL.lat], [NATIONAL.lng, NATIONAL.lat])
      for (const f of country?.features ?? []) if (f.geometry) b.extend(f.geometry as never)
      m.setMaxBounds([
        [b.getWest() - 8, b.getSouth() - 8],
        [b.getEast() + 8, b.getNorth() + 8],
      ])
      // The towns source starts empty; the effects below set its data once React has handed over `map`
      // Town id = SETL_CODE, which is how the hover feature-state finds its feature
      m.addSource('towns', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'SETL_CODE' })
      m.addLayer({ id: 'towns', type: 'fill', source: 'towns', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.82 } })
      m.addLayer({ id: 'towns-line', type: 'line', source: 'towns', paint: { 'line-color': '#d3d3d3', 'line-width': 1 } })
      // Hover emphasis, as on Kaplan: a thicker white line on top of the border
      m.addLayer({
        id: 'towns-hover',
        type: 'line',
        source: 'towns',
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
  }, [geo, country])

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
    const data = { ...geo, features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, fill: color(f.properties.SETL_CODE) } })) }
    ;(map.getSource('towns') as maplibregl.GeoJSONSource).setData(data)
  }, [map, geo, mode, rows, party])
  // The whole thing in the console, to copy back out
  useEffect(() => {
    map?.on('render', () => (window as unknown as { __m: unknown }).__m = map)
    if (map) (window as unknown as { __m: unknown }).__m = map
  }, [map])
  // Town names, hidden while the hover card is up so it is not read twice
  useEffect(() => {
    if (!map) return
    const features = labels.features.flatMap((f) => {
      const name = labelOf(f.properties.SETL_CODE)
      return name ? [{ ...f, properties: { ...f.properties, name } }] : []
    })
    ;(map.getSource('labels') as maplibregl.GeoJSONSource).setData({ ...labels, features })
  }, [map, labels, labelOf])
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
