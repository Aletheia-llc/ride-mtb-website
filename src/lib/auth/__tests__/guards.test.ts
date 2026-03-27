import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/auth/config', () => ({ auth: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ db: { shop: { findUnique: vi.fn() } } }))

import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { requireShopOwner } from '../guards'

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)
const mockNotFound = vi.mocked(notFound)
const mockFindUnique = vi.mocked(db.shop.findUnique)

beforeEach(() => vi.clearAllMocks())

describe('requireShopOwner', () => {
  it('redirects to /signin if not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    mockRedirect.mockImplementation(() => { throw new Error('redirect') })

    await expect(requireShopOwner('my-shop')).rejects.toThrow('redirect')
    expect(mockRedirect).toHaveBeenCalledWith('/signin')
  })

  it('calls notFound if shop does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue(null)
    mockNotFound.mockImplementation(() => { throw new Error('notFound') })

    await expect(requireShopOwner('nonexistent')).rejects.toThrow('notFound')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('redirects to /403 if user is not the owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u-other', slug: 'my-shop' } as any)
    mockRedirect.mockImplementation(() => { throw new Error('redirect') })

    await expect(requireShopOwner('my-shop')).rejects.toThrow('redirect')
    expect(mockRedirect).toHaveBeenCalledWith('/403')
  })

  it('returns shop and user if user is the owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u1', slug: 'my-shop' } as any)

    const result = await requireShopOwner('my-shop')
    expect(result.user.id).toBe('u1')
    expect(result.shop.slug).toBe('my-shop')
  })

  it('allows admin to access any shop', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u-other', slug: 'my-shop' } as any)

    const result = await requireShopOwner('my-shop')
    expect(result.user.id).toBe('admin1')
  })
})
