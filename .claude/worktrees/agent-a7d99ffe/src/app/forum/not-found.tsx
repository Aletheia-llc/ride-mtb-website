import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'

export default function ForumNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <EmptyState
        icon={<MessageSquare className="h-12 w-12" />}
        title="Page not found"
        description="The forum page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/forum">
            <Button>Back to Forum</Button>
          </Link>
        }
      />
    </div>
  )
}
