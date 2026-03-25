'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/ui/components'
import { rsvpEvent } from '../actions/rsvpEvent'
import type { RsvpStatus } from '../types'

interface RSVPButtonProps {
  eventId: string
  currentStatus: RsvpStatus | null
}

export function RSVPButton({ eventId, currentStatus }: RSVPButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<RsvpStatus | null>(currentStatus)

  function handleRsvp(status: RsvpStatus) {
    setLocalStatus(status)
    startTransition(async () => {
      await rsvpEvent(eventId, status)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={localStatus === 'going' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRsvp('going')}
        disabled={isPending}
        loading={isPending && localStatus === 'going'}
      >
        Going
      </Button>
      <Button
        variant={localStatus === 'maybe' ? 'primary' : 'secondary'}
        size="md"
        onClick={() => handleRsvp('maybe')}
        disabled={isPending}
        loading={isPending && localStatus === 'maybe'}
      >
        Maybe
      </Button>
      {localStatus && localStatus !== 'not_going' && (
        <Button
          variant="ghost"
          size="md"
          onClick={() => handleRsvp('not_going')}
          disabled={isPending}
        >
          Cancel RSVP
        </Button>
      )}
    </div>
  )
}
