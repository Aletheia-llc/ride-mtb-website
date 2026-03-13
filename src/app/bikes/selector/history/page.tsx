import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { ResultsHistory } from '@/modules/bikes/components'

export const metadata: Metadata = {
  title: 'Quiz History | Bike Selector | Ride MTB',
  description: 'Your past bike selector quiz results.',
}

export default async function BikeHistoryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/bikes/selector/history')
  }

  const records = await db.quizResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      primaryCategory: true,
      rawScore: true,
      categoryName: true,
      createdAt: true,
    },
  })

  const results = records.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <ResultsHistory results={results} />
    </div>
  )
}
