import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractYouTubeVideoId,
  extractChannelHandle,
  formatDuration,
} from './youtube'

describe('extractYouTubeVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtu.be short URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/123456')).toBeNull()
  })

  it('returns null for bare channel URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/@rideMTB')).toBeNull()
  })
})

describe('extractChannelHandle', () => {
  it('extracts handle from @username URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/@rideMTB')).toBe('@rideMTB')
  })

  it('extracts channel ID from /channel/ URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/channel/UCxxxxxx')).toBe('UCxxxxxx')
  })

  it('returns null for non-channel URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/watch?v=abc')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('converts ISO 8601 PT4M13S to seconds', () => {
    expect(formatDuration('PT4M13S')).toBe(253)
  })

  it('converts PT1H2M3S to seconds', () => {
    expect(formatDuration('PT1H2M3S')).toBe(3723)
  })

  it('converts PT30S to seconds', () => {
    expect(formatDuration('PT30S')).toBe(30)
  })
})
