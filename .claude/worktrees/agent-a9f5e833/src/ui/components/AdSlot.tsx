type AdSize = 'rectangle' | 'leaderboard' | 'mobile'

const AD_DIMENSIONS: Record<AdSize, { width: number; height: number }> = {
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  mobile: { width: 320, height: 50 },
}

export function AdSlot({ size }: { size: AdSize }) {
  const { width, height } = AD_DIMENSIONS[size]
  return (
    <div
      style={{ width, height, maxWidth: '100%' }}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs rounded"
      aria-label="Advertisement"
    >
      Advertisement
    </div>
  )
}
