export type ScreenKind =
  | 'lists'
  | 'story'
  | 'reel'
  | 'live'
  | 'bubble'
  | 'comments'
  | 'profile'
  | 'call'
  | 'feed'
  | 'wrapped'
  | 'post'
  | 'lock'
  | 'poster'
  | 'toast'
  | 'lyrics'
  | 'album'
  | 'stamp'
  | 'share'
  | 'bias'
  | 'emoji'
  | 'chat'
  | 'filters'
  | 'card'
  | 'booth'
  | 'receipt'
  | 'screentime'
  | 'appnote'
  | 'history'
  | 'year'
  | 'caption'
  | 'pin'

export type ScreenSpec = {
  feature: string
  kind: ScreenKind
  bg: string
  ink: string
  accent: string
}

const screen = (feature: string, kind: ScreenKind, bg: string, ink: string, accent: string): ScreenSpec => ({
  feature,
  kind,
  bg,
  ink,
  accent,
})

export const SCREENS: ScreenSpec[] = [
  screen('Instagram unfollowers', 'lists', '#ffffff', '#111111', '#e1306c'),
  screen('Instagram story', 'story', '#1a1a1a', '#ffffff', '#e1306c'),
  screen('Instagram reel', 'reel', '#000000', '#ffffff', '#e1306c'),
  screen('Instagram live', 'live', '#000000', '#ffffff', '#ed4956'),
  screen('Instagram notes', 'bubble', '#ffffff', '#111111', '#111111'),
  screen('Instagram comments', 'comments', '#ffffff', '#111111', '#0095f6'),
  screen('Instagram profile', 'profile', '#ffffff', '#111111', '#111111'),
  screen('Instagram call', 'call', '#111111', '#ffffff', '#2e7d32'),
  screen('Instagram filters', 'filters', '#222222', '#ffffff', '#f77737'),
  screen('Instagram feed', 'feed', '#ffffff', '#111111', '#e1306c'),
  screen('Instagram wrapped', 'wrapped', '#7b2ff7', '#ffffff', '#ffffff'),
  screen('TikTok post', 'post', '#000000', '#ffffff', '#fe2c55'),
  screen('TikTok live', 'live', '#000000', '#ffffff', '#25f4ee'),
  screen('TikTok profile', 'profile', '#000000', '#ffffff', '#fe2c55'),
  screen('TikTok comments', 'comments', '#000000', '#ffffff', '#fe2c55'),
  screen('TikTok wrapped', 'wrapped', '#111111', '#ffffff', '#25f4ee'),
  screen('Tweet to image', 'poster', '#000000', '#ffffff', '#1d9bf0'),
  screen('Twitter ad revenue', 'receipt', '#ffffff', '#111111', '#1d9bf0'),
  screen('YouTube watch page', 'feed', '#0f0f0f', '#ffffff', '#ff0033'),
  screen('YouTube Shorts', 'reel', '#0f0f0f', '#ffffff', '#ff0033'),
  screen('YouTube channel', 'profile', '#0f0f0f', '#ffffff', '#ff0033'),
  screen('YouTube comments', 'comments', '#0f0f0f', '#ffffff', '#ff0033'),
  screen('YouTube wrapped', 'wrapped', '#3d0000', '#ffffff', '#ff0033'),
  screen('Facebook story', 'story', '#1877f2', '#ffffff', '#ffffff'),
  screen('Facebook comments', 'comments', '#ffffff', '#111111', '#1877f2'),
  screen('Generic fake chat', 'chat', '#efe7de', '#111111', '#075e54'),
  screen('Screen Time', 'screentime', '#000000', '#ffffff', '#64d2ff'),
  screen('Android screen time', 'screentime', '#ffffff', '#111111', '#1a73e8'),
  screen('iPhone Notes', 'appnote', '#fff8c9', '#111111', '#111111'),
  screen('Lock-screen notification', 'lock', '#1c1c1e', '#ffffff', '#ffffff'),
  screen('WhatsApp call', 'call', '#075e54', '#ffffff', '#25d366'),
  screen('WhatsApp status', 'story', '#075e54', '#ffffff', '#25d366'),
  screen('WhatsApp wrapped', 'wrapped', '#075e54', '#ffffff', '#d9fdd3'),
  screen('Spotify wrapped', 'wrapped', '#121212', '#1ed760', '#1ed760'),
  screen('Apple Music wrapped', 'wrapped', '#fa233b', '#ffffff', '#ffffff'),
  screen('Spotify receipt', 'receipt', '#121212', '#ffffff', '#1ed760'),
  screen('Netflix wrapped', 'wrapped', '#141414', '#e50914', '#e50914'),
  screen('Letterboxd wrapped', 'wrapped', '#14181c', '#ffffff', '#00e054'),
  screen('Strava wrapped', 'wrapped', '#fc4c02', '#ffffff', '#ffffff'),
  screen('FaceTime', 'call', '#1c1c1e', '#ffffff', '#30d158'),
  screen('Discord call', 'call', '#313338', '#ffffff', '#5865f2'),
  screen('iPhone call screen', 'call', '#1c1c1e', '#ffffff', '#30d158'),
  screen('iPhone call history', 'history', '#000000', '#ffffff', '#ff453a'),
  screen('Discord timestamp', 'stamp', '#313338', '#ffffff', '#5865f2'),
  screen('Discord wrapped', 'wrapped', '#5865f2', '#ffffff', '#ffffff'),
  screen('Discord message', 'chat', '#313338', '#f2f3f5', '#5865f2'),
  screen('Discord profile', 'profile', '#2b2d31', '#ffffff', '#5865f2'),
  screen('Snapchat caption', 'caption', '#000000', '#ffffff', '#fffc00'),
  screen('Pinterest pin', 'pin', '#ffffff', '#111111', '#e60023'),
  screen('Twitch chat', 'chat', '#0e0e10', '#efeff1', '#9146ff'),
  screen('Hinge profile', 'profile', '#ffffff', '#111111', '#7c6a55'),
  screen('Tinder profile', 'profile', '#111111', '#ffffff', '#fe3c72'),
  screen('Bumble profile', 'profile', '#fff8d6', '#111111', '#ffc629'),
  screen('ChatGPT conversation', 'chat', '#212121', '#ececec', '#10a37f'),
  screen('Photo dump', 'booth', '#f4efe6', '#111111', '#111111'),
  screen('Year in review', 'year', '#111111', '#ffffff', '#f5c16c'),
  screen('Xbox achievement', 'toast', '#107c10', '#ffffff', '#ffffff'),
  screen('PlayStation trophy', 'toast', '#003791', '#ffffff', '#ffffff'),
  screen('Steam achievement', 'toast', '#1b2838', '#ffffff', '#66c0f4'),
  screen('Steam wrapped', 'wrapped', '#1b2838', '#ffffff', '#66c0f4'),
  screen('GTA Wasted', 'poster', '#3a0000', '#e10600', '#e10600'),
  screen('GTA Mission Passed', 'poster', '#102010', '#c5e1a5', '#c5e1a5'),
  screen('You Died', 'poster', '#140000', '#7a0000', '#7a0000'),
  screen('Wanted poster', 'poster', '#d7b899', '#3b2414', '#3b2414'),
  screen('One Piece bounty', 'poster', '#f3e2b3', '#6b1d1d', '#6b1d1d'),
  screen('Missing poster', 'poster', '#ffffff', '#111111', '#b00020'),
  screen('Emoji Kitchen', 'emoji', '#ffffff', '#111111', '#111111'),
  screen('Emoji mixer', 'emoji', '#fff7e8', '#111111', '#c45b2d'),
  screen('Emoji Kitchen game', 'emoji', '#f3e8ff', '#111111', '#6d28d9'),
  screen('Minecraft achievement', 'toast', '#2b2b2b', '#ffff55', '#3f3f3f'),
  screen('Lyrics card', 'lyrics', '#1a1a1a', '#ffffff', '#ffffff'),
  screen('Album chart', 'album', '#111111', '#ffffff', '#ffffff'),
  screen('Album cover', 'poster', '#222222', '#ffffff', '#ffffff'),
  screen('Line distribution', 'share', '#ffffff', '#111111', '#e1306c'),
  screen('Bias sorter', 'bias', '#ffffff', '#111111', '#7c3aed'),
  screen('Photocard', 'card', '#f7f7f7', '#111111', '#111111'),
  screen('K-pop photo booth', 'booth', '#ffe4f1', '#111111', '#ff4f9a'),
]

