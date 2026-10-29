import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'
import type { SortKey, TownRow } from '../lib/derive.ts'
import type { PartyLookup } from '../lib/useData.ts'
import { PartyChip, SortTh } from './ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'

export function TownTable({
  rows,
  party,
  sort,
  dir,
  onSort,
  showTurnout = true,
}: {
  rows: TownRow[]
  party: PartyLookup
  sort: SortKey
  dir: 1 | -1
  onSort: (k: string) => void
  /** Towns without ballots still have a turnout figure; the detail page hides it */
  showTurnout?: boolean
}) {
  const { t } = useI18n()
  const th = (k: SortKey, label: string, numeric = true) => (
    <SortTh label={label} k={k} sort={sort} dir={dir} onSort={onSort} numeric={numeric} />
  )
  return (
    <div className="table-wrap">
      <table className="towns">
        <thead>
          <tr>
            {th('name', t('colTown'), false)}
            {th('leader', t('colLeader'), false)}
            {th('share', t('colShare'))}
            {th('margin', t('colMargin'))}
            {showTurnout && th('turnout', t('colTurnout'))}
            {th('valid', t('colValid'))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = r.stats
            const p = s?.leader ? party(s.leader) : null
            return (
              <tr key={r.code}>
                <th scope="row">
                  <Link to={`/town/${r.code}`}>{r.name}</Link>
                </th>
                <td>{p ? <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} /> : <span className="muted">{t('noVotes')}</span>}</td>
                <td className="num">{p ? fmtPct(s!.leaderShare) : '—'}</td>
                <td className="num">{p ? fmtPct(s!.margin) : '—'}</td>
                {showTurnout && <td className="num">{r.turnout ? fmtPct(r.turnout) : '—'}</td>}
                <td className="num">{r.source === 'kaplan' ? fmtInt(r.valid) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="state">{t('empty')}</p>}
    </div>
  )
}
