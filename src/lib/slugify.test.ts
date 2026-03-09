import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Best MTB Trails')).toBe('best-mtb-trails')
  })

  it('removes special characters', () => {
    expect(slugify("What's the best bike?")).toBe('whats-the-best-bike')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})
