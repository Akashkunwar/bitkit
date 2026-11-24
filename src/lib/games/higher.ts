import { mulberry32 } from './random'

export type Higher = { deck: number[]; current: number; streak: number; over: boolean }

function rank(card: number) {
  const face = (card % 13) + 1
  return face === 1 ? 14 : face
}

export function freshHigher(seed = 1): Higher {
  const rand = mulberry32(seed)
  const deck = Array.from({ length: 52 }, (_, index) => index)
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return { deck: deck.slice(1), current: deck[0], streak: 0, over: false }
}

export function callHigher(state: Higher, higher: boolean): Higher {
  if (state.over || !state.deck.length) return { ...state, over: true }
  const next = state.deck[0]
  const deck = state.deck.slice(1)
  const up = rank(next) > rank(state.current)
  const same = rank(next) === rank(state.current)
  if (!same && up !== higher) return { deck, current: next, streak: state.streak, over: true }
  return { deck, current: next, streak: state.streak + (same ? 0 : 1), over: deck.length === 0 }
}

export function cardLabel(card: number) {
  const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const suits = ['♥', '♦', '♣', '♠']
  return `${faces[card % 13]}${suits[Math.floor(card / 13)]}`
}
