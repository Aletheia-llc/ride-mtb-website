import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function screenText(text: string): Promise<'APPROVED' | 'REJECTED'> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      system: 'You are a content moderation assistant. When given a review, respond with only YES if it contains slurs, hate speech, or obvious spam, or NO otherwise.',
      messages: [
        {
          role: 'user',
          content: `Review text:\n<review>${text}</review>`,
        },
      ],
    })
    const verdict = res.content[0]?.type === 'text' ? res.content[0].text.trim().toUpperCase() : 'NO'
    return verdict.startsWith('YES') ? 'REJECTED' : 'APPROVED'
  } catch {
    // Claude unavailable — optimistic fallback for reviews
    return 'APPROVED'
  }
}

export async function screenImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<'APPROVED' | 'FLAGGED' | 'REJECTED'> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: 'Does this image contain nudity, pornography, graphic violence, or other content that violates community guidelines for a public sports facility website? Reply with only APPROVED, FLAGGED, or REJECTED.',
            },
          ],
        },
      ],
    })
    const verdict = res.content[0]?.type === 'text' ? res.content[0].text.trim().toUpperCase() : 'FLAGGED'
    if (verdict.startsWith('REJECTED')) return 'REJECTED'
    if (verdict.startsWith('FLAGGED')) return 'FLAGGED'
    return 'APPROVED'
  } catch {
    // Claude unavailable — conservative fallback for images
    return 'FLAGGED'
  }
}
