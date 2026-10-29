import { write } from './build.ts'
import { fetchAll } from './fetch.ts'

try {
  if (!process.argv.includes('--no-fetch')) await fetchAll()
  // write() validates before swapping the staging dir in, so bad data never replaces good data
  const data = await write('public/data')
  console.log(
    `data: ${data.towns.length} towns, ${data.parties.length} parties, ${data.candidateList.length} candidates ` +
      `(results ${data.asOf.date} ${data.asOf.time})`,
  )
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
}
