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

  const suffix = Math.random().toString(36).substring(2, 6)
  const candidate = `${base}-${suffix}`
  if (!(await existsCheck(candidate))) return candidate

  return `${base}-${Date.now().toString(36)}`
}
