import { requireAuth } from '@/lib/auth/guards'
import { getSavedListings } from '@/modules/marketplace/actions/listings'
import { ListingCard } from '@/modules/marketplace/components/listing/ListingCard'

export default async function MySavedPage() {
  await requireAuth()
  const listings = await getSavedListings()

  return (
    <div>
      <h1>Saved Listings</h1>
      {listings.length === 0 ? (
        <p>You have no saved listings yet.</p>
      ) : (
        <div>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
