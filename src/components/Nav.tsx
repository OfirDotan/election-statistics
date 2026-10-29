import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'

// TODO: Map / Seats / Coalition screens are built by other workstreams; routes render a stub until they land.
const routes = [
  { to: '/towns', key: 'navTowns' },
  { to: '/parties', key: 'navParties' },
  { to: '/leaderboards', key: 'navBoards' },
  { to: '/map', key: 'navMap' },
  { to: '/seats', key: 'navSeats' },
  { to: '/coalition', key: 'navCoalition' },
] as const

export type RouteKey = (typeof routes)[number]['key']

export function Nav() {
  const { t, lang, toggle } = useI18n()
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <NavLink to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          {t('app')}
        </NavLink>
        <nav className="segmented" aria-label={t('app')}>
          {routes.map((r) => (
            <NavLink key={r.to} to={r.to} end={'end' in r} className="segment">
              {t(r.key)}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="lang" onClick={toggle} lang={lang === 'he' ? 'en' : 'he'}>
          {lang === 'he' ? 'EN' : 'עב'}
        </button>
      </div>
    </header>
  )
}
