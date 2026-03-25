import { Badge } from '@/ui/components'

const tierVariantMap: Record<string, 'gold' | 'silver' | 'bronze' | 'error'> = {
  gold: 'gold',
  silver: 'silver',
  bronze: 'bronze',
  incomplete: 'error',
}

interface TierBadgeProps {
  tier: string
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const variant = tierVariantMap[tier] || 'error'
  return (
    <Badge variant={variant} className={className}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  )
}

const difficultyVariantMap: Record<string, 'success' | 'warning' | 'error'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
}

interface DifficultyBadgeProps {
  difficulty: string
  className?: string
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const variant = difficultyVariantMap[difficulty] || 'default'
  return (
    <Badge variant={variant as 'success' | 'warning' | 'error'} className={className}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  )
}

const categoryLabelMap: Record<string, string> = {
  riding_skills: 'Riding Skills',
  maintenance: 'Maintenance',
  fitness: 'Fitness',
  etiquette: 'Etiquette',
  nutrition: 'Nutrition',
  gear: 'Gear',
}

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const label = categoryLabelMap[category] || category
  return (
    <Badge variant="info" className={className}>
      {label}
    </Badge>
  )
}
