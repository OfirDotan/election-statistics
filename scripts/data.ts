import fs from 'node:fs'
import { copyFallback, write } from './build.ts'
import { fetchAll } from './fetch.ts'
import { OFFICIAL, parseResults } from './parse.ts'

// Always refresh from the live sites. data/raw keeps the last good download of each source,
// data/official_national.json the full official national result, and data/fallback the last
// dataset built from them — a dead site or a bad result falls back instead of failing the build.
const warn = (what: string) => console.warn(`data: ${what} — using the saved copy`)

/** The highest count each source has shown, remembered between runs */
const WATERMARK = '.data-watermark.json'
const highWater = JSON.parse(fs.existsSync(WATERMARK) ? fs.readFileSync(WATERMARK, 'utf8') : '{}') as Record<string, number>

/** `--save-official <file>`: store a pasted national results table, one `letters votes` pair per line */
function saveOfficial(file: string) {
  const out: Record<string, number> = {}
  for (const [, key, votes] of fs.readFileSync(file, 'utf8').matchAll(/^\s*(\S+)\s+([\d,]+)\s*$/gm)) out[key] = Number(votes.replaceAll(',', ''))
  if (!Object.keys(out).length) throw new Error(`${file}: no "letters votes" lines found`)
  fs.writeFileSync(OFFICIAL, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`official: ${Object.keys(out).length} lists, ${Object.values(out).reduce((s, n) => s + n, 0)} votes → ${OFFICIAL}`)
}

async function refresh(noFetch: boolean) {
  if (!noFetch) {
    try {
      await fetchAll()
    } catch (err) {
      warn(err instanceof Error ? err.message : String(err))
    }
  }
  // A count cannot go down and the format does not change once counting ends: a source that drops
  // below its last good count is a broken download (reprojected map, vendor change), so stop here
  // and keep the saved copy and the fallback rather than rebuild from figures older than the fallback
  const kaplan = JSON.parse(fs.readFileSync('data/raw/kaplan_national.json', 'utf8')) as Record<string, number>
  const counted = { results: parseResults().head.voters, kaplan_national: Object.values(kaplan).reduce((s, n) => s + n, 0) }
  for (const [name, n] of Object.entries(counted)) {
    if (n < (highWater[name] ?? 0)) throw new Error(`refusing ${name === 'results' ? 'results.pbf' : name + '.json'}: ${n} is below the last good count ${highWater[name]}`)
  }
  try {
    // write() validates before swapping the staging dir in, so bad data never replaces good
    // data and never overwrites the fallback
    const data = await write('public/data')
    console.log(
      `data: ${data.towns.length} towns, ${data.parties.length} parties, ${data.candidateList.length} candidates ` +
        `(results ${data.asOf.date} ${data.asOf.time})`,
    )
    fs.writeFileSync(WATERMARK, JSON.stringify(counted))
  } catch (err) {
    warn(`rebuild failed: ${err instanceof Error ? err.message : String(err)}`)
    const index = await copyFallback()
    console.log(`data: restored the fallback copy (${index.towns} towns, ${index.parties} parties)`)
  }
}

try {
  const at = process.argv.indexOf('--save-official')
  if (at > 0) saveOfficial(process.argv[at + 1])
  // `--no-fetch`: rebuild from the snapshots already in data/raw
  else await refresh(process.argv.includes('--no-fetch'))
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
}
