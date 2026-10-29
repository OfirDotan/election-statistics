import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapView } from '../components/MapView.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { loadGeo } from '../lib/mapData.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

/** Route component: plain wrapper that turns the select callback into town navigation. */
export function MapPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { towns, party, error } = useDataset()
  const geo = useLoad('geo', loadGeo)
  useTitle(t('mapTitle'))

  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [])

  return (
    <section className="page">
      <header className="page-head">
        <h1>{t('mapTitle')}</h1>
        <p className="lead">{t('mapIntro')}</p>
      </header>
      {error && <LoadError />}
      {geo.error && <LoadError />}
      {(!towns || !geo.data) && !error && !geo.error && <Loading />}
      {towns && geo.data && <MapView topo={geo.data} towns={towns} party={party} onSelectTown={(code) => navigate(`/town/${code}`)} />}
    </section>
  )
}
