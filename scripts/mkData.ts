import fs from 'node:fs/promises'
import type { MkProfile } from '../src/lib/types.ts'
import { photo } from './mks.ts'

const SOURCE = 'data/mks.json'
const OUT = 'public/assets/mks'
const WIDTH = 400

/**
 * `npm run mks`: copies every MK's Commons photo into public/assets/mks/<id>.jpg and points
 * `photo` at it, so the site never hotlinks Commons and the Pages build keeps the photos.
 * data/mks.json stays the source of truth; the Commons name is kept in `photoFile`.
 */
async function main() {
  const mks = JSON.parse(await fs.readFile(SOURCE, 'utf8')) as MkProfile[]
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(OUT, { recursive: true })
  let local = 0
  // One at a time: Commons throttles a burst of parallel downloads
  for (const mk of mks) {
    const bytes = mk.photoFile ? await photo(mk.photoFile, WIDTH) : null
    if (!bytes) continue
    await fs.writeFile(`${OUT}/${mk.id}.jpg`, bytes)
    mk.photo = `mks/${mk.id}.jpg`
    local++
  }
  // CRLF, as the file was written
  await fs.writeFile(SOURCE, JSON.stringify(mks, null, 2).replace(/\n/g, '\r\n') + '\r\n')
  console.log(`mks: ${local} of ${mks.length} profiles have a local photo in ${OUT}`)
}

await main()
