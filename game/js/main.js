import { chooseAICard } from './ai.js';
import { buildDeck } from './cards.js';
import { beep } from './audio.js';
import { dealRound, finishRound, legalCards, resolveTrick, trickPoints, createMatch } from './rules.js';
import { renderResult, renderShotResult, renderTable, renderTitle } from './render.js';

const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') || '20261122', 10);
const seed = Number.isFinite(seedParam) ? seedParam >>> 0 : 20261122;
let game = null;

function newRound(match) {
  const deal = dealRound(match.seed, match.round);
  return { ...deal, plays: [], tricks: [], scores: [0, 0], hands: deal.hands, leader: deal.leader, turn: deal.leader };
}

function begin() {
  game = { match: createMatch(seed), roundState: null, locked: false, message: '' };
  game.roundState = newRound(game.match);
  render();
  if (game.roundState.turn === 1) window.setTimeout(aiTurn, 700);
}

function render() {
  if (!game) { renderTitle(app); document.querySelector('#start')?.addEventListener('click', begin); return; }
  if (game.match.over) {
    renderResult(app, game.match.winner === 0, game.match.scores, game.match.rounds);
    document.querySelector('#again')?.addEventListener('click', begin);
    return;
  }
  renderTable(app, game);
  document.querySelectorAll('[data-card]').forEach(button => button.addEventListener('click', () => playHuman(Number(button.dataset.card))));
}

function playHuman(index) {
  if (!game || game.locked || game.roundState.turn !== 0) return;
  const card = game.roundState.hands[0][index];
  if (!card || !legalCards(game.roundState.hands[0], game.roundState.plays[0]?.card.suit).some(item => item.id === card.id)) {
    game.message = 'You must follow the led suit when able.'; render(); return;
  }
  applyPlay(0, card);
  if (!game.match.over) {
    game.locked = true;
    game.roundState.turn = 1;
    render();
    window.setTimeout(aiTurn, 700);
  }
}

function aiTurn() {
  if (!game || game.match.over) return;
  const state = game.roundState;
  const card = chooseAICard(state.hands[1], state.plays, state.trump);
  game.locked = false;
  applyPlay(1, card);
}

function applyPlay(player, card) {
  const state = game.roundState;
  const hand = state.hands[player];
  hand.splice(hand.findIndex(item => item.id === card.id), 1);
  state.plays.push({ player, card });
  beep('play');
  game.message = '';
  if (state.plays.length === 1) {
    state.turn = 1 - player;
    render();
    return;
  }
  const winner = resolveTrick(state.plays, state.trump);
  const points = trickPoints(state.plays);
  state.scores[winner] += points;
  state.tricks.push({ winner, points, plays: state.plays.map(play => ({ ...play })) });
  state.leader = winner;
  state.turn = winner;
  game.message = `${winner === 0 ? 'You' : 'The Keeper'} take ${points} points.`;
  beep('trick');
  const played = state.plays;
  render();
  window.setTimeout(() => {
    if (!game || game.match.over) return;
    state.plays = [];
    game.message = '';
    if (state.tricks.length === 8) {
      finishRound(game.match, state);
      if (game.match.over) { render(); return; }
      game.roundState = newRound(game.match);
      render();
      if (game.roundState.turn === 1) { game.locked = true; window.setTimeout(aiTurn, 700); }
      return;
    }
    render();
    if (winner === 1) { game.locked = true; window.setTimeout(aiTurn, 700); }
  }, 720);
}

function onKey(event) {
  if (!game && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); begin(); return; }
  if (game && !game.match.over && /^[1-8]$/.test(event.key)) playHuman(Number(event.key) - 1);
}

function makeShotTable() {
  game = { match: createMatch(seed), roundState: null, locked: false, message: '' };
  const state = newRound(game.match);
  state.turn = 0;
  for (let trickNo = 0; trickNo < 2; trickNo++) {
    const plays = [];
    for (let offset = 0; offset < 2; offset++) {
      const player = (state.leader + offset) % 2;
      const card = chooseAICard(state.hands[player], plays, state.trump);
      plays.push({ player, card });
      state.hands[player].splice(state.hands[player].findIndex(item => item.id === card.id), 1);
    }
    const winner = resolveTrick(plays, state.trump), points = trickPoints(plays);
    state.scores[winner] += points;
    state.tricks.push({ winner, points, plays });
    state.leader = winner;
  }
  const leadCard = chooseAICard(state.hands[state.leader], [], state.trump);
  state.hands[state.leader].splice(state.hands[state.leader].findIndex(item => item.id === leadCard.id), 1);
  state.plays = [{ player: state.leader, card: leadCard }];
  state.turn = 1 - state.leader;
  if (state.leader === 0) { game.locked = true; game.message = 'The Keeper is considering the trick…'; }
  game.roundState = state;
  render();
}

document.addEventListener('keydown', onKey);
const shot = params.get('shot');
if (shot === 'table') makeShotTable();
else if (shot === 'win') renderShotResult(app, true, [246, 211]);
else if (shot === 'loss') renderShotResult(app, false, [198, 239]);
else render();
