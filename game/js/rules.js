import { buildDeck, shuffle } from './cards.js';
import { mulberry32 } from './rng.js';

export const TRUMP_ORDER = ['ember', 'tide', 'grove', 'moon'];

export function dealRound(seed, round) {
  const deck = shuffle(buildDeck(), mulberry32((seed ^ Math.imul(round + 1, 0x9e3779b9)) >>> 0));
  return { hands: [deck.slice(0, 8), deck.slice(8, 16)], trump: TRUMP_ORDER[round], leader: round % 2 };
}

export function legalCards(hand, ledSuit) {
  const following = ledSuit ? hand.filter(card => card.suit === ledSuit) : [];
  return following.length ? following : [...hand];
}

export function resolveTrick(plays, trump) {
  const ledSuit = plays[0].card.suit;
  const trumps = plays.filter(play => play.card.suit === trump);
  const pool = trumps.length ? trumps : plays.filter(play => play.card.suit === ledSuit);
  return pool.reduce((best, play) => play.card.value > best.card.value ? play : best).player;
}

export function trickPoints(plays) { return 10 + plays[0].card.value + plays[1].card.value; }

export function createMatch(seed) {
  return { seed: seed >>> 0, round: 0, scores: [0, 0], rounds: [], over: false, winner: null };
}

export function finishRound(match, roundState) {
  match.rounds.push({ trump: roundState.trump, tricks: roundState.tricks, scores: [...roundState.scores] });
  match.scores[0] += roundState.scores[0];
  match.scores[1] += roundState.scores[1];
  match.round += 1;
  if (match.round >= 4) {
    match.over = true;
    match.winner = match.scores[0] === match.scores[1] ? -1 : (match.scores[0] > match.scores[1] ? 0 : 1);
  }
  return match;
}
