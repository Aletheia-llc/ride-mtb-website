import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface BrandLinksProps {
  categoryNumber: number
  budget?: number
  ebike?: boolean
}

const BRAND_DATA: Record<number, { name: string; url: string; priceRange: string; models: string }[]> = {
  1: [ // Gravel / XC
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/', priceRange: '$1,500–$12,000', models: 'Marlin, Procaliber, Top Fuel' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/cross-country', priceRange: '$1,200–$13,000', models: 'Rockhopper, Epic' },
    { name: 'Giant', url: 'https://www.giant-bicycles.com/us/bikes/mountain/xc', priceRange: '$900–$11,000', models: 'Talon, Anthem' },
    { name: 'Cannondale', url: 'https://www.cannondale.com/en-us/bikes/mountain/cross-country', priceRange: '$1,100–$10,000', models: 'Habit, Scalpel' },
  ],
  3: [ // Trail
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/', priceRange: '$2,000–$11,000', models: 'Marlin, Roscoe, Fuel EX' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/trail', priceRange: '$1,600–$12,000', models: 'Stumpjumper, Fuse' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/hightower', priceRange: '$3,500–$10,000', models: 'Hightower, Tallboy' },
    { name: 'Yeti', url: 'https://www.yeticycles.com/bikes.html', priceRange: '$4,000–$11,000', models: 'SB115, SB140' },
  ],
  5: [ // Enduro/All-Mountain
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/', priceRange: '$3,500–$12,000', models: 'Slash, Remedy' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/enduro', priceRange: '$3,000–$12,000', models: 'Enduro, Stumpjumper Evo' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/megatower', priceRange: '$4,500–$12,000', models: 'Megatower, Nomad' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/enduro/', priceRange: '$2,800–$9,000', models: 'Spectral, Strive' },
  ],
  7: [ // Enduro/Big Mountain
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/', priceRange: '$4,000–$12,000', models: 'Slash 9, Session' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/enduro', priceRange: '$4,000–$13,000', models: 'Demo, Enduro' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/v10', priceRange: '$5,000–$12,000', models: 'V10, Megatower' },
    { name: 'Yeti', url: 'https://www.yeticycles.com/bikes.html', priceRange: '$4,500–$12,000', models: 'SB165, SB160' },
  ],
  9: [ // Downhill
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/downhill-mountain-bikes/', priceRange: '$4,500–$8,500', models: 'Session 9.9' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/downhill', priceRange: '$4,500–$9,000', models: 'Demo 8' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/v10', priceRange: '$6,000–$10,000', models: 'V10' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/downhill/', priceRange: '$3,500–$8,000', models: 'Sender' },
  ],
}

export function BrandLinks({ categoryNumber, budget: _budget, ebike }: BrandLinksProps) {
  const brands = BRAND_DATA[categoryNumber] ?? BRAND_DATA[5]

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Brands to Check Out
      </h2>
      {ebike && (
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Also check the e-MTB lineup from each brand.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--color-primary)]"
          >
            <div>
              <span className="font-medium text-[var(--color-text)]">{brand.name}</span>
              <span className="ml-2 text-xs text-[var(--color-text-muted)]">{brand.models}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{brand.priceRange}</span>
              <ExternalLink className="h-3 w-3 text-[var(--color-text-muted)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
