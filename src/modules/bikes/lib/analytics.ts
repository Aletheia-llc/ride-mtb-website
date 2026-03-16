import posthog from 'posthog-js'

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    posthog.capture(event, properties)
  } catch {
    // PostHog not initialized — no-op
  }
}

export const bikeAnalytics = {
  quizStarted: () => capture('bike_quiz_started'),
  quizStepCompleted: (step: number, key: string) =>
    capture('bike_quiz_step_completed', { step, key }),
  quizCompleted: (resultId: string, category: string) =>
    capture('bike_quiz_completed', { resultId, category }),
  resultsViewed: (resultId: string) => capture('bike_results_viewed', { resultId }),
  resultsShared: (method: 'native' | 'clipboard') =>
    capture('bike_results_shared', { method }),
  consultationStarted: () => capture('bike_consultation_started'),
  consultationSubmitted: () => capture('bike_consultation_submitted'),
}
