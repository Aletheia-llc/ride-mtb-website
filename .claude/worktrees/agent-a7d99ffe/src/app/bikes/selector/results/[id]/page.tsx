import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db/client'
import { QuizResults } from '@/modules/bikes/components'
import type { SpectrumResult } from '@/modules/bikes/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await db.quizResult.findUnique({
    where: { id },
    select: { categoryName: true },
  })

  if (!result) {
    return { title: 'Result Not Found | Ride MTB' }
  }

  return {
    title: `${result.categoryName} | Bike Selector | Ride MTB`,
    description: `Your Ride MTB bike selector result: ${result.categoryName}`,
  }
}

export default async function BikeResultPage({ params }: PageProps) {
  const { id } = await params

  const record = await db.quizResult.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      resultJson: true,
    },
  })

  if (!record) {
    notFound()
  }

  const result = record.resultJson as unknown as SpectrumResult

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizResults
        result={result}
        resultId={record.id}
        quizSessionId={record.sessionId}
      />
    </div>
  )
}
