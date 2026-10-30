# locality-names.json

English locality names keyed by SETL_CODE (the same `code` as `public/data/towns.json`).

- Source: https://elections.kaplanopensource.co.il/knesset/data/localities.json — `{ "<code>": ["<English>", "<Arabic>"] }`, fetched 2026-10-30. The site states no license for this file.
- Cleaning: the English entry's U+0320 (combining underline, Kaplan's h̠) is dropped, `–` is replaced by `-`, and NFC normalization is applied. Only the English name is kept.
- Coverage: 1215 of 1224 towns. The 9 without a name are absent from Kaplan's file (its /locality/<code>/ pages also show them in Hebrew only): 1196 מחנה יתיר, 1339 אל-עזי, 1362 גבעות עדן, 3786 אובנת, 3815 תל ציון, 3825 מבואות יריחו, 3861 עשהאל, 3864 בית חוגלה, 3869 אביגיל. Code 1417 is `[null, null]` in Kaplan's file and is not in towns.json.
- Regenerate: fetch the URL above, keep `entry[0]` for every code in towns.json, clean as above, sort by numeric code, write 2-space-indented UTF-8 JSON.
