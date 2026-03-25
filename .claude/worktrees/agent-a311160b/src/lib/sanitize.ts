import 'server-only'
import DOMPurify from 'isomorphic-dompurify'
import { ALLOWED_TAGS, ALLOWED_ATTR } from '@/shared/constants/sanitize'

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })

  // Force rel="noopener noreferrer" on all links for security
  return clean.replace(/<a /g, '<a rel="noopener noreferrer" ')
}
