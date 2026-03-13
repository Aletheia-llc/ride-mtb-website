import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await request.json()
  const { name, email, phone, ridingGoals, specificQuestions, budgetRange, quizSessionId } =
    body as {
      name: string
      email: string
      phone?: string
      ridingGoals: string
      specificQuestions?: string
      budgetRange?: string
      quizSessionId?: string
    }

  if (!name || !email || !ridingGoals) {
    return NextResponse.json({ error: 'name, email, and ridingGoals are required' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const consultation = await db.bikeConsultationRequest.create({
    data: {
      userId,
      name,
      email,
      phone: phone ?? null,
      ridingGoals,
      specificQuestions: specificQuestions ?? null,
      budgetRange: budgetRange ?? null,
      quizSessionId: quizSessionId ?? null,
    },
  })

  return NextResponse.json({ id: consultation.id }, { status: 201 })
}