export function screenByFeature(feature: string): ScreenSpec {
  const found = SCREENS.find((item) => item.feature === feature)
  if (!found) throw new Error(`Unknown screen: ${feature}`)
  return found
}

/** Names you follow who do not follow you back. Matching ignores case. */
export function unfollowers(following: string[], followers: string[]): string[] {
  const back = new Set(followers.map((name) => name.trim().toLowerCase()).filter(Boolean))
  const seen = new Set<string>()
  const missing: string[] = []
  for (const name of following) {
    const trimmed = name.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key) || back.has(key)) continue
    seen.add(key)
    missing.push(trimmed)
  }
  return missing
}

/** The Discord timestamp tag plus each of its style letters, and the unix number. */
export function discordStamp(date: Date): string[] {
  const unix = Math.floor(date.getTime() / 1000)
  const tags = ['', 't', 'T', 'd', 'D', 'f', 'F', 'R'].map((style) => (style ? `<t:${unix}:${style}>` : `<t:${unix}>`))
  return [...tags, String(unix)]
}

export function lineShares(taps: Record<string, number>): { name: string; share: number }[] {
  const names = Object.keys(taps)
  const total = names.reduce((sum, name) => sum + taps[name], 0)
  if (!total) return names.map((name) => ({ name, share: 0 }))
  return names.map((name) => ({ name, share: taps[name] / total }))
}

export function nextPair(names: string[], step: number): [string, string] | null {
  const people = names.map((name) => name.trim()).filter(Boolean)
  if (people.length < 2) return null
  const left = ((step % people.length) + people.length) % people.length
  let right = (left + 1 + (Math.abs(step) % (people.length - 1))) % people.length
  if (right === left) right = (left + 1) % people.length
  return [people[left], people[right]]
}

export function addPoint(scores: Record<string, number>, name: string): Record<string, number> {
  return { ...scores, [name]: (scores[name] ?? 0) + 1 }
}
