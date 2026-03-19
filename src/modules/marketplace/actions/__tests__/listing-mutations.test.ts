import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    sellerProfile: {
      findUnique: vi.fn(),
    },
    listing: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
import { revalidatePath } from 'next/cache'
import {
  createListing,
  updateListing,
  deleteListing,
  bumpListing,
  featureListing,
} from '../listing-mutations'

const mockUser = { id: 'user-1', role: 'user' }
const mockOtherUser = { id: 'user-2', role: 'user' }

const baseInput = {
  title: 'Trek Slash 9.9 2023',
  description: 'Excellent condition enduro bike ridden one season',
  category: 'complete_bike' as const,
  condition: 'like_new' as const,
  price: 4500,
  fulfillment: 'local_or_ship' as const,
}

const mockCreatedListing = {
  id: 'listing-1',
  slug: 'trek-slash-9-9-2023-abc123',
  sellerId: 'user-1',
  status: 'pending_review',
  ...baseInput,
  photos: [],
  seller: { id: 'user-1', name: 'Kyle', image: null, sellerProfile: null },
}

const mockExistingListing = {
  id: 'listing-1',
  sellerId: 'user-1',
  slug: 'trek-slash-9-9-2023-abc123',
}

// ---------------------------------------------------------------------------
// createListing
// ---------------------------------------------------------------------------

describe('createListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates listing with pending_review status for non-trusted seller', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.sellerProfile.findUnique).mockResolvedValueOnce(null)
    vi.mocked(db.listing.create).mockResolvedValueOnce(mockCreatedListing as never)

    const result = await createListing(baseInput)

    expect(db.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending_review',
          sellerId: 'user-1',
        }),
      }),
    )
    expect(result.status).toBe('pending_review')
    expect(revalidatePath).toHaveBeenCalledWith('/marketplace')
  })

  it('creates listing with pending_review status even for trusted seller (monolith policy)', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.sellerProfile.findUnique).mockResolvedValueOnce({
      isTrusted: true,
    } as never)
    vi.mocked(db.listing.create).mockResolvedValueOnce(mockCreatedListing as never)

    await createListing(baseInput)

    expect(db.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_review' }),
      }),
    )
  })

  it('throws when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'))

    await expect(createListing(baseInput)).rejects.toThrow()
  })

  it('throws on invalid input', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.sellerProfile.findUnique).mockResolvedValueOnce(null)

    await expect(
      createListing({ ...baseInput, title: 'ab' }), // too short
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// updateListing
// ---------------------------------------------------------------------------

describe('updateListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates listing when caller is the owner', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)
    vi.mocked(db.listing.update).mockResolvedValueOnce({
      ...mockCreatedListing,
      price: 4000,
    } as never)

    const result = await updateListing('listing-1', { price: 4000 })

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: expect.objectContaining({ price: 4000 }),
      }),
    )
    expect(result).toBeDefined()
    expect(revalidatePath).toHaveBeenCalledWith('/marketplace')
  })

  it('throws Unauthorized when caller does not own the listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockOtherUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)

    await expect(updateListing('listing-1', { price: 100 })).rejects.toThrow(/permission/i)
  })

  it('throws when listing does not exist', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(null)

    await expect(updateListing('listing-1', { price: 100 })).rejects.toThrow(/not found/i)
  })
})

// ---------------------------------------------------------------------------
// deleteListing
// ---------------------------------------------------------------------------

describe('deleteListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('changes status to removed when caller is owner', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)
    vi.mocked(db.listing.update).mockResolvedValueOnce({} as never)

    await deleteListing('listing-1')

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: expect.objectContaining({ status: 'removed' }),
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/marketplace')
  })

  it('throws when caller does not own the listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockOtherUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)

    await expect(deleteListing('listing-1')).rejects.toThrow(/permission/i)
  })

  it('throws when listing does not exist', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(null)

    await expect(deleteListing('listing-1')).rejects.toThrow(/not found/i)
  })
})

// ---------------------------------------------------------------------------
// bumpListing
// ---------------------------------------------------------------------------

describe('bumpListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets isBumped and bumpedAt when caller is owner', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)
    vi.mocked(db.listing.update).mockResolvedValueOnce({} as never)

    await bumpListing('listing-1')

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: expect.objectContaining({
          isBumped: true,
          bumpedAt: expect.any(Date),
        }),
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/marketplace')
  })

  it('throws when caller does not own the listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockOtherUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)

    await expect(bumpListing('listing-1')).rejects.toThrow(/permission/i)
  })

  it('throws when listing does not exist', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(null)

    await expect(bumpListing('listing-1')).rejects.toThrow(/not found/i)
  })
})

// ---------------------------------------------------------------------------
// featureListing
// ---------------------------------------------------------------------------

describe('featureListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets isFeatured when caller is owner', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)
    vi.mocked(db.listing.update).mockResolvedValueOnce({} as never)

    await featureListing('listing-1')

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: expect.objectContaining({ isFeatured: true }),
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/marketplace')
  })

  it('sets isFeatured when caller is admin', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'admin-1', role: 'admin' } as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce({
      ...mockExistingListing,
      sellerId: 'other-user',
    } as never)
    vi.mocked(db.listing.update).mockResolvedValueOnce({} as never)

    await featureListing('listing-1')

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isFeatured: true }),
      }),
    )
  })

  it('throws when non-owner non-admin tries to feature a listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(mockOtherUser as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce(mockExistingListing as never)

    await expect(featureListing('listing-1')).rejects.toThrow(/permission/i)
  })
})
