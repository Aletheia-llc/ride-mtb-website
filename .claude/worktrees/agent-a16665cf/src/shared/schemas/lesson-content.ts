import { z } from 'zod'

export const tiptapNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(tiptapNodeSchema).optional(),
    marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() })).optional(),
    text: z.string().optional(),
  })
)

export const lessonContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema),
})
