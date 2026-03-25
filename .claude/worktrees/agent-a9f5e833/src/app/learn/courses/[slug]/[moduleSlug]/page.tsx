import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LessonViewer, QuizSection } from '@/modules/learn'
import type { QuestionData, QuizOption } from '@/modules/learn'
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { getModuleBySlug } from '@/modules/learn/lib/queries'

interface PageProps {
  params: Promise<{ slug: string; moduleSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, moduleSlug } = await params
  const mod = await getModuleBySlug(slug, moduleSlug)
  if (!mod) return { title: 'Lesson Not Found | Ride MTB Learn' }

  return {
    title: `${mod.title} | Ride MTB Learn`,
    description: `Learn about ${mod.title} in this Ride MTB lesson.`,
  }
}

export default async function ModuleLessonPage({ params }: PageProps) {
  const { slug: courseSlug, moduleSlug } = await params
  const mod = await getModuleBySlug(courseSlug, moduleSlug)
  if (!mod) notFound()

  // Get course for breadcrumb and sibling navigation
  const course = await db.learnCourse.findFirst({
    where: { slug: courseSlug, status: 'published' },
    select: {
      title: true,
      slug: true,
      modules: {
        where: { status: 'published' },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, title: true },
      },
    },
  })
  if (!course) notFound()

  // Determine prev/next modules
  const currentIndex = course.modules.findIndex((m) => m.slug === moduleSlug)
  const prevModule = currentIndex > 0 ? course.modules[currentIndex - 1] : null
  const nextModule =
    currentIndex < course.modules.length - 1 ? course.modules[currentIndex + 1] : null

  // Map quiz questions to QuestionData type
  const quizData = mod.quiz
    ? {
        id: mod.quiz.id,
        title: mod.quiz.title,
        difficulty: mod.quiz.difficulty as 'beginner' | 'intermediate' | 'advanced',
        questions: mod.quiz.questions.map(
          (q): QuestionData => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            promptImageUrl: q.promptImageUrl,
            options: q.options as unknown as QuizOption[],
            explanation: q.explanation || '',
            interactiveConfig: q.interactiveConfig as QuestionData['interactiveConfig'],
          }),
        ),
      }
    : null

  const courseUrl = `/learn/courses/${courseSlug}`
  const nextModuleUrl = nextModule
    ? `/learn/courses/${courseSlug}/${nextModule.slug}`
    : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/learn" className="hover:text-[var(--color-primary)]">
          Learn
        </Link>
        <span>/</span>
        <Link href="/learn/courses" className="hover:text-[var(--color-primary)]">
          Courses
        </Link>
        <span>/</span>
        <Link href={courseUrl} className="hover:text-[var(--color-primary)]">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{mod.title}</span>
      </nav>

      {/* Module title */}
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">{mod.title}</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Module {currentIndex + 1} of {course.modules.length}
      </p>

      {/* YouTube embed */}
      {mod.youtubeVideoId && (
        <div className="mb-8 aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${mod.youtubeVideoId}`}
            title={mod.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {/* Lesson content */}
      {mod.lessonContent && (
        <section className="mb-12">
          <LessonViewer content={mod.lessonContent} />
        </section>
      )}

      {/* Quiz section */}
      {quizData && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-[var(--color-text)]">Knowledge Check</h2>
          <QuizSection
            quiz={quizData}
            courseUrl={courseUrl}
            nextModuleUrl={nextModuleUrl}
          />
        </section>
      )}

      {/* Prev/Next navigation */}
      <nav className="flex items-center justify-between border-t border-[var(--color-border)] pt-6">
        {prevModule ? (
          <Link
            href={`/learn/courses/${courseSlug}/${prevModule.slug}`}
            className="group flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft className="h-4 w-4" />
            <div>
              <div className="text-xs">Previous</div>
              <div className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {prevModule.title}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {nextModule ? (
          <Link
            href={`/learn/courses/${courseSlug}/${nextModule.slug}`}
            className="group flex items-center gap-2 text-right text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            <div>
              <div className="text-xs">Next</div>
              <div className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {nextModule.title}
              </div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href={courseUrl}
            className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Back to course overview
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </div>
  )
}
