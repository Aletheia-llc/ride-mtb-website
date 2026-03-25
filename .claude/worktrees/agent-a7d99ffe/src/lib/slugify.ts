import 'server-only'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function uniqueSlug(
  text: string,
  existsCheck: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(text)
  if (!(await existsCheck(base))) return base

  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).substring(2, 6)
    const candidate = `${base}-${suffix}`
    if (!(await existsCheck(candidate))) return candidate
  }

  // Final fallback: timestamp + random to make collision astronomically unlikely
  const fallback = `${base}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`
  if (!(await existsCheck(fallback))) return fallback

  throw new Error(`Unable to generate unique slug for "${text}" after exhausting attempts`)
}
