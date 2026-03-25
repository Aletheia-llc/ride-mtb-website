import type { Metadata } from 'next'
import { BikeQuizFlow } from '@/modules/bikes'

export const metadata: Metadata = {
  title: 'Bike Selector | Ride MTB',
  description: 'Find the perfect mountain bike category for your riding style, terrain, and preferences.',
}

export default function BikeSelectorPage() {
  return <BikeQuizFlow />
}
