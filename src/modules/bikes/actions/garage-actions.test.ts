// src/modules/bikes/actions/garage-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/db/client', () => {
  const tx = {
    userBike: { create: vi.fn() },
    bikeComponent: { create: vi.fn() },
    buildLogEntry: { create: vi.fn() },
  }
  return {
    db: {
      userBike: { findFirst: vi.fn() },
      $transaction: vi.fn((fn) => fn(tx)),
      _tx: tx,
    },
  }
})

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { duplicateBike, exportBike, importBike } from './garage-actions'

const tx = (db as any)._tx

function makeBike(overrides = {}) {
  return {
    id: 'bike-1',
    userId: 'user-1',
    name: 'Ripley',
    brand: 'Ibis',
    model: 'Ripley AF',
    year: 2022,
    category: 'trail',
    wheelSize: '29"',
    frameSize: 'L',
    weight: 27.5,
    isPrimary: true,
    notes: null,
    frameMaterial: 'aluminum',
    travel: 120,
    purchaseYear: 2022,
    purchasePrice: 3200,
    imageUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    components: [
      { id: 'c-1', bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '34', year: 2022,
        weightGrams: 2100, priceCents: 85000, notes: null, isActive: true,
        installedAt: new Date(), removedAt: null, createdAt: new Date() },
    ],
    buildLog: [
      { id: 'bl-1', bikeId: 'bike-1', userId: 'user-1', title: 'New build',
        description: null, imageUrl: null, entryDate: new Date('2024-03-01'), createdAt: new Date() },
    ],
    ...overrides,
  }
}

describe('duplicateBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    tx.userBike.create.mockResolvedValue({ id: 'bike-new' })
    tx.bikeComponent.create.mockResolvedValue({})
  })

  it('creates a copy with isPrimary false and name appended "(copy)"', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')

    expect(tx.userBike.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Ripley (copy)', isPrimary: false }),
      }),
    )
  })

  it('copies active components', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')
    expect(tx.bikeComponent.create).toHaveBeenCalledTimes(1)
  })

  it('does NOT copy buildLog entries', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')
    expect(tx.buildLogEntry.create).not.toHaveBeenCalled()
  })

  it('throws if bike not found', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(null)
    await expect(duplicateBike('bike-x')).rejects.toThrow('Bike not found')
  })
})

describe('exportBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
  })

  it('returns export structure with version 1', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    const result = await exportBike('bike-1')

    expect(result.version).toBe(1)
    expect(result.bike.name).toBe('Ripley')
    expect(result.bike.brand).toBe('Ibis')
    expect(result.components).toHaveLength(1)
    expect(result.components[0].category).toBe('FORK')
    expect(result.buildLog).toHaveLength(1)
    expect(result.buildLog[0].title).toBe('New build')
  })

  it('throws if bike not found', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(null)
    await expect(exportBike('bike-x')).rejects.toThrow('Bike not found')
  })
})

describe('importBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    tx.userBike.create.mockResolvedValue({ id: 'bike-imported' })
    tx.bikeComponent.create.mockResolvedValue({})
    tx.buildLogEntry.create.mockResolvedValue({})
  })

  const validJson = JSON.stringify({
    version: 1,
    bike: { name: 'Slash', brand: 'Trek', model: '9.8', year: 2023, category: 'enduro' },
    components: [
      { category: 'FORK', brand: 'Fox', model: '38', year: 2023, weightGrams: 2300, priceCents: 100000, notes: null, isActive: true },
    ],
    buildLog: [
      { title: 'Initial build', description: null, entryDate: new Date().toISOString() },
    ],
  })

  it('creates bike, components, and buildLog in transaction', async () => {
    const result = await importBike(validJson)
    expect(result.bikeId).toBe('bike-imported')
    expect(tx.userBike.create).toHaveBeenCalledTimes(1)
    expect(tx.bikeComponent.create).toHaveBeenCalledTimes(1)
    expect(tx.buildLogEntry.create).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid JSON', async () => {
    await expect(importBike('not-json')).rejects.toThrow('Invalid JSON file')
  })

  it('throws on invalid BikeCategory', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: 'X', brand: 'Y', model: 'Z', category: 'INVALID_CATEGORY' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Invalid bike category')
  })

  it('throws on invalid BikeComponentCategory', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: 'X', brand: 'Y', model: 'Z', category: 'trail' }, components: [{ category: 'TURBO', brand: 'X', model: 'X', isActive: true }], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Invalid component category')
  })

  it('throws on missing bike name', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: '', brand: 'Trek', model: 'Slash' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Missing bike name')
  })

  it('throws on unsupported version', async () => {
    const bad = JSON.stringify({ version: 2, bike: { name: 'X' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Unsupported export version')
  })
})
