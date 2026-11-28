// The room's games on the phone, each a full-screen card in the talk's look:
//   price   a slider: what would you pay for a sack, delivered? (the median becomes the price)
//   heal    ring rundt feilen: the order page with five bugs; a ring round one heals it on every phone
//   clicker you hold the deck's next button, for one click
// Messages come through window.vedHook (chained after vote.js, lobby.js and room.js).
import { pageSVG, BUGS, W as PW, H as PH } from './healpage.js';
const $ = (s, r = document) => r.querySelector(s);
const send = (m) => window.vedSend?.(m);
const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };

const css = document.createElement('style');
css.textContent = `
  .pl { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: center; gap: 18px;
    padding: calc(24px + env(safe-area-inset-top)) 22px calc(24px + env(safe-area-inset-bottom));
    background: radial-gradient(90% 60% at 50% 100%, rgba(255,90,31,.16), transparent 70%), #16100b; color: #fff3e3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif; animation: pl-in .45s cubic-bezier(.2,.8,.2,1) both; overflow: hidden; }
  .pl::before { content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(255,160,80,.07) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,160,80,.07) 1.5px, transparent 1.5px);
    background-size: 64px 64px; background-position: center; }
  .pl > * { position: relative; }
  .pl.out { transition: opacity .45s, transform .45s; opacity: 0; transform: scale(.98); }
  @keyframes pl-in { from { opacity: 0; transform: translateY(16px); } }
  .pl-eye { font: 700 11px 'Space Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: #ff5a1f; display: flex; align-items: center; gap: 10px; }
  .pl-eye::before { content: ''; width: 22px; height: 2px; background: currentColor; }
  .pl h2 { font-weight: 800; font-size: clamp(30px, 9vw, 42px); line-height: 1; letter-spacing: -.04em; margin: 0; }
  .pl p { color: #c9ad92; font-size: 15px; margin: 0; }
  .pl-big { font: 700 clamp(64px, 22vw, 104px)/1 'Space Mono', monospace; color: #ffd23f; letter-spacing: -.05em; text-shadow: 0 0 40px rgba(255,160,40,.4); }
  .pl-big small { font-size: .3em; color: #c9ad92; letter-spacing: 0; margin-left: 8px; }
  .pl-go { border: 0; border-radius: 99px; padding: 20px; font: 800 20px 'Bricolage Grotesque', sans-serif; color: #1a0d07;
    background: linear-gradient(180deg, #ffb25e, #ff5a1f); box-shadow: 0 16px 40px -14px #ff5a1f, inset 0 1px 0 rgba(255,255,255,.45); cursor: pointer;
    touch-action: manipulation; user-select: none; -webkit-user-select: none; transition: transform .12s; }
  .pl-go:active { transform: scale(.96); }
  .pl-go:disabled { filter: grayscale(.8) brightness(.6); box-shadow: none; }
  /* price */
  .pl-range { -webkit-appearance: none; appearance: none; width: 100%; height: 44px; background: none; margin: 0; touch-action: pan-y; }
  .pl-range::-webkit-slider-runnable-track { height: 10px; border-radius: 99px; background: linear-gradient(90deg, #ffd23f, #ff5a1f); box-shadow: inset 0 0 0 2px rgba(26,18,12,.5); }
  .pl-range::-moz-range-track { height: 10px; border-radius: 99px; background: linear-gradient(90deg, #ffd23f, #ff5a1f); }
  .pl-range::-webkit-slider-thumb { -webkit-appearance: none; width: 38px; height: 38px; margin-top: -14px; border-radius: 50%; background: #fff3e3; border: 3px solid #1a120c; box-shadow: 0 6px 18px rgba(0,0,0,.6); }
  .pl-range::-moz-range-thumb { width: 34px; height: 34px; border-radius: 50%; background: #fff3e3; border: 3px solid #1a120c; }
  .pl-scale { display: flex; justify-content: space-between; font: 700 12px 'Space Mono', monospace; color: #74604d; margin-top: -8px; }
  /* heal */
  .pl.heal { justify-content: flex-start; gap: 10px; touch-action: none; }
  .pl-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .pl-row h2 { font-size: clamp(24px, 7vw, 32px); }
  .pl-count { font: 700 15px 'Space Mono', monospace; color: #ffd23f; white-space: nowrap; }
  .pl-page { position: relative; flex: 1; min-height: 0; touch-action: none; user-select: none; -webkit-user-select: none; }
  .pl-page > svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 18px 40px rgba(0,0,0,.6)); }
  .pl-page > svg.hp { border-radius: 0; }
  .pl-ink path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .pl-ink .draw { stroke: #ffd23f; stroke-width: 4; }
  .pl-ink .hit { stroke: #8fe3a2; stroke-width: 4; filter: drop-shadow(0 0 6px rgba(143,227,162,.8)); }
  .pl-ink .miss { stroke: #ff6f9c; stroke-width: 4; transition: opacity .9s .5s; }
  .pl-ink .miss.gone { opacity: 0; }
  .pl-ink .shake { animation: pl-shake .35s; transform-box: fill-box; }
  .pl-msg { min-height: 22px; font: 600 15px 'Bricolage Grotesque', sans-serif; color: #c9ad92; text-align: center; transition: color .2s; }
  .pl-msg.ok { color: #8fe3a2; } .pl-msg.bad { color: #ff9cb8; }
  @keyframes pl-shake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  /* clicker */
  .pl-remote { width: min(62vw, 240px); aspect-ratio: 1; margin: 8px auto; border-radius: 50%; border: 0; cursor: pointer;
    background: radial-gradient(circle at 40% 35%, #ffb25e, #ff5a1f 60%, #c23d0e); color: #1a0d07; font: 800 30px 'Bricolage Grotesque', sans-serif;
    box-shadow: 0 0 0 10px rgba(255,90,31,.18), 0 0 80px 10px rgba(255,90,31,.45), inset 0 3px 0 rgba(255,255,255,.4); animation: pl-glow 1.6s ease-in-out infinite;
    touch-action: manipulation; user-select: none; -webkit-user-select: none; }
  .pl-remote:active { transform: scale(.95); }
  @keyframes pl-glow { 50% { box-shadow: 0 0 0 18px rgba(255,90,31,.1), 0 0 110px 20px rgba(255,90,31,.55), inset 0 3px 0 rgba(255,255,255,.4); } }
  @media (prefers-reduced-motion: reduce) { .pl, .pl * { animation: none !important; } }
`;
document.head.append(css);

