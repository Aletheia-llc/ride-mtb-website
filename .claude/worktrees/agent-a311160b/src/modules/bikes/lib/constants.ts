import type { QuizStepConfig } from '../types'

export const TOTAL_STEPS = 6

export const TERRAIN_VALUES: Record<string, number> = {
  paved: 1,
  smooth: 3,
  rocky: 5,
  technical: 7,
  bikepark: 9,
}

export const RIDE_DAY_VALUES: Record<string, number> = {
  scenic: 2.5,
  flowy: 4.5,
  balanced: 5,
  challenging: 6.5,
  downhill: 8.5,
}

export const PRIORITY_MODIFIERS: Record<string, number> = {
  distance: -1,
  lightweight: -1,
  capable: 0,
  rough: 1,
}

export interface CategoryMeta {
  name: string
  description: string
  travelRange?: { min: number; max: number }
}

export const CATEGORY_META: Record<number, CategoryMeta> = {
  1: {
    name: 'Gravel / Road+',
    description: 'Light, fast, and versatile. Built for gravel roads, bike paths, and light trail riding.',
    travelRange: { min: 0, max: 40 },
  },
  3: {
    name: 'Cross-Country',
    description: 'Efficient climbing and quick handling. Ideal for XC racing and fast singletrack.',
    travelRange: { min: 80, max: 120 },
  },
  5: {
    name: 'Trail / All-Mountain',
    description: 'The do-it-all category. Balanced climbing and descending for varied terrain.',
    travelRange: { min: 120, max: 150 },
  },
  7: {
    name: 'Enduro',
    description: 'Gravity-focused with enough pedaling ability for big days. Built for steep, technical descents.',
    travelRange: { min: 150, max: 180 },
  },
  9: {
    name: 'Downhill',
    description: 'Maximum suspension travel and stability for bike parks and shuttle-accessed terrain.',
    travelRange: { min: 180, max: 210 },
  },
}

export type WheelConfig = '29/29' | '29/27.5' | '27.5/27.5'

export interface WheelSizeRow {
  maxHeight: number
  configs: Record<number, WheelConfig>
}

export const WHEEL_SIZE_MATRIX: WheelSizeRow[] = [
  {
    maxHeight: 62,
    configs: { 1: '29/29', 3: '27.5/27.5', 5: '27.5/27.5', 7: '27.5/27.5', 9: '27.5/27.5' },
  },
  {
    maxHeight: 66,
    configs: { 1: '29/29', 3: '29/29', 5: '29/27.5', 7: '27.5/27.5', 9: '27.5/27.5' },
  },
  {
    maxHeight: 70,
    configs: { 1: '29/29', 3: '29/29', 5: '29/29', 7: '29/27.5', 9: '27.5/27.5' },
  },
  {
    maxHeight: 999,
    configs: { 1: '29/29', 3: '29/29', 5: '29/29', 7: '29/27.5', 9: '29/29' },
  },
]

export const GENERIC_SIZE_CHART: Record<string, { minHeight: number; maxHeight: number }> = {
  XS: { minHeight: 58, maxHeight: 63 },
  S: { minHeight: 63, maxHeight: 67 },
  M: { minHeight: 67, maxHeight: 71 },
  L: { minHeight: 71, maxHeight: 75 },
  XL: { minHeight: 75, maxHeight: 79 },
  XXL: { minHeight: 79, maxHeight: 84 },
}

// Quiz step configs
export const QUIZ_STEPS: QuizStepConfig[] = [
  {
    step: 1,
    key: 'experience',
    title: 'What\'s your experience level?',
    subtitle: 'This helps us calibrate our recommendation.',
    type: 'single_select',
    options: [
      { id: 'beginner', label: 'Beginner', description: 'New to mountain biking or getting back into it' },
      { id: 'intermediate', label: 'Intermediate', description: 'Comfortable on most trails, developing skills' },
      { id: 'advanced', label: 'Advanced', description: 'Confident on technical terrain, ride regularly' },
      { id: 'expert', label: 'Expert', description: 'Highly skilled, ride the most challenging trails' },
    ],
    skippable: false,
  },
  {
    step: 2,
    key: 'terrain',
    title: 'What terrain do you ride?',
    subtitle: 'Select all that apply.',
    type: 'multi_select',
    options: [
      { id: 'paved', label: 'Paved / Gravel Roads' },
      { id: 'smooth', label: 'Smooth Trails' },
      { id: 'rocky', label: 'Rocky Terrain' },
      { id: 'technical', label: 'Technical Singletrack' },
      { id: 'bikepark', label: 'Bike Park / Lift-Served' },
    ],
    skippable: false,
  },
  {
    step: 3,
    key: 'ride_day',
    title: 'Describe your ideal ride day',
    type: 'single_select',
    options: [
      { id: 'scenic', label: 'Long scenic rides', description: 'Cover lots of ground at a relaxed pace' },
      { id: 'flowy', label: 'Flowy trails', description: 'Smooth, bermed trails with natural flow' },
      { id: 'balanced', label: 'A little of everything', description: 'Mix of climbing and descending' },
      { id: 'challenging', label: 'Challenging terrain', description: 'Technical climbs and descents' },
      { id: 'downhill', label: 'Downhill focused', description: 'Gravity riding, shuttle or lift access' },
    ],
    skippable: false,
  },
  {
    step: 4,
    key: 'priorities',
    title: 'What matters most to you?',
    subtitle: 'Select up to 2 priorities.',
    type: 'multi_select',
    options: [
      { id: 'distance', label: 'Covering distance', description: 'Efficiency and endurance' },
      { id: 'lightweight', label: 'Light weight', description: 'Easy to carry and maneuver' },
      { id: 'capable', label: 'Trail capability', description: 'Handle anything the trail throws at you' },
      { id: 'rough', label: 'Rough terrain', description: 'Stability on the gnarliest trails' },
    ],
    skippable: false,
  },
  {
    step: 5,
    key: 'preferences',
    title: 'Fine-tune your preferences',
    type: 'slider',
    sliderFields: [
      {
        key: 'pedaling_enjoyment',
        label: 'How much do you enjoy pedaling?',
        min: 1,
        max: 10,
        step: 1,
        unit: '',
        minLabel: 'Prefer gravity',
        maxLabel: 'Love to pedal',
      },
      {
        key: 'budget',
        label: 'Budget',
        min: 1000,
        max: 15000,
        step: 500,
        unit: '$',
      },
    ],
    toggleFields: [
      {
        key: 'ebike',
        label: 'E-Bike',
        description: 'Include electric mountain bikes in recommendations',
      },
    ],
    skippable: false,
  },
  {
    step: 6,
    key: 'sizing',
    title: 'Let\'s get your fit right',
    subtitle: 'This helps us recommend the right frame size and wheel configuration.',
    type: 'slider',
    sliderFields: [
      {
        key: 'height_inches',
        label: 'Height',
        min: 54,
        max: 84,
        step: 1,
        unit: 'in',
      },
      {
        key: 'weight_lbs',
        label: 'Weight',
        min: 80,
        max: 350,
        step: 5,
        unit: 'lbs',
      },
    ],
    skippable: false,
  },
]
