import { Link, useParams } from 'react-router-dom'
import { PartyChip, LoadError, Loading } from '../components/ui.tsx'
import { mkPhoto, partyUrl } from '../lib/links.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { loadCandidates, loadMks } from '../lib/data.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function MkPage() {
  const { id = '' } = useParams()
  const { t, lang } = useI18n()
  const { party, error } = useDataset()
  const candidates = useLoad('candidates', loadCandidates)
  const mks = useLoad('mks', loadMks)
  const candidate = candidates.data?.find((c) => c.id === id)
  useTitle(candidate ? (lang === 'en' ? candidate.nameEn ?? candidate.nameHe : candidate.nameHe) : '')

  if (error) return <LoadError />
  if (!candidates.data) return <Loading />
  if (!candidate) return <NotFound />

  const p = party(candidate.party)
  const mk = mks.data?.find((m) => m.id === id)
  const name = lang === 'en' ? candidate.nameEn || candidate.nameHe : candidate.nameHe
  const other = lang === 'he' ? candidate.nameEn : candidate.nameHe
  const background = (lang === 'en' ? mk?.backgroundEn : mk?.backgroundHe) ?? mk?.backgroundHe ?? mk?.backgroundEn
  const age = mk?.birthYear && new Date().getFullYear() - mk.birthYear

  // Only what is known: an unknown fact is left out rather than shown as a dash
  const facts: [string, string | string[] | undefined][] = [
    [t('mkParty'), p.name],
    [t('mkPosition'), `#${candidate.position}`],
    [t('mkBirthYear'), mk?.birthYear?.toString()],
    [t('mkAge'), age?.toString()],
    [t('mkBirthPlace'), lang === 'en' ? mk?.birthPlace : mk?.birthPlaceHe ?? mk?.birthPlace],
    [t('mkEducation'), lang === 'en' ? mk?.education : mk?.educationHe ?? mk?.education],
    [t('mkProfession'), lang === 'en' ? mk?.professionEn ?? mk?.profession : mk?.profession],
    [t('mkPriorTerms'), lang === 'en' ? mk?.priorTerms : mk?.priorTermsHe ?? mk?.priorTerms],
    [t('mkPriorRoles'), lang === 'en' ? mk?.priorRoles : mk?.priorRolesHe ?? mk?.priorRoles],
  ]
  const known = facts.filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v))

  return (
    <section className="page">
      <nav className="crumb" aria-label={p.name}>
        <Link to={partyUrl(p)}>← {t('mkBack')}</Link>
      </nav>
      <header className="party-head">
        <Portrait mk={mk} name={name} initial={candidate.nameHe.slice(0, 1)} />
        <div>
          <h1>
            {name}
            {candidate.incumbent && <span className="badge">{t('incumbent')}</span>}
          </h1>
          <p className="lead">
            {other} · <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={candidate.party} slug={p.slug} /> #{candidate.position}
          </p>
        </div>
      </header>
      <section className="card" aria-labelledby="mk-facts">
        <h2 id="mk-facts">{t('mkBackground')}</h2>
        {mk ? (
          <dl className="party-facts">
            {known.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{Array.isArray(v) ? v.join(' · ') : v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="note">{t('mkNoProfile')}</p>
        )}
        {background && <p>{background}</p>}
        {mk && (
          <>
            <p className="note">{t('mkNote')}</p>
            <ul className="note">
              {mk.sources.map((s) => (
                <li key={s}>
                  <a href={s} target="_blank" rel="noreferrer">
                    {new URL(s).hostname.replace('www.', '')}
                  </a>
                </li>
              ))}
            </ul>
            {mk.photo && mk.photoCredit && (
              <p className="note">
                {t('mkPhotoCredit')}: {mk.photoCredit}
              </p>
            )}
          </>
        )}
      </section>
    </section>
  )
}

/** Commons photo when one exists; otherwise an initials disc, never a stand-in face */
function Portrait({ mk, name, initial }: { mk?: { photo?: string }; name: string; initial: string }) {
  const src = mkPhoto(mk, 400)
  if (src) return <img className="mk-photo" src={src} alt={name} width={120} height={150} />
  return (
    <span className="mk-avatar" aria-hidden="true">
      {initial}
    </span>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <section className="page">
      <h1>{t('mkNotFound')}</h1>
      <Link to="/parties" className="back">
        {t('mkBack')}
      </Link>
    </section>
  )
}
