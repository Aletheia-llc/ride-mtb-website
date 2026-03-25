import Link from 'next/link'
import { BookX } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'

export default function LearnNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <EmptyState
        icon={<BookX className="h-12 w-12" />}
        title="Page not found"
        description="The learn page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/learn">
            <Button>Back to Learn</Button>
          </Link>
        }
      />
    </div>
  )
}
