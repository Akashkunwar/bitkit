import { describe, expect, it } from 'vitest'
import { addPoint, discordStamp, lineShares, nextPair, SCREENS, unfollowers } from '../lib/socialScreens'

const FEATURES = [
  'Instagram unfollowers',
  'Instagram story',
  'Instagram reel',
  'Instagram live',
  'Instagram notes',
  'Instagram comments',
  'Instagram profile',
  'Instagram call',
  'Instagram filters',
  'Instagram feed',
  'Instagram wrapped',
  'TikTok post',
  'TikTok live',
  'TikTok profile',
  'TikTok comments',
  'TikTok wrapped',
  'Tweet to image',
  'Twitter ad revenue',
  'YouTube watch page',
  'YouTube Shorts',
  'YouTube channel',
  'YouTube comments',
  'YouTube wrapped',
  'Facebook story',
  'Facebook comments',
  'Generic fake chat',
  'Screen Time',
  'Android screen time',
  'iPhone Notes',
  'Lock-screen notification',
  'WhatsApp call',
  'WhatsApp status',
  'WhatsApp wrapped',
  'Spotify wrapped',
  'Apple Music wrapped',
  'Spotify receipt',
  'Netflix wrapped',
  'Letterboxd wrapped',
  'Strava wrapped',
  'FaceTime',
  'Discord call',
  'iPhone call screen',
  'iPhone call history',
  'Discord timestamp',
  'Discord wrapped',
  'Discord message',
  'Discord profile',
  'Snapchat caption',
  'Pinterest pin',
  'Twitch chat',
  'Hinge profile',
  'Tinder profile',
  'Bumble profile',
  'ChatGPT conversation',
  'Photo dump',
  'Year in review',
  'Xbox achievement',
  'PlayStation trophy',
  'Steam achievement',
  'Steam wrapped',
  'GTA Wasted',
  'GTA Mission Passed',
  'You Died',
  'Wanted poster',
  'One Piece bounty',
  'Missing poster',
  'Emoji Kitchen',
  'Emoji mixer',
  'Emoji Kitchen game',
  'Minecraft achievement',
  'Lyrics card',
  'Album chart',
  'Album cover',
  'Line distribution',
  'Bias sorter',
  'Photocard',
  'K-pop photo booth',
]

describe('social screens', () => {
  it('has one screen for every listed feature', () => {
    expect(SCREENS.map((item) => item.feature)).toEqual(FEATURES)
    expect(new Set(FEATURES).size).toBe(FEATURES.length)
  })

  it('lists people who do not follow back', () => {
    expect(unfollowers(['Asha', 'Dev', 'Mina'], ['asha', 'Mina'])).toEqual(['Dev'])
  })

  it('writes nine Discord timestamp forms', () => {
    const stamps = discordStamp(new Date('2026-11-23T12:00:00Z'))
    expect(stamps).toHaveLength(9)
    expect(stamps[0]).toBe('<t:1795435200>')
    expect(stamps).toContain('<t:1795435200:R>')
  })

  it('shares lines and picks a bias pair', () => {
    expect(lineShares({ Asha: 1, Dev: 1 }).map((row) => row.share)).toEqual([0.5, 0.5])
    expect(nextPair(['Asha', 'Dev'], 0)).toEqual(['Asha', 'Dev'])
    expect(addPoint({}, 'Asha').Asha).toBe(1)
  })
})
