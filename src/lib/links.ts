/** Party page URL: the English slug when the caller has the record, the ballot key otherwise */
export const partyUrl = (p: { key: string; slug?: string } | string) =>
  `/party/${typeof p === 'string' ? encodeURIComponent(p) : p.slug ?? encodeURIComponent(p.key)}`

/** The MK's own photo under public/assets/; undefined when there is none, so callers fall back to initials */
export const mkPhoto = (mk: { photo?: string } | undefined) =>
  mk?.photo ? `${import.meta.env.BASE_URL}assets/${mk.photo}` : undefined

export const mkUrl = (id: string) => `/mk/${encodeURIComponent(id)}`
