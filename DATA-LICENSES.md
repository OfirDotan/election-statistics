# Data and asset licenses

The MIT license in [`LICENSE`](LICENSE) covers **this project's code only**. The data and images
below belong to their own sources and keep their own terms.

## Election results and turnout

- **Kaplan Open Source** — https://elections.kaplanopensource.co.il/26/
  Source of per-town votes, national totals and party metadata. No explicit license is published
  on the site; it is treated here as a third-party source, used with attribution and without
  redistribution guarantees. Check with the authors before reusing the data commercially.
- **GovMap / Central Elections Committee** — https://mapvotes.bechirot.gov.il/
  Source of per-polling-station turnout, town boundaries and the party catalog. Government data,
  used with attribution.

Raw snapshots and the built dataset are **not redistributed** in this repository. `npm run data`
downloads them from the sources above at build time.

## Candidates

- **[Israel Election 2026 Candidate Lists](https://huggingface.co/datasets/danielrosehill/Israel-Election-2026-Candidate-Lists)**
  by Daniel Rosehill — **CC BY-SA 4.0**. Candidate names, list positions, party leaders and
  incumbency are derived from this dataset. Share-alike applies: any redistribution of this data
  must carry the same license and credit.

## Party logos

See [`src/assets/parties/CREDITS.md`](src/assets/parties/CREDITS.md) for the per-file table.

Most logos are public-domain text logos from Wikimedia Commons. Two are **not free**:

- `shas.svg`: fair-use image from English Wikipedia
- `israel_beiteinu.svg`: fair-use image from English Wikipedia

Neither is displayed in the UI. If you enable them, or redistribute this repository, replace them
with free alternatives first.
