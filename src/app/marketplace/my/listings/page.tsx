import { requireAuth } from '@/lib/auth/guards'
import { getMyListings } from '@/modules/marketplace/actions/listings'
import { MyListingCard } from '@/modules/marketplace/components/listing/MyListingCard'

export default async function MyListingsPage() {
  await requireAuth()
  const listings = await getMyListings()

  return (
    <div>
      <h1>My Listings</h1>
      {listings.length === 0 ? (
        <p>You have no listings yet.</p>
      ) : (
        <div>
          {listings.map((listing) => (
            <MyListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
