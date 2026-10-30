import type { FeatureCollection, Geometry, Point } from 'geojson'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
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

const NO_DATA = '#d4d4d9'
const NATIONAL = { lng: 34.99, lat: 31.2 }
// Town names are set in the page's own font and word-wrap around the point, as Kaplan's labels do
const LABEL = '400 13px Heebo, Rubik, system-ui, sans-serif'
// Over the towns' fill, the sea and the neighbouring countries: names on their centres, largest first
const PLACES: { name: string; lonlat: [number, number]; size: number }[] = [
  { name: 'ירושלים', lonlat: [35.2137, 31.7683], size: 13.4 },
  { name: 'תל אביב -יפו', lonlat: [34.7818, 32.0853], size: 13.4 },
  { name: 'חיפה', lonlat: [34.9896, 32.794], size: 12.2 },
  { name: 'באר שבע', lonlat: [34.7913, 31.2518], size: 12.2 },
  { name: 'ראשון לציון', lonlat: [34.7925, 31.973], size: 11.6 },
  { name: 'פתח תקווה', lonlat: [34.8878, 32.084], size: 11.6 },
  { name: 'אשדוד', lonlat: [34.6405, 31.8014], size: 11.6 },
  { name: 'נתניה', lonlat: [34.8532, 32.3215], size: 11.6 },
  { name: 'בני ברק', lonlat: [34.8338, 32.0807], size: 11.1 },
  { name: 'חולון', lonlat: [34.771, 32.011], size: 11.1 },
  { name: 'רמת גן', lonlat: [34.8146, 32.0684], size: 11.1 },
  { name: 'אשקלון', lonlat: [34.5715, 31.6688], size: 11.1 },
  { name: 'רחובות', lonlat: [34.8113, 31.8928], size: 11.1 },
  { name: 'בת ים', lonlat: [34.7501, 32.017], size: 11.1 },
  { name: 'בית שמש', lonlat: [34.988, 31.745], size: 11.1 },
  { name: 'כפר סבא', lonlat: [34.907, 32.175], size: 11.1 },
  { name: 'הרצליה', lonlat: [34.8434, 32.1663], size: 11.1 },
  { name: 'חדרה', lonlat: [34.9198, 32.434], size: 11.1 },
  { name: 'מודיעין-מכבים-רעות', lonlat: [35.013, 31.897], size: 10.6 },
  { name: 'נצרת', lonlat: [35.3033, 32.7021], size: 10.6 },
  { name: 'עכו', lonlat: [35.0728, 32.9281], size: 10.6 },
  { name: 'רמלה', lonlat: [34.8713, 31.9288], size: 10.6 },
  { name: 'לוד', lonlat: [34.8951, 31.9514], size: 10.6 },
  { name: 'רהט', lonlat: [34.7556, 31.3925], size: 10.6 },
  { name: 'אילת', lonlat: [34.9515, 29.5577], size: 10.6 },
  { name: 'טבריה', lonlat: [35.5312, 32.794], size: 10.2 },
  { name: 'צפת', lonlat: [35.496, 32.9646], size: 10.2 },
  { name: 'עפולה', lonlat: [35.289, 32.607], size: 10.2 },
  { name: 'קריית גת', lonlat: [34.764, 31.61], size: 10.2 },
  { name: 'דימונה', lonlat: [35.033, 31.069], size: 10.2 },
  { name: 'ערד', lonlat: [35.215, 31.259], size: 10.2 },
  { name: 'ירוחם', lonlat: [34.923, 30.987], size: 9.6 },
  { name: 'מצפה רמון', lonlat: [34.801, 30.609], size: 9.6 },
  { name: 'קריית שמונה', lonlat: [35.57, 33.207], size: 9.6 },
  { name: 'נהריה', lonlat: [35.098, 33.006], size: 9.6 },
  { name: 'כרמיאל', lonlat: [35.304, 32.918], size: 9.6 },
  { name: 'שדרות', lonlat: [34.595, 31.525], size: 9.6 },
  { name: 'גני תקווה', lonlat: [34.874, 32.062], size: 9.6 },
  { name: 'קרית אונו', lonlat: [34.855, 32.058], size: 9.6 },
  { name: 'גבעת שמואל', lonlat: [34.849, 32.078], size: 9.6 },
  { name: 'יהוד-מונוסון', lonlat: [34.888, 32.033], size: 9.6 },
  { name: 'אור יהודה', lonlat: [34.857, 32.03], size: 9.6 },
  { name: 'שפרעם', lonlat: [35.169, 32.805], size: 9.6 },
  { name: 'כפר כנא', lonlat: [35.339, 32.747], size: 9.6 },
  { name: 'טירה', lonlat: [34.95, 32.234], size: 9.6 },
  { name: 'כפר קאסם', lonlat: [34.976, 32.114], size: 9.6 },
  { name: 'טייבה', lonlat: [35.005, 32.266], size: 9.6 },
  { name: 'קלנסווה', lonlat: [34.981, 32.284], size: 9.6 },
  { name: 'רמאללה', lonlat: [35.206, 31.903], size: 9.6 },
  { name: 'בית לחם', lonlat: [35.202, 31.706], size: 9.6 },
  { name: 'חברון', lonlat: [35.099, 31.532], size: 9.6 },
  { name: 'יריחו', lonlat: [35.444, 31.866], size: 9.6 },
  { name: 'שכם', lonlat: [35.261, 32.221], size: 9.6 },
  { name: 'עזה', lonlat: [34.4668, 31.5017], size: 9.6 },
  { name: "ג'נין", lonlat: [35.296, 32.461], size: 9.6 },
  { name: 'טולכרם', lonlat: [35.012, 32.31], size: 9.6 },
  { name: 'קלקיליה', lonlat: [34.97, 32.19], size: 9.6 },
  { name: 'בריכת רם', lonlat: [35.762, 33.233], size: 9.6 },
  { name: 'טובא-זנגריה', lonlat: [35.59, 32.966], size: 9.6 },
  { name: 'מגדל העמק', lonlat: [35.243, 32.678], size: 9.6 },
  { name: 'נוף הגליל', lonlat: [35.327, 32.722], size: 9.6 },
  { name: 'יקנעם עילית', lonlat: [35.108, 32.66], size: 9.6 },
  { name: 'זכרון יעקב', lonlat: [34.947, 32.571], size: 9.6 },
  { name: 'קריית מוצקין', lonlat: [35.074, 32.836], size: 9.6 },
  { name: 'נשר', lonlat: [35.121, 32.772], size: 9.6 },
  { name: 'נס ציונה', lonlat: [34.8, 31.93], size: 9.6 },
  { name: 'יבנה', lonlat: [34.742, 31.877], size: 9.6 },
  { name: 'גדרה', lonlat: [34.779, 31.813], size: 9.6 },
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

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {},
        // First colour the canvas ever gets: a background layer added later leaves the cleared buffer black
        layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#cfd3d8' } }],
      },
      center: NATIONAL,
      // North stays up: a bearing left out starts MapLibre at -0.01°, which skews the outline
      bearing: 0,
      pitch: 0,
      zoom: 6.4,
      // Far out enough that the whole country is a small shape in open sea
      minZoom: 0,
      maxZoom: 13,
      maxPitch: 0,
      attributionControl: false,
    })
    // A photo can be rotated, an outline cannot: north stays up
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation()
    let watch: MutationObserver | undefined
    let dark: (() => void) | undefined
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => dark?.()
    // Fires as the map is constructed for the empty inline style, so it cannot be missed here
    m.once('style.load', () => {
      // Land and country outline under the towns; the stroke is the country edge, not town borders
      m.addSource('land', { type: 'geojson', data: country ?? { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#fff' } })
      m.addLayer({ id: 'outline', type: 'line', source: 'land', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#6b7280', 'line-width': 1.5 } })
      // Town names, hidden while the hover card is up so it is not read twice
      m.addSource('labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: PLACES.map((p) => ({ type: 'Feature', properties: { name: p.name, size: -p.size }, geometry: { type: 'Point', coordinates: p.lonlat } })) } })
      m.addLayer({
        id: 'places',
        type: 'symbol',
        source: 'places',
        layout: {
          'symbol-sort-key': ['get', 'size'],
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-letter-spacing': 0.01,
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 18],
          'text-max-width': 6,
          'text-padding': 4,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: { 'text-halo-width': 2 },
      })
      m.addLayer({
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        minzoom: 7.5,
        layout: {
          // Nearest first, so at any zoom the names of the places in view are the ones kept
          'symbol-sort-key': ['get', 'size'],
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-letter-spacing': 0.01,
          'text-size': ['interpolate', ['linear'], ['zoom'], 7.5, 15, 11, 20],
          'text-max-width': 6,
          'text-padding': 4,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: { 'text-halo-width': 2 },
      })
      const bg = () => {
        // Same media query the theme uses (settings: light/dark/system)
        const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
        m.setPaintProperty('sea', 'background-color', dark ? '#141416' : '#cfd3d8')
        m.setPaintProperty('land', 'fill-color', dark ? '#2a2a2e' : '#fff')
        m.setPaintProperty('outline', 'line-color', dark ? '#8a8a93' : '#6b7280')
        // Town borders, Kaplan's scheme: a 1px grey line over the fill. Dark flips it, since #d3d3d3
        // vanishes on dark fills and would only trace the grey towns
        if (m.getLayer('towns-line')) m.setPaintProperty('towns-line', 'line-color', dark ? '#2a2a2e' : '#d3d3d3')
        // Names are black with a white halo, as Kaplan's are, which the towns' grey and muted fills
        // carry; dark text on a party's colour would not. The dark theme inverts both
        m.setPaintProperty('labels', 'text-color', dark ? '#e5e5ea' : '#1f2937')
        m.setPaintProperty('labels', 'text-halo-color', dark ? '#141416' : '#fff')
        m.setPaintProperty('places', 'text-color', dark ? '#e5e5ea' : '#1f2937')
        m.setPaintProperty('places', 'text-halo-color', dark ? '#141416' : '#fff')
      }
      live = m
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
      // 'load' means the style's sources and layers are in and the worker is up, so the towns effect below applies
      // A canvas font loads after the first symbols are drawn, and they would keep the fallback metrics
      // The layout differs, so each of these reloads that font without re-arranging any label
      void document.fonts?.load(LABEL).then(() => {
        m.setLayoutProperty('labels', 'text-font', ['Noto Sans Regular'])
        m.setLayoutProperty('places', 'text-font', ['Noto Sans Regular'])
      })
      m.once('load', () => setMap(m))
    })
    return () => {
      watch?.disconnect()
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
  useEffect(() => {
    if (!map) return
    const names = new Map(towns.map((tw) => [tw.code, tw.name]))
    const data = { ...labels, features: labels.features.flatMap((f) => (names.has(f.properties.SETL_CODE) ? [{ ...f, properties: { ...f.properties, name: names.get(f.properties.SETL_CODE) } }] : [])) }
    ;(map.getSource('labels') as maplibregl.GeoJSONSource).setData(data)
  }, [map, labels, towns, lang])
  // The labels layer is the newest and on top, so it would take the clicks meant for the towns
  const hideLabel = () => {
    map?.setLayoutProperty('labels', 'visibility', 'none')
    map?.setLayoutProperty('places', 'visibility', 'none')
  }
  const showLabels = () => {
    map?.setLayoutProperty('labels', 'visibility', 'visible')
    map?.setLayoutProperty('places', 'visibility', 'visible')
  }
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
    map.on('mousemove', hideLabel)
    map.on('mouseout', showLabels)
    return () => {
      map.off('mousemove', 'towns', onMove)
      map.off('mouseleave', 'towns', onLeave)
      map.off('click', 'towns', onClick)
      map.off('mousemove', hideLabel)
      map.off('mouseout', showLabels)
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
            <strong>{active.name}</strong>
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
