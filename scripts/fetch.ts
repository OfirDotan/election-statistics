import fs from 'node:fs/promises'
import path from 'node:path'

const RAW = 'data/raw'

export const SOURCES = {
  kalpi: 'https://mapvotes.bechirot.gov.il/data/votes/latest/kalpi_data.json',
  municipal: 'https://mapvotes.bechirot.gov.il/data/votes/latest/municipal_data.json',
  geometry: 'https://mapvotes.bechirot.gov.il/data/votes/latest/municipal_geometry.topojson',
  elections: 'https://mapvotes.bechirot.gov.il/data/votes/elections.json',
  kaplan_parties: 'https://elections.kaplanopensource.co.il/26/data/parties.json',
  kaplan_national: 'https://elections.kaplanopensource.co.il/26/data/national_results.json',
  results: 'https://elections.kaplanopensource.co.il/26/data/results.pbf',
  candidates:
    'https://huggingface.co/datasets/danielrosehill/Israel-Election-2026-Candidate-Lists/resolve/main/candidates.csv',
  candidate_parties:
    'https://huggingface.co/datasets/danielrosehill/Israel-Election-2026-Candidate-Lists/resolve/main/parties.csv',
}

const EXT: Record<keyof typeof SOURCES, string> = {
  kalpi: 'json',
  municipal: 'json',
  geometry: 'topojson',
  elections: 'json',
  kaplan_parties: 'json',
  kaplan_national: 'json',
  results: 'pbf',
  candidates: 'csv',
  candidate_parties: 'csv',
}

/**
 * Refreshes `data/raw` from the live sites. Every download lands in a temp file first, so a failed
 * or torn fetch leaves the last good snapshot in place — that copy is the fallback the site builds from.
 */
export async function fetchAll(): Promise<void> {
  await fs.mkdir(RAW, { recursive: true })
  const warnings: string[] = []
  await Promise.all(
    Object.entries(SOURCES).map(async ([name, url]) => {
      const file = path.join(RAW, `${name}.${EXT[name as keyof typeof SOURCES]}`)
      // mapvotes.bechirot.gov.il rejects requests without a browser UA/Referer (403)
      let error: string
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://mapvotes.bechirot.gov.il/' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = Buffer.from(await res.arrayBuffer())
        if (!body.length) throw new Error('empty body')
        await fs.writeFile(`${file}.tmp`, body)
        await fs.rename(`${file}.tmp`, file)
        console.log(`fetch ${name}: ok`)
        return
      } catch (err) {
        error = err instanceof Error ? err.message : String(err)
      }
      try {
        await fs.access(file)
        warnings.push(`${name}: ${error} — kept the saved copy from ${(await fs.stat(file)).mtime.toISOString().slice(0, 16).replace('T', ' ')}`)
      } catch {
        // No saved copy and the network failed: nothing to fall back on
        if (name.startsWith('kaplan') || name === 'results') throw new Error(`fetch ${name}: ${error}, and no saved copy to fall back on`)
        warnings.push(`${name}: ${error} — no saved copy, this part of the site stays empty`)
      }
    }),
  )
  for (const w of warnings) console.warn(`warn fetch ${w}`)
}
