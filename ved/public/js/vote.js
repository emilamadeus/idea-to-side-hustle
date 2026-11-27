// The vote on the phone, and the site's look following the winner.
//   vedHook(m)  is called by the page for every message from the relay
//   vedSend(m)  sends to the relay (set by the page)
// Phases: idle (nothing) · open (pick a direction) · sudden (chop for a tied contender, 15 s) ·
// closed (the winner fills the phone for a moment, then the site turns into it).
import { LANDINGS } from './landings.js';

const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const ACC = { skog: '#a8d08d', nordisk: '#d2693a', rask: '#ffd23f', peis: '#ff7a2f' };
const byKey = Object.fromEntries(LANDINGS.map((l) => [l.key, l]));

// a direction drawn into an svg: the whole page, or a crop of its picture for the hero
// crops at the hero's own shape (about 4:3), on the part of each picture that carries it
const CROP = { skog: '476 150 330 260', nordisk: '470 110 336 265', rask: '300 30 540 425' }; // rask: the truck alone, with room on every side
function shot(key, crop = false) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', crop ? CROP[key] : '0 0 840 472');
  svg.setAttribute('preserveAspectRatio', crop ? 'xMidYMid slice' : 'xMidYMid meet');
  const g = document.createElementNS(NS, 'g');
  svg.append(g);
  byKey[key].draw(g, 0, 0, 840, 472, crop ? { chip: false, art: true } : undefined); // the hero: picture only, it has its own 'Neste levering'
  return svg;
}

// ---------- the site's look ----------
const COPY = {
  peis: { eye: 'Vedlevering · Hele Norge', h1: 'Ved på døra,<br><em>hele vinteren.</em>', lead: 'Tørr bjørkeved, stablet ved døra di hver 14. dag. <span class="serif">Pause når du vil.</span>' },
  skog: { eye: 'Vedlevering · Hele Norge', h1: 'Fra skogen,<br><em>til døra di.</em>', lead: 'Bjørk hogd, kløyvd og tørket lokalt. <span class="serif">Levert hver 14. dag.</span>' },
  nordisk: { eye: 'Ved · Abonnement', h1: 'Ved.<br><em>Enkelt.</em>', lead: 'Tørr bjørk, stablet ved døra di. <span class="serif">Pause når du vil.</span>' },
  rask: { eye: 'Levering i morgen · Hele Norge', h1: 'Ved på døra<br><em>i morgen.</em>', lead: 'Bestill før 22:00. <span class="serif">Vi kjører i natt.</span>' },
};
let peisArt = null;
export function applyTheme(t) {
  if (!COPY[t]) t = 'peis';
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', { peis: '#140a05', skog: '#0d1a12', nordisk: '#f4efe7', rask: '#ffd23f' }[t]);
  const c = COPY[t];
  const eye = $('.hero .eyebrow'), h1 = $('.hero h1'), lead = $('.hero .lead');
  if (eye) eye.textContent = c.eye;
  if (h1) h1.innerHTML = c.h1;
  if (lead) lead.innerHTML = c.lead;
  const hearth = $('.hearth');
  if (hearth) {
    peisArt ??= hearth.querySelector('svg');
    hearth.querySelector('.alt-art')?.remove();
    peisArt.style.display = t === 'peis' ? '' : 'none';
    if (t !== 'peis') { const s = shot(t, true); s.classList.add('alt-art'); hearth.prepend(s); }
  }
}

// ---------- the vote ----------
let vote = { phase: 'idle' }, offset = 0, lastPhase = 'idle', voted = false, changing = false, revealTimer = null, tick = null;
const ui = {};
function build() {
  const v = document.createElement('section');
  v.className = 'vote hide';
  v.innerHTML = `
    <div class="v-head"><p class="v-eye">Stem nå</p><h2>Velg visuell retning</h2><p>Den som vinner, blir ekte.</p></div>
    <div class="v-track"></div>
    <div class="v-dots"></div>
    <div class="v-done hide">
      <svg class="v-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg>
      <h3>Stemmen er sendt.</h3>
      <div class="v-bars"></div>
      <button class="v-change" type="button">Endre stemme</button>
    </div>`;
  document.body.append(v);
  ui.vote = v;
  ui.track = $('.v-track', v);
  ui.dots = $('.v-dots', v);
  ui.done = $('.v-done', v);
  ui.bars = $('.v-bars', v);
  LANDINGS.forEach((l) => {
    const c = document.createElement('div');
    c.className = 'v-card';
    c.style.setProperty('--acc', ACC[l.key]);
    c.dataset.key = l.key;
    c.innerHTML = `<div class="v-shot"></div><div class="v-name">${l.name}</div><button class="v-btn" type="button">Stem på ${l.name}</button>`;
    $('.v-shot', c).append(shot(l.key));
    $('.v-btn', c).addEventListener('click', () => cast(l.key, c));
    ui.track.append(c);
    const d = document.createElement('i'); ui.dots.append(d);
    const b = document.createElement('div');
    b.className = 'v-bar'; b.dataset.key = l.key; b.style.setProperty('--acc', ACC[l.key]);
    b.innerHTML = `<span class="n">${l.name}</span><span class="t"><i></i></span><span class="c">0</span>`;
    ui.bars.append(b);
  });
  ui.track.addEventListener('scroll', () => {
    const k = Math.round(ui.track.scrollLeft / ui.track.clientWidth);
    [...ui.dots.children].forEach((d, i) => d.classList.toggle('on', i === k));
  }, { passive: true });
  ui.dots.children[0]?.classList.add('on');
  $('.v-change', v).addEventListener('click', () => { changing = true; voted = false; render(); });

  const s = document.createElement('section');
  s.className = 'sudden hide';
  s.innerHTML = `<p class="s-eye">Uavgjort</p><h2>Utslagsrunde!</h2><p class="s-sub">Trykk for å hogge. Mest ved vinner.</p><div class="s-time">15</div><div class="s-list"></div>`;
  document.body.append(s);
  ui.sudden = s; ui.time = $('.s-time', s); ui.slist = $('.s-list', s);

  const r = document.createElement('section');
  r.className = 'win hide';
  r.innerHTML = `<div class="r-shot"></div><h2><span class="r-name"></span> vant.</h2><p>Dette blir siden dere bestiller fra.</p>`;
  document.body.append(r);
  ui.reveal = r;
}

