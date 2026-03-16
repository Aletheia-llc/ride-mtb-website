// Garage types
export type {
  BikeCategory,
  UserBikeData,
  BikeServiceLogData,
} from './garage'

// Quiz types
export type QuizStepType = 'multi_select' | 'single_select' | 'slider'

export interface QuizOption {
  id: string
  label: string
  description?: string
  image?: string
}

export interface SliderField {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  minLabel?: string
  maxLabel?: string
}

export interface ToggleField {
  key: string
  label: string
  description?: string
}

export interface QuizStepConfig {
  step: number
  key: string
  title: string
  subtitle?: string
  type: QuizStepType
  options?: QuizOption[]
  sliderFields?: SliderField[]
  toggleFields?: ToggleField[]
  skippable: boolean
}

export interface QuizAnswers {
  experience: string
  terrain: string[]
  ride_day: string
  priorities: string[]
  preferences: {
    pedaling_enjoyment: number
    budget: number
    ebike: boolean
  }
  sizing: {
    height_inches: number
    weight_lbs: number
  }
}

// Result types
export interface AlternativeResult {
  categoryNumber: number
  categoryName: string
  reason: string
}

export interface ScoreBreakdown {
  terrainBase: number
  terrainInputs: string[]
  rideDayBlend: number
  rideDayInput: string
  afterPriorities: number
  priorityInputs: string[]
  pedalingModifier: number
  pedalingInput: number
  experienceModifier: number
  experienceInput: string
  rawScore: number
  finalCategory: number
}

export interface SpectrumResult {
  primaryCategory: number
  rawScore: number
  categoryName: string
  categoryDescription: string
  travelRange?: { min: number; max: number }
  wheelConfig: string
  recommendedSize: string
  fitNotes: string[]
  whyMatches: string[]
  alternatives: AlternativeResult[]
  budget: number
  ebike: boolean
  scoreBreakdown: ScoreBreakdown
}
