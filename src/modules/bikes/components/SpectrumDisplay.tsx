'use client'

interface SpectrumDisplayProps {
  value: number
  categories: Record<number, { name: string }>
  className?: string
}

export function SpectrumDisplay({ value, categories, className = '' }: SpectrumDisplayProps) {
  const positions = [1, 3, 5, 7, 9]
  // Map 1-9 to 0-100% position
  const markerPercent = ((value - 1) / 8) * 100

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Bar with marker */}
      <div className="relative h-4 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-50% to-red-500">
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${markerPercent}%` }}
        >
          <div className="h-7 w-7 rounded-full border-3 border-white bg-[var(--color-primary)] shadow-lg" />
        </div>
      </div>

      {/* Category labels below */}
      <div className="mt-2 flex justify-between">
        {positions.map((pos, idx) => {
          const cat = categories[pos]
          const isActive = Math.round(value) === pos || roundToNearestOddLocal(value) === pos
          const align = idx === 0 ? 'text-left' : idx === positions.length - 1 ? 'text-right' : 'text-center'
          return (
            <span
              key={pos}
              className={`flex-1 text-xs ${align} ${
                isActive ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {cat?.name ?? pos}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function roundToNearestOddLocal(value: number): number {
  const clamped = Math.max(1, Math.min(9, value))
  const oddNumbers = [1, 3, 5, 7, 9]
  let closest = oddNumbers[0]
  let minDist = Math.abs(clamped - closest)
  for (let i = 1; i < oddNumbers.length; i++) {
    const dist = Math.abs(clamped - oddNumbers[i])
    if (dist < minDist) {
      minDist = dist
      closest = oddNumbers[i]
    }
  }
  return closest
}
