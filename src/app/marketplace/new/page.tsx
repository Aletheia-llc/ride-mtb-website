import { redirect } from 'next/navigation'

/**
 * /marketplace/new → canonical create-listing route at /marketplace/sell
 */
export default function NewListingPage() {
  redirect('/marketplace/sell')
}
