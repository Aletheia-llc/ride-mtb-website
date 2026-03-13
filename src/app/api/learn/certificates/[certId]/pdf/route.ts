export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { db } from '@/lib/db/client'
import { CertificatePdf } from '@/modules/learn/components/CertificatePdf'

interface RouteParams {
  params: Promise<{ certId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { certId } = await params

  const cert = await db.learnCertificate.findUnique({
    where: { id: certId },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  })

  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // Get best score for this user + course from quiz attempts
  const attempts = await db.learnQuizAttempt.findMany({
    where: {
      userId: cert.userId,
      quiz: {
        module: {
          courseId: cert.courseId,
        },
      },
    },
    select: { score: true },
    orderBy: { score: 'desc' },
    take: 1,
  })
  const bestScore = attempts.length > 0 ? Math.round(attempts[0].score) : 0

  try {
    const buffer = await renderToBuffer(
      CertificatePdf({
        courseTitle: cert.course.title,
        tier: cert.tier,
        issuedAt: cert.issuedAt,
        userName: cert.user.name || 'Anonymous',
        score: bestScore,
        certId: cert.id,
      })
    )

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certId}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[learn/certificates/pdf] render error:', err)
    return NextResponse.json(
      { error: 'pdf_render_error', message: 'Failed to generate PDF.' },
      { status: 500 }
    )
  }
}
