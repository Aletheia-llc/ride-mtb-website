import piexif from 'piexifjs'

/**
 * Strip EXIF metadata from a JPEG buffer.
 * PNG and WebP do not embed EXIF — skip those formats.
 */
export function stripExifFromJpeg(buffer: Buffer): Buffer {
  try {
    // piexif operates on binary strings
    const binaryStr = buffer.toString('binary')
    const stripped = piexif.remove(binaryStr)
    return Buffer.from(stripped, 'binary')
  } catch {
    // Return original buffer if EXIF stripping fails (e.g., malformed JPEG)
    return buffer
  }
}
