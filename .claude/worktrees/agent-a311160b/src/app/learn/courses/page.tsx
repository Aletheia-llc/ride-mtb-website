import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { CourseCard, DifficultyBadge, CategoryBadge } from '@/modules/learn'
import { EmptyState } from '@/ui/components'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCourses, getCourseProgress, type CourseFilters } from '@/modules/learn/lib/queries'
import type { Difficulty, LearnCategory } from '@/generated/prisma/client'

export const metadata: Metadata = {
  title: 'Courses | Ride MTB Learn',
  description: 'Browse mountain biking courses by category and difficulty.',
}

const CATEGORIES: { value: LearnCategory; label: string }[] = [
  { value: 'riding_skills', label: 'Riding Skills' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'etiquette', label: 'Etiquette' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'gear', label: 'Gear' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

interface PageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    difficulty?: string
  }>
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await auth()

  const filters: CourseFilters = {}
  if (params.category && CATEGORIES.some((c) => c.value === params.category)) {
    filters.category = params.category as LearnCategory
  }
  if (params.difficulty && DIFFICULTIES.some((d) => d.value === params.difficulty)) {
    filters.difficulty = params.difficulty as Difficulty
  }
  if (params.search) {
    filters.search = params.search
  }

  const courses = await getCourses(filters)

  // Fetch progress for all courses if user is logged in
  const progressMap: Record<string, { completed: number; total: number }> = {}
  if (session?.user?.id) {
    const progressResults = await Promise.all(
      courses.map((course) =>
        getCourseProgress(session.user!.id, course.id).then((p) => ({
          courseId: course.id,
          ...p,
        })),
      ),
    )
    for (const p of progressResults) {
      progressMap[p.courseId] = {
        completed: p.completedModules,
        total: p.totalModules,
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Courses</h1>
        <p className="text-[var(--color-text-muted)]">
          Browse all available mountain biking courses.
        </p>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search courses..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {/* Preserve existing filter params */}
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.difficulty && <input type="hidden" name="difficulty" value={params.difficulty} />}
        </div>
      </form>

      {/* Filter pills */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-muted)]">Category:</span>
          <Link
            href={{
              pathname: '/learn/courses',
              query: {
                ...(params.search && { search: params.search }),
                ...(params.difficulty && { difficulty: params.difficulty }),
              },
            }}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !params.category
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={{
                pathname: '/learn/courses',
                query: {
                  category: cat.value,
                  ...(params.search && { search: params.search }),
                  ...(params.difficulty && { difficulty: params.difficulty }),
                },
              }}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                params.category === cat.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-muted)]">Difficulty:</span>
          <Link
            href={{
              pathname: '/learn/courses',
              query: {
                ...(params.search && { search: params.search }),
                ...(params.category && { category: params.category }),
              },
            }}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !params.difficulty
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
            }`}
          >
            All
          </Link>
          {DIFFICULTIES.map((diff) => (
            <Link
              key={diff.value}
              href={{
                pathname: '/learn/courses',
                query: {
                  difficulty: diff.value,
                  ...(params.search && { search: params.search }),
                  ...(params.category && { category: params.category }),
                },
              }}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                params.difficulty === diff.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
              }`}
            >
              {diff.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Active filters summary */}
      {(params.category || params.difficulty || params.search) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Showing:</span>
          {params.search && (
            <span className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs text-[var(--color-text)]">
              &quot;{params.search}&quot;
            </span>
          )}
          {params.category && <CategoryBadge category={params.category} />}
          {params.difficulty && <DifficultyBadge difficulty={params.difficulty} />}
          <Link
            href="/learn/courses"
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Results */}
      {courses.length === 0 ? (
        <EmptyState
          title="No courses found"
          description="Try adjusting your filters or search terms."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={progressMap[course.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
