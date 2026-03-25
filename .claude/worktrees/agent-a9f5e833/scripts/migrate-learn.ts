#!/usr/bin/env npx tsx
// ── Learn Content Migration Script ──────────────────────────
// Migrates ALL learn content from the standalone Docker PostgreSQL DB
// into the monolith's Supabase DB via Prisma.
//
// Source: postgresql://postgres:postgres@localhost:5434/ridemtb_learn
// Target: Monolith Supabase (DATABASE_URL in .env.local)
//
// Usage: npx tsx scripts/migrate-learn.ts

import { config } from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

config({ path: '.env.local' })

// ── Source DB (Docker standalone) ───────────────────────────

const sourcePool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/ridemtb_learn',
})

// ── Target DB (Monolith Supabase via Prisma) ─────────────────

function createTargetDb(): PrismaClient {
  const host = process.env.DATABASE_HOST
  const port = Number(process.env.DATABASE_PORT ?? '5432')
  const user = process.env.DATABASE_USER
  const password = process.env.DATABASE_PASSWORD
  if (!host || !user || !password) {
    console.error('Error: DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD must be set in .env.local')
    process.exit(1)
  }
  const pool = new Pool({ host, port, user, password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 2 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// ── Source row types ─────────────────────────────────────────

interface SourceCourse {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnail_url: string | null
  difficulty: string
  category: string
  sort_order: number
  status: string
  sponsor_id: string | null
  created_at: Date
  updated_at: Date
}

interface SourceModule {
  id: string
  course_id: string
  slug: string
  title: string
  sort_order: number
  lesson_content: object | null
  youtube_video_id: string | null
  status: string
  created_at: Date
  updated_at: Date
}

interface SourceQuiz {
  id: string
  module_id: string | null
  slug: string
  title: string
  description: string | null
  difficulty: string
  category: string
  status: string
  created_at: Date
  updated_at: Date
}

interface SourceQuestion {
  id: string
  quiz_id: string
  sort_order: number
  type: string
  prompt: string
  prompt_image_url: string | null
  options: object
  explanation: string
  interactive_config: object | null
  created_at: Date
  updated_at: Date
}

// ── Enum mappers ─────────────────────────────────────────────
// Source and target enums match exactly, but we cast to be safe.

type ContentStatus = 'draft' | 'published' | 'archived'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type LearnCategory = 'riding_skills' | 'maintenance' | 'fitness' | 'etiquette' | 'nutrition' | 'gear'
type QuestionType = 'multiple_choice' | 'true_false' | 'image_based' | 'drag_drop' | 'diagram_match' | 'hotspot'

function mapStatus(s: string): ContentStatus {
  if (s === 'published' || s === 'draft' || s === 'archived') return s
  console.warn(`  Unknown status "${s}", defaulting to "draft"`)
  return 'draft'
}

function mapDifficulty(d: string): Difficulty {
  if (d === 'beginner' || d === 'intermediate' || d === 'advanced') return d
  console.warn(`  Unknown difficulty "${d}", defaulting to "beginner"`)
  return 'beginner'
}

function mapCategory(c: string): LearnCategory {
  const valid: LearnCategory[] = ['riding_skills', 'maintenance', 'fitness', 'etiquette', 'nutrition', 'gear']
  if (valid.includes(c as LearnCategory)) return c as LearnCategory
  console.warn(`  Unknown category "${c}", defaulting to "riding_skills"`)
  return 'riding_skills'
}

function mapQuestionType(t: string): QuestionType {
  const valid: QuestionType[] = ['multiple_choice', 'true_false', 'image_based', 'drag_drop', 'diagram_match', 'hotspot']
  if (valid.includes(t as QuestionType)) return t as QuestionType
  console.warn(`  Unknown question type "${t}", defaulting to "multiple_choice"`)
  return 'multiple_choice'
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('=== Ride MTB Learn Content Migration ===\n')

  const db = createTargetDb()

  // 1. Read all source data
  console.log('Reading source data from Docker DB (port 5434)...')

  const { rows: courses } = await sourcePool.query<SourceCourse>(
    'SELECT * FROM courses ORDER BY sort_order ASC, created_at ASC'
  )
  console.log(`  courses:   ${courses.length}`)

  const { rows: modules } = await sourcePool.query<SourceModule>(
    'SELECT * FROM modules ORDER BY sort_order ASC, created_at ASC'
  )
  console.log(`  modules:   ${modules.length}`)

  const { rows: quizzes } = await sourcePool.query<SourceQuiz>(
    'SELECT * FROM quizzes ORDER BY created_at ASC'
  )
  console.log(`  quizzes:   ${quizzes.length}`)

  const { rows: questions } = await sourcePool.query<SourceQuestion>(
    'SELECT * FROM questions ORDER BY sort_order ASC, created_at ASC'
  )
  console.log(`  questions: ${questions.length}`)

  // 2. Delete existing learn data in reverse dependency order
  console.log('\nClearing existing learn data from Supabase...')

  const deletedQuestions = await db.learnQuestion.deleteMany({})
  console.log(`  Deleted ${deletedQuestions.count} LearnQuestion(s)`)

  const deletedQuizzes = await db.learnQuiz.deleteMany({})
  console.log(`  Deleted ${deletedQuizzes.count} LearnQuiz(es)`)

  const deletedModules = await db.learnModule.deleteMany({})
  console.log(`  Deleted ${deletedModules.count} LearnModule(s)`)

  const deletedCourses = await db.learnCourse.deleteMany({})
  console.log(`  Deleted ${deletedCourses.count} LearnCourse(s)`)

  // 3. Insert courses
  console.log('\nInserting courses...')
  let courseCount = 0
  for (const c of courses) {
    await db.learnCourse.create({
      data: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description ?? undefined,
        thumbnailUrl: c.thumbnail_url ?? undefined,
        difficulty: mapDifficulty(c.difficulty),
        category: mapCategory(c.category),
        sortOrder: c.sort_order,
        status: mapStatus(c.status),
        // sponsor_id is skipped — no sponsor model in monolith
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    })
    courseCount++
    process.stdout.write(`\r  ${courseCount}/${courses.length}`)
  }
  console.log(`\r  Inserted ${courseCount} course(s)`)

  // 4. Insert modules
  console.log('\nInserting modules...')
  let moduleCount = 0
  for (const m of modules) {
    await db.learnModule.create({
      data: {
        id: m.id,
        courseId: m.course_id,
        slug: m.slug,
        title: m.title,
        sortOrder: m.sort_order,
        lessonContent: m.lesson_content ?? undefined,
        youtubeVideoId: m.youtube_video_id ?? undefined,
        status: mapStatus(m.status),
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      },
    })
    moduleCount++
    process.stdout.write(`\r  ${moduleCount}/${modules.length}`)
  }
  console.log(`\r  Inserted ${moduleCount} module(s)`)

  // 5. Insert quizzes
  console.log('\nInserting quizzes...')
  let quizCount = 0
  for (const q of quizzes) {
    await db.learnQuiz.create({
      data: {
        id: q.id,
        moduleId: q.module_id ?? undefined,
        slug: q.slug,
        title: q.title,
        description: q.description ?? undefined,
        difficulty: mapDifficulty(q.difficulty),
        category: mapCategory(q.category),
        status: mapStatus(q.status),
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      },
    })
    quizCount++
    process.stdout.write(`\r  ${quizCount}/${quizzes.length}`)
  }
  console.log(`\r  Inserted ${quizCount} quiz(es)`)

  // 6. Insert questions
  console.log('\nInserting questions...')
  let questionCount = 0
  for (const q of questions) {
    await db.learnQuestion.create({
      data: {
        id: q.id,
        quizId: q.quiz_id,
        sortOrder: q.sort_order,
        type: mapQuestionType(q.type),
        prompt: q.prompt,
        promptImageUrl: q.prompt_image_url ?? undefined,
        options: q.options,
        explanation: q.explanation ?? undefined,
        interactiveConfig: q.interactive_config ?? undefined,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      },
    })
    questionCount++
    process.stdout.write(`\r  ${questionCount}/${questions.length}`)
  }
  console.log(`\r  Inserted ${questionCount} question(s)`)

  // 7. Summary
  console.log('\n=== Migration Complete ===')
  console.log(`  Courses:   ${courseCount}`)
  console.log(`  Modules:   ${moduleCount}`)
  console.log(`  Quizzes:   ${quizCount}`)
  console.log(`  Questions: ${questionCount}`)

  await sourcePool.end()
  await db.$disconnect()
}

main().catch((err) => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
