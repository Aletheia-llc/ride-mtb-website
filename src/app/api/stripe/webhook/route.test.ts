import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/modules/creators/lib/stripe', () => ({
  constructStripeEvent: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'
import { POST } from './route'

function makeWebhookRequest(body: string) {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'test-sig', 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/stripe/webhook', () => {
  it('returns 400 when stripe signature verification fails', async () => {
    vi.mocked(constructStripeEvent).mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('activates creator when account.updated has details_submitted and charges_enabled', async () => {
    const mockEvent = {
      type: 'account.updated',
      data: { object: { id: 'acct_123', details_submitted: true, charges_enabled: true } },
    }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)
    vi.mocked(db.creatorProfile.findFirst).mockResolvedValueOnce({
      id: 'profile-1', stripeAccountId: 'acct_123',
    } as any)
    vi.mocked(db.creatorProfile.update).mockResolvedValueOnce({} as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { status: 'active' },
    })
  })

  it('does not activate creator when details_submitted is false', async () => {
    const mockEvent = {
      type: 'account.updated',
      data: { object: { id: 'acct_123', details_submitted: false, charges_enabled: false } },
    }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('returns 200 for unhandled event types (no-op)', async () => {
    const mockEvent = { type: 'payment_intent.created', data: { object: {} } }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })
})