let card = null, kind = null;
const WAKE = { price: 'Sett prisen', heal: 'Ring rundt feilen', clicker: 'Fjernkontrollen' };
function open(k, html) {
  const again = kind === k;
  close(true);
  if (!again && WAKE[k]) window.vedWake?.(WAKE[k]); // the phone lights up: your turn
  kind = k;
  card = document.createElement('div');
  card.className = 'pl';
  card.innerHTML = html;
  document.body.append(card);
  return card;
}
function close(now) {
  if (!card) return;
  const c = card; card = null; kind = null; H = null;
  window.vedWakeCancel?.();
  clearInterval(c._timer);
  if (now) { c.remove(); return; }
  c.classList.add('out'); setTimeout(() => c.remove(), 450);
}
function finish(html, ms = 3200) {
  if (!card) return;
  const c = card;
  c.innerHTML = html;
  clearInterval(c._timer);
  setTimeout(() => { if (card === c) close(); }, ms);
}

// ---------- price ----------
function priceOpen(m) {
  const start = m.mine ?? m.price ?? 129;
  const c = open('price', `<p class="pl-eye">Salen setter prisen</p>
    <h2>Hva ville du betalt for en sekk ved, levert på døra?</h2>
    <div class="pl-big"><span>${start}</span><small>kr</small></div>
    <input class="pl-range" type="range" min="50" max="300" step="10" value="${start}" aria-label="Pris i kroner">
    <div class="pl-scale"><span>50</span><span>300</span></div>
    <p>Midten av salen blir prisen i butikken.</p>`);
  const r = $('.pl-range', c), out = $('.pl-big span', c);
  let last = 0, pending = null;
  const push = () => { pending = null; last = Date.now(); send({ type: 'price', kr: Number(r.value) }); };
  r.addEventListener('input', () => {
    out.textContent = r.value;
    if (Date.now() - last > 160) push(); else if (!pending) pending = setTimeout(push, 160);
  });
  if (m.mine == null) push();   // everyone starts counted at the default
}
function priceSet(m) {
  if (kind !== 'price') return;
  finish(`<p class="pl-eye">Prisen er satt</p><h2>Salens pris</h2><div class="pl-big">${m.price}<small>kr</small></div>
    <p>${m.mine != null ? `Du sa ${m.mine} kr.` : ''}</p>`, 4200);
  buzz([40, 60, 40]);
}

