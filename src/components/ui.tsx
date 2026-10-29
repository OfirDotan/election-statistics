import type { ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n.ts'


/** Colored dot + party name. Unknown keys render the key as-is with a neutral dot. */
export function PartyChip({ name, color }: { name: string; color?: string }) {
  return (
    <span className="chip">
      <span className="dot" style={{ background: color ?? 'var(--dot-unknown)' }} aria-hidden="true" />
      {name}
    </span>
  )
}

export function Loading() {
  const { t } = useI18n()
  return (
    <div className="state" role="status">
      {t('loading')}
    </div>
  )
}

export function LoadError() {
  const { t } = useI18n()
  return (
    <div className="state state-error" role="alert">
      {t('error')}
    </div>
  )
}

/** Th/Td helpers: sortable header button reports order to assistive tech. */
export function SortTh({ label, k, sort, dir, onSort, numeric }: { label: string; k: string; sort: string; dir: 1 | -1; onSort: (k: string) => void; numeric?: boolean }) {
  const active = sort === k
  return (
    <th scope="col" className={numeric ? 'num' : undefined} aria-sort={active ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort" onClick={() => onSort(k)}>
        {label}
        <span className="sort-arrow" aria-hidden="true">{active ? (dir === 1 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
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
