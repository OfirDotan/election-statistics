import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'
import { Settings } from './Settings.tsx'

const routes = [
  { to: '/parties', key: 'navParties' },
  { to: '/towns', key: 'navTowns' },
  { to: '/map', key: 'navMap' },
  { to: '/leaderboards', key: 'navBoards' },
  { to: '/coalition', key: 'navCoalition' },
] as const

export type RouteKey = (typeof routes)[number]['key']

export function Nav() {
  const { t, lang, toggle } = useI18n()
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <NavLink to="/" className="brand" end title={t('home')}>
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
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
        <Settings />
      </div>
    </header>
  )
}
