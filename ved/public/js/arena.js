// The arena on the phone: a joystick, a fire button, three hearts, and the whole arena, with your
// own dot labelled Du. Last one standing wins; the TV shows the whole arena.
//   The phone owns its own position (steering is instant here) and sends it ~15 times a second.
//   The talk decides hits, lives, the ring and who is out, and sends the state back ~12 a second.
//   Out: a ghost card with your place and a cheer button (sparks on the TV).
// Messages come through window.vedHook (chained after play.js). The numbers match src/slides/arena.js.
const PR = 18, SPEED = 210, BSPD = 420, BLIFE = 1.15, BR = 6, CD = 0.45;
const send = (m) => window.vedSend?.(m);
const buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };
const meId = (() => { try { return JSON.parse(localStorage.getItem('ved-voter') || '""').slice(0, 6); } catch { return ''; } })();
const INK = '#1a120c';

const css = document.createElement('style');
css.textContent = `
  .ar { position: fixed; inset: 0; z-index: 35; display: flex; flex-direction: column; gap: 12px; color: #fff3e3;
    padding: calc(14px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
    background: radial-gradient(90% 50% at 50% 100%, rgba(255,90,31,.14), transparent 70%), #16100b;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif; touch-action: none; user-select: none; -webkit-user-select: none;
    -webkit-touch-callout: none; overflow: hidden; animation: ar-in .45s cubic-bezier(.2,.8,.2,1) both; }
  .ar.out { transition: opacity .45s; opacity: 0; }
  @keyframes ar-in { from { opacity: 0; transform: translateY(14px); } }
  .ar-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ar-who { min-width: 0; }
  .ar-eye { font: 700 11px 'Space Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: #ff5a1f; display: flex; align-items: center; gap: 10px; }
  .ar-eye::before { content: ''; width: 22px; height: 2px; background: currentColor; }
  .ar-name { font-weight: 800; font-size: 24px; letter-spacing: -.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 8px; }
  .ar-name i { width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid ${INK}; flex: none; }
  .ar-hearts { display: flex; gap: 6px; flex: none; }
  .ar-hearts svg { width: 34px; height: 32px; overflow: visible; transition: transform .2s; }
  .ar-hearts .lost { animation: ar-crack .6s both; }
  @keyframes ar-crack { 0% { transform: scale(1.35) rotate(-8deg); } 40% { transform: scale(.9) rotate(6deg); } 100% { transform: scale(.82); opacity: .55; } }
  .ar-view { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; }
  .ar-view canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .ar-msg { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; pointer-events: none; padding: 0 30px; }
  .ar-msg b { font-weight: 800; font-size: 26px; letter-spacing: -.02em; line-height: 1.1; text-shadow: 0 2px 16px #000; }
  .ar-msg b.big { font-size: 110px; font-family: 'Bricolage Grotesque'; color: #fff3e3; -webkit-text-stroke: 3px ${INK}; animation: ar-tick .9s both; }
  .ar-msg b.go { color: #ff5a1f; font-size: 72px; -webkit-text-stroke: 0; }
  @keyframes ar-tick { from { transform: scale(1.4); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 80% { opacity: 1; } to { opacity: 0; } }
  .ar-flash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle, transparent 40%, rgba(255,60,40,.55)); opacity: 0; }
  .ar-flash.on { animation: ar-flash .5s ease-out; }
  @keyframes ar-flash { from { opacity: 1; } to { opacity: 0; } }
  .ar-pad { display: flex; align-items: center; justify-content: space-between; height: min(36vh, 220px); flex: none; }
  .ar-stick { position: relative; width: min(44vw, 190px); aspect-ratio: 1; border-radius: 50%; touch-action: none;
    background: radial-gradient(circle, #241912 0 64%, #1c140e 65%);
    box-shadow: inset 0 0 0 2.5px rgba(255,190,120,.45), inset 0 10px 30px rgba(0,0,0,.6), 0 20px 40px -20px #000; }
  .ar-stick::before { content: ''; position: absolute; inset: 5%; border-radius: 50%;
    background: repeating-conic-gradient(from -4deg, rgba(255,190,120,.55) 0 8deg, transparent 8deg 90deg);
    -webkit-mask: radial-gradient(circle closest-side, transparent 84%, #000 85% 100%); mask: radial-gradient(circle closest-side, transparent 84%, #000 85% 100%); }
  .ar-stick::after { content: ''; position: absolute; inset: 22%; border-radius: 50%; border: 2px dashed rgba(255,190,120,.18); }
  .ar-puck { position: absolute; left: 50%; top: 50%; width: 46%; aspect-ratio: 1; margin: -23% 0 0 -23%; border-radius: 50%; z-index: 1;
    background: radial-gradient(circle at 38% 30%, #fff8ee 0 8%, var(--pc, #ff7a2f) 30%, color-mix(in srgb, var(--pc, #ff7a2f) 60%, #000) 100%);
    box-shadow: 0 0 0 3px ${INK}, inset 0 -6px 12px rgba(0,0,0,.35), 0 14px 24px -6px rgba(0,0,0,.8), 0 0 30px -4px var(--pc, #ff7a2f);
    transition: transform .28s cubic-bezier(.3,1.6,.5,1); will-change: transform; }
  .ar-puck.held { transition: none; }
  .ar-puck::after { content: ''; position: absolute; inset: 26%; border-radius: 50%; box-shadow: inset 0 2px 0 rgba(255,255,255,.35), inset 0 -2px 4px rgba(0,0,0,.3);
    background: radial-gradient(circle, rgba(0,0,0,.12), transparent 70%); }
  .ar-fire { -webkit-tap-highlight-color: transparent; position: relative; width: min(34vw, 140px); aspect-ratio: 1; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: none;
    background: radial-gradient(circle at 40% 30%, #ffd9a8 0 6%, #ff8a3d 30%, #ff5a1f 60%, #c23a0b 100%); color: ${INK};
    box-shadow: 0 0 0 3px ${INK}, 0 0 0 9px rgba(255,90,31,.16), inset 0 -8px 16px rgba(0,0,0,.3), 0 18px 36px -10px #ff5a1f;
    font: 800 20px 'Bricolage Grotesque', sans-serif; letter-spacing: .02em; transition: transform .08s; }
  .ar-fire.down { transform: scale(.93); }
  .ar-fire:disabled { filter: grayscale(.85) brightness(.55); box-shadow: 0 0 0 3px ${INK}; }
  .ar-fire i { position: absolute; inset: -9px; border-radius: 50%; pointer-events: none;
    background: conic-gradient(rgba(255,243,227,.85) calc(var(--cd, 0) * 1turn), transparent 0);
    -webkit-mask: radial-gradient(circle, transparent calc(50% - 4px), #000 calc(50% - 4px));
            mask: radial-gradient(circle, transparent calc(50% - 4px), #000 calc(50% - 4px)); }
  .ar-card { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; justify-content: center; gap: 16px; padding: 0 26px;
    background: rgba(22,16,11,.9); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: ar-in .6s .2s both; }
  .ar-card h2 { margin: 0; font-weight: 800; font-size: clamp(34px, 11vw, 52px); line-height: .95; letter-spacing: -.04em; }
  .ar-card p { margin: 0; color: #c9ad92; font-size: 16px; }
  .ar-place { font: 700 clamp(64px, 22vw, 100px)/1 'Space Mono', monospace; color: #ffd23f; letter-spacing: -.05em; }
  .ar-place small { font-size: .3em; color: #c9ad92; letter-spacing: 0; margin-left: 8px; }
  .ar-cheer { border: 0; border-radius: 99px; padding: 20px; font: 800 20px 'Bricolage Grotesque', sans-serif; color: ${INK};
    background: linear-gradient(180deg, #ffe58a, #ffd23f); box-shadow: 0 0 0 3px ${INK}, 0 16px 40px -14px #ffd23f; touch-action: manipulation; transition: transform .1s; }
  .ar-cheer:active { transform: scale(.95); }
  .ar-win h2 { color: #ffd23f; }
`;
document.head.append(css);

