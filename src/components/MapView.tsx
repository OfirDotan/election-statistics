import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
// maplibre-gl 6 ships its worker next to itself and only looks for it when import.meta.url is blank
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { feature } from 'topojson-client'
import { useI18n } from '../i18n/useI18n.ts'
import { fmtPct } from '../lib/fmt.ts'
import { toWgs84, type MunicipalCollection, type MunicipalTopology } from '../lib/mapData.ts'
import { readableOn, scaleColor, topParty } from '../lib/mapLogic.ts'
import { share } from '../lib/stats.ts'
import type { Town } from '../lib/types.ts'

maplibregl.config.WORKER_URL = workerUrl

export type MapMode = 'leader' | 'turnout' | 'share'

const NO_DATA = '#d4d4d9'
const NATIONAL = { lng: 34.99, lat: 31.2 }
type Row = { name: string; leader: string | null; leaderShare: number | null; turnout: number }

export function MapView({
  topo,
  towns,
  party,
  onSelectTown,
}: {
  topo: MunicipalTopology
  towns: Town[]
  party: (key: string) => { name: string; color: string | undefined }
  onSelectTown: (code: number) => void
}) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<MapMode>('leader')
  const [tip, setTip] = useState<{ code: number; x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)

  const { geo, rows } = useMemo(() => {
    const geo = toWgs84(feature(topo as never, topo.objects.municipal as never) as unknown as MunicipalCollection)
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
      // Far enough out to see the country whole on a phone, with sea around it
      minZoom: 2,
      maxZoom: 13,
      maxPitch: 0,
      attributionControl: false,
    })
    // A photo can be rotated, an outline cannot: north stays up
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation()
    m.on('error', (e) => console.error('MAPERR', e))
    let watch: MutationObserver | undefined
    m.on('load', () => {
      // One neutral land colour under every town; the pan limit is the land's own outline.
      // The stroke only draws union edges, so the country outline appears but town borders do not
      m.addSource('land', { type: 'geojson', data: geo })
      m.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#fff' } })
      m.addLayer({ id: 'outline', type: 'line', source: 'land', layout: { 'line-join': 'round' }, paint: { 'line-color': '#6b7280', 'line-width': 2 } })
      const bg = () => {
        // Same media query the theme uses (settings: light/dark/system)
        const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
        m.setPaintProperty('sea', 'background-color', dark ? '#141416' : '#cfd3d8')
        m.setPaintProperty('land', 'fill-color', dark ? '#2a2a2e' : '#fff')
        m.setPaintProperty('outline', 'line-color', dark ? '#8a8a93' : '#6b7280')
      }
      bg()
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', bg)
      watch = new MutationObserver(bg)
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      let w = 180
      let e = -180
      let s = 90
      let n = -90
      const walk = (c: unknown): void => {
        if (Array.isArray(c) && typeof c[0] === 'number') {
          const [lng, lat] = c as number[]
          w = Math.min(w, lng)
          e = Math.max(e, lng)
          s = Math.min(s, lat)
          n = Math.max(n, lat)
        } else if (Array.isArray(c)) (c as unknown[]).forEach(walk)
      }
      for (const f of geo.features) walk((f.geometry as { coordinates: unknown } | null)?.coordinates)
      m.setMaxBounds([
        [w, s],
        [e, n],
      ])
      setMap(m)
    })
    return () => {
      watch?.disconnect()
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
    const data = {
      ...geo,
      features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, fill: color(f.properties.SETL_CODE) } })),
    }
    const source = map.getSource('towns') as maplibregl.GeoJSONSource | undefined
    if (source) source.setData(data)
    else {
      map.addSource('towns', { type: 'geojson', data })
      map.addLayer({ id: 'towns', type: 'fill', source: 'towns', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.82 } })
      map.addLayer({ id: 'towns-line', type: 'line', source: 'towns', paint: { 'line-color': 'rgba(0,0,0,0.18)', 'line-width': 0.4 } })
    }
  }, [map, geo, mode, rows, party])

  useEffect(() => {
    if (!map) return
    const codeOf = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) =>
      e.features?.[0]?.properties?.SETL_CODE as number | undefined
    const onMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const code = codeOf(e)
      const known = code != null && rows.has(code)
      map.getCanvas().style.cursor = known ? 'pointer' : ''
      setTip(known ? { code, x: e.point.x, y: e.point.y } : null)
    }
    const onLeave = () => {
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
            <span>{active.leader ? party(active.leader).name : t('mapNoData')}</span>
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
                {party(k).name}
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
