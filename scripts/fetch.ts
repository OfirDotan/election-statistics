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

export async function fetchAll(): Promise<void> {
  await fs.mkdir(RAW, { recursive: true })
  let failed = 0
  await Promise.all(
    Object.entries(SOURCES).map(async ([name, url]) => {
      // mapvotes.bechirot.gov.il rejects requests without a browser UA/Referer (403), incl. from GitHub runners
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://mapvotes.bechirot.gov.il/' },
      })
      if (!res.ok) {
        console.error(`fetch ${name}: HTTP ${res.status}`)
        failed++
        return
      }
      const file = path.join(RAW, `${name}.${EXT[name as keyof typeof SOURCES]}`)
      // Write beside the target and rename, so a torn download never replaces a good snapshot
      await fs.writeFile(`${file}.tmp`, Buffer.from(await res.arrayBuffer()))
      await fs.rename(`${file}.tmp`, file)
      console.log(`fetch ${name}: ok`)
    }),
  )
  if (failed) throw new Error(`${failed} source(s) failed to download`)
}
