/** `/mk/:id` key for a list slot, named after the person: `benjamin-netanyahu`. */
export function personId(c: { nameEn?: string; nameHe: string; party: string; position: number }) {
  const slug = (c.nameEn ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || `${c.party}-${c.position}`
}
