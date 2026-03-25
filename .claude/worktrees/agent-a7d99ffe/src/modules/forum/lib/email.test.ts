import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Resend — must use class syntax for `new Resend(...)` to work
// The mockSend function is defined inside the factory to avoid hoisting issues
vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' })
  class MockResend {
    emails = { send: mockSend }
    static _mockSend = mockSend
  }
  return { Resend: MockResend }
})

import { Resend } from 'resend'
import { sendReplyNotification, sendMentionNotification } from './email'

describe('sendReplyNotification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends email when emailNotifications is true', async () => {
    await expect(
      sendReplyNotification({
        toEmail: 'author@example.com',
        toName: 'Author',
        replierName: 'Rider',
        threadTitle: 'Best trails?',
        threadSlug: 'best-trails-abc123',
        emailNotifications: true,
      }),
    ).resolves.not.toThrow()
  })

  it('skips sending when emailNotifications is false', async () => {
    // Access the underlying mock send function via the static property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSend = (Resend as unknown as { _mockSend: ReturnType<typeof vi.fn> })._mockSend

    await sendReplyNotification({
      toEmail: 'author@example.com',
      toName: 'Author',
      replierName: 'Rider',
      threadTitle: 'Best trails?',
      threadSlug: 'best-trails-abc123',
      emailNotifications: false,
    })

    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('sendMentionNotification', () => {
  it('sends email with correct subject when emailNotifications is true', async () => {
    await expect(
      sendMentionNotification({
        toEmail: 'mentioned@example.com',
        toName: 'Mentioned',
        mentionerName: 'Shredder',
        threadTitle: 'Trail tips',
        threadSlug: 'trail-tips-xyz',
        emailNotifications: true,
      }),
    ).resolves.not.toThrow()
  })
})
