export type BikeCategory =
  | 'gravel'
  | 'xc'
  | 'trail'
  | 'enduro'
  | 'downhill'
  | 'dirt_jump'
  | 'ebike'
  | 'other'

export interface UserBikeData {
  id: string
  userId: string
  name: string
  brand: string
  model: string
  year: number | null
  category: BikeCategory
  wheelSize: string | null
  frameSize: string | null
  weight: number | null
  imageUrl: string | null
  isPrimary: boolean
  notes: string | null
  frameMaterial?: string | null
  travel?: number | null
  purchaseYear?: number | null
  purchasePrice?: number | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    serviceLogs: number
  }
}

export interface BikeServiceLogData {
  id: string
  bikeId: string
  serviceType: string
  description: string | null
  cost: number | null
  serviceDate: Date
  mileage: number | null
  createdAt: Date
}
