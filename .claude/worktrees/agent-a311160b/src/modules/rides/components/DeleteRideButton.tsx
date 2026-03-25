'use client'

import { useTransition } from 'react'
import { Button } from '@/ui/components'
import { Trash2 } from 'lucide-react'
import { deleteRide } from '../actions/deleteRide'

interface DeleteRideButtonProps {
  rideId: string
}

export function DeleteRideButton({ rideId }: DeleteRideButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this ride log?')) return

    startTransition(async () => {
      await deleteRide(rideId)
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      title="Delete ride"
    >
      <Trash2 className="h-4 w-4 text-[var(--color-text-muted)]" />
    </Button>
  )
}
