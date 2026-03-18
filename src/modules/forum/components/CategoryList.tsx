import Link from 'next/link'
import { Card } from '@/ui/components'
import { MessageSquare } from 'lucide-react'
import type { ForumCategory } from '@/modules/forum/types'

interface CategoryListProps {
  categories: ForumCategory[]
}

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p className="text-lg font-medium">No categories yet</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        return (
          <Link
            key={category.id}
            href={`/forum/${category.slug}`}
            className="block transition-shadow hover:shadow-md"
          >
            <Card className="h-full">
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-hidden="true">
                  {category.icon || '💬'}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-[var(--color-text)]">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)] line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {category._count.posts} {category._count.posts === 1 ? 'thread' : 'threads'}
                </span>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
