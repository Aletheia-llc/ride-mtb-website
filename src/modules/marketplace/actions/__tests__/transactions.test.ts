import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    listing: {
      findUniqueOrThrow: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
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
  createTransaction,
  updateTransactionStatus,
  addTracking,
  getTransaction,
  getMyPurchases,
  getMySales,
} from '../transactions'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockBuyer = { id: 'buyer-1', role: 'user' }
const mockSeller = { id: 'seller-1', role: 'user' }

const mockListing = {
  id: 'listing-1',
  sellerId: 'seller-1',
  price: 100,
  title: 'Trek Slash 9.9',
  slug: 'trek-slash-9-9-abc123',
  shippingCost: 0,
  fulfillment: 'ship_only',
}

const mockTransaction = {
  id: 'tx-1',
  listingId: 'listing-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  salePrice: 100,
  shippingCost: 0,
  platformFee: 5,
  sellerPayout: 95,
  totalCharged: 100,
  stripePaymentIntentId: 'pi_test_123',
  trackingNumber: null,
  trackingCarrier: null,
  shippedAt: null,
  deliveredAt: null,
  status: 'paid',
  createdAt: new Date(),
  updatedAt: new Date(),
  listing: mockListing,
  buyer: mockBuyer,
  seller: mockSeller,
}

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------

describe('createTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PLATFORM_FEE_PERCENT = '5'
  })

  it('creates a transaction record with correct platform fee', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)
    vi.mocked(db.transaction.create).mockResolvedValue(mockTransaction as any)

    const result = await createTransaction(
      'listing-1',
      'buyer-1',
      100,
      'pi_test_123',
      'ship_only',
    )

    expect(db.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          salePrice: 100,
          stripePaymentIntentId: 'pi_test_123',
        }),
      }),
    )
    expect(result).toHaveProperty('id')
  })

  it('calculates platform fee correctly — $100 item at 5% = 500 cents ($5.00)', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)

    let capturedData: any
    vi.mocked(db.transaction.create).mockImplementation(async (args: any) => {
      capturedData = args.data
      return mockTransaction as any
    })

    await createTransaction('listing-1', 'buyer-1', 100, 'pi_test_123', 'ship_only')

    // platformFee stored in dollars = 5.00 (Math.round(100 * 100 * 0.05) / 100)
    expect(capturedData.platformFee).toBeCloseTo(5.0, 2)
  })

  it('calculates sellerPayout as salePrice minus platformFee', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.listing.findUniqueOrThrow).mockResolvedValue(mockListing as any)

    let capturedData: any
    vi.mocked(db.transaction.create).mockImplementation(async (args: any) => {
      capturedData = args.data
      return mockTransaction as any
    })

    await createTransaction('listing-1', 'buyer-1', 100, 'pi_test_123', 'ship_only')

    // sellerPayout = 100 - 5 = 95
    expect(capturedData.sellerPayout).toBeCloseTo(95.0, 2)
  })
})

// ---------------------------------------------------------------------------
// updateTransactionStatus
// ---------------------------------------------------------------------------

describe('updateTransactionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates transaction status when caller is the seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)
    vi.mocked(db.transaction.update).mockResolvedValue({
      ...mockTransaction,
      status: 'shipped',
    } as any)

    await updateTransactionStatus('tx-1', 'shipped')

    expect(db.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-1' },
        data: expect.objectContaining({ status: 'shipped' }),
      }),
    )
  })

  it('updates transaction status when caller is the buyer', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)
    vi.mocked(db.transaction.update).mockResolvedValue({
      ...mockTransaction,
      status: 'delivered',
    } as any)

    await updateTransactionStatus('tx-1', 'delivered')

    expect(db.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-1' },
        data: expect.objectContaining({ status: 'delivered' }),
      }),
    )
  })

  it('throws if caller is neither buyer nor seller', async () => {
    const stranger = { id: 'stranger-1', role: 'user' }
    vi.mocked(requireAuth).mockResolvedValue(stranger as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)

    await expect(updateTransactionStatus('tx-1', 'shipped')).rejects.toThrow(
      /not authorized/i,
    )
  })

  it('includes optional trackingNumber when provided', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)
    vi.mocked(db.transaction.update).mockResolvedValue({
      ...mockTransaction,
      status: 'shipped',
      trackingNumber: '1Z999AA1012345678',
    } as any)

    await updateTransactionStatus('tx-1', 'shipped', '1Z999AA1012345678')

    expect(db.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trackingNumber: '1Z999AA1012345678' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// addTracking
// ---------------------------------------------------------------------------

describe('addTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets tracking number and carrier, changes status to shipped', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSeller as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)
    vi.mocked(db.transaction.update).mockResolvedValue({
      ...mockTransaction,
      status: 'shipped',
      trackingNumber: '1Z999AA1012345678',
      trackingCarrier: 'UPS',
    } as any)

    const result = await addTracking('tx-1', '1Z999AA1012345678', 'UPS')

    expect(db.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-1' },
        data: expect.objectContaining({
          trackingNumber: '1Z999AA1012345678',
          trackingCarrier: 'UPS',
          status: 'shipped',
        }),
      }),
    )
    expect(result).toHaveProperty('status', 'shipped')
  })

  it('throws if caller is not the seller', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockBuyer as any)
    vi.mocked(db.transaction.findUniqueOrThrow).mockResolvedValue(mockTransaction as any)

    await expect(addTracking('tx-1', '1Z999AA1012345678', 'UPS')).rejects.toThrow(
      /only the seller/i,
    )
  })
})
