import type { QuestionType, Tier } from '@/generated/prisma/client'

export interface QuizOption {
  id: string
  text: string
  imageUrl?: string
  isCorrect: boolean
}

export interface QuestionData {
  id: string
  type: QuestionType
  prompt: string
  promptImageUrl?: string | null
  options: QuizOption[]
  explanation: string
  interactiveConfig?: DragDropConfig | DiagramMatchConfig | HotspotConfig | null
}

export interface DragDropConfig {
  type: 'drag_drop'
  items: { id: string; text: string }[]
  correctOrder: string[]
}

export interface DiagramMatchConfig {
  type: 'diagram_match'
  imageUrl: string
  labels: { id: string; text: string }[]
  targets: { id: string; x: number; y: number; labelId: string }[]
}

export interface HotspotConfig {
  type: 'hotspot'
  imageUrl: string
  zones: HotspotZone[]
}

export interface HotspotZone {
  id: string
  label: string
  isCorrect: boolean
  x: number
  y: number
  width: number
  height: number
}

export interface QuizState {
  currentIndex: number
  answers: Record<string, string>
  feedback: Record<string, { correct: boolean; selectedId: string }>
  isComplete: boolean
}

export interface QuizResultData {
  score: number
  tier: Tier
  correctCount: number
  totalCount: number
  xpEarned: number
  answers: { questionId: string; selectedOptionId: string; correct: boolean }[]
  courseCompleted?: boolean
  certificateTier?: string
}
