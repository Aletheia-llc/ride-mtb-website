'use client'

import { useTransition } from 'react'
import { Button } from '@/ui/components'
import { deleteServiceLogAction } from '../../actions/deleteServiceLog'

interface DeleteServiceLogButtonProps {
  logId: string
  bikeId: string
}

export function DeleteServiceLogButton({ logId, bikeId }: DeleteServiceLogButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this service entry?')) return

    startTransition(async () => {
      const result = await deleteServiceLogAction(logId, bikeId)
      if (!result.success && result.errors.general) {
        alert(result.errors.general)
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      loading={isPending}
    >
      Delete
    </Button>
  )
}
