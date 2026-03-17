'use client'

import { useState, useCallback, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronDown, ChevronRight, MapPin, Star, Map, List } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import { SystemClusterMapDynamic, TrailLines } from '@/modules/trails/components'
import type { TrailLineData } from '@/modules/trails/components'
import { SYSTEM_TYPE_LABELS } from '@/modules/trails/lib/difficulty'
import { getSystemsInBoundsAction } from '@/modules/trails/actions/getSystemsInBounds'
import { getSystemTrailsAction } from '@/modules/trails/actions/getSystemTrails'

interface SystemPin {
  id: string
  slug: string
  name: string
  systemType: string
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  trailCount: number
  totalMiles: number
  averageRating: number | null
  reviewCount: number
}

interface Props {
  initialSystems: SystemPin[]
}

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'trail_network', label: 'Trail Network' },
  { value: 'bike_park', label: 'Bike Park' },
  { value: 'open_space', label: 'Open Space' },
  { value: 'urban_park', label: 'Urban Park' },
  { value: 'skills_park', label: 'Skills Park' },
  { value: 'private_property', label: 'Private' },
]

export function ExploreClient({ initialSystems }: Props) {
  const router = useRouter()
  const [systems, setSystems] = useState<SystemPin[]>(initialSystems)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null)
  const [trailsMap, setTrailsMap] = useState<Record<string, TrailLineData[]>>({})
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('map')
  const [, startTransition] = useTransition()

  // Fix 1: useState instead of useRef so loading state triggers re-renders
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // Fix 2: Keep trailsMap in a ref so handleMoveEnd doesn't need it in deps
  const trailsMapRef = useRef(trailsMap)
  useEffect(() => {
    trailsMapRef.current = trailsMap
  }, [trailsMap])

  // Keep loadingIds in a ref so loadTrailsForSystem doesn't need it in deps
  const loadingIdsRef = useRef(loadingIds)
  useEffect(() => {
    loadingIdsRef.current = loadingIds
  }, [loadingIds])

  // Fix 3: Shared trail-fetching helper used by both handleMoveEnd and handleToggleExpand
  const loadTrailsForSystem = useCallback(
    async (systemId: string) => {
      // Guard: skip if already loaded or currently loading
      if (trailsMapRef.current[systemId] || loadingIdsRef.current.has(systemId)) return

      setLoadingIds((prev) => new Set(prev).add(systemId))

      const rawTrails = await getSystemTrailsAction(systemId)
      const mapped: TrailLineData[] = rawTrails
        .filter(
          (t): t is typeof t & { gpsTrack: { trackData: string } } =>
            t.gpsTrack?.trackData != null,
        )
        .map((t) => ({
          slug: t.slug,
          name: t.name,
          physicalDifficulty: t.physicalDifficulty,
          technicalDifficulty: t.technicalDifficulty,
          trackData: t.gpsTrack.trackData,
        }))

      setTrailsMap((prev) => ({ ...prev, [systemId]: mapped }))
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(systemId)
        return next
      })
    },
    [],
  )

  // Client-side filter by search + type
  const filteredSystems = systems.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (s.state?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchesType = !typeFilter || s.systemType === typeFilter
    return matchesSearch && matchesType
  })

  // Valid pins for the map (must have coordinates)
  const mapPins = filteredSystems.filter(
    (s): s is SystemPin & { latitude: number; longitude: number } =>
      s.latitude != null && s.longitude != null,
  )

  // Fix 2: trailsMap removed from deps; read via trailsMapRef.current inside
  const handleMoveEnd = useCallback(
    (bounds: { ne: [number, number]; sw: [number, number] }, _center: [number, number], zoom: number) => {
      startTransition(async () => {
        const results = await getSystemsInBoundsAction(bounds)
        const pins: SystemPin[] = results
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            systemType: r.systemType,
            city: r.city,
            state: r.state,
            latitude: r.latitude,
            longitude: r.longitude,
            trailCount: r.trailCount,
            totalMiles: r.totalMiles,
            averageRating: r.averageRating,
            reviewCount: r.reviewCount,
          }))
        setSystems(pins)

        // Auto-expand if zoomed in enough and only one system visible
        if (zoom >= 11 && pins.length === 1) {
          const single = pins[0]
          setExpandedSystemId(single.id)
          await loadTrailsForSystem(single.id)
        }
      })
    },
    [loadTrailsForSystem],
  )

  const handleSystemClick = useCallback(
    (slug: string) => {
      router.push(`/trails/explore/${slug}`)
    },
    [router],
  )

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    setMapInstance(map)
  }, [])

  const handleToggleExpand = useCallback(
    async (system: SystemPin) => {
      if (expandedSystemId === system.id) {
        setExpandedSystemId(null)
        return
      }
      setExpandedSystemId(system.id)
      await loadTrailsForSystem(system.id)
    },
    [expandedSystemId, loadTrailsForSystem],
  )

  const expandedSystem = filteredSystems.find((s) => s.id === expandedSystemId) ?? null
  const expandedTrails = expandedSystemId ? (trailsMap[expandedSystemId] ?? []) : []

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left sidebar ── */}
      <aside
        className={`flex w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:w-[400px] md:flex-shrink-0 ${
          mobileTab === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Search + filter bar */}
        <div className="border-b border-[var(--color-border)] p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, state..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {filteredSystems.length} system{filteredSystems.length !== 1 ? 's' : ''} in view
          </p>
        </div>

        {/* System list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
          {filteredSystems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <MapPin className="h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">No trail systems found</p>
              <p className="text-xs text-[var(--color-text-muted)]">Pan the map or adjust your filters</p>
            </div>
          ) : (
            filteredSystems.map((system) => {
              const isExpanded = expandedSystemId === system.id
              const trails = trailsMap[system.id] ?? []
              return (
                <div key={system.id}>
                  {/* System row */}
                  <div className="flex items-start gap-2 px-4 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <button
                      onClick={() => handleToggleExpand(system)}
                      className="mt-0.5 shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      aria-label={isExpanded ? 'Collapse trails' : 'Expand trails'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/trails/explore/${system.slug}`}
                        className="block text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] truncate"
                      >
                        {system.name}
                      </Link>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {[system.city, system.state].filter(Boolean).join(', ')}
                        {system.systemType && (
                          <>
                            {' · '}
                            <span className="text-[var(--color-primary)]/80">
                              {SYSTEM_TYPE_LABELS[system.systemType] ?? system.systemType}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                        <span>{system.trailCount} trails</span>
                        {system.totalMiles > 0 && (
                          <span>{system.totalMiles.toFixed(1)} mi</span>
                        )}
                        {system.averageRating != null && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {Number(system.averageRating).toFixed(1)}
                            {system.reviewCount > 0 && (
                              <span>({system.reviewCount})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded trail list */}
                  {isExpanded && (
                    <div className="bg-[var(--color-bg-secondary)] pl-10 pr-4 pb-2">
                      {loadingIds.has(system.id) ? (
                        <p className="py-3 text-xs text-[var(--color-text-muted)]">Loading trails…</p>
                      ) : trails.length === 0 ? (
                        <p className="py-3 text-xs text-[var(--color-text-muted)]">No GPS trails available</p>
                      ) : (
                        <ul className="divide-y divide-[var(--color-border)]">
                          {trails.map((trail) => (
                            <li key={trail.slug}>
                              <Link
                                href={`/trails/explore/${system.slug}/${trail.slug}`}
                                className="block py-2 text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] truncate"
                              >
                                {trail.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Right map panel ── */}
      <div
        className={`relative flex-1 ${
          mobileTab === 'map' ? 'flex' : 'hidden md:flex'
        } flex-col`}
      >
        <SystemClusterMapDynamic
          systems={mapPins.map((s) => ({
            slug: s.slug,
            name: s.name,
            city: s.city ?? '',
            state: s.state ?? '',
            latitude: s.latitude,
            longitude: s.longitude,
            trailCount: s.trailCount,
            averageRating: s.averageRating,
          }))}
          className="h-full w-full"
          onSystemClick={handleSystemClick}
          onMapReady={handleMapReady}
          onMoveEnd={handleMoveEnd}
        />
        {/* Render trail lines when a system is expanded */}
        {expandedSystem && expandedTrails.length > 0 && (
          <TrailLines map={mapInstance} trails={expandedTrails} />
        )}
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'list'
              ? 'text-[var(--color-primary)] border-t-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <List className="h-4 w-4" />
          List
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'map'
              ? 'text-[var(--color-primary)] border-t-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <Map className="h-4 w-4" />
          Map
        </button>
      </div>
    </div>
  )
}
