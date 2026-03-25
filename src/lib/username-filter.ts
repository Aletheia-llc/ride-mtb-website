/**
 * Username profanity / inappropriate content filter.
 *
 * Uses the `bad-words` package as a baseline and extends it with an explicit
 * list of sexual terms and slurs that frequently appear in usernames with
 * numbers appended (e.g. "bigdick69").  The check strips trailing digits and
 * special characters before testing so that "bigdick69" is caught the same
 * way "bigdick" would be.
 */
import { Filter } from 'bad-words'

const filter = new Filter()

// Additional terms not reliably caught by the base list when combined with
// numbers or used as username components.
const EXTRA_BLOCKED = [
  'bigdick',
  'bigcock',
  'smalldick',
  'tinydick',
  'hardcock',
  'dickhead',
  'dickface',
  'cockhead',
  'cumshot',
  'cumslut',
  'cumguzzler',
  'jizz',
  'blowjob',
  'handjob',
  'rimjob',
  'buttplug',
  'dildo',
  'vibrator',
  'fisting',
  'teabagging',
  'ballsack',
  'nutsack',
  'titfuck',
  'boobies',
  'titties',
  'cameltoe',
  'nudes',
  'onlyfans',
  'sexting',
  'rapist',
  'pedophile',
  'pedo',
  'molester',
  'groomer',
  // slurs — represented partially to avoid echoing them in source
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'tranny',
  'retard',
  'kike',
  'spic',
  'chink',
  'gook',
  'wetback',
  'cracker',
  'cunt',
]

filter.addWords(...EXTRA_BLOCKED)

/**
 * Strip trailing digits and common separator characters so that "bigdick69"
 * is tested as "bigdick".
 */
function stripTrailingNoise(s: string): string {
  return s.replace(/[\d_\-]+$/, '')
}

/**
 * Returns true if the username contains inappropriate content.
 * Checks are case-insensitive and handle trailing numbers.
 */
export function isUsernameProfane(username: string): boolean {
  const lower = username.toLowerCase()
  const stripped = stripTrailingNoise(lower)

  if (filter.isProfane(lower)) return true
  if (stripped && stripped !== lower && filter.isProfane(stripped)) return true

  return false
}