const heart = (lost) => `<svg viewBox="-17 -16 34 32"><path d="M0 13 C-14 3 -16 -4 -13 -9 C-10 -14 -3 -13 0 -7 C3 -13 10 -14 13 -9 C16 -4 14 3 0 13 Z"
  fill="${lost ? '#2a1d14' : '#ff5a1f'}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>${lost ? '<path d="M1 -6 L-3 0 L2 3 L-1 10" fill="none" stroke="#6b5a48" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-8 -7 C-6 -9 -4 -9 -3 -8" fill="none" stroke="#ffd9a8" stroke-width="2.4" stroke-linecap="round"/>'}</svg>`;

let A = null; // the running arena on this phone

// While the arena is open the page cannot zoom: two thumbs (stick + fire) read as a pinch and
// quick taps as a double-tap. The viewport is locked (which also snaps a zoomed page back), and
// touches and Safari's gesture events inside the arena never reach the browser.
const vp = document.querySelector('meta[name=viewport]');
const vp0 = vp?.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';
const stop = (e) => { if (A) e.preventDefault(); };
function noZoom(on) {
  vp?.setAttribute('content', on ? 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' : vp0);
  const f = on ? 'addEventListener' : 'removeEventListener';
  ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach((t) => document[f](t, stop, { passive: false }));
  document[f]('touchmove', stop, { passive: false });
  document[f]('touchstart', multi, { passive: false });
  document[f]('touchend', tapEnd, { passive: false });
}
const multi = (e) => { if (A && e.touches.length > 1) e.preventDefault(); };
let lastEnd = 0;
const tapEnd = (e) => {
  if (!A || e.target.closest?.('.ar-cheer')) return;
  const t = Date.now();
  if (t - lastEnd < 350) e.preventDefault(); // a quick second tap is not a double-tap zoom
  lastEnd = t;
};
const now = () => Date.now() + (A?.off || 0);

function open(m) {
  if (A) { A.R = m.R || A.R; return; }
  if (!m.out) window.vedWake?.('Arenaen');
  const root = document.createElement('div');
  root.className = 'ar';
  root.innerHTML = `
    <div class="ar-top"><div class="ar-who"><div class="ar-eye">Arenaen</div><div class="ar-name"><i></i><span>Du</span></div></div><div class="ar-hearts"></div></div>
    <div class="ar-view"><canvas></canvas><div class="ar-flash"></div><div class="ar-msg"></div></div>
    <div class="ar-pad"><div class="ar-stick"><div class="ar-puck"></div></div><button class="ar-fire" type="button"><i></i>Skyt</button></div>`;
  document.body.append(root);
  noZoom(true);
  const a0 = Math.random() * 6.28, d0 = (m.R || 400) * (0.3 + Math.random() * 0.4);
  A = {
    root, R: m.R || 400, phase: m.phase, at: m.at || 0, off: (m.now || Date.now()) - Date.now(),
    x: Math.cos(a0) * d0, y: Math.sin(a0) * d0, a: a0 + Math.PI, vx: 0, vy: 0, hp: 3, cd: 0, firing: false,
    roster: new Map(), myK: -1, others: new Map(), bullets: [], mine: [], fx: [], ringR: m.R || 400, ringT: m.R || 400,
    sendT: 0, last: '', dead: false, watching: false, joinedT: performance.now(), shake: 0, cdShown: -1, raf: 0,
  };
  A.cv = root.querySelector('canvas'); A.g = A.cv.getContext('2d');
  A.msg = root.querySelector('.ar-msg'); A.flash = root.querySelector('.ar-flash');
  A.fire = root.querySelector('.ar-fire'); A.puck = root.querySelector('.ar-puck');
  hearts();
  stick(root.querySelector('.ar-stick'));
  fireBtn();
  if (m.out) return out(m.out);
  phase(m);
  let t0 = performance.now();
  const loop = (t) => { if (!A) return; const dt = Math.min(0.05, (t - t0) / 1000); t0 = t; frame(dt, t / 1000); A.raf = requestAnimationFrame(loop); };
  A.raf = requestAnimationFrame(loop);
  sendPos(true);
}

function close(fast) {
  if (!A) return;
  window.vedWakeCancel?.();
  noZoom(false);
  const r = A.root; cancelAnimationFrame(A.raf); A = null;
  if (fast) { r.remove(); return; }
  r.classList.add('out'); setTimeout(() => r.remove(), 500);
}

function hearts() {
  const h = A.root.querySelector('.ar-hearts');
  h.innerHTML = [0, 1, 2].map((i) => heart(i >= A.hp)).join('');
  if (A.lostAt !== undefined) h.children[A.lostAt]?.classList.add('lost');
}

function phase(m) {
  A.phase = m.phase; A.R = m.R || A.R;
  if (m.at) A.at = m.at;
  if (m.now) A.off = m.now - Date.now();
  if (A.phase === 'lobby') say('<b>Øv deg på å styre.<br>Runden starter snart.</b>');
  if (A.phase === 'fight') { A.count = -1; A.joinedT = performance.now(); }
}
const say = (html) => { if (A) A.msg.innerHTML = html; };

// ---------- controls ----------
function stick(base) {
  let id = null;
  const move = (e) => {
    const r = base.getBoundingClientRect(), max = r.width * 0.36;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    A.puck.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = Math.min(1, d / max), dead = k < 0.12;
    A.vx = dead ? 0 : (dx / max); A.vy = dead ? 0 : (dy / max);
    if (!dead) A.a = Math.atan2(dy, dx);
  };
  base.addEventListener('pointerdown', (e) => { if (id !== null) return; id = e.pointerId; base.setPointerCapture(id); A.puck.classList.add('held'); move(e); e.preventDefault(); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === id && A) move(e); });
  const up = (e) => { if (e.pointerId !== id || !A) return; id = null; A.vx = A.vy = 0; A.puck.classList.remove('held'); A.puck.style.transform = ''; };
  base.addEventListener('pointerup', up); base.addEventListener('pointercancel', up);
}
function fireBtn() {
  const b = A.fire;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); A.firing = true; b.classList.add('down'); });
  const up = () => { if (!A) return; A.firing = false; b.classList.remove('down'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

const live = () => A.phase === 'fight' && now() >= A.at;
function shoot() {
  A.cd = CD;
  send({ type: 'afire', x: Math.round(A.x), y: Math.round(A.y), a: Math.round(A.a * 100) });
  A.mine.push({ x: A.x + Math.cos(A.a) * (PR + 4), y: A.y + Math.sin(A.a) * (PR + 4), vx: Math.cos(A.a) * BSPD, vy: Math.sin(A.a) * BSPD, life: BLIFE });
  buzz(8);
}
function sendPos(force) {
  const s = `${Math.round(A.x)},${Math.round(A.y)},${Math.round(A.a * 100)}`;
  if (!force && s === A.last && A.sendT > -0.6) return;
  A.last = s; A.sendT = 1 / 15;
  send({ type: 'apos', x: Math.round(A.x), y: Math.round(A.y), a: Math.round(A.a * 100) });
}

// ---------- each frame ----------
function frame(dt, time) {
  // countdown
  if (A.phase === 'fight') {
    const left = Math.ceil((A.at - now()) / 1000);
    if (left !== A.count && left >= 0 && left <= 3) {
      A.count = left;
      say(left > 0 ? `<b class="big">${left}</b>` : '<b class="big go">Kjør!</b>');
      if (left === 0) buzz(60);
    }
    // joined after the start: watch the TV
    if (!A.watching && A.myK < 0 && A.roster.size && performance.now() - A.joinedT > 2500) {
      A.watching = true;
      card('<p class="ar-eye">Arenaen</p><h2>Runden er i gang.</h2><p>Du er med i neste. Se på TV-en.</p>');
    }
  }
  if (!A) return;
  // move: the phone owns its position
  if (!A.dead) {
    A.x += A.vx * SPEED * dt; A.y += A.vy * SPEED * dt;
    const r = Math.hypot(A.x, A.y), lim = A.R - PR;
    if (r > lim) { A.x *= lim / r; A.y *= lim / r; }
    A.cd = Math.max(0, A.cd - dt);
    if (A.firing && A.cd <= 0 && live()) shoot();
    A.sendT -= dt;
    if (A.sendT <= 0) sendPos(false);
  }
  const cdk = A.cd > 0 ? Math.round((1 - A.cd / CD) * 20) / 20 : 0;
  if (cdk !== A.cdShown) { A.cdShown = cdk; A.fire.style.setProperty('--cd', cdk); }
  A.fire.disabled = A.dead || !live();
  // the others ease toward the latest state; bullets fly on between states
  const e = 1 - Math.exp(-dt * 14);
  A.others.forEach((o) => { o.dx += (o.x - o.dx) * e; o.dy += (o.y - o.dy) * e; });
  A.ringR += (A.ringT - A.ringR) * e;
  for (const b of A.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
  A.bullets = A.bullets.filter((b) => b.life > 0);
  for (const b of A.mine) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (Math.hypot(b.x, b.y) > A.R) b.life = 0;
    // looks like a hit here: the bullet stops (the talk decides the damage)
    A.others.forEach((o) => { if (b.life > 0 && Math.hypot(o.dx - b.x, o.dy - b.y) < PR + BR) b.life = 0; });
  }
  A.mine = A.mine.filter((b) => b.life > 0);
  for (const f of A.fx) f.t += dt;
  A.fx = A.fx.filter((f) => f.t < f.dur);
  A.shake = Math.max(0, A.shake - dt);
  draw(time);
}

// ---------- drawing: the whole arena, fitted to the screen ----------
function draw(time) {
  const cv = A.cv, g = A.g, dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const CX = cv.width / 2, CY = cv.height / 2, s = Math.min(CX, CY) / (A.R + 8);
  const u = dpr / s;                          // one screen pixel, in arena units
  const sh = A.shake > 0 ? Math.sin(A.shake * 80) * 6 * dpr * (A.shake / 0.3) : 0;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(s, 0, 0, s, CX + sh, CY);
  // the floor inside the wall, the grid, the danger zone
  g.save();
  g.beginPath(); g.arc(0, 0, A.R, 0, 6.2832); g.clip();
  g.fillStyle = '#1f160f'; g.fillRect(-A.R, -A.R, A.R * 2, A.R * 2);
  g.strokeStyle = 'rgba(255,190,120,.10)'; g.lineWidth = 1.5 * u;
  for (let x = -Math.floor(A.R / 80) * 80; x < A.R; x += 80) { g.beginPath(); g.moveTo(x, -A.R); g.lineTo(x, A.R); g.stroke(); }
  for (let y = -Math.floor(A.R / 80) * 80; y < A.R; y += 80) { g.beginPath(); g.moveTo(-A.R, y); g.lineTo(A.R, y); g.stroke(); }
  if (A.ringR < A.R - 1) {
    g.beginPath(); g.arc(0, 0, A.R, 0, 6.2832); g.arc(0, 0, A.ringR, 0, 6.2832, true);
    g.fillStyle = `rgba(255,90,31,${0.18 + 0.06 * Math.sin(time * 4)})`; g.fill();
  }
  g.restore();
  g.beginPath(); g.arc(0, 0, A.R, 0, 6.2832); g.lineWidth = 2.5 * u; g.strokeStyle = 'rgba(255,190,120,.6)'; g.stroke();
  if (A.ringR < A.R - 1) {
    g.save(); g.setLineDash([9 * u, 6 * u]); g.lineDashOffset = -time * 20 * u;
    g.beginPath(); g.arc(0, 0, Math.max(4, A.ringR), 0, 6.2832); g.lineWidth = 2.5 * u; g.strokeStyle = '#ff5a1f'; g.stroke(); g.restore();
  }
  // bullets: never smaller than a few pixels
  const br = Math.max(BR, 3 * u);
  const bullet = (b, color) => {
    g.lineCap = 'round'; g.lineWidth = br * 1.4; g.strokeStyle = color + '66';
    g.beginPath(); g.moveTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05); g.lineTo(b.x, b.y); g.stroke();
    g.beginPath(); g.arc(b.x, b.y, br, 0, 6.2832); g.fillStyle = color; g.fill(); g.lineWidth = 1.5 * u; g.strokeStyle = INK; g.stroke();
  };
  A.bullets.forEach((b) => bullet(b, A.roster.get(b.o)?.color || '#fff3e3'));
  const myColor = A.roster.get(A.myK)?.color || '#ff7a2f';
  A.mine.forEach((b) => bullet(b, myColor));
  // players: at least 8 px, so a crowded arena still reads
  const pr = Math.max(PR, 8 * u);
  const named = A.others.size <= 14;
  const dot = (x, y, a, hp, color, name, me) => {
    g.beginPath();
    g.moveTo(x + Math.cos(a) * pr * 1.6, y + Math.sin(a) * pr * 1.6);
    g.lineTo(x + Math.cos(a + 0.42) * pr * 1.1, y + Math.sin(a + 0.42) * pr * 1.1);
    g.lineTo(x + Math.cos(a - 0.42) * pr * 1.1, y + Math.sin(a - 0.42) * pr * 1.1);
    g.closePath(); g.fillStyle = '#fff3e3'; g.fill(); g.lineWidth = 1.5 * u; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(x, y, pr, 0, 6.2832); g.fillStyle = '#2a1d14'; g.fill();
    g.save(); g.beginPath(); g.arc(x, y, pr, 0, 6.2832); g.clip();
    g.fillStyle = color; g.fillRect(x - pr, y + pr - (2 * pr * hp) / 3, pr * 2, (2 * pr * hp) / 3); g.restore();
    g.beginPath(); g.arc(x, y, pr, 0, 6.2832); g.lineWidth = 2 * u; g.strokeStyle = INK; g.stroke();
    if (!me && !named) return;
    g.font = `700 ${(me ? 12 : 10) * u}px "Space Mono", monospace`; g.textAlign = 'center';
    g.lineWidth = 3.5 * u; g.strokeStyle = 'rgba(22,16,11,.9)'; g.strokeText(name, x, y - pr - 9 * u);
    g.fillStyle = '#fff3e3'; g.fillText(name, x, y - pr - 9 * u);
  };
  A.others.forEach((o, k) => { const r = A.roster.get(k); if (r) dot(o.dx, o.dy, o.a, o.hp, r.color, r.name, false); });
  if (!A.dead && !A.watching) dot(A.x, A.y, A.a, A.hp, myColor, 'Du', true);
  // hits and falls
  for (const f of A.fx) {
    const q = f.t / f.dur;
    g.globalAlpha = 1 - q;
    if (f.kind === 'hit') { g.beginPath(); g.arc(f.x, f.y, pr + (3 + q * 24) * u, 0, 6.2832); g.lineWidth = (4 * (1 - q) + 1.5) * u; g.strokeStyle = f.color; g.stroke(); }
    if (f.kind === 'die') {
      for (let i = 0; i < 6; i++) {
        const a0 = i / 6 * 6.28, d = q * pr * 3;
        g.save(); g.translate(f.x + Math.cos(a0 + 0.52) * d, f.y + Math.sin(a0 + 0.52) * d); g.rotate(q * (i % 2 ? 2 : -2));
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, pr, a0, a0 + 1.047); g.closePath(); g.fillStyle = f.color; g.fill(); g.lineWidth = 1.5 * u; g.strokeStyle = INK; g.stroke(); g.restore();
      }
    }
    g.globalAlpha = 1;
  }
}

