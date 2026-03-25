import type { Metadata } from 'next'
import Link from 'next/link'
import { Brain, BookOpen } from 'lucide-react'
import { DifficultyBadge, CategoryBadge } from '@/modules/learn'
import { Card, EmptyState } from '@/ui/components'
import { db } from '@/lib/db/client'

export const metadata: Metadata = {
  title: 'Quizzes | Ride MTB Learn',
  description: 'Test your mountain biking knowledge with interactive quizzes.',
}

export default async function QuizzesPage() {
  const quizzes = await db.learnQuiz.findMany({
    where: { status: 'published' },
    include: {
      questions: { select: { id: true } },
      module: {
        select: {
          course: {
            select: { title: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const standaloneQuizzes = quizzes.filter((q) => !q.moduleId)
  const courseQuizzes = quizzes.filter((q) => q.moduleId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Quizzes</h1>
        <p className="text-[var(--color-text-muted)]">
          Test your mountain biking knowledge. Earn XP and badges by scoring well.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-12 w-12" />}
          title="No quizzes available yet"
          description="Check back soon for new quizzes to test your knowledge."
        />
      ) : (
        <>
          {/* Standalone quizzes */}
          {standaloneQuizzes.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 text-xl font-semibold text-[var(--color-text)]">
                Standalone Quizzes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {standaloneQuizzes.map((quiz) => (
                  <Link key={quiz.id} href={`/learn/quizzes/${quiz.slug}`} className="block">
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <div className="mb-3 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold text-[var(--color-text)]">{quiz.title}</h3>
                      </div>
                      {quiz.description && (
                        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                          {quiz.description}
                        </p>
                      )}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <DifficultyBadge difficulty={quiz.difficulty} />
                        <CategoryBadge category={quiz.category} />
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Course quizzes */}
          {courseQuizzes.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-[var(--color-text)]">
                Course Quizzes
              </h2>
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">
                These quizzes are part of courses. Complete the lesson first for the best experience.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courseQuizzes.map((quiz) => (
                  <Link key={quiz.id} href={`/learn/quizzes/${quiz.slug}`} className="block">
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <div className="mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold text-[var(--color-text)]">{quiz.title}</h3>
                      </div>
                      {quiz.module?.course && (
                        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                          Part of: {quiz.module.course.title}
                        </p>
                      )}
                      {quiz.description && (
                        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                          {quiz.description}
                        </p>
                      )}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <DifficultyBadge difficulty={quiz.difficulty} />
                        <CategoryBadge category={quiz.category} />
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
