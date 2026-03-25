import 'server-only'
import { db } from '@/lib/db/client'
import type { Difficulty, LearnCategory, Tier } from '@/generated/prisma/client'
import { isBetterTier } from './scoring'

// ── Filters ──────────────────────────────────────────────────

export interface CourseFilters {
  category?: LearnCategory
  difficulty?: Difficulty
  search?: string
}

// ── 1. getCourses ────────────────────────────────────────────

export async function getCourses(filters?: CourseFilters) {
  return db.learnCourse.findMany({
    where: {
      status: 'published',
      ...(filters?.category && { category: filters.category }),
      ...(filters?.difficulty && { difficulty: filters.difficulty }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    },
    include: {
      modules: {
        where: { status: 'published' },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, youtubeVideoId: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

// ── 2. getCourseBySlug ───────────────────────────────────────

export async function getCourseBySlug(slug: string) {
  return db.learnCourse.findFirst({
    where: { slug, status: 'published' },
    include: {
      modules: {
        where: { status: 'published' },
        orderBy: { sortOrder: 'asc' },
        include: {
          quiz: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
            },
          },
        },
      },
    },
  })
}

// ── 3. getModuleBySlug ───────────────────────────────────────

export async function getModuleBySlug(courseSlug: string, moduleSlug: string) {
  const course = await db.learnCourse.findFirst({
    where: { slug: courseSlug, status: 'published' },
    select: { id: true },
  })
  if (!course) return null

  return db.learnModule.findFirst({
    where: {
      courseId: course.id,
      slug: moduleSlug,
      status: 'published',
    },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })
}

// ── 4. getQuizBySlug ─────────────────────────────────────────

export async function getQuizBySlug(slug: string) {
  return db.learnQuiz.findFirst({
    where: { slug, status: 'published' },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

// ── 5. getQuizById ───────────────────────────────────────────

export async function getQuizById(quizId: string) {
  return db.learnQuiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

// ── 6. submitQuizAttempt ─────────────────────────────────────

interface SubmitQuizAttemptInput {
  userId: string
  quizId: string
  score: number
  tier: Tier
  xpEarned: number
  answers: unknown
}

export async function submitQuizAttempt({
  userId,
  quizId,
  score,
  tier,
  xpEarned,
  answers,
}: SubmitQuizAttemptInput) {
  return db.$transaction(async (tx) => {
    const attempt = await tx.learnQuizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        tier,
        xpEarned,
        answers: answers as object,
        completedAt: new Date(),
      },
    })

    // Upsert progress — only update if the new tier is better
    const existing = await tx.learnProgress.findUnique({
      where: { userId_quizId: { userId, quizId } },
    })

    if (!existing) {
      await tx.learnProgress.create({
        data: { userId, quizId, bestTier: tier },
      })
    } else if (isBetterTier(tier, existing.bestTier)) {
      await tx.learnProgress.update({
        where: { id: existing.id },
        data: { bestTier: tier },
      })
    }

    return attempt
  })
}

// ── 7. getCourseProgress ─────────────────────────────────────

export async function getCourseProgress(userId: string, courseId: string) {
  const publishedModules = await db.learnModule.findMany({
    where: { courseId, status: 'published' },
    select: {
      id: true,
      quiz: {
        select: { id: true },
      },
    },
  })

  const totalModules = publishedModules.length

  // Get quiz IDs for modules that have quizzes
  const quizIds = publishedModules
    .map((m) => m.quiz?.id)
    .filter((id): id is string => id != null)

  // Count how many of those quizzes the user has passed
  const passedCount = await db.learnProgress.count({
    where: {
      userId,
      quizId: { in: quizIds },
      bestTier: { not: 'incomplete' },
    },
  })

  return {
    completedModules: passedCount,
    totalModules,
  }
}

// ── 8. getUserCertificates ───────────────────────────────────

export async function getUserCertificates(userId: string) {
  return db.learnCertificate.findMany({
    where: { userId },
    include: {
      course: {
        select: { title: true },
      },
    },
    orderBy: { issuedAt: 'desc' },
  })
}

// ── 9. checkCourseCompletion ─────────────────────────────────

export async function checkCourseCompletion(userId: string, courseId: string) {
  const publishedModules = await db.learnModule.findMany({
    where: { courseId, status: 'published' },
    select: {
      quiz: {
        select: { id: true },
      },
    },
  })

  const quizIds = publishedModules
    .map((m) => m.quiz?.id)
    .filter((id): id is string => id != null)

  if (quizIds.length === 0) {
    return { completed: false, bestTiers: [] as Tier[] }
  }

  const progressRecords = await db.learnProgress.findMany({
    where: {
      userId,
      quizId: { in: quizIds },
    },
    select: { quizId: true, bestTier: true },
  })

  const bestTiers = quizIds.map((qid) => {
    const record = progressRecords.find((p) => p.quizId === qid)
    return record?.bestTier ?? ('incomplete' as Tier)
  })

  const completed = bestTiers.every((t) => t !== 'incomplete')

  return { completed, bestTiers }
}

// ── 10. createCertificate ────────────────────────────────────

export async function createCertificate(
  userId: string,
  courseId: string,
  tier: Tier,
) {
  return db.learnCertificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, tier },
    update: { tier },
  })
}
