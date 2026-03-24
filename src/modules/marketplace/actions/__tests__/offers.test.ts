import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    listing: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    offer: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    listingConversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    listingMessage: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import {
  makeOffer,
  acceptOffer,
  declineOffer,
  counterOffer,
  withdrawOffer,
} from '../offers'

const mockBuyer = { id: 'buyer-1', role: 'user' }
const mockSeller = { id: 'seller-1', role: 'user' }

const mockListing = {
  id: 'listing-1',
  sellerId: 'seller-1',
  status: 'active',
  acceptsOffers: true,
  minOfferPercent: null,
  price: 1000,
  title: 'Trek Slash',
  slug: 'trek-slash-abc123',
}

const mockOffer = {
  id: 'offer-1',
  listingId: 'listing-1',
  buyerId: 'buyer-1',
  amount: 800,
  message: null,
  status: 'pending',
  parentOfferId: null,
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  listing: {
    id: 'listing-1',
    sellerId: 'seller-1',
    slug: 'trek-slash-abc123',
  },
}

const mockConversation = {
  id: 'conv-1',
  listingId: 'listing-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
}

// ---------------------------------------------------------------------------
// Helpers to reduce repetition
// ---------------------------------------------------------------------------

function setupDbForOffer() {
  vi.mocked(db.listingConversation.findFirst).mockResolvedValue(mockConversation as any)
  vi.mocked(db.listingMessage.create).mockResolvedValue({} as any)
}

// ---------------------------------------------------------------------------
// makeOffer
// ---------------------------------------------------------------------------

describe('makeOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForOffer()
  })

  it('creates an offer when caller is authenticated buyer', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)
    vi.mocked(db.offer.findFirst).mockResolvedValue(null)
    vi.mocked(db.offer.create).mockResolvedValue({ id: 'offer-new', ...mockOffer } as any)

    const result = await makeOffer('listing-1', 800, 'I love this bike')

    expect(db.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          amount: 800,
          message: 'I love this bike',
          status: 'pending',
        }),
      }),
    )
    expect(result).toHaveProperty('id')
  })

  it('throws if not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

    await expect(makeOffer('listing-1', 800)).rejects.toThrow()
  })

  it('throws if buyer tries to offer on their own listing', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)
    vi.mocked(db.offer.findFirst).mockResolvedValue(null)

    await expect(makeOffer('listing-1', 800)).rejects.toThrow(
      'You cannot make an offer on your own listing.',
    )
  })

  it('throws if listing is not active', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue({
      ...mockListing,
      status: 'sold',
    } as any)

    await expect(makeOffer('listing-1', 800)).rejects.toThrow(
      'This listing is no longer active.',
    )
  })

  it('throws if listing does not accept offers', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue({
      ...mockListing,
      acceptsOffers: false,
    } as any)

    await expect(makeOffer('listing-1', 800)).rejects.toThrow(
      'This listing does not accept offers.',
    )
  })

  it('throws if buyer already has a pending offer on this listing', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)
    vi.mocked(db.offer.findFirst).mockResolvedValue(mockOffer as any)

    await expect(makeOffer('listing-1', 900)).rejects.toThrow(
      'You already have a pending offer on this listing.',
    )
  })

  it('throws if amount is below minOfferPercent threshold', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue({
      ...mockListing,
      minOfferPercent: 80,
      price: 1000,
    } as any)
    vi.mocked(db.offer.findFirst).mockResolvedValue(null)

    await expect(makeOffer('listing-1', 700)).rejects.toThrow(
      /at least 80%/,
    )
  })
})

// ---------------------------------------------------------------------------
// acceptOffer
// ---------------------------------------------------------------------------

