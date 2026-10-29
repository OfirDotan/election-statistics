import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PartyLogo } from '../components/PartyLogo.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { MAJORITY } from '../lib/coalition.ts'
import { readableOn } from '../lib/color.ts'
import { allocate, SEATS } from '../lib/mandates.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Coalition() {
  const { t } = useI18n()
  const { party, official, error } = useDataset()
  const [picked, setPicked] = useState<string[]>([])
  useTitle(t('coalitionTitle'))

  const allocation = official ? allocate({ votes: official.votes }) : null
  const ranked = useMemo(
    () => (allocation?.seats ?? []).filter((s) => s.seats > 0).sort((a, b) => b.seats - a.seats || b.votes - a.votes),
    [allocation],
  )
  const chosen = ranked.filter((s) => picked.includes(s.key))
  const seats = chosen.reduce((sum, s) => sum + s.seats, 0)

  const toggle = (key: string) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  // Seat n belongs to the first chosen party whose running total passes n; the rest of the 120 stay empty
  const fill: string[] = []
  // readableOn says which text colour reads on a party colour; white text means the colour itself is dark
  const dark: boolean[] = []
  chosen.forEach((s) => {
    const color = party(s.key).color ?? 'var(--dot-unknown)'
    fill.push(...Array<string>(s.seats).fill(color))
    dark.push(...Array<boolean>(s.seats).fill(readableOn(color) === '#ffffff'))
  })
  const progress = (seats / SEATS) * 100
  const strict = (MAJORITY / SEATS) * 100

  return (
    <section className="page">
      <div className="row-head">
        <header className="page-head">
          <h1>{t('coalitionTitle')}</h1>
          <p className="lead">{t('coalitionIntro')}</p>
        </header>
        <Link to="/parties" className="button">
          {t('navParties')} →
        </Link>
      </div>
      <p className="banner" role="status">
        {t('unverified')}
      </p>
      {error && <LoadError />}
      {!allocation && !error && <Loading />}
      {allocation && (
        <section className="card">
          <div className="coal-progress" aria-live="polite">
            <div className="coal-count">
              <strong className="num">{seats}</strong>
              <span>/ {MAJORITY}</span>
            </div>
            <p className={seats >= MAJORITY ? 'ok' : 'warn'}>
              {seats >= MAJORITY ? t('hasMajority') : seats === 0 ? t('pickToBuild') : `${MAJORITY - seats} ${t('seatsNeededCount')}`}
            </p>
          </div>
          <div
            className="coal-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={SEATS}
            aria-valuenow={seats}
            aria-label={`${seats} / ${MAJORITY}`}
          >
            <span className="coal-fill" style={{ inlineSize: `${progress}%` }} />
            <span className="coal-majority" style={{ insetInlineStart: `${strict}%` }}>
              <span className="coal-majority-label">{t('coalitionMajority')}</span>
            </span>
          </div>

          <div className="seat-grid" role="img" aria-label={`${t('coalitionTitle')}: ${seats} / ${SEATS}`}>
            {Array.from({ length: SEATS }, (_, i) =>
              fill[i] ? <span key={i} className={`cell cell-filled ${dark[i] ? 'on-dark' : 'on-light'}`} style={{ background: fill[i] }} /> : <span key={i} className="cell cell-empty" />,
            )}
          </div>

          <ul className="party-cards">
            {ranked.map((s) => {
              const p = party(s.key)
              const on = picked.includes(s.key)
              const color = p.color ?? 'var(--dot-unknown)'
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`party-card${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(s.key)}
                    style={{ '--party': color, '--on-party': readableOn(p.color ?? '#999') } as CSSProperties}
                  >
                    <span className="party-card-logo">
                      <PartyLogo logo={p.logo} />
                    </span>
                    <span className="party-card-name">{p.name}</span>
                    <span className="party-card-seats num">{s.seats}</span>
                    <span className="party-card-state" aria-hidden="true">
                      {on ? '✓' : '+'}
                    </span>
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
