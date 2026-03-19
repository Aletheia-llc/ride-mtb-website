import type { ItemCondition } from '@/modules/marketplace/types'

const conditionLabels: Record<ItemCondition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

// Inline colors — no --color-condition-* tokens exist in this monolith
const conditionColors: Record<ItemCondition, string> = {
  new: '#15803d',
  like_new: '#1d4ed8',
  good: '#2563eb',
  fair: '#d97706',
  poor: '#dc2626',
}

interface ConditionBadgeProps {
  condition: ItemCondition
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: conditionColors[condition] }}
    >
      {conditionLabels[condition]}
    </span>
  )
}
