import fs from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

/** Converted photos, so a re-run reuses them instead of asking Wikimedia again; heic-only ones prove HEIC decodes */
const CACHE = 'data/raw/mk-photos'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The Commons file at `width`, as JPEG whatever Commons serves (sharp re-encodes HEIC, WebP and PNG).
 * Retries a few times: Commons rate-limits bursts. Null if it still fails, and the page shows initials.
 */
export async function photo(file: string, width: number): Promise<Buffer | null> {
  const cached = `${CACHE}/${encodeURIComponent(file)}.${width}.jpg`
  if (fs.existsSync(cached)) return readFile(cached)
  let error = ''
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`, {
        headers: { 'User-Agent': 'election-statistics/1.0 (https://github.com/; MK profile photos)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().flatten({ background: '#fff' }).jpeg({ quality: 80 }).toBuffer()
      await mkdir(CACHE, { recursive: true })
      await writeFile(cached, jpeg)
      return jpeg
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      await sleep(1000 * i)
    }
  }
  console.warn(`warn ${file}: ${error} — initials instead`)
  return null
}
