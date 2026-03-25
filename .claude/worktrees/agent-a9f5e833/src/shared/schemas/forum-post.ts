import { z } from 'zod'

export const forumThreadSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1).max(50_000),
  categoryId: z.string().cuid(),
})

export const forumPostSchema = z.object({
  content: z.string().min(1).max(50_000),
  threadId: z.string().cuid(),
})
