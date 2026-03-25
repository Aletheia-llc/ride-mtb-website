'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/components'
import { Trash2 } from 'lucide-react'
import { deleteMedia } from '@/modules/media'

export function DeleteMediaButton({ mediaId }: { mediaId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm('Delete this media item?')) return

    startTransition(async () => {
      const result = await deleteMedia(mediaId)
      if (result.success) {
        router.push('/media')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      title="Delete media"
    >
      <Trash2 className="h-4 w-4 text-[var(--color-text-muted)]" />
    </Button>
  )
}
