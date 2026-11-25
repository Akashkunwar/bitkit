import { mulberry32 } from './random'

export type Blackjack = {
  deck: number[]
  you: number[]
  dealer: number[]
  done: boolean
  result: '' | 'win' | 'lose' | 'push'
}

export function handValue(cards: number[]) {
  let total = 0
  let aces = 0
  cards.forEach((card) => {
    if (card === 1) {
      aces += 1
      total += 11
    } else total += Math.min(card, 10)
  })
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

function draw(deck: number[]) {
  return { card: deck[0], deck: deck.slice(1) }
}

export function freshBlackjack(seed = 1): Blackjack {
  const rand = mulberry32(seed)
  const deck = Array.from({ length: 52 }, (_, index) => (index % 13) + 1)
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const you = [deck[0], deck[2]]
  const dealer = [deck[1], deck[3]]
  const dealt = { deck: deck.slice(4), you, dealer, done: false, result: '' as const }
  if (handValue(you) >= 21 || handValue(dealer) === 21) return standBlackjack(dealt)
  return dealt
}

function finish(you: number[], dealer: number[], deck: number[]): Blackjack {
  let hand = dealer
  let rest = deck
  while (handValue(hand) < 17 && rest.length) {
    const next = draw(rest)
    hand = hand.concat(next.card)
    rest = next.deck
  }
  const yours = handValue(you)
  const theirs = handValue(hand)
  const result = yours > 21 ? 'lose' : theirs > 21 || yours > theirs ? 'win' : yours === theirs ? 'push' : 'lose'
  return { deck: rest, you, dealer: hand, done: true, result }
}

export function hitBlackjack(state: Blackjack): Blackjack {
  if (state.done || handValue(state.you) >= 21) return state
  const next = draw(state.deck)
  const you = state.you.concat(next.card)
  if (handValue(you) > 21) return finish(you, state.dealer, next.deck)
  return { ...state, deck: next.deck, you }
}

export function standBlackjack(state: Blackjack): Blackjack {
  if (state.done) return state
  return finish(state.you, state.dealer, state.deck)
}
