import { Award } from 'lucide-react'
import { Card } from '@/ui/components'
import { TierBadge } from './LearnBadges'

interface CertificateViewProps {
  courseTitle: string
  tier: string
  issuedAt: Date | string
  userName: string
  score: number
}

export function CertificateView({
  courseTitle,
  tier,
  issuedAt,
  userName,
  score,
}: CertificateViewProps) {
  const date = typeof issuedAt === 'string' ? new Date(issuedAt) : issuedAt
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="mx-auto max-w-lg text-center">
      <Award className="mx-auto mb-4 h-12 w-12 text-yellow-600" />

      <h2 className="mb-1 text-xl font-bold text-[var(--color-text)]">Certificate of Completion</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">This certifies that</p>

      <p className="mb-4 text-2xl font-semibold text-[var(--color-primary)]">{userName}</p>

      <p className="mb-2 text-sm text-[var(--color-text-muted)]">has successfully completed</p>
      <p className="mb-4 text-lg font-semibold text-[var(--color-text)]">{courseTitle}</p>

      <div className="mb-4 flex items-center justify-center gap-3">
        <TierBadge tier={tier} />
        <span className="text-sm text-[var(--color-text-muted)]">Score: {score}%</span>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">Issued on {formattedDate}</p>
    </Card>
  )
}