// ---------- heal ----------
// Draw a ring round a bug on the order page. The relay judges it: a hit heals that bug on every
// phone (and on the TV); a miss shakes and fades. One bug per ring, and a tight one.
const WHY = {
  line: 'Tegn en ring rundt feilen.', many: 'Én feil per ring.', big: 'Ring tettere rundt feilen.',
  none: 'Ingen feil der.', done: 'Den er allerede fikset.', slow: 'Litt roligere.',
};
const NS = 'http://www.w3.org/2000/svg';
let H = null;
function healStart(m) {
  const fixed = new Set(m.fixed || []);
  if (kind === 'heal' && H) { fixed.forEach((id) => healApply(id)); return; }   // a reconnect: keep the card
  const c = open('heal', `<div class="pl-row"><h2>Ring rundt en feil</h2><span class="pl-count"></span></div>
    <div class="pl-page">${pageSVG('phone')}<svg class="pl-ink" viewBox="0 0 ${PW} ${PH}" preserveAspectRatio="xMidYMid meet"></svg></div>
    <p class="pl-msg">Fem feil. Én ring per feil.</p>`);
  c.classList.add('heal');
  H = { c, fixed: new Set(), ink: $('.pl-ink', c), msg: $('.pl-msg', c), count: $('.pl-count', c), pending: null };
  fixed.forEach((id) => healApply(id, true));
  healCount();
  // no scrolling or zooming while drawing
  c.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  c.addEventListener('gesturestart', (e) => e.preventDefault());
  const ink = H.ink;
  let pts = null, path = null;
  const at = (e) => { const p = ink.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(ink.getScreenCTM().inverse()); return [q.x, q.y]; };
  const d = (ps) => 'M' + ps.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L');
  ink.addEventListener('pointerdown', (e) => {
    if (H.pending) return;
    ink.setPointerCapture?.(e.pointerId);
    pts = [at(e)];
    path = document.createElementNS(NS, 'path'); path.setAttribute('class', 'draw'); ink.append(path);
  });
  ink.addEventListener('pointermove', (e) => {
    if (!pts) return;
    const q = at(e), l = pts[pts.length - 1];
    if (Math.hypot(q[0] - l[0], q[1] - l[1]) < 3) return;
    pts.push(q); path.setAttribute('d', d(pts));
  });
  const up = () => {
    if (!pts) return;
    const ps = pts, el = path; pts = null; path = null;
    el.setAttribute('d', d(ps) + ' Z');
    // at most 64 points go to the relay
    const step = Math.max(1, Math.ceil(ps.length / 64));
    const out = ps.filter((_, k) => k % step === 0).map((q) => [Math.round(q[0]), Math.round(q[1])]);
    H.pending = el;
    if (!send({ type: 'heal-circle', pts: out })) healMiss({ reason: 'slow' });
    setTimeout(() => { if (H?.pending === el) healMiss({ reason: 'slow' }); }, 4000);
  };
  ink.addEventListener('pointerup', up); ink.addEventListener('pointercancel', up);
}
function healApply(id, instant) {
  if (!H || H.fixed.has(id)) return;
  H.fixed.add(id);
  const g = H.c.querySelector(`[data-bug="${id}"]`);
  if (!g) return;
  if (instant) { g.querySelectorAll('*').forEach((n) => { n.style.transition = 'none'; }); g.classList.add('hp-fixed'); requestAnimationFrame(() => g.querySelectorAll('*').forEach((n) => { n.style.transition = ''; })); }
  else g.classList.add('hp-fixed');
}
const healCount = () => { if (H) H.count.textContent = `${H.fixed.size} / ${BUGS.length}`; };
const say = (text, cls = '') => { if (!H) return; H.msg.textContent = text; H.msg.className = `pl-msg ${cls}`; };
function healOk(m) {
  if (kind !== 'heal' || !H) return;
  const el = H.pending; H.pending = null;
  if (el) el.setAttribute('class', 'hit');
  healApply(m.bug); healCount();
  say(m.rank === 1 ? `Først! ${(m.ms / 1000).toFixed(1).replace('.', ',')} s` : `Funnet! Nummer ${m.rank}.`, 'ok');
  buzz([30, 40, 90]);
}
function healMiss(m) {
  if (kind !== 'heal' || !H) return;
  const el = H.pending; H.pending = null;
  if (el) { el.setAttribute('class', 'miss shake'); requestAnimationFrame(() => el.classList.add('gone')); setTimeout(() => el.remove(), 1500); }
  say(WHY[m.reason] || WHY.none, 'bad');
  buzz(50);
}
function healFix(m) {
  if (kind !== 'heal' || !H || H.fixed.has(m.bug)) return;
  healApply(m.bug); healCount();
  say(`${m.by} fant en feil.`);
}
function healDone() {
  if (kind !== 'heal') return;
  setTimeout(() => { H = null; finish('<p class="pl-eye">Ring rundt feilen</p><h2>Alle fem er funnet.</h2><p>Se opp på skjermen.</p>', 4200); }, 1400);
}

