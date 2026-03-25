# Learn MVP Design

**Date:** 2026-03-12

## Goal

Add the two remaining user-facing features to the Learn module that are required before gathering feedback: PDF certificate downloads and an AI chatbot help widget.

## Current State

The Learn module already has: quiz engine (6 question types), scoring/tier/XP system, course/module/lesson pages, leaderboard, and certificate entities (HTML view only). The architecture is solid and production-ready except for these two gaps.

## Architecture

Both features are additive — no existing code needs to change structurally. PDF generation is a new API endpoint that renders an existing certificate record. The chatbot is a new floating widget + API route that runs independently of any course page.

**New dependencies to install:**
```bash
npm install @react-pdf/renderer @anthropic-ai/sdk
```

Note: `@react-pdf/renderer` uses a WASM binary internally. The PDF route must declare `export const runtime = 'nodejs'` to avoid Edge runtime conflicts. If Turbopack raises a bundling error for the WASM dependency, add `serverExternalPackages: ['@react-pdf/renderer']` to `next.config.ts`.

---

## Feature 1: PDF Certificate Generation

### What it does

When a user earns a certificate (completes a course), they can download a PDF version they can share, print, or embed in a portfolio. The existing `CertificateView` page gets a "Download PDF" button.

### Components

**`src/modules/learn/components/CertificatePdf.tsx`**

A `@react-pdf/renderer` Document component (uses `Document`, `Page`, `View`, `Text`, `StyleSheet` — no HTML or Tailwind). Renders:
- Ride MTB branding (name + tagline)
- "Certificate of Completion" heading (matches existing HTML view wording)
- User's full name (large, prominent)
- Course name
- Tier badge (Gold / Silver / Bronze) with tier color
- Score percentage (e.g. "Score: 92%") — included to match the HTML certificate view
- Date issued (formatted as "March 12, 2026")
- Certificate ID (small, for verification)

**`src/app/api/learn/certificates/[certId]/pdf/route.ts`**

Must include:
```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
```

`GET` handler:
1. Fetch `LearnCertificate` by `certId` including `user.name`, `course.title`, and the best `LearnQuizAttempt` score (query via `userId + quizId` using `orderBy: { score: 'desc' }, take: 1` — matches how the HTML certificate view fetches the score)
2. If not found: 404
3. Auth check: certificates are public for verification — allow unauthenticated access
4. Render `CertificatePdf` with `renderToBuffer()` from `@react-pdf/renderer`
5. Return `new Response(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="certificate-${certId}.pdf"` } })`

**`src/app/learn/certificates/[certId]/page.tsx`** (modify existing)

Add a "Download PDF" button: a plain `<a href="/api/learn/certificates/[certId]/pdf" download>` link. No client-side JS needed.

### Error handling

- Invalid `certId`: API returns 404
- PDF render failure: API returns 500 with JSON error (caught in try/catch around `renderToBuffer`)
- The download button is only shown if the certificate record exists

---

## Feature 2: AI Chatbot

### What it does

A floating chat button appears on all `/learn/**` pages. Clicking it opens a slide-in panel where users can ask questions about course content, get help understanding quiz answers, or ask general MTB technique questions. Powered by Claude Haiku 4.5.

### Schema additions

**`LearnChatMessage`** model (add to `prisma/schema.prisma`):
```prisma
model LearnChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // "user" | "assistant"
  content   String   @db.Text
  courseId  String?  // optional context
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("learn_chat_messages")
}
```

Also add the back-reference to the `User` model:
```prisma
learnChatMessages LearnChatMessage[]
```

Rate limiting uses the existing `rateLimit()` utility from `src/lib/rate-limit.ts` (uses Upstash Redis, already installed). Call with `maxPerMinute: 1` to allow 1 message per minute (60/hour) — the utility uses a sliding window per-minute interface; there is no hourly window option. Messages are still saved to `LearnChatMessage` for history/display — the table is not used for rate limiting.

### Components

**`src/modules/learn/components/LearnChatbot.tsx`** (`'use client'`)

- Floating button: bottom-right corner, fixed position, `z-50`, uses `MessageCircle` icon from lucide-react
- Panel: slide-in from right, 380px wide, full viewport height on mobile
- Message list: scrollable, shows user messages (right-aligned) and assistant messages (left-aligned) with distinct styling
- Input: textarea with submit on Enter (Shift+Enter for newline), send button
- Shows typing indicator while awaiting response
- Displays rate limit error if threshold exceeded: "You've reached the hourly limit. Try again in a bit."
- Auth gate: if not signed in, shows "Sign in to use the AI assistant" prompt instead of the chat UI

The chatbot component is added to `src/app/learn/layout.tsx` so it appears on all learn pages without each page importing it.

### API route

**`src/app/api/learn/chat/route.ts`** — `POST`

Request body:
```typescript
{
  message: string      // user's message (max 1000 chars)
  courseId?: string    // optional, for course-specific context
  history?: Array<{ role: 'user' | 'assistant'; content: string }> // last 10 messages
}
```

Handler:
1. Auth check — 401 if not signed in
2. Validate `message` (non-empty, max 1000 chars)
3. Rate limit check using `rateLimit({ userId, action: 'learn-chat' })` — return 429 if exceeded
4. If `courseId` provided: fetch course title, description, and module titles to inject as context
5. Build system prompt:
   ```
   You are a helpful MTB (mountain biking) assistant for the Ride MTB learning platform.
   You help riders understand course content, technique, maintenance, and general MTB knowledge.
   Be concise, friendly, and practical. If asked about something unrelated to mountain biking or
   the course content, politely redirect to MTB topics.
   [If courseId provided]: The user is currently viewing the course: "{title}" — {description}.
   Course modules: {module titles}.
   ```
6. Call Claude Haiku 4.5 via Anthropic SDK with `max_tokens: 500`
7. Save user message and assistant response to `LearnChatMessage`
8. Return `{ response: string }`

### Error handling

- Rate limit exceeded: 429 with `{ error: 'rate_limit', message: '...' }`
- Anthropic API error: 500 with `{ error: 'ai_error', message: 'Something went wrong. Try again.' }`
- Message too long: 400 with `{ error: 'message_too_long' }`

---

## Out of Scope

- Admin CMS for course/quiz management (content added via seed data for now)
- AI quiz generator
- Analytics dashboard
- Affiliate system
- Streaming responses (non-streaming is simpler and sufficient for MVP)

---

## Testing

- `CertificatePdf`: render to buffer in a test and assert it's a valid PDF (non-empty buffer, starts with `%PDF`)
- `/api/learn/certificates/[certId]/pdf`: test 404 on bad ID, test 200 with correct Content-Type header
- `/api/learn/chat`: test 401 when unauthenticated, test 429 when rate limit exceeded, test 400 on missing message
