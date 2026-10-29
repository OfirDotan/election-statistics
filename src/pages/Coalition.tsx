import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SeatStrip } from '../components/SeatStrip.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { MAJORITY, summariseCoalition } from '../lib/coalition.ts'
import { allocate } from '../lib/mandates.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Coalition() {
  const { t } = useI18n()
  const { party, official, error } = useDataset()
  const [picked, setPicked] = useState<string[]>([])
  useTitle(t('coalitionTitle'))

  const allocation = official ? allocate({ votes: official.votes }) : null
  const result = allocation ? summariseCoalition(allocation.seats, picked) : null
  const sizes = new Map((allocation?.seats ?? []).map((s) => [s.key, s.seats]))
  // Every list that won a seat, largest first; picked partners join their party's block
  const blockOf = (key: string) => {
    const partner = allocation?.effectiveApparentments.find(([a, b]) => a === key || b === key)
    return partner ? (partner[0] === key ? partner[1] : partner[0]) : key
  }
  const blocks = result
    ? result.parties.map((p) => ({ key: p.key, seats: p.seats, label: party(p.key).name, color: party(p.key).color }))
    : []

  const toggle = (key: string) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const ranked = [...sizes].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])

  return (
    <section className="page">
      <div className="row-head">
        <header className="page-head">
          <h1>{t('coalitionTitle')}</h1>
          <p className="lead">{t('coalitionIntro')}</p>
        </header>
        <Link to="/seats" className="button">
          {t('seatsTitle')} →
        </Link>
      </div>
      <p className="banner" role="status">
        {t('unverified')}
      </p>
      {error && <LoadError />}
      {!result && !error && <Loading />}
      {result && (
        <>
          <section className="card coalition-summary" aria-live="polite">
            <div className="coalition-count">
              <strong className="num">{result.seats}</strong>
              <span>/ {MAJORITY - 1 + 1}</span>
            </div>
            <p className={result.hasMajority ? 'ok' : 'warn'}>
              {result.hasMajority ? t('hasMajority') : `${result.seatsNeeded} ${t('needsMore')}`}
              {result.missing && (
                <span>
                  {' '}
                  · {party(result.missing.key).name} ({result.missing.seats}) {t('blocking')}
                </span>
              )}
            </p>
            <div className="seat-strip" role="img" aria-label={`${t('seats')}: ${result.seats}`}>
              <span
                className="seat-block"
                style={{ inlineSize: `${result.share * 100}%`, background: 'var(--tint)', color: '#fff' }}
              >
                {result.seats > 0 ? result.seats : ''}
              </span>
              <span className="seat-block seat-empty" style={{ inlineSize: `${(1 - result.share) * 100}%` }} />
            </div>
            <div className="majority-mark" style={{ insetInlineStart: `${(MAJORITY / 120) * 100}%` }} aria-hidden="true" />
          </section>

          <section className="card">
            <h2>{t('leaderParty')}</h2>
            {result.parties.length === 0 && <p className="note">{t('pickToBuild')}</p>}
            {blocks.length > 0 && <SeatStrip blocks={blocks} label={t('coalitionTitle')} />}
            <ul className="pick-list">
              {ranked.map(([key]) => {
                const p = party(key)
                const on = picked.includes(key)
                const block = blockOf(key)
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={`pick${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(key)}
                      style={{ borderColor: p.color, background: on ? p.color : undefined }}
                    >
                      <span className="seat-dot" style={{ background: on ? 'currentColor' : p.color }} aria-hidden="true" />
                      {p.name}
                      <span className="num">{sizes.get(key)}</span>
                      {block !== key && <span className="partner-mark" title={party(block).name} aria-label={party(block).name} />}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="note">{t('noteSeats')}</p>
          </section>
        </>
      )}
    </section>
  )
}
