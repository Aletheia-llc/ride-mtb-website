import { z } from 'zod'

export const learnQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  imageUrl: z.string().url().optional(),
  isCorrect: z.boolean(),
})

export const learnQuestionOptionsSchema = z.array(learnQuestionOptionSchema).min(2)
