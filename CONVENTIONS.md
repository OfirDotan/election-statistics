# Code conventions

How this repo is written. They describe what the code already does, so follow them for new work and
change both together if a rule stops fitting.

## Ground rules

- **Delete before you add.** A helper, component or key that nothing uses is a bug. Before adding a
  new one, check the existing files below for something that already does the job.
- **Checks before every commit:** `npx tsc -b`, `npx eslint . --quiet`, `npx vitest run`,
  `npx vite build`. All four clean.
- **No new dependencies** for what the platform or an installed package already does.
- **Derive, don't store.** Figures (shares, margins, ranks, national totals) are computed from the
  raw data on render or in a `useMemo`; nothing derived is written into `public/data`.

## Layout

| Path | Holds |
|---|---|
| `src/pages/` | One component per route. Owns the page's state and data wiring; markup is `section.page > header.page-head` then the content |
| `src/components/` | Reusable, data-in/props-out views. No data loading inside them except `MapView` |
| `src/lib/` | Pure logic and hooks. No JSX. Each file has a single job (`fmt`, `derive`, `stats`, `prefs`, …) |
| `src/i18n/` | Strings (`en.ts`, `he.ts`, `ctx.ts`), the provider, and `useI18n` |
| `scripts/` | Build-time data pipeline (`npm run data`, `npm run mks`). Node only, never bundled |
| `tests/` | Vitest, mirroring the source path it tests (`tests/lib/derive.test.ts`) |
| `public/` | Files served at the site root: `data/`, `assets/`, the two favicons |

## TypeScript

- Strict; no `any`. Use `unknown` plus a narrowing check at the boundary.
- **Import with the `.ts` / `.tsx` extension** — `import { fmtPct } from '../lib/fmt.ts'`. This is
  required by `allowImportingTsExtensions`.
- `import type { … }` for types.
- Prefer `interface` for object shapes that cross a module (e.g. `TownRow`), `type` for unions and
  aliases.
- Export only what other modules use. A non-exported helper stays local to its file.
- No default exports. Named exports only, so the import and the definition read the same.
- Data types live in `src/lib/types.ts`; a type used by one module stays in it.

## React

- Function components, plain functions, one per file, named after the file (`TownTable.tsx` →
  `TownTable`).
- Props are destructured in the parameter list and typed inline on the parameter, not with a separate
  `Props` interface, unless the list is long enough to hurt:
  `export function ColHelp({ text }: { text: string }) { … }`.
- Hooks at the top of the component, always called unconditionally.
- Derived lists are wrapped in `useMemo` with the full dependency list; anything the linter can decide
  is left to it (no manual `useCallback` for handlers).
- Lookups that need the language come from `useDataset()`; the language itself from `useI18n()`.
- Persisted preferences go through `src/lib/prefs.ts` and are read with the matching hook
  (`useInfo()`), which listens for `PREFS_EVENT` so an open page updates without a reload. Never read
  `localStorage` in a component.
- Loading and error states are the shared `Loading` / `LoadError` from `components/ui.tsx` — never a
  bespoke message.

## Naming and style

- Files: `PascalCase.tsx` for components and pages, `camelCase.ts` for everything else.
- Variables and functions `camelCase`; types `PascalCase`; constants that never change `SCREAMING_SNAKE`
  (`MIN_VALID`, `TAU`).
- Event handlers read `onX` as props, `handleX` nowhere — inline arrow functions are the norm.
- Abbreviations the codebase already uses: `t` (translate), `ln` (pick a language's literal), `dir`
  (sort direction 1 | -1), `f` (town filters), `d { … }` in template strings.
- Early return over nested `if`. `===` always; `??` over `||` when the left can be `0` or `''`.
  Object literals in expressions use `Object.fromEntries` / `Object.hasOwn` rather than loops with
  `delete`.
- Sort comparators end with `|| a.code - b.code` so ties are stable.

## CSS (`src/index.css`, the only stylesheet)

- One stylesheet, plain CSS, no modules, no preprocessor, no Tailwind.
- **Logical properties only** — `inline-size`, `margin-inline`, `inset-inline-start`, `padding-block`.
  The site renders both LTR and RTL from one rule set; a physical `left`/`right`/`margin-top` is a bug
  unless it is deliberately pinned (the seat grid sets `direction: ltr` and says so).
- **Design tokens** from `:root` — `var(--surface)`, `var(--text)`, `var(--hairline)`, `var(--radius)`,
  `var(--ease)`. A raw hex is allowed only inside the theme token blocks or for data colours (party
  colours, turnout bands).
- Both themes: every colour that changes uses a token that `[data-theme='dark']` redefines.
- Class names are lowercase, hyphenated, and grouped by page or component (`.towns-bar`,
  `.board-charts`, `.chart-card`). State classes are `is-` prefixed (`.is-empty`, `.is-dim`).
- Breakpoints, in this order only: `@media (max-width: 420px)`, `(max-width: 600px)`,
  `(max-width: 900px)`, `(min-width: 901px)`. Mobile-first layouts are written in the base rule and
  widened with `min-width`.
- Tables on phones scroll sideways inside `.table-wrap`; the page itself never scrolls horizontally.
- Motion goes through `var(--ease)` and is disabled by the existing `prefers-reduced-motion` block.
- Every rule you add must be used by a class in a `.tsx`. Delete a rule with the markup that used it.

## Text and i18n

- **Every user-visible string is a key** in `src/i18n/en.ts` and `src/i18n/he.ts`. Both files have the
  same keys; `en` is typed against `he`, so a missing English key fails the build.
- Hebrew is the source of truth for the key list; English is a full translation, not a fallback.
- Some keys are only ever built at runtime: `map_${mode}` in `MapView`, `bloc_${id}` from `blocs.ts`,
  and the board labels and rank columns indexed in `TownTable` / `LeaderboardsPage`. They live at the
  end of both dictionaries; a plain grep will call them unused, so check the lookup before deleting one.
- Names in code are English; names on screen come from the dictionary.
- Numbers: `fmtInt` / `fmtPct` (Latin digits in both languages). Map place names use the `place_'…'`
  keys, resolved by `townNames.ts`.
- Copy is plain, says what happens, and carries no exclamation marks. Notes that qualify data (partial,
  illustrative) stay on the page that shows it.

## Data pipeline

- `scripts/data.ts` fetches each source, falls back to the committed snapshot in `data/raw/`, validates,
  and writes `public/data/*.json`. A source that answers `403` (GovMap on Actions) warns and continues.
- Never hand-edit `public/data/`. Change the script and run `npm run data`.
- Each script file exports small pure steps (`parse*`, `validate*`) so `tests/scripts/` can test them
  without the network.

## Tests

- Vitest, `tests/<same path>.test.ts(x)`. Pure functions and hooks' logic get unit tests; components are
  exercised in the browser against the dev server instead of with a DOM-testing library.
- One `describe` per exported function; test names describe the behaviour, not the function
  ("keeps a town's closest race when a party won no vote there").
- Fixtures are built with small local factories at the top of the file (`const town = (…) => …`).

## Git

- Conventional commits: `feat: …`, `fix: …`, `chore: …`. Subject in the imperative, lower case, no
  trailing full stop.
- One logical change per commit. Every commit builds and passes the checks.
- Deploying is `git push origin HEAD:main`; the Pages workflow runs the checks again.
