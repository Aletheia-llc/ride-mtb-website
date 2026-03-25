import { describe, it, expect } from 'vitest'
import { forumThreadSchema, forumPostSchema } from './forum-post'

describe('forumThreadSchema', () => {
  it('validates a valid thread', () => {
    const result = forumThreadSchema.safeParse({
      title: 'Help with jumps',
      content: 'How do I get better at jumping?',
      categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    expect(result.success).toBe(true)
  })

  it('rejects title under 3 chars', () => {
    const result = forumThreadSchema.safeParse({
      title: 'Hi',
      content: 'Content here',
      categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    expect(result.success).toBe(false)
  })
})

describe('forumPostSchema', () => {
  it('validates a valid post (no title)', () => {
    const result = forumPostSchema.safeParse({
      content: 'Great advice, thanks!',
      threadId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty content', () => {
    const result = forumPostSchema.safeParse({
      content: '',
      threadId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    })
    expect(result.success).toBe(false)
  })
})
