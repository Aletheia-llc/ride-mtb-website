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
      await deleteServiceLogAction(logId, bikeId)
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
