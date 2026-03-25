import piexif from 'piexifjs'

/**
 * Strip EXIF metadata from a JPEG buffer.
 * PNG and WebP do not embed EXIF — skip those formats.
 */
export function stripExifFromJpeg(buffer: Buffer): Buffer {
  // piexif operates on binary strings
  const binaryStr = buffer.toString('binary')
  const stripped = piexif.remove(binaryStr)
  return Buffer.from(stripped, 'binary')
}
