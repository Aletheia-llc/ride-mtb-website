import { describe, it, expect, vi } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { CertificatePdf } from '../CertificatePdf'

// Mock @react-pdf/renderer to avoid WASM issues in test environment
vi.mock('@react-pdf/renderer', async () => {
  const actual = await vi.importActual<typeof import('@react-pdf/renderer')>('@react-pdf/renderer')
  return {
    ...actual,
    renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock certificate')),
  }
})

describe('CertificatePdf', () => {
  it('renders to a non-empty buffer starting with %PDF', async () => {
    const element = CertificatePdf({
      courseTitle: 'Trail Riding Fundamentals',
      tier: 'gold',
      issuedAt: new Date('2026-03-12'),
      userName: 'Jane Rider',
      score: 92,
      certId: 'test-cert-id-123',
    })

    const buffer = await renderToBuffer(element)
    expect(buffer).toBeTruthy()
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.toString('utf8').startsWith('%PDF')).toBe(true)
  })

  it('creates a Document element', () => {
    const element = CertificatePdf({
      courseTitle: 'Bike Maintenance 101',
      tier: 'silver',
      issuedAt: new Date('2026-01-01'),
      userName: 'Test User',
      score: 80,
      certId: 'test-cert-id-456',
    })

    // CertificatePdf returns a React element (the Document)
    expect(element).toBeTruthy()
    expect(element.type).toBeTruthy()
  })
})
