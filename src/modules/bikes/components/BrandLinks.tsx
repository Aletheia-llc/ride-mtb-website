import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface BrandLinksProps {
  categoryNumber: number
  budget?: number
  ebike?: boolean
}

const BRAND_LOGOS: Record<string, string> = {
  Trek: '/images/brands/trek.png',
  Specialized: '/images/brands/specialized.png',
  'Santa Cruz': '/images/brands/santacruz.png',
  Canyon: '/images/brands/canyon.png',
  Giant: '/images/brands/giant.png',
  'YT Industries': '/images/brands/yt.png',
}

const BRAND_DATA: Record<number, { name: string; url: string; priceRange: string; models: string }[]> = {
  1: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/', priceRange: '$1,500–$12,000', models: 'Marlin, Procaliber, Top Fuel' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/cross-country', priceRange: '$1,200–$13,000', models: 'Rockhopper, Epic' },
    { name: 'Giant', url: 'https://www.giant-bicycles.com/us/bikes/mountain/xc', priceRange: '$900–$11,000', models: 'Talon, Anthem' },
  ],
  3: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/', priceRange: '$2,000–$11,000', models: 'Marlin, Roscoe, Fuel EX' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/trail', priceRange: '$1,600–$12,000', models: 'Stumpjumper, Fuse' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/hightower', priceRange: '$3,500–$10,000', models: 'Hightower, Tallboy' },
  ],
  5: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/', priceRange: '$2,500–$11,000', models: 'Fuel EX, Remedy' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/trail', priceRange: '$2,000–$12,000', models: 'Stumpjumper, Stumpjumper Evo' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/hightower', priceRange: '$3,500–$10,000', models: 'Hightower, Tallboy' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/trail/', priceRange: '$2,500–$8,000', models: 'Spectral, Neuron' },
  ],
  7: [
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/enduro', priceRange: '$4,500–$13,000', models: 'Enduro, Stumpjumper Evo' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/megatower', priceRange: '$5,000–$12,000', models: 'Megatower, Nomad' },
    { name: 'YT Industries', url: 'https://www.yt-industries.com/en/bikes/mountain/', priceRange: '$3,500–$7,500', models: 'Capra, Tues' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/enduro/', priceRange: '$3,000–$8,000', models: 'Torque, Strive' },
  ],
  9: [
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
        {brands.map((brand) => {
          const logo = BRAND_LOGOS[brand.name]
          return (
            <Link
              key={brand.name}
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--color-primary)]"
            >
              <div className="flex items-center gap-2.5">
                {logo && (
                  <Image src={logo} alt={brand.name} width={24} height={24} className="h-6 w-6 shrink-0 rounded object-contain" unoptimized />
                )}
                <div>
                  <span className="font-medium text-[var(--color-text)]">{brand.name}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">{brand.models}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{brand.priceRange}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
