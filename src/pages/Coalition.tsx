import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PartyLogo } from '../components/PartyLogo.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { MAJORITY } from '../lib/coalition.ts'
import { allocate, SEATS } from '../lib/mandates.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Coalition() {
  const { t, ln } = useI18n()
  const { party, official, error } = useDataset()
  const [picked, setPicked] = useState<string[]>([])
  useTitle(t('coalitionTitle'))

  const allocation = official ? allocate({ votes: official.votes }) : null
  const ranked = useMemo(
    () => (allocation?.seats ?? []).filter((s) => s.seats > 0).sort((a, b) => b.seats - a.seats || b.votes - a.votes),
    [allocation],
  )
  // Each picked party fills a contiguous block, largest first; the 61st cell is the majority line
  const seats = ranked.reduce((sum, s) => sum + (picked.includes(s.key) ? s.seats : 0), 0)
  const cells: (string | null)[] = []
  for (const s of ranked) for (let i = 0; i < (picked.includes(s.key) ? s.seats : 0); i++) cells.push(s.key)
  while (cells.length < SEATS) cells.push(null)

  const toggle = (key: string) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

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
      {!allocation && !error && <Loading />}
      {allocation && (
        <section className="card">
          <div className="plenary-head">
            <div className="plenary-count">
              <strong className="num">{seats}</strong>
              <span>{ln(`/ ${SEATS} ${t('seats')}`, `/ ${SEATS} ${t('seats')}`)}</span>
            </div>
            <p className={seats >= MAJORITY ? 'ok' : 'warn'} aria-live="polite">
              {seats >= MAJORITY ? t('hasMajority') : `${MAJORITY - seats} ${t('seatsNeededCount')}`}
            </p>
            <ul className="plenary-key">
              {ranked
                .filter((s) => picked.includes(s.key))
                .map((s) => {
                  const p = party(s.key)
                  return (
                    <li key={s.key}>
                      <button type="button" className="key-item" onClick={() => toggle(s.key)} title={t('coalitionRemove')}>
                        <PartyLogo logo={p.logo} />
                        <span>{p.name}</span>
                        <span className="num">{s.seats}</span>
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>

          <ol
            className="seat-grid"
            role="img"
            aria-label={`${t('coalitionTitle')}: ${seats}/${SEATS} — ${MAJORITY} ${t('seatsNeededCount')}`}
          >
            {cells.map((key, i) => (
              <li
                key={i}
                className={`cell${key ? '' : ' is-empty'}${i === MAJORITY - 1 ? ' is-majority' : ''}`}
                style={key ? { background: party(key).color } : undefined}
              />
            ))}
          </ol>
          <p className="note">{ln(`${MAJORITY} מנדטים — קו הרוב`, `${MAJORITY} seats — the majority line`)}</p>

          <ul className="party-cards">
            {ranked.map((s) => {
              const p = party(s.key)
              const on = picked.includes(s.key)
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`party-card${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(s.key)}
                    style={{ '--party': p.color ?? 'var(--dot-unknown)' } as CSSProperties}
                  >
                    <span className="party-card-logo">
                      <PartyLogo logo={p.logo} />
                    </span>
                    <span className="party-card-name">{p.name}</span>
                    <span className="party-card-seats num">{s.seats}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="note">
            {t('noteSeats')} {t('noConstraints')}
          </p>
        </section>
      )}
    </section>
  )
}
