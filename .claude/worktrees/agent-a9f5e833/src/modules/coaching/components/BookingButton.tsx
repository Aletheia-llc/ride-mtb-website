'use client'

import { Button } from '@/ui/components'

interface BookingButtonProps {
  calcomLink: string | null
  hourlyRate: number | null
}

export function BookingButton({ calcomLink, hourlyRate }: BookingButtonProps) {
  if (!calcomLink) {
    return (
      <Button variant="secondary" disabled>
        Contact for booking
      </Button>
    )
  }

  const label = hourlyRate != null
    ? `Book a Session — $${hourlyRate}/hr`
    : 'Book a Session'

  return (
    <a href={calcomLink} target="_blank" rel="noopener noreferrer">
      <Button>{label}</Button>
    </a>
  )
}
