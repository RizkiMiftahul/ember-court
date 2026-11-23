import { legalCards, trickPoints } from './rules.js';

export function chooseAICard(hand, plays, trump) {
  const ledSuit = plays.length ? plays[0].card.suit : null;
  const legal = legalCards(hand, ledSuit).sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  if (!plays.length) return legal[0];
  const currentWinner = winningPlayer(plays, trump);
  const me = 1 - plays[0].player;
  const worth = trickPoints([...plays, { player: me, card: legal[0] }]);
  if (ledSuit && hand.some(card => card.suit === ledSuit)) {
    if (currentWinner !== me && worth >= 14) {
      return legal.find(card => wouldWin([...plays, { player: me, card }], trump)) ?? legal[0];
    }
    return legal[0];
  }
  const trumpCards = legal.filter(card => card.suit === trump);
  if (trumpCards.length && currentWinner !== me && worth >= 16) {
    return trumpCards.find(card => wouldWin([...plays, { player: me, card }], trump)) ?? legal[0];
  }
  return legal[0];
}

function winningPlayer(plays, trump) { return plays[winnerIndex(plays, trump)].player; }
function wouldWin(plays, trump) { return winnerIndex(plays, trump) === plays.length - 1; }
function winnerIndex(plays, trump) {
  const led = plays[0].card.suit;
  let best = 0;
  for (let i = 1; i < plays.length; i++) {
    const a = plays[i].card, b = plays[best].card;
    if ((a.suit === trump && b.suit !== trump) || (a.suit === b.suit && a.value > b.value)) best = i;
  }
  return best;
}
