import Link from 'next/link'
import Image from 'next/image'
import { Phone, Wrench, MapPin } from 'lucide-react'
import { Card, Badge } from '@/ui/components'
import type { ShopSummary } from '../types'

interface ShopCardProps {
  shop: ShopSummary
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shops/${shop.slug}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          {/* Shop image */}
          {shop.imageUrl && (
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={shop.imageUrl}
                alt={shop.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            {/* Name */}
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              {shop.name}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <MapPin className="h-4 w-4" />
              <span>{shop.city}, {shop.state}</span>
            </div>

            {/* Phone */}
            {shop.phone && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Phone className="h-4 w-4" />
                <span>{shop.phone}</span>
              </div>
            )}

            {/* Services preview */}
            <div className="flex flex-wrap items-center gap-2">
              {shop.servicesCount > 0 && (
                <Badge variant="info">
                  <Wrench className="mr-1 h-3 w-3" />
                  {shop.servicesCount} {shop.servicesCount === 1 ? 'service' : 'services'}
                </Badge>
              )}
              {shop.brandsCount > 0 && (
                <Badge variant="default">
                  {shop.brandsCount} {shop.brandsCount === 1 ? 'brand' : 'brands'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
