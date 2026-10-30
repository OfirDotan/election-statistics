import { Link, useParams } from 'react-router-dom'
import { PartyLogo } from '../components/PartyLogo.tsx'
import { AlignmentCard } from '../components/AlignmentCard.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { BLOCS } from '../lib/blocs.ts'
import { loadCandidates, loadMks } from '../lib/data.ts'
import { mkPhoto, mkUrl } from '../lib/links.ts'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { allocate, DEFAULT_THRESHOLD } from '../lib/mandates.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function PartyPage() {
  const { key = '' } = useParams()
  const { t, lang } = useI18n()
  const { parties, official, error } = useDataset()
  const candidates = useLoad('candidates', loadCandidates)
  const mks = useLoad('mks', loadMks)
  // The URL carries the English slug; the old Hebrew key still resolves so links keep working
  const party = parties.find((p) => p.slug === key || p.key === key)
  const id = party?.key ?? key
  useTitle(party ? (lang === 'en' ? party.nameEn || party.name : party.name) : '')

  if (error) return <LoadError />
  // The party list loads in parallel: without it there is nothing to render, and reading
  // `party` below would throw and leave a blank page
  if (!parties.length) return <Loading />
  if (!party) return <NotFound />
  // Seats and threshold need only the party list; the candidate file fills the leader's rows
  const result = official ? allocate({ votes: official.votes }) : null

  const seat = result?.seats.find((s) => s.key === id)
  const seats = seat?.seats ?? 0
  const votes = party.nationalVotes ?? 0
  const share = party.nationalShare ?? 0
  const candidate = candidates.data?.find((c) => c.party === id && c.position === 1)
  const leader = lang === 'en' ? party.leader?.en ?? candidate?.nameEn : party.leader?.he ?? candidate?.nameHe
  // Only the seats won are filled: #1..#seats is who enters the Knesset, the rest of the list does not
  const elected = candidates.data
    ?.filter((c) => c.party === id && c.position <= seats)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ key: c.position, id: c.id, name: lang === 'en' ? c.nameEn ?? c.nameHe : c.nameHe, incumbent: c.incumbent, photo: mkPhoto(mks.data?.find((m) => m.id === c.id)) }))
  const bloc = BLOCS.find((b) => (b.keys as readonly string[]).includes(id))
  const name = lang === 'en' ? party.nameEn || party.name : party.name
  // The name in the other language, when the list has one that differs
  const other = lang === 'he' ? party.nameEn : party.nameEn ? party.name : undefined

  const rows: [string, string][] = [
    [t('partyNameHe'), party.name],
    [t('partyNameEn'), party.nameEn ?? '—'],
    [t('leaderName'), leader ?? '—'],
    [t('seatNo'), candidate ? `#${candidate.position}` : '—'],
    [t('role'), candidate ? (candidate.incumbent ? t('incumbent') : t('challenger')) : '—'],
    [t('onList'), `${party.candidates}`],
    [t('bloc'), bloc ? t(`bloc_${bloc.id}`) : t('noBloc')],
    [t('seats'), `${seats}`],
    [t('votesWord'), fmtInt(votes)],
    [t('share'), fmtPct(share)],
    [t('threshold'), `${fmtPct(share)} / ${fmtPct(DEFAULT_THRESHOLD * 100, 2)} ${result?.below.some((b) => b.key === id) ? t('underThreshold') : '✓'}`],
  ]

  return (
    <section className="page">
      <nav className="crumb" aria-label={t('partiesTitle')}>
        <Link to="/parties">← {t('partyBack')}</Link>
      </nav>
      <header className="party-head">
        <PartyLogo logo={party.logo} />
        <div>
          <h1>{name}</h1>
          {other && <p className="lead">{other}</p>}
        </div>
      </header>
      {official && (
        <dl className="stats">
          <div>
            <dt>{t('seats')}</dt>
            <dd className="num">{seats}</dd>
          </div>
          <div>
            <dt>{t('votesWord')}</dt>
            <dd className="num">{fmtInt(votes)}</dd>
          </div>
          <div>
            <dt>{t('ofValid')}</dt>
            <dd className="num">{fmtPct(share)}</dd>
          </div>
        </dl>
      )}
      {!candidates.data ? (
        <Loading />
      ) : (
        <section className="card" aria-labelledby="party-data">
          <h2 id="party-data">{t('partyFullData')}</h2>
          <dl className="party-facts">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="note">{t('noteSeats')}</p>
        </section>
      )}
      {seats > 0 && elected && elected.length > 0 && (
        <section className="card" aria-labelledby="party-elected">
          <h2 id="party-elected">{t('electedMks')}</h2>
          <ol className="elected">
            {elected.map((c) => (
              <li key={c.key}>
                <span className="num">#{c.key}</span>
                <Link to={mkUrl(c.id)} className="mk-mini">
                  {c.photo ? <img src={c.photo} alt="" width={32} height={32} loading="lazy" /> : null}
                  {c.name}
                </Link>
                {c.incumbent && <span className="badge">{t('incumbent')}</span>}
              </li>
            ))}
          </ol>
          <p className="note">{t('electedNote')}</p>
        </section>
      )}
      <AlignmentCard partyKey={id} />
    </section>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <section className="page">
      <h1>{t('partyNotFound')}</h1>
      <Link to="/parties" className="back">
        {t('partyBack')}
      </Link>
    </section>
  )
}
