import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock DB
vi.mock('@/lib/db/client', () => ({
  db: {
    learnCertificate: {
      findUnique: vi.fn(),
    },
    learnQuizAttempt: {
      findMany: vi.fn(),
    },
  },
}))

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
  Document: () => null,
  Page: () => null,
  View: () => null,
  Text: () => null,
  StyleSheet: { create: (s: object) => s },
}))

// Mock CertificatePdf component
vi.mock('@/modules/learn/components/CertificatePdf', () => ({
  CertificatePdf: vi.fn().mockReturnValue({ type: 'Document', props: {} }),
}))

import { db } from '@/lib/db/client'
import { GET } from './route'

const mockCert = {
  id: 'cert-123',
  userId: 'user-456',
  courseId: 'course-789',
  tier: 'gold',
  issuedAt: new Date('2026-03-12'),
  pdfUrl: null,
  user: { name: 'Jane Rider' },
  course: { title: 'Trail Riding Fundamentals' },
}

function makeRequest(certId: string) {
  return new NextRequest(`http://localhost/api/learn/certificates/${certId}/pdf`)
}

describe('GET /api/learn/certificates/[certId]/pdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for unknown certId', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(null)

    const response = await GET(makeRequest('nonexistent'), {
      params: Promise.resolve({ certId: 'nonexistent' }),
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Certificate not found')
  })

  it('returns 200 with application/pdf content type for valid certId', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(mockCert as never)
    vi.mocked(db.learnQuizAttempt.findMany).mockResolvedValueOnce([
      { score: 92 },
    ] as never)

    const response = await GET(makeRequest('cert-123'), {
      params: Promise.resolve({ certId: 'cert-123' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('certificate-cert-123.pdf')
  })
})
