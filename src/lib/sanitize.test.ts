import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script><p>safe</p>')).toBe('<p>safe</p>')
  })

  it('allows permitted tags', () => {
    expect(sanitizeHtml('<p><strong>bold</strong></p>')).toBe('<p><strong>bold</strong></p>')
  })

  it('strips target attribute from links', () => {
    const input = '<a href="https://example.com" target="_blank">link</a>'
    const output = sanitizeHtml(input)
    expect(output).not.toContain('target=')
    expect(output).toContain('rel="noopener noreferrer"')
  })

  it('strips data attributes', () => {
    expect(sanitizeHtml('<p data-foo="bar">text</p>')).toBe('<p>text</p>')
  })
})
