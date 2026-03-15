// src/modules/fantasy/types/index.ts
import type {
  FantasySeries, FantasyEvent, Rider, RiderEventEntry,
  FantasyTeam, FantasyPick, FantasyEventScore, FantasySeasonScore,
  FantasyLeague, FantasyLeagueMember, ExpertPick,
  Discipline, SeriesStatus, EventStatus, Gender,
} from '@/generated/prisma/client'

export type {
  FantasySeries, FantasyEvent, Rider, RiderEventEntry,
  FantasyTeam, FantasyPick, FantasyEventScore, FantasySeasonScore,
  FantasyLeague, FantasyLeagueMember, ExpertPick,
  Discipline, SeriesStatus, EventStatus, Gender,
}

export interface SeriesWithEvents extends FantasySeries {
  events: FantasyEvent[]
}

export interface EventWithEntries extends FantasyEvent {
  riderEntries: (RiderEventEntry & { rider: Rider })[]
}

export interface RiderWithEntries extends Rider {
  eventEntries: RiderEventEntry[]
}
