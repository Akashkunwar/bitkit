export type ChatTheme = {
  id: string
  label: string
  bg: string
  header: string
  headerText: string
  mine: string
  mineText: string
  theirs: string
  theirsText: string
}

export type PostTheme = {
  id: string
  label: string
  bg: string
  card: string
  ink: string
  muted: string
  accent: string
}

export const CHATS: ChatTheme[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    bg: '#efe7de',
    header: '#075e54',
    headerText: '#ffffff',
    mine: '#d9fdd3',
    mineText: '#111',
    theirs: '#ffffff',
    theirsText: '#111',
  },
  {
    id: 'imessage',
    label: 'iMessage',
    bg: '#ffffff',
    header: '#f6f6f6',
    headerText: '#111',
    mine: '#0b93f6',
    mineText: '#fff',
    theirs: '#e9e9eb',
    theirsText: '#111',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    bg: '#ffffff',
    header: '#ffffff',
    headerText: '#111',
    mine: '#3797f0',
    mineText: '#fff',
    theirs: '#efefef',
    theirsText: '#111',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    bg: '#ffffff',
    header: '#ffffff',
    headerText: '#111',
    mine: '#0084ff',
    mineText: '#fff',
    theirs: '#f0f0f0',
    theirsText: '#111',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    bg: '#d6e7f5',
    header: '#517da2',
    headerText: '#fff',
    mine: '#efffde',
    mineText: '#111',
    theirs: '#ffffff',
    theirsText: '#111',
  },
  {
    id: 'android',
    label: 'Android messages',
    bg: '#ffffff',
    header: '#1a73e8',
    headerText: '#fff',
    mine: '#1a73e8',
    mineText: '#fff',
    theirs: '#f1f3f4',
    theirsText: '#111',
  },
  {
    id: 'discord',
    label: 'Discord',
    bg: '#313338',
    header: '#2b2d31',
    headerText: '#f2f3f5',
    mine: '#5865f2',
    mineText: '#fff',
    theirs: '#2b2d31',
    theirsText: '#f2f3f5',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    bg: '#111111',
    header: '#111111',
    headerText: '#fff',
    mine: '#0fadff',
    mineText: '#fff',
    theirs: '#262626',
    theirsText: '#fff',
  },
  {
    id: 'teams',
    label: 'Teams',
    bg: '#f5f5f5',
    header: '#4b53bc',
    headerText: '#fff',
    mine: '#e8ebfa',
    mineText: '#111',
    theirs: '#ffffff',
    theirsText: '#111',
  },
  {
    id: 'signal',
    label: 'Signal',
    bg: '#ffffff',
    header: '#3a76f0',
    headerText: '#fff',
    mine: '#3a76f0',
    mineText: '#fff',
    theirs: '#f3f4f6',
    theirsText: '#111',
  },
  {
    id: 'x',
    label: 'X direct',
    bg: '#000000',
    header: '#000000',
    headerText: '#fff',
    mine: '#1d9bf0',
    mineText: '#fff',
    theirs: '#16181c',
    theirsText: '#fff',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    bg: '#000000',
    header: '#000000',
    headerText: '#fff',
    mine: '#fe2c55',
    mineText: '#fff',
    theirs: '#1f1f1f',
    theirsText: '#fff',
  },
  {
    id: 'slack',
    label: 'Slack',
    bg: '#ffffff',
    header: '#3f0e40',
    headerText: '#fff',
    mine: '#1164a3',
    mineText: '#fff',
    theirs: '#f8f8f8',
    theirsText: '#111',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    bg: '#f3f2ef',
    header: '#0a66c2',
    headerText: '#fff',
    mine: '#0a66c2',
    mineText: '#fff',
    theirs: '#ffffff',
    theirsText: '#111',
  },
]

export const POSTS: PostTheme[] = [
  { id: 'tweet', label: 'Post on X', bg: '#000', card: '#000', ink: '#fff', muted: '#8b98a5', accent: '#1d9bf0' },
  { id: 'ig-post', label: 'Instagram post', bg: '#fff', card: '#fff', ink: '#111', muted: '#8e8e8e', accent: '#111' },
  {
    id: 'facebook',
    label: 'Facebook post',
    bg: '#f0f2f5',
    card: '#fff',
    ink: '#111',
    muted: '#65676b',
    accent: '#1877f2',
  },
  {
    id: 'linkedin-post',
    label: 'LinkedIn post',
    bg: '#f3f2ef',
    card: '#fff',
    ink: '#111',
    muted: '#666',
    accent: '#0a66c2',
  },
  {
    id: 'reddit',
    label: 'Reddit post',
    bg: '#dae0e6',
    card: '#fff',
    ink: '#1a1a1b',
    muted: '#787c7e',
    accent: '#ff4500',
  },
  {
    id: 'youtube',
    label: 'YouTube comment',
    bg: '#0f0f0f',
    card: '#0f0f0f',
    ink: '#fff',
    muted: '#aaa',
    accent: '#ff0033',
  },
  { id: 'threads', label: 'Threads', bg: '#fff', card: '#fff', ink: '#000', muted: '#999', accent: '#000' },
  { id: 'bluesky', label: 'Bluesky', bg: '#fff', card: '#fff', ink: '#0c1b33', muted: '#667', accent: '#1185fe' },
]

export function chatById(id: string): ChatTheme {
  return CHATS.find((theme) => theme.id === id) ?? CHATS[0]
}

export function postById(id: string): PostTheme {
  return POSTS.find((theme) => theme.id === id) ?? POSTS[0]
}
