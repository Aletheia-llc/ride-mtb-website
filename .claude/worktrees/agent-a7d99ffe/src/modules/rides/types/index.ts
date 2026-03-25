export interface RideLogData {
  id: string
  date: Date
  duration: number | null
  notes: string | null
  trailId: string | null
  createdAt: Date
}

export interface RideLogWithTrail extends RideLogData {
  trailName: string | null
  trailSystemName: string | null
}
