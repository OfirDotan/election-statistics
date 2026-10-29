import fs from 'node:fs'
import { copyFallback, write } from './build.ts'
import { fetchAll } from './fetch.ts'
import { OFFICIAL } from './parse.ts'

// Always refresh from the live sites. data/raw keeps the last good download of each source,
// data/official_national.json the full official national result, and data/fallback the last
// dataset built from them — a dead site or a bad result falls back instead of failing the build.
const warn = (what: string) => console.warn(`data: ${what} — using the saved copy`)

/** `--save-official <file>`: store a pasted national results table, one `letters votes` pair per line */
function saveOfficial(file: string) {
  const out: Record<string, number> = {}
  for (const [, key, votes] of fs.readFileSync(file, 'utf8').matchAll(/^\s*(\S+)\s+([\d,]+)\s*$/gm)) out[key] = Number(votes.replaceAll(',', ''))
  if (!Object.keys(out).length) throw new Error(`${file}: no "letters votes" lines found`)
  fs.writeFileSync(OFFICIAL, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`official: ${Object.keys(out).length} lists, ${Object.values(out).reduce((s, n) => s + n, 0)} votes → ${OFFICIAL}`)
}

async function refresh() {
  try {
    await fetchAll()
  } catch (err) {
    warn(err instanceof Error ? err.message : String(err))
  }
  try {
    // write() validates before swapping the staging dir in, so bad data never replaces good
    // data and never overwrites the fallback
    const data = await write('public/data')
    console.log(
      `data: ${data.towns.length} towns, ${data.parties.length} parties, ${data.candidateList.length} candidates ` +
        `(results ${data.asOf.date} ${data.asOf.time})`,
    )
  } catch (err) {
    warn(`rebuild failed: ${err instanceof Error ? err.message : String(err)}`)
    const index = await copyFallback()
    console.log(`data: restored the fallback copy (${index.towns} towns, ${index.parties} parties)`)
  }
}

try {
  const at = process.argv.indexOf('--save-official')
  if (at > 0) saveOfficial(process.argv[at + 1])
  else await refresh()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
}
