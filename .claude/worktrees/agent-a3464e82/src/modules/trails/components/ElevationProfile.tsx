'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { GpsPoint } from '../types'

interface ElevationProfileProps {
  trackData: string // JSON string of GpsPoint[]
  className?: string
}

const M_TO_FT = 3.28084

/**
 * Haversine distance between two GPS points in miles.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface ProfilePoint {
  distance: number // cumulative miles
  elevation: number // feet
}

function buildProfile(trackData: string): ProfilePoint[] | null {
  let points: GpsPoint[]
  try {
    points = JSON.parse(trackData)
  } catch {
    return null
  }

  if (!points || points.length < 2) return null

  // Build cumulative distance + elevation
  const profile: ProfilePoint[] = []
  let cumDist = 0

  for (let i = 0; i < points.length; i++) {
    const [lat, lng, ele] = points[i]
    if (i > 0) {
      const [prevLat, prevLng] = points[i - 1]
      cumDist += haversineDistance(prevLat, prevLng, lat, lng)
    }
    profile.push({
      distance: cumDist,
      elevation: ele * M_TO_FT,
    })
  }

  // Downsample to max 200 points
  if (profile.length <= 200) return profile

  const step = profile.length / 200
  const downsampled: ProfilePoint[] = []
  for (let i = 0; i < 200; i++) {
    const idx = Math.min(Math.round(i * step), profile.length - 1)
    downsampled.push(profile[idx])
  }
  // Always include last point
  if (downsampled[downsampled.length - 1] !== profile[profile.length - 1]) {
    downsampled[downsampled.length - 1] = profile[profile.length - 1]
  }

  return downsampled
}

function computeStats(profile: ProfilePoint[]) {
  let gain = 0
  let loss = 0
  let minEle = Infinity
  let maxEle = -Infinity

  for (let i = 0; i < profile.length; i++) {
    const ele = profile[i].elevation
    if (ele < minEle) minEle = ele
    if (ele > maxEle) maxEle = ele
    if (i > 0) {
      const diff = ele - profile[i - 1].elevation
      if (diff > 0) gain += diff
      else loss += Math.abs(diff)
    }
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    min: Math.round(minEle),
    max: Math.round(maxEle),
  }
}

export function ElevationProfile({ trackData, className = '' }: ElevationProfileProps) {
  const profile = useMemo(() => buildProfile(trackData), [trackData])

  if (!profile) return null

  const stats = computeStats(profile)

  return (
    <div className={className}>
      {/* Chart */}
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={profile}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
              label={{
                value: 'mi',
                position: 'insideBottomRight',
                offset: -4,
                style: { fontSize: 10, fill: 'var(--color-text-muted)' },
              }}
            />
            <YAxis
              domain={['dataMin - 100', 'dataMax + 100']}
              tickFormatter={(v: number) => `${Math.round(v).toLocaleString()}`}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
              width={52}
              label={{
                value: 'ft',
                position: 'insideTopLeft',
                offset: -4,
                style: { fontSize: 10, fill: 'var(--color-text-muted)' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [
                `${Math.round(Number(value)).toLocaleString()} ft`,
                'Elevation',
              ]}
              labelFormatter={(label) => `${Number(label).toFixed(2)} mi`}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#16a34a"
              strokeWidth={2}
              fill="url(#elevGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
        <span>
          Gain:{' '}
          <strong className="font-medium text-[var(--color-text)]">
            {stats.gain.toLocaleString()} ft
          </strong>
        </span>
        <span>
          Loss:{' '}
          <strong className="font-medium text-[var(--color-text)]">
            {stats.loss.toLocaleString()} ft
          </strong>
        </span>
        <span>
          Min:{' '}
          <strong className="font-medium text-[var(--color-text)]">
            {stats.min.toLocaleString()} ft
          </strong>
        </span>
        <span>
          Max:{' '}
          <strong className="font-medium text-[var(--color-text)]">
            {stats.max.toLocaleString()} ft
          </strong>
        </span>
      </div>
    </div>
  )
}
