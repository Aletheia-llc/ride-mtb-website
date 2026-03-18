'use server'

import { getEventBySlug } from '../lib/queries'

export async function generateEventIcal(slug: string): Promise<string> {
  const event = await getEventBySlug(slug)
  if (!event) throw new Error('Event not found')

  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  // RFC 5545 §3.3.11: escape TEXT property values
  const escapeText = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

  // RFC 5545 §3.1: fold lines longer than 75 octets (using CRLF + SPACE)
  const fold = (line: string): string => {
    const chunks: string[] = []
    while (line.length > 75) {
      chunks.push(line.slice(0, 75))
      line = ' ' + line.slice(75)
    }
    chunks.push(line)
    return chunks.join('\r\n')
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ride MTB//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@ride-mtb.com`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    fold(`SUMMARY:${escapeText(event.title)}`),
    event.description ? fold(`DESCRIPTION:${escapeText(event.description)}`) : '',
    event.location ? fold(`LOCATION:${escapeText(event.location)}`) : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n') + '\r\n'
}
