export type Platform = {
  id: string
  name: string
  field: string
  limit: number
  /** Some platforms truncate rather than reject; others hard-stop typing. */
  behaviour: 'truncates' | 'blocks' | 'penalised'
  note?: string
  /** Counts every URL as this many characters regardless of real length. */
  urlWeight?: number
  group: 'Social' | 'Search' | 'Messaging' | 'Store'
}

export const PLATFORMS: Platform[] = [
  { id: 'x-post', name: 'X', field: 'Post', limit: 280, behaviour: 'blocks', urlWeight: 23, group: 'Social',
    note: 'Every link counts as 23 characters however long it is.' },
  { id: 'x-bio', name: 'X', field: 'Bio', limit: 160, behaviour: 'blocks', group: 'Social' },
  { id: 'ig-caption', name: 'Instagram', field: 'Caption', limit: 2200, behaviour: 'blocks', group: 'Social',
    note: 'Only the first ~125 characters show before "more".' },
  { id: 'ig-bio', name: 'Instagram', field: 'Bio', limit: 150, behaviour: 'blocks', group: 'Social' },
  { id: 'li-post', name: 'LinkedIn', field: 'Post', limit: 3000, behaviour: 'blocks', group: 'Social',
    note: 'Truncated at ~210 characters in the feed.' },
  { id: 'li-headline', name: 'LinkedIn', field: 'Headline', limit: 220, behaviour: 'blocks', group: 'Social' },
  { id: 'li-about', name: 'LinkedIn', field: 'About', limit: 2600, behaviour: 'blocks', group: 'Social' },
  { id: 'yt-title', name: 'YouTube', field: 'Title', limit: 100, behaviour: 'blocks', group: 'Social',
    note: 'Search results cut around 60 characters.' },
  { id: 'yt-desc', name: 'YouTube', field: 'Description', limit: 5000, behaviour: 'blocks', group: 'Social',
    note: 'First 157 characters appear above the fold.' },
  { id: 'fb-post', name: 'Facebook', field: 'Post', limit: 63206, behaviour: 'blocks', group: 'Social',
    note: 'Engagement drops sharply past ~80 characters.' },
  { id: 'tiktok-caption', name: 'TikTok', field: 'Caption', limit: 2200, behaviour: 'blocks', group: 'Social' },
  { id: 'threads', name: 'Threads', field: 'Post', limit: 500, behaviour: 'blocks', group: 'Social' },
  { id: 'reddit-title', name: 'Reddit', field: 'Title', limit: 300, behaviour: 'blocks', group: 'Social' },
  { id: 'pin-desc', name: 'Pinterest', field: 'Description', limit: 500, behaviour: 'blocks', group: 'Social' },

  { id: 'meta-title', name: 'Google', field: 'Title tag', limit: 60, behaviour: 'penalised', group: 'Search',
    note: 'Measured in pixels really; 60 characters is the safe proxy.' },
  { id: 'meta-desc', name: 'Google', field: 'Meta description', limit: 155, behaviour: 'truncates', group: 'Search' },
  { id: 'og-title', name: 'Open Graph', field: 'og:title', limit: 88, behaviour: 'truncates', group: 'Search' },
  { id: 'og-desc', name: 'Open Graph', field: 'og:description', limit: 200, behaviour: 'truncates', group: 'Search' },
  { id: 'slug', name: 'URL', field: 'Slug', limit: 75, behaviour: 'penalised', group: 'Search' },

  { id: 'email-subject', name: 'Email', field: 'Subject', limit: 60, behaviour: 'truncates', group: 'Messaging',
    note: 'Mobile clients often show only 35 characters.' },
  { id: 'email-preheader', name: 'Email', field: 'Preheader', limit: 100, behaviour: 'truncates', group: 'Messaging' },
  { id: 'sms', name: 'SMS', field: 'Single message', limit: 160, behaviour: 'truncates', group: 'Messaging',
    note: 'Any non-GSM character drops the limit to 70.' },
  { id: 'push', name: 'Push', field: 'Notification body', limit: 120, behaviour: 'truncates', group: 'Messaging' },
  { id: 'wa-status', name: 'WhatsApp', field: 'About', limit: 139, behaviour: 'blocks', group: 'Messaging' },

  { id: 'appstore-title', name: 'App Store', field: 'Name', limit: 30, behaviour: 'blocks', group: 'Store' },
  { id: 'appstore-sub', name: 'App Store', field: 'Subtitle', limit: 30, behaviour: 'blocks', group: 'Store' },
  { id: 'play-title', name: 'Play Store', field: 'Title', limit: 30, behaviour: 'blocks', group: 'Store' },
  { id: 'play-short', name: 'Play Store', field: 'Short description', limit: 80, behaviour: 'blocks', group: 'Store' },
]

const URL_PATTERN = /https?:\/\/\S+/g

export type Counts = {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  /** Grapheme clusters — what a person calls "characters" when emoji are involved. */
  graphemes: number
  bytes: number
  urls: number
  emoji: number
}

function countGraphemes(input: string): number {
  // Intl.Segmenter groups emoji sequences and combining marks the way a user
  // perceives them; [...string] would count each code point separately.
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Segmenter) {
    return [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(input)].length
  }
  return [...input].length
}

export function countText(input: string): Counts {
  const urls = input.match(URL_PATTERN) ?? []
  return {
    characters: input.length,
    charactersNoSpaces: input.replace(/\s/g, '').length,
    words: (input.match(/\S+/g) ?? []).length,
    lines: input ? input.split('\n').length : 0,
    graphemes: countGraphemes(input),
    bytes: new TextEncoder().encode(input).length,
    urls: urls.length,
    emoji: [...input].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length,
  }
}

/** Length as a given platform would score it, applying any URL weighting. */
export function lengthFor(input: string, platform: Platform): number {
  if (!platform.urlWeight) return countGraphemes(input)
  const replaced = input.replace(URL_PATTERN, 'u'.repeat(platform.urlWeight))
  return countGraphemes(replaced)
}

export type Status = 'ok' | 'near' | 'over'

export function statusFor(used: number, limit: number): Status {
  if (used > limit) return 'over'
  if (used >= limit * 0.9) return 'near'
  return 'ok'
}
