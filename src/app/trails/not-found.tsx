import Link from 'next/link'
import { Mountain } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'

export default function TrailsNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <EmptyState
        icon={<Mountain className="h-12 w-12" />}
        title="Trail not found"
        description="The trail or trail system you're looking for doesn't exist or has been removed."
        action={
          <Link href="/trails">
            <Button>Back to Trails</Button>
          </Link>
        }
      />
    </div>
  )
}
