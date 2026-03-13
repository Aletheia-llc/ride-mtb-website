import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

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
import { auth } from '@/lib/auth/config'
import { GET } from './route'

const mockAuth = vi.mocked(auth)

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
    // auth is checked after 404, so we can provide any session value
    mockAuth.mockResolvedValue({ user: { id: 'user-456', role: 'user' } } as never)

    const response = await GET(makeRequest('nonexistent'), {
      params: Promise.resolve({ certId: 'nonexistent' }),
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Certificate not found')
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(mockCert as never)
    mockAuth.mockResolvedValue(null as never)

    const response = await GET(makeRequest('cert-123'), {
      params: Promise.resolve({ certId: 'cert-123' }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated user does not own the certificate and is not admin', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(mockCert as never)
    mockAuth.mockResolvedValue({ user: { id: 'other-user', role: 'user' } } as never)

    const response = await GET(makeRequest('cert-123'), {
      params: Promise.resolve({ certId: 'cert-123' }),
    })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with application/pdf content type for the certificate owner', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(mockCert as never)
    vi.mocked(db.learnQuizAttempt.findMany).mockResolvedValueOnce([
      { score: 92 },
    ] as never)
    mockAuth.mockResolvedValue({ user: { id: 'user-456', role: 'user' } } as never)

    const response = await GET(makeRequest('cert-123'), {
      params: Promise.resolve({ certId: 'cert-123' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('certificate-cert-123.pdf')
  })

  it('returns 200 for an admin downloading any certificate', async () => {
    vi.mocked(db.learnCertificate.findUnique).mockResolvedValueOnce(mockCert as never)
    vi.mocked(db.learnQuizAttempt.findMany).mockResolvedValueOnce([{ score: 85 }] as never)
    mockAuth.mockResolvedValue({ user: { id: 'admin-user', role: 'admin' } } as never)

    const response = await GET(makeRequest('cert-123'), {
      params: Promise.resolve({ certId: 'cert-123' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
  })
})
