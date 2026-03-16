import { ImageResponse } from 'next/og'
import { db } from '@/lib/db/client'
import type { SpectrumResult } from '@/modules/bikes/types'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ id: string }>
}

const CATEGORY_COLOR: Record<number, string> = {
  1: '#60a5fa', // blue — gravel
  3: '#34d399', // green — XC
  5: '#a78bfa', // purple — trail
  7: '#f97316', // orange — enduro
  9: '#ef4444', // red — downhill
}

const CATEGORIES = [
  { num: 1, label: 'Gravel' },
  { num: 3, label: 'XC' },
  { num: 5, label: 'Trail' },
  { num: 7, label: 'Enduro' },
  { num: 9, label: 'DH' },
]

export default async function OGImage({ params }: Props) {
  const { id } = await params

  const record = await db.quizResult.findUnique({
    where: { id },
    select: { categoryName: true, resultJson: true },
  })

  if (!record) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#94a3b8',
          fontSize: 32,
          fontFamily: 'sans-serif',
        }}
      >
        Result not found
      </div>,
      { ...size }
    )
  }

  const result = record.resultJson as unknown as SpectrumResult
  const primary = result.primaryCategory
  const activeColor = CATEGORY_COLOR[primary] ?? '#22c55e'
  const rawScore = result.rawScore ?? primary

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: '#0f172a',
        padding: '60px 72px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Top: brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#22c55e',
          }}
        />
        <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
          Ride MTB · Bike Selector
        </span>
      </div>

      {/* Middle: result */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#94a3b8', fontSize: 22, margin: 0 }}>Your match</p>
        <h1
          style={{
            color: '#f8fafc',
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
          }}
        >
          {record.categoryName}
        </h1>
        {result.categoryDescription && (
          <p style={{ color: '#94a3b8', fontSize: 24, maxWidth: 700, lineHeight: 1.4, margin: 0 }}>
            {result.categoryDescription}
          </p>
        )}
      </div>

      {/* Bottom: spectrum bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        {/* Bar track */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 12,
            borderRadius: 6,
            background: '#1e293b',
            display: 'flex',
          }}
        >
          {/* Fill up to rawScore position */}
          <div
            style={{
              width: `${((rawScore - 1) / 8) * 100}%`,
              height: '100%',
              borderRadius: 6,
              background: `linear-gradient(to right, #60a5fa, ${activeColor})`,
            }}
          />
          {/* Dot at score position */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${((rawScore - 1) / 8) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: activeColor,
              border: '3px solid #0f172a',
            }}
          />
        </div>

        {/* Category labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.num}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cat.num === primary ? activeColor : '#334155',
                }}
              />
              <span
                style={{
                  color: cat.num === primary ? activeColor : '#64748b',
                  fontSize: cat.num === primary ? 18 : 15,
                  fontWeight: cat.num === primary ? 700 : 400,
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size }
  )
}
