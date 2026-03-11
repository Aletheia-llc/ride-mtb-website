import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CertificateView } from '@/modules/learn'
import { db } from '@/lib/db/client'

interface PageProps {
  params: Promise<{ certId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { certId } = await params
  const cert = await db.learnCertificate.findUnique({
    where: { id: certId },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  })
  if (!cert) return { title: 'Certificate Not Found | Ride MTB' }

  const userName = cert.user.name || 'A Ride MTB learner'
  return {
    title: `${userName} — ${cert.course.title} Certificate | Ride MTB`,
    description: `${userName} has completed ${cert.course.title} on Ride MTB with a ${cert.tier} tier.`,
    openGraph: {
      title: `${userName} completed ${cert.course.title}`,
      description: `Earned a ${cert.tier} tier certificate on Ride MTB.`,
    },
  }
}

export default async function CertificatePage({ params }: PageProps) {
  const { certId } = await params
  const cert = await db.learnCertificate.findUnique({
    where: { id: certId },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  })
  if (!cert) notFound()

  // Get best score for this user+course from quiz attempts
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/learn" className="hover:text-[var(--color-primary)]">
          Learn
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Certificate</span>
      </nav>

      <CertificateView
        courseTitle={cert.course.title}
        tier={cert.tier}
        issuedAt={cert.issuedAt}
        userName={cert.user.name || 'Anonymous'}
        score={bestScore}
      />

      {/* Verification note */}
      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        Certificate ID: {cert.id}
      </p>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learn
        </Link>
      </div>
    </div>
  )
}
