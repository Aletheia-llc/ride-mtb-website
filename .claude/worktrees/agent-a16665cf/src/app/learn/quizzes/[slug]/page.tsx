import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QuizSection } from '@/modules/learn'
import type { QuestionData, QuizOption } from '@/modules/learn'
// eslint-disable-next-line no-restricted-imports
import { getQuizBySlug } from '@/modules/learn/lib/queries'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const quiz = await getQuizBySlug(slug)
  if (!quiz) return { title: 'Quiz Not Found | Ride MTB Learn' }

  return {
    title: `${quiz.title} | Ride MTB Learn`,
    description: quiz.description || `Test your knowledge with the ${quiz.title} quiz.`,
    openGraph: {
      title: `${quiz.title} — Ride MTB Quiz`,
      description: quiz.description || `${quiz.questions.length} questions to test your knowledge.`,
    },
  }
}

export default async function QuizPage({ params }: PageProps) {
  const { slug } = await params
  const quiz = await getQuizBySlug(slug)
  if (!quiz) notFound()

  const quizData = {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty as 'beginner' | 'intermediate' | 'advanced',
    questions: quiz.questions.map(
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/learn" className="hover:text-[var(--color-primary)]">
          Learn
        </Link>
        <span>/</span>
        <Link href="/learn/quizzes" className="hover:text-[var(--color-primary)]">
          Quizzes
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{quiz.title}</span>
      </nav>

      <QuizSection
        quiz={quizData}
        courseUrl="/learn/quizzes"
        nextModuleUrl={null}
      />

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/learn/quizzes"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to quizzes
        </Link>
      </div>
    </div>
  )
}
