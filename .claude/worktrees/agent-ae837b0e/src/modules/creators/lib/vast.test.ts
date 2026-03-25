import { describe, it, expect } from 'vitest'
import { buildVastXml, buildEmptyVast } from './vast'

describe('buildEmptyVast', () => {
  it('returns minimal VAST 2.0 with no Ad element', () => {
    const xml = buildEmptyVast()
    expect(xml).toContain('<VAST version="2.0"/>')
    expect(xml).not.toContain('<Ad')
  })
})

describe('buildVastXml', () => {
  const input = {
    impressionId: 'imp_abc123',
    creativeUrl: 'https://cdn.bunny.net/ads/creative.mp4',
    advertiserName: 'Acme Bikes',
    baseUrl: 'https://ride-mtb.vercel.app',
    durationSeconds: 30,
  }

  it('includes VAST 2.0 version', () => {
    expect(buildVastXml(input)).toContain('version="2.0"')
  })

  it('includes impression tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('/api/creators/ads/track?impressionId=imp_abc123&event=impression')
  })

  it('includes complete tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('event=complete')
  })

  it('includes skip tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('event=skip')
  })

  it('includes creative URL in MediaFile', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('https://cdn.bunny.net/ads/creative.mp4')
  })

  it('encodes advertiser name safely', () => {
    const xml = buildVastXml({ ...input, advertiserName: '<script>xss</script>' })
    expect(xml).not.toContain('<script>')
    expect(xml).toContain('&lt;script&gt;')
  })

  it('sets skip offset to 5 seconds', () => {
    expect(buildVastXml(input)).toContain('skipoffset="00:00:05"')
  })

  it('formats duration correctly', () => {
    expect(buildVastXml(input)).toContain('<Duration>00:00:30</Duration>')
  })
})
