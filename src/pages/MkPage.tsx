import { Link, useParams } from 'react-router-dom'
import { PartyChip, LoadError, Loading } from '../components/ui.tsx'
import { mkPhoto, partyUrl } from '../lib/links.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { loadCandidates, loadMks } from '../lib/data.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'
import type { MkProfile } from '../lib/types.ts'

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
  const other = lang === 'en' ? candidate.nameHe : candidate.nameEn

  return (
    <section className="page mk-page">
      <nav className="crumb" aria-label={p.name}>
        <Link to={partyUrl(p)}>← {t('mkBack')}</Link>
      </nav>
      <article className="card mk-card">
        <header className="mk-head">
          <Portrait mk={mk} name={name} initials={initials(name)} />
          <div className="mk-head-text">
            <h1 className="mk-name">{name}</h1>
            {other && (
              <p className="mk-name-alt" lang={lang === 'he' ? 'en' : 'he'} dir={lang === 'he' ? 'ltr' : 'rtl'}>
                {other}
              </p>
            )}
            <div className="mk-tags">
              <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={candidate.party} slug={p.slug} />
              <span className="mk-tag">#{candidate.position}</span>
              {candidate.incumbent && <span className="mk-tag">{t('incumbent')}</span>}
            </div>
          </div>
        </header>
        {mk ? <Profile mk={mk} /> : <p className="mk-note">{t('mkNoProfile')}</p>}
      </article>
    </section>
  )
}

function Profile({ mk }: { mk: MkProfile }) {
  const { t, lang } = useI18n()
  const pick = (a?: string[], b?: string[]) => (lang === 'en' ? (a?.length ? a : b) : (b?.length ? b : a)) ?? []
  const one = (a?: string, b?: string) => (lang === 'en' ? a || b : b || a)
  const age = mk.birthYear ? new Date().getFullYear() - mk.birthYear : undefined
  const education = pick(mk.education, mk.educationHe)
  const roles = pick(mk.priorRoles, mk.priorRolesHe)
  const bio = lang === 'en' ? mk.backgroundEn || mk.backgroundHe : mk.backgroundHe || mk.backgroundEn

  // Only what is known: an unknown fact is left out rather than shown as a dash
  const facts: [string, string | undefined][] = [
    [t('mkBirthYear'), mk.birthYear?.toString()],
    [t('mkAge'), age?.toString()],
    [t('mkBirthPlace'), one(mk.birthPlace, mk.birthPlaceHe)],
    [t('mkProfession'), one(mk.professionEn, mk.profession)],
    [t('mkReligion'), one(mk.religion, mk.religionHe)],
    [t('mkPriorTerms'), one(mk.priorTerms, mk.priorTermsHe)],
  ]
  const known = facts.filter(([, v]) => v).map(([k, v]): [string, string] => [k, v as string])

  return (
    <>
      {known.length > 0 && <FactGrid title={t('mkFacts')} facts={known} />}
      {education.length > 0 && <Rows title={t('mkEducation')} rows={education.map((r) => ({ text: r.split('|')[0] }))} />}
      {roles.length > 0 && <Rows title={t('mkPriorRoles')} rows={roles.map((r) => splitDate(r, lang))} />}
      {bio && (
        <section className="mk-sec" aria-labelledby="mk-about">
          <h2 id="mk-about">{t('mkAbout')}</h2>
          <p className="mk-prose">{bio}</p>
        </section>
      )}
      <section className="mk-sec" aria-labelledby="mk-sources">
        <h2 id="mk-sources">{t('mkSources')}</h2>
        <ul className="mk-rows mk-sources">
          {mk.sources.map((s) => {
            const url = new URL(s)
            const he = url.hostname.endsWith('wikipedia.org')
            return (
              <li key={s}>
                <a href={s} target="_blank" rel="noreferrer" lang={he ? 'he' : 'en'} dir={he ? 'rtl' : 'ltr'}>
                  {url.hostname.replace(/^www\./, '')}
                  {decodeURIComponent(url.pathname)}
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      {(mk.photo || bio) && (
        <p className="mk-note mk-foot">
          {bio && t('mkNote')}
          {mk.photo && mk.photoCredit && `${bio ? ' ' : ''}${t('mkPhotoCredit')}: ${mk.photoCredit}`}
        </p>
      )}
    </>
  )
}

function FactGrid({ title, facts }: { title: string; facts: [string, string][] }) {
  return (
    <section className="mk-sec" aria-label={title}>
      <h2>{title}</h2>
      <dl className="mk-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** One entry per row: the text, with its years in an aligned column on the other side */
function Rows({ title, rows }: { title: string; rows: { text: string; date?: string }[] }) {
  return (
    <section className="mk-sec" aria-label={title}>
      <h2>{title}</h2>
      <ul className="mk-rows">
        {rows.map((r, i) => (
          <li key={i}>
            <span>{r.text}</span>
            {r.date && <span className="mk-date">{r.date}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "Chair of the Finance Committee (2014–2017)" -> text + date; a Knesset term stays inside the text */
function splitDate(s: string, lang: string) {
  const m = s.match(/^(.*?)\s*\(([^()]*\d{4}[^()]*)\)\s*$/)
  if (!m) return { text: s }
  // The date column is RTL: a Hebrew "from" must lead, and a bare year there would read wrong in any language
  return { text: m[1], date: lang === 'he' ? m[2].replace(/^from (\d{4})$/, 'משנת $1') : m[2] }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
}

/** Local photo when one exists; otherwise an initials block, never a stand-in face */
function Portrait({ mk, name, initials }: { mk?: { photo?: string }; name: string; initials: string }) {
  const src = mkPhoto(mk)
  if (src) return <img className="mk-photo" src={src} alt={name} width={200} height={250} />
  return (
    <span className="mk-avatar" role="img" aria-label={name}>
      <span aria-hidden="true">{initials}</span>
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
