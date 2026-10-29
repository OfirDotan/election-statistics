import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PartyLogo } from '../components/PartyLogo.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { MAJORITY } from '../lib/coalition.ts'
import { chamber } from '../lib/donut.ts'
import { readableOn } from '../lib/color.ts'
import { allocate } from '../lib/mandates.ts'
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
  // The chamber holds the coalition or 61 seats, whichever is bigger; any seats left over stay free
  const room = Math.max(seats, MAJORITY)
  // Only the picked parties sit in the chamber, in ranked order, from the inner rows outward
  const blocks = chosen.map((s) => ({ key: s.key, n: s.seats }))
  const block = (n: number) => {
    let at = 0
    for (const s of blocks) if (n < (at += s.n)) return s
    return null
  }

  const toggle = (key: string) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

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
          <div className="plenary-head">
            <div className="plenary-count">
              <strong className="num">{seats}</strong>
              <span>/ {MAJORITY} {t('seats')}</span>
            </div>
            <p className={seats >= MAJORITY ? 'ok' : 'warn'} aria-live="polite">
              {seats >= MAJORITY ? t('hasMajority') : `${MAJORITY - seats} ${t('seatsNeededCount')}`}
            </p>
          </div>

          <div className="chamber-wrap">
            <svg className="chamber" viewBox="-104 -104 208 112" role="img" aria-label={`${t('coalitionTitle')}: ${seats} / ${room}`}>
              {/* Coloured seats are the coalition; a faint seat is a place a party could still take */}
              {chamber(room).map((s, n) => {
                const b = block(n)
                return b ? (
                  <rect key={n} x={s.cx - s.size / 2} y={s.cy - s.size / 2} width={s.size} height={s.size} rx={s.size / 3} fill={party(b.key).color} />
                ) : (
                  <rect key={n} x={s.cx - s.size / 2} y={s.cy - s.size / 2} width={s.size} height={s.size} rx={s.size / 3} className="chamber-track" />
                )
              })}
            </svg>
          </div>

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
                    style={{ '--party': p.color ?? 'var(--dot-unknown)', '--on-party': readableOn(p.color ?? '#999') } as CSSProperties}
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
