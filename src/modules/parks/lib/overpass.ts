import type { FacilityType, OsmFacility } from '../types'

const US_BBOX = '24.396308,-124.848974,49.384358,-66.885444'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const TIMEOUT_MS = 60_000

export const FACILITY_QUERIES: Array<{ type: FacilityType; label: string; query: string }> = [
  {
    type: 'SKATEPARK',
    label: 'Skateparks',
    query: `[out:json][timeout:60];(way["sport"="skateboard"](${US_BBOX});relation["sport"="skateboard"](${US_BBOX}););out center tags;`,
  },
  {
    type: 'PUMPTRACK',
    label: 'Pump Tracks',
    query: `[out:json][timeout:60];(way["cycling"="pump_track"](${US_BBOX});way["mtb:type"="pumptrack"](${US_BBOX});relation["cycling"="pump_track"](${US_BBOX});relation["mtb:type"="pumptrack"](${US_BBOX}););out center tags;`,
  },
  {
    type: 'BIKEPARK',
    label: 'Bike Parks',
    query: `[out:json][timeout:60];(way["leisure"="bikepark"](${US_BBOX});relation["leisure"="bikepark"](${US_BBOX}););out center tags;`,
  },
]

export async function runOverpassQuery(query: string): Promise<unknown[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
    const json = await res.json() as { elements: unknown[] }
    return json.elements ?? []
  } finally {
    clearTimeout(timer)
  }
}

export function buildOsmId(element: { type: string; id: number }): string {
  const prefix = element.type === 'relation' ? 'r' : 'w'
  return `${prefix}${element.id}`
}

export function getCenter(element: {
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
}): { lat: number; lon: number } | null {
  if (element.type === 'way' && element.center) {
    return element.center
  }
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon }
  }
  return null
}

export function buildSlug(name: string, osmId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
  return `${base}-${osmId}`
}

export const STATE_SLUG_MAP: Record<string, { name: string; slug: string }> = {
  AL: { name: 'Alabama', slug: 'alabama' },
  AK: { name: 'Alaska', slug: 'alaska' },
  AZ: { name: 'Arizona', slug: 'arizona' },
  AR: { name: 'Arkansas', slug: 'arkansas' },
  CA: { name: 'California', slug: 'california' },
  CO: { name: 'Colorado', slug: 'colorado' },
  CT: { name: 'Connecticut', slug: 'connecticut' },
  DE: { name: 'Delaware', slug: 'delaware' },
  FL: { name: 'Florida', slug: 'florida' },
  GA: { name: 'Georgia', slug: 'georgia' },
  HI: { name: 'Hawaii', slug: 'hawaii' },
  ID: { name: 'Idaho', slug: 'idaho' },
  IL: { name: 'Illinois', slug: 'illinois' },
  IN: { name: 'Indiana', slug: 'indiana' },
  IA: { name: 'Iowa', slug: 'iowa' },
  KS: { name: 'Kansas', slug: 'kansas' },
  KY: { name: 'Kentucky', slug: 'kentucky' },
  LA: { name: 'Louisiana', slug: 'louisiana' },
  ME: { name: 'Maine', slug: 'maine' },
  MD: { name: 'Maryland', slug: 'maryland' },
  MA: { name: 'Massachusetts', slug: 'massachusetts' },
  MI: { name: 'Michigan', slug: 'michigan' },
  MN: { name: 'Minnesota', slug: 'minnesota' },
  MS: { name: 'Mississippi', slug: 'mississippi' },
  MO: { name: 'Missouri', slug: 'missouri' },
  MT: { name: 'Montana', slug: 'montana' },
  NE: { name: 'Nebraska', slug: 'nebraska' },
  NV: { name: 'Nevada', slug: 'nevada' },
  NH: { name: 'New Hampshire', slug: 'new-hampshire' },
  NJ: { name: 'New Jersey', slug: 'new-jersey' },
  NM: { name: 'New Mexico', slug: 'new-mexico' },
  NY: { name: 'New York', slug: 'new-york' },
  NC: { name: 'North Carolina', slug: 'north-carolina' },
  ND: { name: 'North Dakota', slug: 'north-dakota' },
  OH: { name: 'Ohio', slug: 'ohio' },
  OK: { name: 'Oklahoma', slug: 'oklahoma' },
  OR: { name: 'Oregon', slug: 'oregon' },
  PA: { name: 'Pennsylvania', slug: 'pennsylvania' },
  RI: { name: 'Rhode Island', slug: 'rhode-island' },
  SC: { name: 'South Carolina', slug: 'south-carolina' },
  SD: { name: 'South Dakota', slug: 'south-dakota' },
  TN: { name: 'Tennessee', slug: 'tennessee' },
  TX: { name: 'Texas', slug: 'texas' },
  UT: { name: 'Utah', slug: 'utah' },
  VT: { name: 'Vermont', slug: 'vermont' },
  VA: { name: 'Virginia', slug: 'virginia' },
  WA: { name: 'Washington', slug: 'washington' },
  WV: { name: 'West Virginia', slug: 'west-virginia' },
  WI: { name: 'Wisconsin', slug: 'wisconsin' },
  WY: { name: 'Wyoming', slug: 'wyoming' },
  DC: { name: 'Washington DC', slug: 'washington-dc' },
}

export function parseOsmElement(
  element: Record<string, unknown>,
  facilityType: FacilityType,
): OsmFacility | null {
  const tags = (element.tags ?? {}) as Record<string, string>
  const osmId = buildOsmId(element as { type: string; id: number })
  const center = getCenter(element as Parameters<typeof getCenter>[0])
  if (!center) return null

  const name = tags.name ?? tags['name:en'] ?? ''
  if (!name) return null

  const stateAbbr = tags['addr:state'] ?? null
  const stateInfo = stateAbbr ? (STATE_SLUG_MAP[stateAbbr.toUpperCase()] ?? null) : null

  const litTag = tags.lit
  const feeTag = tags.fee

  return {
    osmId,
    type: facilityType,
    name,
    slug: buildSlug(name, osmId),
    latitude: center.lat,
    longitude: center.lon,
    address: tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : null,
    city: tags['addr:city'] ?? null,
    state: stateInfo?.name ?? null,
    stateSlug: stateInfo?.slug ?? null,
    operator: tags.operator ?? null,
    openingHours: tags.opening_hours ?? null,
    surface: tags.surface ?? null,
    website: tags.website ?? tags.url ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    lit: litTag === 'yes' ? true : litTag === 'no' ? false : null,
    fee: feeTag === 'yes' ? true : feeTag === 'no' ? false : null,
    metadata: tags,
  }
}
