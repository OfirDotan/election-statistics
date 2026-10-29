import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav.tsx'
import { useI18n } from './i18n/useI18n.ts'
import { ComingSoon } from './pages/ComingSoon.tsx'
import { Home } from './pages/Home.tsx'
import { LeaderboardsPage } from './pages/LeaderboardsPage.tsx'
import { MapPage } from './pages/MapPage.tsx'
import { Parties } from './pages/Parties.tsx'
import { TownPage } from './pages/TownPage.tsx'
import { Towns } from './pages/Towns.tsx'

function NotFound() {
  const { t } = useI18n()
  return (
    <section className="page">
      <h1>{t('notFound')}</h1>
      <Link to="/" className="back">
        {t('back')}
      </Link>
    </section>
  )
}

// HashRouter: GitHub Pages has no SPA fallback, so a path like /town/123 would 404 on reload.
export function App() {
  const { t } = useI18n()
  return (
    <HashRouter>
      <Nav />
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <main id="main" className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/towns" element={<Towns />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/seats" element={<ComingSoon titleKey="navSeats" />} />
          <Route path="/coalition" element={<ComingSoon titleKey="navCoalition" />} />
          <Route path="/town/:code" element={<TownPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </HashRouter>
  )
}

export default App
