'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QuizAnswers } from '../types'
import { TOTAL_STEPS } from '../lib/constants'

interface QuizState {
  currentStep: number
  answers: QuizAnswers
  isSubmitting: boolean
  sessionToken: string
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  setSubmitting: (submitting: boolean) => void
  reset: () => void
}

const initialAnswers: QuizAnswers = {
  experience: '',
  terrain: [],
  ride_day: '',
  priorities: [],
  preferences: { pedaling_enjoyment: 5, budget: 5000, ebike: false },
  sizing: { height_inches: 70, weight_lbs: 170 },
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      currentStep: 1,
      answers: { ...initialAnswers },
      isSubmitting: false,
      sessionToken: crypto.randomUUID(),
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS) })),
      prevStep: () =>
        set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      goToStep: (step) => set({ currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)) }),
      setSubmitting: (submitting) => set({ isSubmitting: submitting }),
      reset: () =>
        set({ currentStep: 1, answers: { ...initialAnswers }, isSubmitting: false, sessionToken: crypto.randomUUID() }),
    }),
    {
      name: 'ride-mtb-quiz-v3',
      merge: (persisted, current) => {
        const p = persisted as Partial<QuizState>
        const c = current as QuizState
        return { ...c, ...p, answers: { ...c.answers, ...p.answers } }
      },
    },
  ),
)
