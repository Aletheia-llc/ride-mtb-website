import { CourseCard } from './CourseCard'

const categoryLabels: Record<string, string> = {
  riding_skills: 'Riding Skills',
  maintenance: 'Maintenance',
  fitness: 'Fitness',
  etiquette: 'Etiquette',
  nutrition: 'Nutrition',
  gear: 'Gear',
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  difficulty: string
  category: string
  modules: { id: string; youtubeVideoId: string | null }[]
}

interface CourseListProps {
  courses: Course[]
  progress?: Record<string, { completed: number; total: number }>
  activeCategory?: string | null
  activeDifficulty?: string | null
}

export function CourseList({
  courses,
  progress,
  activeCategory,
  activeDifficulty,
}: CourseListProps) {
  const filtered = courses.filter((course) => {
    if (activeCategory && course.category !== activeCategory) return false
    if (activeDifficulty && course.difficulty !== activeDifficulty) return false
    return true
  })

  const categories = Object.entries(categoryLabels)
  const difficulties = Object.entries(difficultyLabels)

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="py-1 text-sm font-medium text-[var(--color-text-muted)]">Category:</span>
          {categories.map(([value, label]) => (
            <span
              key={value}
              className={`rounded-full px-3 py-1 text-sm ${
                activeCategory === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="py-1 text-sm font-medium text-[var(--color-text-muted)]">Difficulty:</span>
          {difficulties.map(([value, label]) => (
            <span
              key={value}
              className={`rounded-full px-3 py-1 text-sm ${
                activeDifficulty === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-[var(--color-text-muted)]">No courses match the selected filters.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={progress?.[course.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
