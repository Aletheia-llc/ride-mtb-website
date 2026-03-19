import 'server-only'
import { ImageAnnotatorClient } from '@google-cloud/vision'

export type ModerationResult = { pass: true } | { pass: false; reason: string }

const BLOCKED_CATEGORIES = ['adult', 'violence'] as const
const BLOCKED_LIKELIHOODS = new Set(['LIKELY', 'VERY_LIKELY'])

function makeClient(): ImageAnnotatorClient {
  return new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  })
}

export async function checkImageSafety(buffer: Buffer): Promise<ModerationResult> {
  const client = makeClient()
  const [result] = await client.safeSearchDetection({ image: { content: buffer } })
  const safe = result.safeSearchAnnotation

  if (!safe) return { pass: true }

  for (const category of BLOCKED_CATEGORIES) {
    const likelihood = safe[category] as string | undefined
    if (likelihood && BLOCKED_LIKELIHOODS.has(likelihood)) {
      return { pass: false, reason: `Content flagged as ${category}` }
    }
  }

  return { pass: true }
}
