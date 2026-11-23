import { suitOf } from './cards.js';

function cardMarkup(card, options = {}) {
  const suit = options.back ? null : suitOf(card.suit);
  return `<button class="playing-card ${options.back ? 'back' : ''} ${options.played ? 'played' : ''}" ${options.index === undefined ? 'disabled' : `data-card="${options.index}"`} style="--suit:${suit?.color ?? '#dfc08b'}" aria-label="${options.back ? 'Face-down card' : `${card.value} of ${suit.name}`}" ${options.back ? '' : `title="${card.value} of ${suit.name}"`}>
    ${options.back ? '<span class="back-mark">EC</span>' : `<span class="card-value">${card.value}</span><span class="card-glyph">${suit.glyph}</span><span class="card-suit">${suit.name}</span>`}
  </button>`;
}

function header(title, subtitle = '') { return `<header class="masthead"><div class="brand-mark">EC</div><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div></header>`; }

export function renderTitle(app) {
  app.innerHTML = `<section class="screen title-screen">${header('Ember Court', 'A duel of nerve, memory, and the changing suit')}<div class="title-art"><div class="sun-disc"></div><div class="art-card art-one">♨<b>8</b></div><div class="art-card art-two">☾<b>4</b></div><div class="art-card art-three">❧<b>6</b></div></div><div class="intro"><p>Four rounds. Four shifting trumps. Take the tricks that matter.</p><button class="primary" id="start">Play</button><div class="how"><strong>How to play</strong><span>Play one card each trick. Follow suit when you can. Highest led suit wins, unless trump is played. Every trick scores 10 plus both card values.</span><small>Keys 1–8 play a card · Enter or Space starts</small></div></div><div class="title-footer">A fireside contest for two</div></section>`;
}

export function renderTable(app, state) {
  const p = state.roundState;
  const names = ['You', 'The Keeper'];
  app.innerHTML = `<section class="screen table-screen"><header class="table-head"><div class="brand-inline"><span>EC</span> EMBER COURT</div><div class="round-pill">ROUND ${state.match.round + 1}<i></i> 4</div><div class="scores"><div><small>YOU</small><b>${state.match.scores[0] + p.scores[0]}</b></div><div><small>KEEPER</small><b>${state.match.scores[1] + p.scores[1]}</b></div></div></header>
  <div class="table-felt"><div class="trump-label">TRUMP <strong style="color:${suitOf(p.trump).color}">${suitOf(p.trump).glyph} ${suitOf(p.trump).name}</strong><span>Round ${state.match.round + 1} · ${p.tricks.length}/8 tricks</span></div>
  <section class="opponent-area"><div class="player-tag">THE KEEPER <span>${p.hands[1].length} cards</span></div><div class="opponent-hand">${p.hands[1].map(() => cardMarkup(null, { back: true })).join('')}</div></section>
  <section class="play-zone"><div class="table-note">${p.plays.length ? `${names[p.plays[0].player]} led ${suitOf(p.plays[0].card.suit).name}` : (p.leader === 0 ? 'Your lead' : 'The Keeper leads')}</div><div class="played-cards">${[0, 1].map(player => { const play = p.plays.find(item => item.player === player); return `<div class="play-slot ${play ? 'occupied' : ''}">${play ? `<div class="played-by">${names[player]}</div>${cardMarkup(play.card, { played: true })}` : '<div class="empty-slot">✦</div>'}</div>`; }).join('')}</div><div class="status-line">${state.message || (state.locked ? 'The Keeper is considering the trick…' : p.plays.length === 0 && p.leader === 1 ? 'The Keeper leads…' : 'Choose a card to play')}</div></section>
  <section class="player-area"><div class="player-tag">YOUR HAND <span>${p.hands[0].length} cards</span></div><div class="hand">${p.hands[0].map((card, index) => cardMarkup(card, { index })).join('')}</div></section></div>
  <footer class="table-footer"><div class="round-score">THIS ROUND <b>${p.scores[0]}</b> — <b>${p.scores[1]}</b></div><div class="trick-log"><span>TRICK LOG</span>${p.tricks.slice(-4).reverse().map((trick, i) => `<i class="log-dot ${trick.winner === 0 ? 'ours' : 'theirs'}" title="Trick ${p.tricks.length - i}: ${names[trick.winner]} · ${trick.points} pts"></i>`).join('') || '<small>Awaiting the first card</small>'}</div><div class="key-help">Press 1–8 to play</div></footer></section>`;
}

export function renderResult(app, won, scores, roundScores) {
  const title = won ? 'The court is yours.' : 'The Keeper prevails.';
  app.innerHTML = `<section class="screen result-screen ${won ? 'victory' : 'defeat'}">${header('Ember Court', 'The final tally is in')}<div class="result-sigil">${won ? '✦' : '☾'}<span></span></div><div class="result-copy"><p class="eyebrow">FOUR ROUNDS COMPLETE</p><h2>${title}</h2><p>${won ? 'A deft hand and a well-timed trump.' : 'The Keeper read the court a little better this time.'}</p></div><div class="final-score"><div><small>YOU</small><b>${scores[0]}</b></div><span>—</span><div><small>THE KEEPER</small><b>${scores[1]}</b></div></div><div class="round-breakdown">${roundScores.map((round, index) => `<div><span>R${index + 1} · ${suitOf(round.trump).glyph}</span><b>${round.scores[0]} : ${round.scores[1]}</b></div>`).join('')}</div><button class="primary" id="again">Play again</button><p class="seed-note">Same seed, same shuffle. A new contest awaits.</p></section>`;
}

export function renderShotResult(app, won, scores) {
  const roundScores = [0, 1, 2, 3].map(index => ({
    trump: ['ember', 'tide', 'grove', 'moon'][index],
    scores: scores.map(total => Math.floor(total / 4) + (index < total % 4 ? 1 : 0))
  }));
  renderResult(app, won, scores, roundScores);
}
