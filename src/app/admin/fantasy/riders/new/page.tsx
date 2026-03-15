import type { Metadata } from 'next'
import { RiderForm } from '../RiderForm'

export const metadata: Metadata = {
  title: 'New Rider | Admin | Ride MTB',
}

export default function NewRiderPage() {
  return <RiderForm />
}
