export type XpModule = 'forum' | 'learn' | 'trails' | 'bikes' | 'events' | 'reviews' | 'rides' | 'marketplace' | 'merch' | 'shops' | 'media' | 'coaching'

export type XpEvent =
  | 'forum_post_created' | 'forum_thread_created' | 'forum_vote_received'
  | 'learn_quiz_completed' | 'learn_quiz_improved' | 'learn_module_completed' | 'learn_course_completed'
  | 'trail_review_submitted' | 'trail_condition_reported' | 'trail_photo_uploaded' | 'trail_gpx_contributed'
  | 'ride_logged' | 'review_submitted' | 'event_attended' | 'streak_bonus'

export interface XpGrantResult {
  granted: boolean
  points: number
  newTotal: number
}
