// The room's games on the phone, each a full-screen card in the talk's look:
//   price   a slider: what would you pay for a sack, delivered? (the median becomes the price)
//   bug     spot the bug: one of the SMS cards is wrong; the first to tap it, with times
//   clicker you hold the deck's next button, for one click
// Messages come through window.vedHook (chained after vote.js, lobby.js and room.js).
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
  /* bug */
  .pl-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pl-col { border: 2px solid rgba(255,190,120,.35); border-radius: 14px; padding: 10px; display: grid; gap: 8px; background: rgba(36,26,19,.7); }
  .pl-col > b { font: 700 11px 'Space Mono', monospace; letter-spacing: .14em; color: #c9ad92; }
  .pl-card { border: 2px solid rgba(255,190,120,.4); border-radius: 10px; padding: 10px 8px; text-align: left; background: #1d1510; color: #fff3e3; cursor: pointer;
    font: 800 19px 'Bricolage Grotesque', sans-serif; touch-action: manipulation; }
  .pl-card small { display: block; font: 700 11px 'Space Mono', monospace; letter-spacing: .08em; color: #c9ad92; margin-bottom: 2px; }
  .pl-card.static { cursor: default; opacity: .85; }
  .pl-card.bad { animation: pl-shake .35s; border-color: #ff6f9c; }
  .pl-card.ok { border-color: #8fe3a2; box-shadow: 0 0 0 3px #8fe3a2; }
  @keyframes pl-shake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  .pl-timer { font: 700 15px 'Space Mono', monospace; color: #ffd23f; }
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
const WAKE = { price: 'Sett prisen', bug: 'Finn feilen', clicker: 'Fjernkontrollen' };
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
  const c = card; card = null; kind = null;
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

// ---------- bug ----------
function bugStart() {
  const c = open('bug', `<p class="pl-eye">Finn feilen</p>
    <h2>Én SMS kommer på feil dag. Trykk på den.</h2>
    <p>SMS-en sier «Veden kommer i morgen».</p>
    <div class="pl-cols">
      <div class="pl-col"><b>RUTEPLANEN</b>
        <div class="pl-card static"><small>FROGNER</small>Onsdag</div>
        <div class="pl-card static"><small>GRÜNERLØKKA</small>Torsdag</div></div>
      <div class="pl-col"><b>SMS-ENE</b>
        <button class="pl-card" data-card="sms-frogner" type="button"><small>FROGNER</small>Tirsdag</button>
        <button class="pl-card" data-card="sms-grunerlokka" type="button"><small>GRÜNERLØKKA</small>Tirsdag</button></div>
    </div>
    <div class="pl-timer">0,0 s</div>`);
  const t0 = Date.now(), tm = $('.pl-timer', c);
  c._timer = setInterval(() => { tm.textContent = `${((Date.now() - t0) / 1000).toFixed(1).replace('.', ',')} s`; }, 100);
  c.querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => { c._last = b; send({ type: 'bug-tap', card: b.dataset.card }); }));
}
function bugWrong() {
  if (kind !== 'bug' || !card?._last) return;
  const b = card._last; b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); buzz(60);
}
function bugOk(m) {
  if (kind !== 'bug') return;
  card._last?.classList.add('ok');
  buzz([30, 40, 90]);
  setTimeout(() => finish(`<p class="pl-eye">Funnet</p><h2>${m.rank === 1 ? 'Først!' : `Nummer ${m.rank}.`}</h2>
    <div class="pl-big">${(m.ms / 1000).toFixed(1).replace('.', ',')}<small>s</small></div><p>Se opp på skjermen.</p>`, 4000), 500);
}

// ---------- clicker ----------
function clicker() {
  const c = open('clicker', `<p class="pl-eye">Fjernkontrollen</p>
    <h2>Du styrer presentasjonen nå.</h2><p>Ett trykk. Du bestemmer når.</p>
    <button class="pl-remote" type="button">Neste</button>`);
  buzz([80, 60, 80, 60, 200]);
  $('.pl-remote', c).addEventListener('click', (e) => { e.currentTarget.disabled = true; send({ type: 'clicker-next' }); buzz(30); }, { once: true });
}

// ---------- messages ----------
const handle = (m) => {
  if (!m?.type) return;
  if (m.type === 'price-open') priceOpen(m);
  if (m.type === 'price-set') priceSet(m);
  if (m.type === 'bug-start') bugStart();
  if (m.type === 'bug-wrong') bugWrong();
  if (m.type === 'bug-ok') bugOk(m);
  if (m.type === 'bug-end' && kind === 'bug') close();
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
