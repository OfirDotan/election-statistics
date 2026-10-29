/** Party page URL: the English slug when the caller has the record, the ballot key otherwise */
export const partyUrl = (p: { key: string; slug?: string } | string) =>
  `/party/${typeof p === 'string' ? encodeURIComponent(p) : p.slug ?? encodeURIComponent(p.key)}`

/** Wikimedia Commons file name at a width; undefined when the MK has no photo, so callers fall back to initials */
export const mkPhoto = (mk: { photo?: string } | undefined, width: number) =>
  mk?.photo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(mk.photo)}?width=${width}` : undefined

export const mkUrl = (id: string) => `/mk/${encodeURIComponent(id)}`
