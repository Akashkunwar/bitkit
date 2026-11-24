import { mulberry32 } from './random'

export type Suit = 0 | 1 | 2 | 3
export type Card = { rank: number; suit: Suit; up: boolean }
export type Klondike = { stock: Card[]; waste: Card[]; foundations: Card[][]; tableau: Card[][] }

function red(card: Card) {
  return card.suit < 2
}

function canSit(card: Card, onto: Card) {
  return red(card) !== red(onto) && card.rank + 1 === onto.rank
}

export function freshKlondike(seed = 1): Klondike {
  const rand = mulberry32(seed)
  const deck: Card[] = []
  for (let suit = 0; suit < 4; suit += 1) {
    for (let rank = 1; rank <= 13; rank += 1) deck.push({ rank, suit: suit as Suit, up: false })
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const tableau: Card[][] = [[], [], [], [], [], [], []]
  let n = 0
  for (let pile = 0; pile < 7; pile += 1) {
    for (let depth = 0; depth <= pile; depth += 1) {
      const card = deck[n]
      n += 1
      tableau[pile].push({ ...card, up: depth === pile })
    }
  }
  return { stock: deck.slice(n), waste: [], foundations: [[], [], [], []], tableau }
}

export function drawKlondike(state: Klondike): Klondike {
  if (state.stock.length) {
    const card = state.stock[state.stock.length - 1]
    return { ...state, stock: state.stock.slice(0, -1), waste: state.waste.concat({ ...card, up: true }) }
  }
  return { ...state, stock: [...state.waste].reverse().map((card) => ({ ...card, up: false })), waste: [] }
}

export type Take = { kind: 'waste' } | { kind: 'tableau'; pile: number; index: number }

function taken(state: Klondike, from: Take): Card[] | null {
  if (from.kind === 'waste') return state.waste.length ? [state.waste[state.waste.length - 1]] : null
  const pile = state.tableau[from.pile]
  const cards = pile.slice(from.index)
  if (!cards.length || cards.some((card) => !card.up)) return null
  for (let i = 0; i < cards.length - 1; i += 1) if (!canSit(cards[i + 1], cards[i])) return null
  return cards
}

function without(state: Klondike, from: Take): Klondike {
  const tableau = state.tableau.map((pile) => pile.slice())
  if (from.kind === 'waste') return { ...state, waste: state.waste.slice(0, -1), tableau }
  tableau[from.pile] = tableau[from.pile].slice(0, from.index)
  const top = tableau[from.pile][tableau[from.pile].length - 1]
  if (top && !top.up) tableau[from.pile][tableau[from.pile].length - 1] = { ...top, up: true }
  return { ...state, tableau }
}

export function toTableau(state: Klondike, from: Take, dest: number): Klondike | null {
  const cards = taken(state, from)
  if (!cards) return null
  if (from.kind === 'tableau' && from.pile === dest) return null
  const pile = state.tableau[dest]
  const top = pile[pile.length - 1]
  if (top && !canSit(cards[0], top)) return null
  if (!top && cards[0].rank !== 13) return null
  const next = without(state, from)
  next.tableau[dest] = next.tableau[dest].concat(cards)
  return next
}

export function toFoundation(state: Klondike, from: Take): Klondike | null {
  const cards = taken(state, from)
  if (!cards || cards.length !== 1) return null
  const card = cards[0]
  const pile = state.foundations[card.suit]
  const top = pile[pile.length - 1]
  if (top && (top.suit !== card.suit || card.rank !== top.rank + 1)) return null
  if (!top && card.rank !== 1) return null
  const next = without(state, from)
  next.foundations = next.foundations.map((foundation, suit) =>
    suit === card.suit ? foundation.concat(card) : foundation,
  )
  return next
}

export function klondikeWon(state: Klondike) {
  return state.foundations.every((pile) => pile.length === 13)
}
