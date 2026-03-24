#!/usr/bin/env npx tsx
// scripts/generate-quiz-questions.ts
//
// AI-generates 5 questions per quiz (3 multiple_choice + 2 true_false)
// for all quizzes that currently have 0 questions.
//
// Usage:
//   npx tsx scripts/generate-quiz-questions.ts
//   (requires ANTHROPIC_API_KEY in .env.local)

import { config } from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import Anthropic from '@anthropic-ai/sdk'

config({ path: '.env.local' })

// ── DB ───────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
  max: 2,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

// ── Claude ───────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tiptap JSON → plain text ──────────────────────────────────

function tiptapToText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const parts: string[] = []

  function walk(node: Record<string, unknown>) {
    if (node.type === 'text') {
      parts.push((node.text as string) ?? '')
      return
    }
    const children = node.content as Record<string, unknown>[] | undefined
    if (children) {
      for (const child of children) walk(child)
    }
    const blockTypes = ['paragraph', 'heading', 'listItem', 'blockquote', 'bulletList', 'orderedList']
    if (blockTypes.includes(node.type as string)) {
      parts.push('\n')
    }
  }

  walk(content as Record<string, unknown>)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

// ── Types ────────────────────────────────────────────────────

interface GeneratedOption {
  id: string
  text: string
  isCorrect: boolean
}

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false'
  prompt: string
  options: GeneratedOption[]
  explanation: string
}

// ── Call Claude to generate questions ────────────────────────

async function generateQuestions(
  quizTitle: string,
  lessonText: string
): Promise<GeneratedQuestion[]> {
  const system = `You are an expert mountain bike coach creating quiz questions for an online education platform.

Generate exactly 8 quiz questions based on the provided lesson content:
- 5 "multiple_choice" questions, each with exactly 4 options (exactly 1 correct)
- 3 "true_false" questions, each with exactly 2 options (True/False, exactly 1 correct)

Return ONLY a valid JSON object with this exact structure — no markdown fences, no extra text:
{
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "Clear question text ending in a question mark?",
      "options": [
        { "id": "a", "text": "Option A text", "isCorrect": false },
        { "id": "b", "text": "Option B text", "isCorrect": true },
        { "id": "c", "text": "Option C text", "isCorrect": false },
        { "id": "d", "text": "Option D text", "isCorrect": false }
      ],
      "explanation": "Brief explanation of why the correct answer is right, referencing the lesson."
    },
    {
      "type": "true_false",
      "prompt": "A clear statement about the lesson content (not a question).",
      "options": [
        { "id": "true", "text": "True", "isCorrect": true },
        { "id": "false", "text": "False", "isCorrect": false }
      ],
      "explanation": "Why this statement is true/false."
    }
  ]
}

Guidelines:
- All questions must be directly based on the lesson content — nothing external
- Multiple choice distractors should be plausible but clearly wrong per the lesson
- True/false prompts should be factual statements, not questions
- Keep prompts concise (1-2 sentences max)
- Explanations should be helpful and reference specific lesson details`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system,
    messages: [
      {
        role: 'user',
        content: `Quiz title: "${quizTitle}"\n\nLesson content:\n${lessonText.slice(0, 6000)}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text block')
  }

  let raw = textBlock.text.trim()

  // Strip markdown fences if Claude added them despite instructions
  raw = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  try {
    const parsed = JSON.parse(raw) as { questions: GeneratedQuestion[] }
    return parsed.questions
  } catch {
    // Last-ditch: extract the JSON object
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as { questions: GeneratedQuestion[] }
      return parsed.questions
    }
    throw new Error(`Could not parse JSON from response:\n${raw.slice(0, 300)}`)
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set. Add it to .env.local and retry.')
    process.exit(1)
  }

  console.log('Fetching quizzes from DB...\n')

  const quizzes = await db.learnQuiz.findMany({
    include: {
      module: { select: { title: true, lessonContent: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const toProcess = quizzes.filter((q) => q._count.questions === 0 && q.module?.lessonContent)
  const skipped = quizzes.length - toProcess.length

  console.log(`Total quizzes: ${quizzes.length}`)
  console.log(`Already have questions / no content: ${skipped}`)
  console.log(`Will generate for: ${toProcess.length}\n`)

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < toProcess.length; i++) {
    const quiz = toProcess[i]
    const prefix = `[${i + 1}/${toProcess.length}]`
    process.stdout.write(`${prefix} "${quiz.title}"... `)

    const lessonText = tiptapToText(quiz.module!.lessonContent)
    if (!lessonText || lessonText.length < 50) {
      console.log('⏭  skipped (content too short)')
      continue
    }

    try {
      const questions = await generateQuestions(quiz.title, lessonText)

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Empty questions array returned')
      }

      await db.learnQuestion.createMany({
        data: questions.map((q, idx) => ({
          quizId: quiz.id,
          sortOrder: idx + 1,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          explanation: q.explanation ?? null,
        })),
      })

      console.log(`✓  ${questions.length} questions`)
      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗  ${msg.slice(0, 80)}`)
      errors.push(`"${quiz.title}": ${msg}`)
      failed++
    }

    // Respect rate limits — 500ms between requests
    if (i < toProcess.length - 1) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log('\n─────────────────────────────────────')
  console.log(`✓  ${success} quizzes populated`)
  if (failed > 0) {
    console.log(`✗  ${failed} failed:`)
    for (const e of errors) console.log(`   • ${e}`)
  }
  console.log('─────────────────────────────────────')

  await db.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
