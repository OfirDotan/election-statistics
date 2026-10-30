import type { FeatureCollection, Geometry } from 'geojson'
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
type Row = { name: string; leader: string | null; leaderShare: number | null; turnout: number }

export function MapView({
  topo,
  country,
  towns,
  party,
  onSelectTown,
}: {
  topo: MunicipalTopology
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
    m.on('error', (e) => console.error('MAPERR', e))
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
      const bg = () => {
        // Same media query the theme uses (settings: light/dark/system)
        const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
        m.setPaintProperty('sea', 'background-color', dark ? '#141416' : '#cfd3d8')
        m.setPaintProperty('land', 'fill-color', dark ? '#2a2a2e' : '#fff')
        m.setPaintProperty('outline', 'line-color', dark ? '#8a8a93' : '#6b7280')
        // Town borders, Kaplan's scheme: a 1px grey line over the fill; #d3d3d3 vanishes on dark fills
        const townStroke = dark ? 'rgba(255,255,255,0.18)' : '#d3d3d3'
        if (m.getLayer('towns-line')) m.setPaintProperty('towns-line', 'line-color', townStroke)
        if (m.getLayer('towns-hover')) m.setPaintProperty('towns-hover', 'line-color', dark ? '#fff' : '#000')
      }
      ;(window as unknown as { __m: unknown }).__m = m
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
