import { geoMercator, geoPath } from 'd3-geo'
import { useMemo, useState, type FocusEvent, type MouseEvent } from 'react'
import { feature } from 'topojson-client'
import { useI18n } from '../i18n/useI18n.ts'
import { fmtPct } from '../lib/fmt.ts'
import type { MunicipalCollection, MunicipalTopology } from '../lib/mapData.ts'
import { readableOn, scaleColor, topParty } from '../lib/mapLogic.ts'
import { share } from '../lib/stats.ts'
import type { Town } from '../lib/types.ts'

export type MapMode = 'leader' | 'turnout' | 'share'

const W = 600
const H = 820
const NO_DATA = '#d4d4d9'

interface Row {
  name: string
  leader: string | null
  leaderShare: number | null
  turnout: number
}

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
  const { t } = useI18n()
  const [mode, setMode] = useState<MapMode>('leader')
  const [tip, setTip] = useState<{ code: number; x: number; y: number } | null>(null)

  const { paths, rows } = useMemo(() => {
    const geo = feature(topo as never, (topo.objects as Record<string, unknown>).municipal as never) as unknown as MunicipalCollection
    const rows = new Map<number, Row>()
    for (const tw of towns) {
      const v = tw.votes
      if (!v || v.voters <= 0) continue
      const top = topParty(tw)
      rows.set(tw.code, { name: tw.name, leader: top?.party ?? null, leaderShare: top?.share ?? null, turnout: share(v.voters, v.eligible) })
    }
    // One projection for the whole country; each feature keeps its own path so it can be a focusable button
    const projection = geoMercator().fitExtent(
      [
        [6, 6],
        [W - 6, H - 6],
      ],
      { type: 'FeatureCollection', features: geo.features } as never,
    )
    const path = geoPath(projection)
    const paths = geo.features.flatMap((f) => {
      const d = path(f as never)
      return d ? [{ code: f.properties.SETL_CODE, d }] : []
    })
    return { paths, rows }
  }, [topo, towns])

  const fill = (r: Row | undefined): string => {
    if (!r) return NO_DATA
    if (mode === 'leader') return r.leader ? party(r.leader).color ?? NO_DATA : NO_DATA
    if (mode === 'turnout') return scaleColor(r.turnout, 0, 100)
    return r.leaderShare === null ? NO_DATA : scaleColor(r.leaderShare, 0, 100)
  }

  const show = (code: number, e: MouseEvent | FocusEvent) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement
    const box = svg?.getBoundingClientRect()
    const hit = (e.currentTarget as SVGElement).getBoundingClientRect()
    if (!box) return
    setTip({ code, x: hit.left + hit.width / 2 - box.left, y: hit.top - box.top })
  }
  const activate = (code: number, r: Row | undefined) => r && onSelectTown(code)
  const active = tip ? rows.get(tip.code) : undefined

  return (
    <section className="map card">
      <div className="map-bar">
        <div className="seg" role="group" aria-label={t('mapMode')}>
          {(['leader', 'turnout', 'share'] as const).map((m) => (
            <button key={m} type="button" className={mode === m ? 'on' : undefined} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {t(`map_${m}`)}
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
        <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="group" aria-label={`${t('mapMap')}: ${t(`map_${mode}`)}`}>
          {paths.map(({ code, d }) => {
            const r = rows.get(code)
            return (
              <path
                key={code}
                d={d}
                fill={fill(r)}
                className={r ? 'maptown' : 'maptown nodata'}
                tabIndex={r ? 0 : -1}
                role={r ? 'button' : undefined}
                aria-label={r ? `${r.name}, ${r.leader ? party(r.leader).name : t('mapNoData')}, ${t('colTurnout')} ${fmtPct(r.turnout)}` : undefined}
                onMouseEnter={(e) => show(code, e)}
                onFocus={(e) => show(code, e)}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
                onClick={() => activate(code, r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    activate(code, r)
                  }
                }}
              />
            )
          })}
        </svg>
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
      <div className="map-legend" role="group" aria-label={t('mapMap')}>
        {mode === 'leader' ? (
          <>
            {[...new Set([...rows.values()].map((r) => r.leader).filter((k): k is string => !!k))]
              .sort((a, b) => party(a).name.localeCompare(party(b).name, 'he'))
              .map((k) => (
                <span key={k} className="legend-item">
                  <span className="swatch" style={{ display: 'grid', placeItems: 'center', background: party(k).color }} aria-hidden="true">
                    <span style={{ width: 4, height: '60%', background: readableOn(party(k).color ?? '#999'), borderRadius: 1 }} />
                  </span>
                  {party(k).name}
                </span>
              ))}
            <span className="legend-item">
              <span className="swatch" style={{ background: NO_DATA, boxShadow: 'inset 0 0 0 1px var(--map-border)' }} aria-hidden="true" />
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
