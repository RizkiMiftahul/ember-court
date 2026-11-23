export const SUITS = [
  { id: 'ember', name: 'Ember', glyph: '♨', color: '#ed604b' },
  { id: 'tide', name: 'Tide', glyph: '≋', color: '#55bce9' },
  { id: 'grove', name: 'Grove', glyph: '❧', color: '#75cf88' },
  { id: 'moon', name: 'Moon', glyph: '☾', color: '#be91ef' }
];

export function buildDeck() {
  return SUITS.flatMap(suit => Array.from({ length: 8 }, (_, i) => ({ suit: suit.id, value: i + 1, id: `${suit.id}-${i + 1}` })));
}

export function shuffle(deck, rng) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function suitOf(id) { return SUITS.find(suit => suit.id === id); }
export function cardLabel(card) { return `${card.value} of ${suitOf(card.suit).name}`; }
