function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function secondsToHms(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function buildEmptyVast(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="2.0"/>'
}

interface VastInput {
  impressionId: string
  creativeUrl: string
  advertiserName: string
  baseUrl: string
  durationSeconds: number
}

export function buildVastXml({
  impressionId,
  creativeUrl,
  advertiserName,
  baseUrl,
  durationSeconds,
}: VastInput): string {
  const track = (event: string) =>
    `${baseUrl}/api/creators/ads/track?impressionId=${impressionId}&event=${event}`

  return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="2.0">
  <Ad id="${impressionId}">
    <InLine>
      <AdSystem>Ride MTB Ads</AdSystem>
      <AdTitle><![CDATA[${escapeXml(advertiserName)}]]></AdTitle>
      <Impression id="start"><![CDATA[${track('impression')}]]></Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:05">
            <Duration>${secondsToHms(durationSeconds)}</Duration>
            <TrackingEvents>
              <Tracking event="complete"><![CDATA[${track('complete')}]]></Tracking>
              <Tracking event="skip"><![CDATA[${track('skip')}]]></Tracking>
            </TrackingEvents>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="2000">
                <![CDATA[${creativeUrl}]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`
}
