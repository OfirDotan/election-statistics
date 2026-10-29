/** `/mk/:id` key for a list slot, named after the person: `benjamin-netanyahu`. */
export function personId(c: { nameEn?: string; nameHe: string; party: string; position: number }) {
  const slug = (c.nameEn ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || `${c.party}-${c.position}`
}

/** Reverse of personId: look the id up in the candidate list rather than parsing it */
export function findCandidate<T extends { id: string }>(candidates: T[], id: string): T | undefined {
  return candidates.find((c) => c.id === id)
}
