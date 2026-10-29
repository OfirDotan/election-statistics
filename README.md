# 26th Knesset election statistics

An index of the Israeli 26th Knesset election (held 27 October 2026): every town's result, full-text
search, filters by party and leader, leaderboards for one-party towns and closest races, a town map,
and per-town detail down to polling-station turnout.

**The results shown are partial and unofficial.** They are compiled from third-party sources, not
published by the Central Elections Committee. Nothing here is an official result, and the pages that
simulate seat allocation or coalitions are illustrative only.

## License

Code is MIT (see [`LICENSE`](LICENSE)). The data and logos have their own terms, including
CC BY-SA 4.0 for the candidate data: see [`DATA-LICENSES.md`](DATA-LICENSES.md).

## Data sources

| Source | Feeds | Required? | Used for |
|---|---|---|---|
| [Kaplan Open Source](https://elections.kaplanopensource.co.il/26/) | `results.pbf`, `national_results.json`, `parties.json` | yes | Votes per town, national totals, party colors |
| [HuggingFace candidate lists](https://huggingface.co/datasets/danielrosehill/Israel-Election-2026-Candidate-Lists) | `candidates.csv`, `parties.csv` | yes | Candidates, leaders, incumbents |
| [GovMap / CEC](https://mapvotes.bechirot.gov.il/) | kalpi turnout, town geometry, party catalog | no | Per-station turnout, the map, Hebrew party names |

The GovMap feeds are optional because that host answers `403` to GitHub Actions runners. The build
warns and continues without them; local runs with an open network get everything.

Vote counts come from Kaplan's per-town records, but the **national totals** (`national_results.json`)
are the ones that matter for seat math: about 493,000 votes (8.7%) were cast in double envelopes and
are counted only nationally, never in any town.

### Attribution

- Candidate data: [Daniel Rosehill's Israel Election 2026 Candidate Lists](https://huggingface.co/datasets/danielrosehill/Israel-Election-2026-Candidate-Lists), CC BY-SA 4.0.
- Election results: Kaplan Open Source.
- Party logos: see [`src/assets/parties/CREDITS.md`](src/assets/parties/CREDITS.md). Two of them (Shas, Yisrael Beiteinu) are non-free fair-use images and are not currently shown in the UI.

## Getting started

Requires Node 24 or newer (the data script uses `--experimental-strip-types`).

```bash
npm install
npm run data    # fetch, parse, validate, write public/data/
npm run dev
```

`npm run data -- --no-fetch` rebuilds from snapshots already in `data/raw/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run data` | Full pipeline: fetch → parse → validate → write `public/data/` |
| `npm test` | Vitest, all files under `tests/` |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck plus production build into `dist/` |

## How the data pipeline works

```
scripts/fetch.ts    download 9 sources into data/raw/ (atomic: temp file then rename)
scripts/parse.ts    decode geobuf PBF, TopoJSON and CSV into plain records
scripts/build.ts    join on CBS locality code and ballot letter; write to public/data.staging
scripts/validate.ts invariants; the build only swaps staging into public/data after they hold
scripts/data.ts     orchestrates all of the above; non-zero exit on failure
```

The generated dataset (`public/data/`) and the raw snapshots (`data/raw/`) are **not committed**.
They are rebuilt by `npm run data`, which CI and the deploy both run.

Validation fails the build on: duplicate or out-of-range locality codes, voters above eligible,
valid plus invalid not matching voters, party votes exceeding valid votes, a kalpi belonging to an
unknown town, and malformed ballot letters in the candidate CSV. A failed build leaves the previous
dataset untouched.

## Project layout

```
scripts/     data pipeline (Node, TypeScript, no bundler)
src/lib/     pure logic: stats, town derivations, map scale, seat allocation, coalitions
src/components/  shared UI
src/pages/   routes
src/i18n/    Hebrew and English strings
tests/       Vitest suites mirroring src/
```

Routes: `/` home, `/towns` table and filters, `/town/:code` detail, `/parties`, `/leaderboards`,
`/map`. `/seats` and `/coalition` are placeholders.

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, lint, tests, the data pipeline and a build on every push
and pull request. `.github/workflows/deploy.yml` does the same on `main` and publishes to GitHub
Pages.
