import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db/client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatRequestBody {
  message?: string
  courseId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // 2. Parse body
  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { message, courseId, history = [] } = body

  // 3. Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }

  if (message.length > 1000) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 })
  }

  // 4. Rate limit
  try {
    await rateLimit({ userId, action: 'learn-chat', maxPerMinute: 1 })
  } catch {
    return NextResponse.json(
      { error: 'rate_limit', message: "You've reached the limit. Try again in a bit." },
      { status: 429 },
    )
  }

  // 5. Optionally fetch course context
  let courseContext = ''
  if (courseId) {
    const course = await db.learnCourse.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        description: true,
        modules: {
          where: { status: 'published' },
          orderBy: { sortOrder: 'asc' },
          select: { title: true },
        },
      },
    })

    if (course) {
      const moduleTitles = course.modules.map((m) => m.title).join(', ')
      courseContext = `\nThe user is currently viewing the course: "${course.title}" — ${course.description ?? ''}.\nCourse modules: ${moduleTitles}.`
    }
  }

  // 6. Build system prompt
  const systemPrompt = `You are a helpful MTB (mountain biking) assistant for the Ride MTB learning platform. You help riders understand course content, technique, maintenance, and general MTB knowledge. Be concise, friendly, and practical. If asked about something unrelated to mountain biking or the course content, politely redirect to MTB topics.${courseContext}`

  // 7. Build message history (last 10 messages, alternating user/assistant)
  const historyMessages = history.slice(-10).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // 8. Call Claude Haiku
  let assistantResponse: string
  try {
    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: 'user', content: message.trim() },
      ],
    })

    const firstContent = aiResponse.content[0]
    assistantResponse =
      firstContent?.type === 'text'
        ? firstContent.text
        : 'Sorry, I could not generate a response.'
  } catch (err) {
    console.error('[Chat] Anthropic API error:', err)
    return NextResponse.json(
      { error: 'ai_error', message: 'Something went wrong. Try again.' },
      { status: 500 },
    )
  }

  // 9. Save messages to DB
  await db.learnChatMessage.create({
    data: { userId, role: 'user', content: message.trim(), courseId: courseId ?? null },
  })
  await db.learnChatMessage.create({
    data: { userId, role: 'assistant', content: assistantResponse, courseId: courseId ?? null },
  })

  return NextResponse.json({ response: assistantResponse })
}