describe('acceptOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForOffer()
  })

  it('updates offer status to accepted when caller is the seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)
    vi.mocked(db.offer.update).mockResolvedValue({ ...mockOffer, status: 'accepted' } as any)
    vi.mocked(db.offer.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(db.listing.update).mockResolvedValue(mockListing as any)

    await acceptOffer('offer-1')

    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'accepted' }),
      }),
    )
    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'reserved' },
      }),
    )
  })

  it('throws if caller is not the listing seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)

    await expect(acceptOffer('offer-1')).rejects.toThrow(
      'Only the seller can accept offers.',
    )
  })

  it('throws if offer is not pending', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue({
      ...mockOffer,
      status: 'declined',
    } as any)

    await expect(acceptOffer('offer-1')).rejects.toThrow(
      'This offer is no longer pending.',
    )
  })

  it('declines all other pending offers on the same listing when accepting', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)
    vi.mocked(db.offer.update).mockResolvedValue({ ...mockOffer, status: 'accepted' } as any)
    vi.mocked(db.offer.updateMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(db.listing.update).mockResolvedValue(mockListing as any)

    await acceptOffer('offer-1')

    expect(db.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          listingId: 'listing-1',
          id: { not: 'offer-1' },
          status: 'pending',
        }),
        data: expect.objectContaining({ status: 'declined' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// declineOffer
// ---------------------------------------------------------------------------

describe('declineOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForOffer()
  })

  it('updates offer status to declined when caller is the seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)
    vi.mocked(db.offer.update).mockResolvedValue({ ...mockOffer, status: 'declined' } as any)

    await declineOffer('offer-1')

    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'declined' }),
      }),
    )
  })

  it('throws if caller is not the listing seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)

    await expect(declineOffer('offer-1')).rejects.toThrow(
      'Only the seller can decline offers.',
    )
  })

  it('throws if offer is not pending', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue({
      ...mockOffer,
      status: 'accepted',
    } as any)

    await expect(declineOffer('offer-1')).rejects.toThrow(
      'This offer is no longer pending.',
    )
  })
})

// ---------------------------------------------------------------------------
// counterOffer
// ---------------------------------------------------------------------------

describe('counterOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForOffer()
  })

  it('creates a new offer linked to the original and marks original as countered', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)
    vi.mocked(db.offer.update).mockResolvedValue({ ...mockOffer, status: 'countered' } as any)
    const newOffer = { ...mockOffer, id: 'offer-2', amount: 900, parentOfferId: 'offer-1' }
    vi.mocked(db.offer.create).mockResolvedValue(newOffer as any)

    const result = await counterOffer('offer-1', 900)

    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'countered' }),
      }),
    )
    expect(db.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentOfferId: 'offer-1',
          amount: 900,
          buyerId: 'buyer-1',
          listingId: 'listing-1',
        }),
      }),
    )
    expect(result).toHaveProperty('id', 'offer-2')
  })

  it('throws if caller is not the listing seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)

    await expect(counterOffer('offer-1', 900)).rejects.toThrow(
      'Only the seller can counter offers.',
    )
  })

  it('throws if offer is not pending', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue({
      ...mockOffer,
      status: 'withdrawn',
    } as any)

    await expect(counterOffer('offer-1', 900)).rejects.toThrow(
      'This offer is no longer pending.',
    )
  })
})

// ---------------------------------------------------------------------------
// withdrawOffer
// ---------------------------------------------------------------------------

describe('withdrawOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForOffer()
  })

  it('updates offer status to withdrawn when caller is the buyer', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)
    vi.mocked(db.offer.update).mockResolvedValue({ ...mockOffer, status: 'withdrawn' } as any)

    await withdrawOffer('offer-1')

    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'withdrawn' }),
      }),
    )
  })

  it('throws if caller is not the offer creator (buyer)', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue(mockOffer as any)

    await expect(withdrawOffer('offer-1')).rejects.toThrow(
      'Only the buyer can withdraw an offer.',
    )
  })

  it('throws if offer is not pending', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.offer.findUniqueOrThrow).mockResolvedValue({
      ...mockOffer,
      status: 'accepted',
    } as any)

    await expect(withdrawOffer('offer-1')).rejects.toThrow(
      'This offer is no longer pending.',
    )
  })
})