// ---------- clicker ----------
function clicker() {
  const c = open('clicker', `<p class="pl-eye">Fjernkontrollen</p>
    <h2>Du styrer presentasjonen nå.</h2><p>Ett trykk. Du bestemmer når.</p>
    <button class="pl-remote" type="button">Neste</button>`);
  buzz([80, 60, 80, 60, 200]);
  $('.pl-remote', c).addEventListener('click', (e) => { e.currentTarget.disabled = true; send({ type: 'clicker-next' }); buzz(30); }, { once: true });
}

// ---------- the launch stack ----------
// A quiet card from the ship slide: the three services the talk recommends, with links. No wake-up:
// it is something to keep, not something to do now.
const STACK = [
  ['Cloudflare', 'Hosting, domene og DNS', 'https://www.cloudflare.com'],
  ['Supabase', 'Database og innlogging', 'https://supabase.com'],
  ['Resend', 'E-post', 'https://resend.com'],
];
function stackCard() {
  document.querySelector('.pl-stack')?.remove();
  const o = document.createElement('div');
  o.className = 'pl-stack';
  o.innerHTML = `<div class="pl-sheet"><p class="pl-eye">Slik gjør du det</p><h3>Lanser gratis</h3>
    ${STACK.map(([n, r, u]) => `<a href="${u}" target="_blank" rel="noopener"><b>${n}</b><span>${r}</span><i>${u.replace(/^https:\/\/(www\.)?/, '')} ↗</i></a>`).join('')}
    <p class="pl-foot">Gratis å starte. Du betaler bare for domenet.</p><button type="button">Lukk</button></div>`;
  document.body.append(o);
  o.querySelector('button').addEventListener('click', () => { o.classList.add('out'); setTimeout(() => o.remove(), 400); });
}
const css2 = document.createElement('style');
css2.textContent = `
  .pl-stack { position: fixed; inset: 0; z-index: 25; display: flex; align-items: flex-end; background: rgba(10,6,4,.55); animation: pl-fade .4s both; }
  .pl-stack.out { transition: opacity .4s; opacity: 0; }
  @keyframes pl-fade { from { opacity: 0; } }
  .pl-sheet { width: 100%; padding: 26px 22px calc(22px + env(safe-area-inset-bottom)); display: grid; gap: 12px; color: #fff3e3;
    background: #1d1510; border-top: 2px solid rgba(255,190,120,.35); border-radius: 26px 26px 0 0; font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    animation: pl-up .5s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes pl-up { from { transform: translateY(40px); opacity: 0; } }
  .pl-sheet .pl-eye { margin: 0; }
  .pl-sheet h3 { margin: 0 0 4px; font: 800 30px/1 'Bricolage Grotesque', sans-serif; letter-spacing: -.03em; }
  .pl-sheet a { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 14px 16px; border-radius: 14px; text-decoration: none; color: inherit;
    background: #241a13; border: 1.5px solid rgba(255,190,120,.25); }
  .pl-sheet a b { font: 800 19px 'Bricolage Grotesque', sans-serif; }
  .pl-sheet a span { grid-column: 1; color: #c9ad92; font-size: 14px; }
  .pl-sheet a i { grid-row: 1 / 3; grid-column: 2; align-self: center; font: 700 12px 'Space Mono', monospace; color: #ffd23f; font-style: normal; }
  .pl-foot { margin: 2px 0 0; color: #c9ad92; font-size: 14px; }
  .pl-sheet button { margin-top: 4px; border: 0; border-radius: 99px; padding: 15px; font: 800 17px 'Bricolage Grotesque', sans-serif; color: #1a0d07;
    background: linear-gradient(180deg, #ffb25e, #ff5a1f); }
`;
document.head.append(css2);

// ---------- messages ----------
const handle = (m) => {
  if (!m?.type) return;
  if (m.type === 'price-open') priceOpen(m);
  if (m.type === 'price-set') priceSet(m);
  if (m.type === 'heal-start') healStart(m);
  if (m.type === 'heal-ok') healOk(m);
  if (m.type === 'heal-miss') healMiss(m);
  if (m.type === 'heal-fix') healFix(m);
  if (m.type === 'heal-done') healDone();
  if (m.type === 'heal-end' && kind === 'heal') { H = null; close(); }
  if (m.type === 'stack') stackCard();
  if (m.type === 'clicker') clicker();
  if (m.type === 'clicker-done') finish('<p class="pl-eye">Fjernkontrollen</p><h2>Takk!</h2><p>Se opp på skjermen.</p>', 2400);
  if (m.type === 'clicker-end' && kind === 'clicker') close();
  if (m.type === 'room-reset' || m.type === 'reset') close(true);
};
const prev = window.vedHook;
window.vedHook = (m) => {
  prev?.(m);
  handle(m);
  if (m.type === 'state' && m.game) handle(m.game);   // joined mid-game: pick it up
};
if (window.vedGameNow) handle(window.vedGameNow);   // the game was running before this script loaded
