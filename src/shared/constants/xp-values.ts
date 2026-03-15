import type { XpEvent } from '@/shared/types/xp'

export const XP_VALUES: Record<XpEvent, number> = {
  forum_post_created: 10,
  forum_thread_created: 15,
  forum_vote_received: 2,
  learn_quiz_completed: 25,
  learn_quiz_improved: 15,
  learn_module_completed: 50,
  learn_course_completed: 200,
  trail_review_submitted: 10,
  trail_condition_reported: 5,
  trail_photo_uploaded: 5,
  trail_gpx_contributed: 25,
  ride_logged: 3,
  review_submitted: 10,
  event_attended: 20,
  event_created: 25,
  streak_bonus: 10,
  listing_created: 10,
  listing_favorited: 2,
  bike_quiz_completed: 15,
}

export const STREAK_MULTIPLIERS: Record<number, number> = {
  3: 1.1,
  7: 1.25,
  14: 1.5,
  30: 2.0,
}
