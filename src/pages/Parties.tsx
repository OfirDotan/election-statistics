import { useState, type CSSProperties } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { Loading, LoadError, PartyChip } from '../components/ui.tsx'
import { SeatsPie } from '../components/SeatsPie.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { loadParties } from '../lib/data.ts'
import { allocate, DEFAULT_THRESHOLD } from '../lib/mandates.ts'
import { BLOCS } from '../lib/blocs.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

type Metric = 'seats' | 'votes' | 'pct'
// The two ballot lists that stood and won no seats, which still get a row (with 0 seats)
const ZERO_SEAT = new Set(['ך', 'די'])
// Where the threshold falls in each track: a CSS variable so the stylesheet keeps the placement
const THRESHOLD_AT = { '--threshold': DEFAULT_THRESHOLD } as CSSProperties

export function Parties() {
  const { t, ln } = useI18n()
  const { towns, party, parties, official, error } = useDataset()
  const ballot = useLoad('parties', loadParties)
  const [metric, setMetric] = useState<Metric>('seats')
  useTitle(t('partiesTitle'))

  // Official national votes and seats; no town has the double-envelope ballots (about 8.8%), so town sums fall short
  const result = official ? allocate({ votes: official.votes }) : null
  const seatOf = Object.fromEntries((result?.seats ?? []).map((s) => [s.key, s.seats]))
  const ranked = towns
    ? parties
        .map((p) => ({ ...party(p.key), pct: p.nationalShare ?? 0, votes: p.nationalVotes ?? 0, seats: seatOf[p.key] ?? 0 }))
        .filter((p) => p.votes > 0)
        .sort((a, b) => b.votes - a.votes)
    : []
  // Ranked by votes; seats reorder the list, so sort on the shown value
  const sorted = metric === 'pct' ? ranked : [...ranked].sort((a, b) => (metric === 'seats' ? b.seats - a.seats : b.votes - a.votes))
  // Seats: only parties that won one (plus עמך and המילואימניקים, who stood and got none);
  // votes and percent: every list on the ballot
  const shown = metric === 'seats' ? sorted.filter((p) => p.seats > 0 || ZERO_SEAT.has(p.key)) : ranked
  // Each bar is drawn against the leader, so the biggest party fills the track in every mode
  const max = Math.max(1, ...shown.map((p) => p[metric]))
  const value = (p: (typeof ranked)[number]) => (metric === 'seats' ? `${p.seats}` : metric === 'votes' ? fmtInt(p.votes) : fmtPct(p.pct))

  // Lists with no votes and no seats, still on the ballot: named in the note rather than given empty bars
  const counted = new Set(ranked.map((p) => p.key))
  const nothing = (ballot.data ?? []).filter((p) => !counted.has(p.key)).map((p) => party(p.key).name)

  // Only seated parties form a bloc; lists under the threshold belong to none
  const blocs = BLOCS.map((b) => {
    const members = ranked.filter((p) => p.seats > 0 && (b.keys as readonly string[]).includes(p.key))
    return { ...b, members, seats: members.reduce((n, p) => n + p.seats, 0) }
  })
  const blocMax = Math.max(1, ...blocs.map((b) => b.seats))
  const seatRows = [...ranked].filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats || b.votes - a.votes)

  return (
    <section className="page">
      <header className="page-head">
        <h1>{t('partiesTitle')}</h1>
        <p className="lead">{t('partiesIntro')}</p>
      </header>
      <p className="banner" role="status">
        {t('unverified')}
      </p>
      {error && <LoadError />}
      {(!towns || !ballot.data) && !error && <Loading />}
      {towns && ballot.data && (
        <>
          {/* Party list on the left, blocs beside it on the right; the seats pie sits under the blocs */}
          <div className="board-pair board-columns">
            <section className="card party-list" role="region" aria-label={t('national')}>
              <div className="seg" role="group" aria-label={t('national')}>
                {(['seats', 'votes', 'pct'] as const).map((m) => (
                  <button key={m} type="button" className={metric === m ? 'on' : undefined} aria-pressed={metric === m} onClick={() => setMetric(m)}>
                    {{ seats: t('bySeats'), votes: t('byVotes'), pct: t('byPct') }[m]}
                  </button>
                ))}
              </div>
              <ol className="party-bars">
                {shown.map((p) => (
                  <li key={p.key}>
                    <span className="pb-name">
                      <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} />
                    </span>
                    <span className="pb-track">
                      <span className="pb-fill" style={{ inlineSize: `${(p[metric] / max) * 100}%`, background: p.color }} />
                      {/* The threshold sits on the same scale as the bars, so it rides inside each track */}
                      {metric === 'pct' && <span className="pb-threshold" data-label={`אחוז חסימה ${fmtPct(DEFAULT_THRESHOLD * 100, 2)}`} style={THRESHOLD_AT} />}
                    </span>
                    <span className="pb-value num">{value(p)}</span>
                  </li>
                ))}
              </ol>
              <p className="note">
                {metric === 'seats' ? t('noteSeats') : metric === 'votes' ? t('votesWord') : t('ofValid')}
              </p>
              <p className="note">
                {ln(`בפתק ${ballot.data.length} רשימות`, `${ballot.data.length} lists on the ballot`)}
                {` · ${t('allLists')}: ${ranked.length}`}
                {nothing.length > 0 && ` · ${t('noVotes')}: ${nothing.join(', ')}`}
              </p>
            </section>
            <div className="board-side">
              <section className="card" aria-labelledby="blocs-head">
                <h2 id="blocs-head">{t('blocsTitle')}</h2>
                <ol className="blocs">
                  {blocs.map((b) => (
                    <li key={b.id}>
                      <span className="bloc-name">
                        <span className="dot" style={{ background: b.color }} aria-hidden="true" />
                        {t(`bloc_${b.id}`)}
                      </span>
                      <span className="pb-track">
                        <span className="pb-fill" style={{ inlineSize: `${(b.seats / blocMax) * 100}%`, background: b.color }} />
                      </span>
                      <span className="pb-value num">{b.seats}</span>
                      <ul className="bloc-members">
                        {b.members.map((p) => (
                          <li key={p.key}>
                            <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <p className="note">{t('blocsNote')}</p>
              </section>
              {result && seatRows.length > 0 && (
                <section className="card" aria-labelledby="seats-pie">
                  <h2 id="seats-pie">{t('seatsTitle')}</h2>
                  <SeatsPie slices={seatRows} seatWord={t('seats')} />
                  <p className="note">{t('noteSeats')}</p>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
