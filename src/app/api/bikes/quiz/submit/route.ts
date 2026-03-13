import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { computeSpectrumCategory } from '@/modules/bikes/lib/spectrum'
import { grantXP } from '@/modules/xp/lib/engine'
import type { QuizAnswers } from '@/modules/bikes/types'

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await request.json()
  const { answers, sessionToken } = body as { answers: QuizAnswers; sessionToken: string }

  if (!answers || !sessionToken) {
    return NextResponse.json({ error: 'Missing answers or sessionToken' }, { status: 400 })
  }

  const result = computeSpectrumCategory(answers)

  try {
    const quizSession = await db.quizSession.upsert({
      where: { sessionToken },
      create: {
        sessionToken,
        userId,
        answers: {
          createMany: {
            data: Object.entries(answers).map(([stepKey, answerValue]) => ({
              stepKey,
              answerValue: answerValue as object,
            })),
            skipDuplicates: true,
          },
        },
      },
      update: { userId },
    })

    const quizResult = await db.quizResult.upsert({
      where: { sessionId: quizSession.id },
      create: {
        sessionId: quizSession.id,
        userId,
        primaryCategory: result.primaryCategory,
        rawScore: result.rawScore,
        categoryName: result.categoryName,
        resultJson: result as object,
      },
      update: {
        userId,
        primaryCategory: result.primaryCategory,
        rawScore: result.rawScore,
        categoryName: result.categoryName,
        resultJson: result as object,
      },
    })

    if (userId) {
      grantXP({
        userId,
        event: 'bike_quiz_completed',
        module: 'bikes',
        refId: quizResult.id,
      }).catch((err) => {
        console.error('[bikes] XP grant failed:', err)
      })
    }

    return NextResponse.json({ resultId: quizResult.id, sessionId: quizSession.id, result })
  } catch (err) {
    console.error('[bikes/quiz/submit] DB error:', err)
    // Return 200 with the computed result so client can still show inline fallback
    return NextResponse.json({ result, error: 'Save failed' }, { status: 200 })
  }
}
