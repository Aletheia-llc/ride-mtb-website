import type { Metadata } from 'next'
import { SeriesForm } from '../SeriesForm'

export const metadata: Metadata = {
  title: 'New Fantasy Series | Admin | Ride MTB',
}

export default function NewSeriesPage() {
  return <SeriesForm />
}