function cast(key, card) {
  if (vote.phase !== 'open') return;
  navigator.vibrate?.(30);
  window.vedSend?.({ type: 'vote', choice: key });
  vote.mine = key;
  card.classList.add('lift');
  setTimeout(() => card.classList.add('fly'), 260);
  setTimeout(() => { card.classList.remove('lift', 'fly'); voted = true; changing = false; render(); }, 950);
}

// sudden death: each tap is an axe chop
function chopButton(key) {
  const l = byKey[key];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 's-btn';
  b.style.setProperty('--acc', ACC[key]);
  b.innerHTML = `<span class="s-shot"></span><span class="s-name">${l.name}</span><span class="s-count">0</span>
    <svg class="s-axe" viewBox="0 0 60 60"><path d="M30 6l-4 44" stroke="#7a5233" stroke-width="6" stroke-linecap="round"/><path d="M24 8c10-4 22 0 26 10-8 1-16 0-24 4z" fill="#cfd3da" stroke="#1a120c" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  $('.s-shot', b).append(shot(key));
  let mine = 0;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (vote.phase !== 'sudden') return;
    window.vedSend?.({ type: 'chop', choice: key });
    navigator.vibrate?.(12);
    $('.s-count', b).textContent = ++mine;
    b.classList.remove('chop'); void b.offsetWidth; b.classList.add('chop');
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('i');
      c.className = 'chip';
      c.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`);
      c.style.setProperty('--dy', `${-40 - Math.random() * 90}px`);
      c.style.setProperty('--r', `${(Math.random() - 0.5) * 540}deg`);
      b.append(c);
      setTimeout(() => c.remove(), 700);
    }
  });
  return b;
}

function render() {
  const p = vote.phase;
  ui.vote.classList.toggle('hide', p !== 'open');
  ui.sudden.classList.toggle('hide', p !== 'sudden');
  if (p === 'open') {
    const showDone = (voted || vote.mine) && !changing;
    ui.track.classList.toggle('hide', !!showDone);
    ui.dots.classList.toggle('hide', !!showDone);
    ui.done.classList.toggle('hide', !showDone);
    const total = Object.values(vote.tally || {}).reduce((a, b) => a + b, 0);
    [...ui.bars.children].forEach((b) => {
      const n = vote.tally?.[b.dataset.key] || 0;
      $('.t i', b).style.width = `${total ? (n / total) * 100 : 0}%`;
      $('.c', b).textContent = n;
      b.classList.toggle('mine', vote.mine === b.dataset.key);
    });
  }
  if (p === 'sudden' && lastPhase !== 'sudden') {
    ui.slist.innerHTML = '';
    vote.contenders.forEach((k) => ui.slist.append(chopButton(k)));
    clearInterval(tick);
    tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((vote.endsAt - (Date.now() + offset)) / 1000));
      ui.time.textContent = left;
      if (!left) clearInterval(tick);
    }, 100);
  }
  if (p === 'closed' && (lastPhase === 'open' || lastPhase === 'sudden') && vote.winner) {
    const r = ui.reveal;
    $('.r-shot', r).innerHTML = ''; $('.r-shot', r).append(shot(vote.winner));
    $('.r-name', r).textContent = byKey[vote.winner].name;
    r.style.setProperty('--acc', ACC[vote.winner]);
    r.classList.remove('hide');
    navigator.vibrate?.([60, 40, 120]);
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => r.classList.add('hide'), 6500);
  }
  if (p === 'idle') { voted = false; changing = false; }
  lastPhase = p;
}

window.vedHook = (m) => {
  if (m.vote) { vote = m.vote; offset = (m.vote.now || Date.now()) - Date.now(); if (m.type === 'state') lastPhase = vote.phase === 'closed' ? 'closed' : lastPhase; render(); }
  if (m.theme) applyTheme(m.theme);
};
build();
// catch up on what arrived before this module loaded
if (window.vedLast) window.vedHook({ type: 'state', ...window.vedLast });
fetch('/api/state').then((r) => r.json()).then((st) => applyTheme(st.theme)).catch(() => {});
