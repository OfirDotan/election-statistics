import { useState } from 'react'
import { SeatStrip } from '../components/SeatStrip.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { Loading, LoadError, PartyChip } from '../components/ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { loadParties } from '../lib/data.ts'
import { allocate } from '../lib/mandates.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

type Metric = 'seats' | 'votes' | 'pct'
// The two ballot lists that stood and won no seats, which still get a row (with 0 seats)
const ZERO_SEAT = new Set(['ך', 'די'])

// The four camps of the 26th Knesset, as the campaign itself was framed. The Joint List carries
// the first Arab bloc; Ra'am the second
const BLOCS = [
  // ביחד and ישר stood as an apparentment (s. 81(d)), so their votes are counted together at the threshold
  { id: 'change', color: '#2563EB', keys: ['דרך', 'רק', 'אמת', 'ל', 'כן'] },
  { id: 'netanyahu', color: '#DC2626', keys: ['מחל', 'ב', 'שס', 'ג', 'ט'] },
  { id: 'joint', color: '#16A34A', keys: ['ודם'] },
  { id: 'raam', color: '#EAB308', keys: ['עם'] },
] as const

export function Parties() {
  const { t, ln } = useI18n()
  const { towns, party, parties, official, error } = useDataset()
  const ballot = useLoad('parties', loadParties)
  const [metric, setMetric] = useState<Metric>('seats')
  useTitle(t('partiesTitle'))

  // Official national votes and seats; no town has the 493,642 double-envelope ballots, so town sums fall short
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
          {result && (
            <section className="card" aria-labelledby="seats-chart">
              <h2 id="seats-chart">{t('seatsTitle')}</h2>
              <SeatStrip blocks={sorted.map((p) => ({ key: p.key, seats: p.seats, color: p.color, label: p.name }))} label={t('seatsTitle')} />
              <p className="note">{t('seatsIntro')}</p>
            </section>
          )}
          {/* Blocs sit beside the party list, so both are read against each other */}
          <div className="board-pair">
            <section className="card" role="region" aria-label={t('national')}>
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
                      <PartyChip name={p.name} color={p.color} logo={p.logo} />
                    </span>
                    <span className="pb-track">
                      <span className="pb-fill" style={{ inlineSize: `${(p[metric] / max) * 100}%`, background: p.color }} />
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
                          <PartyChip name={party(p.key).name} color={p.color} logo={p.logo} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="note">{t('blocsNote')}</p>
            </section>
          </div>
        </>
      )}
    </section>
  )
}
