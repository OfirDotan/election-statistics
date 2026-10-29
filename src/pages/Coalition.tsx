import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PartyLogo } from '../components/PartyLogo.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { MAJORITY } from '../lib/coalition.ts'
import { allocate, SEATS } from '../lib/mandates.ts'
import { refusalBetween, type Refusal } from '../lib/refusals.ts'
import { seatArc, type ArcPoint } from '../lib/seatArc.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

interface SitDown {
  add: string
  remove: string
  refusal: Refusal
}

const ARC = seatArc()
const pos = (pt: ArcPoint) => ({ insetInlineStart: `${pt.x}%`, insetBlockStart: `${pt.y}%` })

export function Coalition() {
  const { t, ln } = useI18n()
  const { party, official, error } = useDataset()
  const [picked, setPicked] = useState<string[]>([])
  const [clash, setClash] = useState<SitDown | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useTitle(t('coalitionTitle'))

  const allocation = official ? allocate({ votes: official.votes }) : null
  const ranked = useMemo(
    () => (allocation?.seats ?? []).filter((s) => s.seats > 0).sort((a, b) => b.seats - a.seats || b.votes - a.votes),
    [allocation],
  )
  // Seats filled from the outer ends inward, in ballot order: the two blocks of a typical coalition
  const ballotOrder = [...ranked].sort((a, b) => (official?.votes[b.key] ?? 0) - (official?.votes[a.key] ?? 0))
  const filled: { key: string; count: number }[] = []
  let left: string[] = []
  const right: string[] = []
  for (const s of ballotOrder) {
    const n = picked.includes(s.key) ? s.seats : 0
    if (n) filled.push({ key: s.key, count: n })
  }
  const seats = filled.reduce((sum, f) => sum + f.count, 0)
  const next = [...filled]
  for (let i = 0; i < SEATS; i++) {
    const slot = i < SEATS / 2 ? left : right
    const block = next.find((f) => f.count > 0)
    if (block) {
      slot.unshift(block.key)
      block.count--
    }
    if (next[0]?.count === 0) next.shift()
  }
  left = left.reverse()
  const seatKeys = [...left, ...right]

  const open = (d: SitDown) => {
    setClash(d)
    dialog.current?.showModal()
  }
  const close = () => {
    dialog.current?.close()
    setClash(null)
  }
  const add = (key: string) => {
    const conflict = picked.map((k) => ({ key: k, refusal: refusalBetween(key, k) })).find((c) => c.refusal)
    if (conflict?.refusal) open({ add: key, remove: conflict.key, refusal: conflict.refusal })
    else setPicked((prev) => [...prev, key])
  }
  const toggle = (key: string) => (picked.includes(key) ? setPicked((prev) => prev.filter((k) => k !== key)) : add(key))
  const confirm = () => {
    if (!clash) return
    setPicked((prev) => [...prev.filter((k) => k !== clash.remove), clash.add])
    close()
  }

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
        <>
          <section className="card">
            <div className="plenary-head">
              <div className="plenary-count">
                <strong className="num">{seats}</strong>
                <span>{ln(`/ 120 ${t('seats')}`, `/ 120 ${t('seats')}`)}</span>
              </div>
              <p className={seats >= MAJORITY ? 'ok' : 'warn'} aria-live="polite">
                {seats >= MAJORITY ? t('hasMajority') : `${MAJORITY - seats} ${t('seatsNeededCount')}`}
              </p>
              <ul className="plenary-key">
                {filled.map((f) => {
                  const p = party(f.key)
                  return (
                    <li key={f.key}>
                      <button type="button" className="key-item" onClick={() => toggle(f.key)} title={t('coalitionRemove')}>
                        <PartyLogo logo={p.logo} />
                        <span>{p.name}</span>
                        <span className="num">{f.count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="hemicycle">
              <div className="hemicycle-floor" aria-hidden="true" />
            <div className="hemicycle-61" aria-hidden="true">
              <span>{MAJORITY}</span>
            </div>
              <ol
                className="hemicycle-seats"
                role="img"
                aria-label={`${t('coalitionTitle')}: ${filled.map((f) => `${party(f.key).name} ${f.count}`).join(', ') || t('pickToBuild')}`}
              >
                {ARC.map((pt) => {
                  const key = seatKeys[pt.index]
                  return (
                    <li
                      key={pt.index}
                      className={`hs${key ? '' : ' is-empty'}${pt.index === MAJORITY - 1 ? ' is-majority' : ''}`}
                      style={{ ...pos(pt), background: key && party(key).color }}
                    />
                  )
                })}
              </ol>
            </div>

            <div className="majority-note">
              {ln(`${MAJORITY} מנדטים — קו הרוב`, `${MAJORITY} seats — the majority line`)}
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
            <p className="note">{t('noteSeats')}</p>
          </section>
        </>
      )}

      <dialog ref={dialog} className="clash" aria-labelledby="clash-title" onClose={() => setClash(null)}>
        {clash && (
          <>
            <h2 id="clash-title">{ln('לא הולך ביחד', 'Not sitting together')}</h2>
            <p className="clash-line">
              <strong>{party(clash.add).name}</strong> {ln('מסרבת לשבת עם', 'refuses to sit with')}{' '}
              <strong>{party(clash.remove).name}</strong>
            </p>
            <blockquote className="clash-reason">{ln(clash.refusal.reason.he, clash.refusal.reason.en)}</blockquote>
            <p className="clash-source">
              {t('source')}: {clash.refusal.source}
            </p>
            <div className="clash-actions">
              <button type="button" className="button" onClick={confirm}>
                {ln(`הסירו את ${party(clash.remove).name} והוסיפו את ${party(clash.add).name}`, `Remove ${party(clash.remove).name} and add ${party(clash.add).name}`)}
              </button>
              <button type="button" className="button subtle" onClick={close} autoFocus>
                {t('cancel')}
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  )
}
