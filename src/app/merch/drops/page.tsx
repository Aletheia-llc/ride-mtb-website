import type { Metadata } from 'next'
import { DropsSection } from '@/modules/merch/components/DropsSection'

export const metadata: Metadata = {
  title: 'Limited Drops | Ride MTB Merch',
  description: 'Exclusive limited-edition Ride MTB merchandise drops.',
}

export default function DropsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <DropsSection />
    </div>
  )
}
