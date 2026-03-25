import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, CheckCircle, Circle, PlayCircle, ArrowLeft } from 'lucide-react'
import { DifficultyBadge, CategoryBadge, TierBadge } from '@/modules/learn'
import { Card, ProgressBar } from '@/ui/components'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { getCourseBySlug, getCourseProgress } from '@/modules/learn/lib/queries'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseBySlug(slug)
  if (!course) return { title: 'Course Not Found | Ride MTB Learn' }

  return {
    title: `${course.title} | Ride MTB Learn`,
    description: course.description || `Learn ${course.title} with Ride MTB.`,
    openGraph: {
      title: course.title,
      description: course.description || undefined,
    },
  }
}

export default async function CourseOverviewPage({ params }: PageProps) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)
  if (!course) notFound()

  const session = await auth()

  // Get user progress for this course
  let progress: { completedModules: number; totalModules: number } | null = null
  let moduleProgress: Record<string, string> = {} // quizId -> bestTier

  if (session?.user?.id) {
    progress = await getCourseProgress(session.user.id, course.id)

    // Get per-module progress (which quizzes have been passed)
    const quizIds = course.modules
      .map((m) => m.quiz?.id)
      .filter((id): id is string => id != null)

    if (quizIds.length > 0) {
      const progressRecords = await db.learnProgress.findMany({
        where: {
          userId: session.user.id,
          quizId: { in: quizIds },
        },
        select: { quizId: true, bestTier: true },
      })
      moduleProgress = Object.fromEntries(
        progressRecords.map((p) => [p.quizId, p.bestTier]),
      )
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/learn" className="hover:text-[var(--color-primary)]">
          Learn
        </Link>
        <span>/</span>
        <Link href="/learn/courses" className="hover:text-[var(--color-primary)]">
          Courses
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{course.title}</span>
      </nav>

      {/* Course header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
          <CategoryBadge category={course.category} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">{course.title}</h1>
        {course.description && (
          <p className="mb-4 text-lg text-[var(--color-text-muted)]">{course.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.totalModules > 0 && (
        <div className="mb-8">
          <ProgressBar
            value={progress.completedModules}
            max={progress.totalModules}
            label={`${progress.completedModules} of ${progress.totalModules} modules complete`}
          />
        </div>
      )}

      {/* Module list */}
      <div className="space-y-3">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text)]">Modules</h2>
        {course.modules.map((mod, index) => {
          const quizId = mod.quiz?.id
          const bestTier = quizId ? moduleProgress[quizId] : undefined
          const isCompleted = bestTier && bestTier !== 'incomplete'

          return (
            <Link
              key={mod.slug}
              href={`/learn/courses/${course.slug}/${mod.slug}`}
              className="block"
            >
              <Card className="flex items-center gap-4 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">
                      Module {index + 1}
                    </span>
                    {bestTier && bestTier !== 'incomplete' && (
                      <TierBadge tier={bestTier} />
                    )}
                  </div>
                  <h3 className="truncate font-medium text-[var(--color-text)]">{mod.title}</h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {mod.quiz && (
                    <span className="text-xs text-[var(--color-text-muted)]">Has quiz</span>
                  )}
                  <PlayCircle className="h-5 w-5 text-[var(--color-text-muted)]" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/learn/courses"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>
      </div>
    </div>
  )
}
