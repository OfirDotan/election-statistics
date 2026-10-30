import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'
import { PartyLogo } from './PartyLogo.tsx'
import { partyUrl } from '../lib/links.ts'


/** Logo (or a colored dot when none was sourced) + party name; links to the party page */
export function PartyChip({ name, color, logo, partyKey, slug }: { name: string; color?: string; logo?: string; partyKey?: string; slug?: string }) {
  return (
    <span className="chip">
      {logo ? <PartyLogo logo={logo} /> : <span className="dot" style={{ background: color ?? 'var(--dot-unknown)' }} aria-hidden="true" />}
      {partyKey ? <Link to={partyUrl(slug ?? partyKey)}>{name}</Link> : name}
    </span>
  )
}

/** The language-switch overlay's spinner, in the page: same look, same words to assistive tech */
export function Loading() {
  const { t } = useI18n()
  return (
    <div className="state state-loading" role="status" aria-label={t('loading')}>
      <Spinner />
    </div>
  )
}

/** An arc that spins while data loads; motion stops under prefers-reduced-motion */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function LoadError() {
  const { t } = useI18n()
  return (
    <div className="state state-error" role="alert">
      {t('error')}
    </div>
  )
}

/** A column's definition behind a small "?"; text, not a popup, so the browser's own tooltip can't be clipped by the table's scroll box */
export function ColHelp({ text }: { text: string }) {
  return (
    <details className="col-help">
      <summary aria-label={text}>?</summary>
      <p>{text}</p>
    </details>
  )
}

export function Title({ children, sub, h2 }: { children: ReactNode; sub?: ReactNode; h2?: boolean }) {
  return (
    <header className="page-head">
      {h2 ? <h2>{children}</h2> : <h1>{children}</h1>}
      {sub && <p className="lead">{sub}</p>}
    </header>
  )
}
