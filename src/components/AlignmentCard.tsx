import { useI18n } from '../i18n/useI18n.ts'
import { DILEMMAS, SOURCES, STANCES } from '../lib/alignments.ts'

const sourceUrl = (source: string) => (source.startsWith('https://') ? source : SOURCES.find((s) => s.id === source)?.url)

/** Camp note, one block per dilemma (bar between the two labelled poles), then the sources once at the bottom. */
export function AlignmentCard({ partyKey }: { partyKey: string }) {
  const { t, ln } = useI18n()
  const entry = STANCES[partyKey]
  if (!entry) return null
  const cited = [
    ...new Set(DILEMMAS.flatMap((d) => (entry.stances[d.key] ? [sourceUrl(entry.stances[d.key].source)!] : []))),
  ]
  return (
    <section className="card" aria-labelledby="alignment">
      <h2 id="alignment">{t('alignment')}</h2>
      <p className="align-camp">{ln(entry.campNoteHe, entry.campNoteEn)}</p>
      <ul className="dilemmas">
        {DILEMMAS.filter((d) => entry.stances[d.key]).map((d) => {
          const s = entry.stances[d.key]
          const left = ln(d.leftHe, d.leftEn)
          const right = ln(d.rightHe, d.rightEn)
          return (
            <li key={d.key} className="dilemma">
              <h3>{ln(d.he, d.en)}</h3>
              {/* RTL: the "right" pole sits on the right; a left-to-right bar puts 100 on the right in both languages */}
              <div
                className="dilemma-axis"
                role="img"
                aria-label={`${ln(d.he, d.en)}: ${left} – ${right}, ${s.score}/100`}
                aria-description={s.basis}
                title={s.basis}
              >
                <span className="dilemma-poles" aria-hidden="true">
                  <span>{left}</span>
                  <span>{right}</span>
                </span>
                <span className="axis">
                  <span className="axis-mid" />
                  <span className="axis-mark" style={{ left: `${s.score}%` }} />
                </span>
              </div>
              <p className="dilemma-basis">{s.basis}</p>
            </li>
          )
        })}
      </ul>
      {cited.length > 0 && (
        <details className="align-sources">
          <summary>{t('sources')}</summary>
          <ol>
            {cited.map((href) => {
              const label = SOURCES.find((s) => s.url === href)?.label ?? href
              return (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                </li>
              )
            })}
          </ol>
        </details>
      )}
    </section>
  )
}
