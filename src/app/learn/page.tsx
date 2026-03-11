import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  Brain,
  Trophy,
  Award,
  Bike,
  Wrench,
  Dumbbell,
  HandHelping,
  Apple,
  ShieldCheck,
} from 'lucide-react'
import { Card } from '@/ui/components'
import { CourseCard } from '@/modules/learn'
// eslint-disable-next-line no-restricted-imports
import { getCourses } from '@/modules/learn/lib/queries'

export const metadata: Metadata = {
  title: 'Learn | Ride MTB',
  description:
    'Master mountain biking with structured courses, quizzes, and certifications. Earn XP and track your progress.',
}

const HOW_IT_WORKS = [
  {
    icon: BookOpen,
    title: 'Learn',
    description: 'Watch video lessons and read expert guides on riding skills, maintenance, and more.',
  },
  {
    icon: Brain,
    title: 'Quiz',
    description: 'Test your knowledge with interactive quizzes after each module.',
  },
  {
    icon: Trophy,
    title: 'Earn XP',
    description: 'Score well to earn XP, climb the leaderboard, and unlock badges.',
  },
  {
    icon: Award,
    title: 'Get Certified',
    description: 'Complete all modules in a course to earn a shareable certificate.',
  },
] as const

const CATEGORIES = [
  { key: 'riding_skills', label: 'Riding Skills', icon: Bike },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell },
  { key: 'etiquette', label: 'Etiquette', icon: HandHelping },
  { key: 'nutrition', label: 'Nutrition', icon: Apple },
  { key: 'gear', label: 'Gear', icon: ShieldCheck },
] as const

export default async function LearnPage() {
  const courses = await getCourses()
  const featured = courses.slice(0, 3)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Master Mountain Biking
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-[var(--color-text-muted)]">
          Structured courses taught by experienced riders. Learn at your own pace,
          test your knowledge, and earn certifications.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/learn/courses"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <BookOpen className="h-5 w-5" />
            Browse Courses
          </Link>
          <Link
            href="/learn/quizzes"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3 font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
          >
            <Brain className="h-5 w-5" />
            Take a Quiz
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-[var(--color-text)]">
          How It Works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.title} className="text-center">
                <Icon className="mx-auto mb-3 h-10 w-10 text-[var(--color-primary)]" />
                <h3 className="mb-1 text-base font-semibold text-[var(--color-text)]">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">{step.description}</p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Featured Courses */}
      {featured.length > 0 && (
        <section className="mb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Featured Courses</h2>
            <Link
              href="/learn/courses"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-[var(--color-text)]">
          Browse by Category
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.key}
                href={`/learn/courses?category=${cat.key}`}
                className="group"
              >
                <Card className="flex items-center gap-4 transition-shadow group-hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
                    <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{cat.label}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Explore {cat.label.toLowerCase()} courses
                    </p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-[var(--color-bg-secondary)] p-8 text-center sm:p-12">
        <h2 className="mb-3 text-2xl font-bold text-[var(--color-text)]">
          Ready to level up your riding?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-[var(--color-text-muted)]">
          Join the Ride MTB community and start earning XP, badges, and certifications today.
        </p>
        <Link
          href="/learn/courses"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          Get Started
        </Link>
      </section>
    </div>
  )
}