// ---------- from the talk ----------
function roster(m) {
  if (!A) return;
  A.roster = new Map(m.list.map(([k, id, name, color]) => [k, { id, name, color }]));
  A.roster.forEach((r, k) => { if (r.id === meId) A.myK = k; });
  const me = A.roster.get(A.myK);
  if (me) {
    const n = A.root.querySelector('.ar-name');
    n.querySelector('span').textContent = me.name;
    n.querySelector('i').style.background = me.color;
    A.root.style.setProperty('--pc', me.color);
  }
}
function state(m) {
  if (!A) return;
  A.ringT = m.r; A.R = m.R || A.R;
  if (A.ringR > A.R) A.ringR = A.R;
  const seen = new Set();
  for (let i = 0; i < m.p.length; i += 5) {
    const [k, x, y, a, hp] = m.p.slice(i, i + 5);
    if (k === A.myK) {
      if (hp < A.hp && !A.dead) hit(A.hp - 1);
      A.hp = hp; continue;
    }
    seen.add(k);
    const o = A.others.get(k);
    if (o) { o.x = x; o.y = y; o.a = a / 100; o.hp = hp; } else A.others.set(k, { x, y, dx: x, dy: y, a: a / 100, hp });
  }
  // the others who fell since the last state break apart here too
  A.others.forEach((o, k) => { if (!seen.has(k)) { A.fx.push({ kind: 'die', x: o.dx, y: o.dy, color: A.roster.get(k)?.color || '#fff3e3', t: 0, dur: 0.9 }); A.others.delete(k); } });
  A.bullets = [];
  for (let i = 0; i < m.b.length; i += 4) {
    const [o, x, y, a] = m.b.slice(i, i + 4);
    if (o === A.myK) continue;               // mine fly here already
    A.bullets.push({ o, x, y, vx: Math.cos(a / 100) * BSPD, vy: Math.sin(a / 100) * BSPD, life: 0.2 });
  }
  for (let i = 0; i < (m.h || []).length; i += 2) {
    const [v, by] = m.h.slice(i, i + 2);
    const o = A.others.get(v);
    if (o) A.fx.push({ kind: 'hit', x: o.dx, y: o.dy, color: A.roster.get(by)?.color || '#ff5a1f', t: 0, dur: 0.5 });
  }
}
function hit(left) {
  A.lostAt = left; hearts();
  A.shake = 0.3;
  A.flash.classList.remove('on'); void A.flash.offsetWidth; A.flash.classList.add('on');
  buzz([40, 30, 80]);
}
function out(m) {
  if (!A || A.dead) return;
  A.dead = true; A.hp = 0; hearts();
  A.fx.push({ kind: 'die', x: A.x, y: A.y, color: A.roster.get(A.myK)?.color || '#ff7a2f', t: 0, dur: 1.1 });
  buzz([120, 60, 200]);
  setTimeout(() => {
    if (!A || A.ended) return;
    card(`<p class="ar-eye">Ute</p><div class="ar-place">${m.rank}<small>av ${m.total}</small></div>
      <p>${m.by === 'Ringen' ? 'Ringen tok deg.' : `Tatt av ${esc(m.by)}.`}</p>
      <button class="ar-cheer" type="button">Hei-heia</button><p>Se på TV-en. Heiingen lander der.</p>`);
    A?.root.querySelector('.ar-cheer')?.addEventListener('click', () => { send({ type: 'acheer' }); buzz(10); });
  }, 1100);
}
function card(html) {
  if (!A) return;
  A.root.querySelector('.ar-card')?.remove();
  const c = document.createElement('div');
  c.className = 'ar-card'; c.innerHTML = html;
  A.root.append(c);
  return c;
}
function end(m) {
  if (!A) return;
  if (!m.name) return close();              // the talk moved on mid-round
  A.ended = true;
  const me = m.winner && m.winner === meId;
  const c = card(me ? '<p class="ar-eye">Arenaen</p><h2>Du vant.</h2><p>Se opp på skjermen.</p>'
    : `<p class="ar-eye">Arenaen</p><h2>${esc(m.name)} vant.</h2><p>Se opp på skjermen.</p>`);
  if (me) { c.classList.add('ar-win'); buzz([80, 60, 80, 60, 300]); }
  setTimeout(() => close(), 7000);
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- messages ----------
const handle = (m) => {
  if (!m?.type) return;
  if (m.type === 'arena') { if (!A) open(m); else phase(m); if (m.out) out(m.out); }
  if (m.type === 'arena-roster') roster(m);
  if (m.type === 'arena-state') state(m);
  if (m.type === 'arena-out') out(m);
  if (m.type === 'arena-end') end(m);
  if (m.type === 'room-reset' || m.type === 'reset') close(true);
};
const prev = window.vedHook;
window.vedHook = (m) => {
  prev?.(m);
  handle(m);
  if (m.type === 'state' && m.game?.type === 'arena') handle(m.game);
};
if (window.vedGameNow?.type === 'arena') handle(window.vedGameNow);   // the game was running before this script loaded
