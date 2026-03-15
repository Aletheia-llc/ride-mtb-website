import Link from 'next/link'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { Card, ProgressBar } from '@/ui/components'
import { DifficultyBadge, CategoryBadge } from './LearnBadges'

interface CourseCardProps {
  course: {
    id: string
    slug: string
    title: string
    description: string | null
    difficulty: string
    category: string
    modules: { id: string; youtubeVideoId: string | null }[]
  }
  progress?: { completed: number; total: number } | null
  priority?: boolean
}

export function CourseCard({ course, progress, priority }: CourseCardProps) {
  const firstVideoModule = course.modules.find((m) => m.youtubeVideoId)
  const thumbnailUrl = firstVideoModule?.youtubeVideoId
    ? `https://img.youtube.com/vi/${firstVideoModule.youtubeVideoId}/mqdefault.jpg`
    : null

  return (
    <Link href={`/learn/courses/${course.slug}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        {thumbnailUrl ? (
          <div className="relative -mx-6 -mt-6 mb-4 aspect-video overflow-hidden rounded-t-xl bg-[var(--color-bg-secondary)]">
            <Image
              src={thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          </div>
        ) : (
          <div className="-mx-6 -mt-6 mb-4 flex aspect-video items-center justify-center rounded-t-xl bg-[var(--color-bg-secondary)]">
            <BookOpen className="h-12 w-12 text-[var(--color-text-muted)]" />
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
          <CategoryBadge category={course.category} />
        </div>

        <h3 className="mb-1 text-base font-semibold text-[var(--color-text)]">{course.title}</h3>
        {course.description && (
          <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">{course.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>{course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}</span>
        </div>

        {progress && progress.total > 0 && (
          <div className="mt-3">
            <ProgressBar
              value={progress.completed}
              max={progress.total}
              label={`${progress.completed} of ${progress.total} complete`}
            />
          </div>
        )}
      </Card>
    </Link>
  )
}
