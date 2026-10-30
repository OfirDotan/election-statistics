import { useNavigate } from 'react-router-dom'
import { MapView } from '../components/MapView.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { loadCountry, loadGeo, loadLabels } from '../lib/mapData.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

/** Route component: the card renders straight away and fills in, so no scroll reset was needed. */
export function MapPage() {
  const { t } = useI18n()
  const { towns, party, error } = useDataset()
  const geo = useLoad('geo', loadGeo)
  // A missing outline must not hide the town map, so only the other loads gate it
  const country = useLoad('country', loadCountry)
  const labels = useLoad('labels', loadLabels)
  const navigate = useNavigate()
  useTitle(t('mapTitle'))

  return (
    <section className="page map-page">
      <header className="page-head">
        <h1>{t('mapTitle')}</h1>
      </header>
      {error && <LoadError />}
      {geo.error && <LoadError />}
      {(!towns || !geo.data) && !error && !geo.error && <Loading />}
      {towns && geo.data && labels.data && (
        <MapView topo={geo.data} labels={labels.data} country={country.data} towns={towns} party={party} onSelectTown={(code) => navigate(`/town/${code}`)} />
      )}
    </section>
  )
}
