// The lobby: what a phone shows before the talk opens the shop. It wears the talk's look
// (Arbeidstegning: warm grid, crop marks, a title block, one pencil note) and shows the room
// itself: every phone that joined orbits the count in the middle, yours marked.
// Once the talk starts (the title slide's first click), the page dims: the orbit shrinks to a faint
// strip, one line says to watch the screen, and the title block shows the sheet the talk is on.
// Nothing here asks for attention; a room activity lights the phone up (js/wake.js) when it is time.
// The relay still collects the talk's tips (def.pocket) for the end of the talk.
// When the shop opens, the orbit collapses into one point, the point flashes in the winning
// design's colour, and the shop appears out of it.
const $ = (s, r = document) => r.querySelector(s);
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const ACC = { peis: ['#ffb25e', '#ff5a1f'], skog: ['#c6e8ab', '#86b86b'], nordisk: ['#f4efe7', '#e9dfd0'], rask: ['#ffe27a', '#ffd23f'] };
const INK = { peis: '#1a0d07', skog: '#0d1a12', nordisk: '#1a120c', rask: '#14110c' };
const TITLE = 'Fra idé til lansering, med AI';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const voterId = (() => { try { return JSON.parse(localStorage.getItem('ved-voter') || '""').slice(0, 6); } catch { return ''; } })();

const css = document.createElement('style');
css.textContent = `
  .lobby { position: fixed; inset: 0; z-index: 9; overflow: hidden; color: #fff3e3; background: #16100b;
    display: flex; flex-direction: column; padding: calc(16px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom));
    font-family: 'Bricolage Grotesque', system-ui, sans-serif; animation: lb-in .7s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes lb-in { from { opacity: 0; } }
  .lobby .lb-grid { position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,160,80,.085) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,160,80,.085) 1.5px, transparent 1.5px),
      linear-gradient(rgba(255,160,80,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,160,80,.04) 1px, transparent 1px);
    background-size: 80px 80px, 80px 80px, 16px 16px, 16px 16px; background-position: center;
    -webkit-mask-image: radial-gradient(120% 90% at 50% 55%, #000 30%, transparent 85%); mask-image: radial-gradient(120% 90% at 50% 55%, #000 30%, transparent 85%);
    animation: lb-pan 40s linear infinite; }
  @keyframes lb-pan { to { background-position: calc(50% + 80px) calc(50% + 80px); } }
  .lobby .lb-glow { position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(70% 45% at 50% 56%, rgba(255,90,31,.16), transparent 70%), radial-gradient(60% 30% at 50% 108%, rgba(255,210,63,.08), transparent 70%); }
  .lobby .lb-crop { position: absolute; width: 18px; height: 18px; border: 0 solid rgba(255,190,120,.55); pointer-events: none; }
  .lobby .lb-crop.tl { left: 10px; top: calc(10px + env(safe-area-inset-top)); border-width: 2px 0 0 2px; }
  .lobby .lb-crop.tr { right: 10px; top: calc(10px + env(safe-area-inset-top)); border-width: 2px 2px 0 0; }
  .lobby .lb-crop.bl { left: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); border-width: 0 0 2px 2px; }
  .lobby .lb-crop.br { right: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); border-width: 0 2px 2px 0; }
  .lobby > :not(.lb-grid):not(.lb-glow):not(.lb-crop):not(.lb-flash) { position: relative; }
  .lb-top { display: flex; justify-content: space-between; align-items: center; font: 700 11px 'Space Mono', monospace; letter-spacing: .18em; text-transform: uppercase; color: #c9ad92; padding: 4px 4px 0; }
  .lb-live { display: inline-flex; align-items: center; gap: 8px; padding: 6px 11px; border: 1.5px solid rgba(255,190,120,.3); border-radius: 99px; }
  .lb-live i { width: 7px; height: 7px; border-radius: 50%; background: #74604d; transition: background .4s, box-shadow .4s; }
  .lb-live.on i { background: #8fe3a2; box-shadow: 0 0 10px #8fe3a2; animation: lb-blink 2s ease-in-out infinite; }
  @keyframes lb-blink { 50% { opacity: .45; } }
  .lb-hero { margin-top: clamp(18px, 5svh, 44px); padding: 0 4px; }
  .lb-eye { font: 700 11px 'Space Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: #ff5a1f; display: flex; align-items: center; gap: 10px; }
  .lb-eye::before { content: ''; width: 22px; height: 2px; background: currentColor; }
  .lb-title { font-weight: 800; font-size: clamp(40px, 12.4vw, 64px); line-height: .92; letter-spacing: -.045em; margin: 12px 0 0; }
  .lb-title span { display: block; overflow: hidden; padding-bottom: .06em; }
  .lb-title span > i { display: inline-block; font-style: normal; animation: lb-rise .9s cubic-bezier(.2,.8,.2,1) both; }
  .lb-title span:nth-child(2) > i { animation-delay: .08s; } .lb-title span:nth-child(3) > i { animation-delay: .16s; }
  @keyframes lb-rise { from { transform: translateY(105%); } }
  .lb-orbit { flex: 1; min-height: 240px; margin: 4px -22px 0; }
  .lb-orbit canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .lb-count { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
  .lb-count b { display: block; font: 700 clamp(56px, 18vw, 84px)/1 'Space Mono', monospace; color: #ffd23f; letter-spacing: -.04em; text-shadow: 0 0 40px rgba(255,160,40,.45); }
  .lb-count span { font: 700 11px 'Space Mono', monospace; letter-spacing: .24em; text-transform: uppercase; color: #c9ad92; }
  .lb-foot { display: grid; gap: 12px; }
  .lb-hint { font-size: 15px; color: #c9ad92; padding: 0 4px; }
  .lb-block { display: grid; grid-template-columns: auto 1fr auto; border: 2px solid rgba(255,190,120,.45); background: rgba(22,16,11,.7);
    font: 400 9.5px 'Space Mono', monospace; text-transform: uppercase; letter-spacing: .1em; color: #c9ad92; }
  .lb-block > div { padding: 7px 11px; border-left: 2px solid rgba(255,190,120,.45); }
  .lb-block > div:first-child { border-left: 0; }
  .lb-block b { display: block; font-weight: 700; font-size: 12px; color: #fff3e3; letter-spacing: .04em; white-space: nowrap; }
  .lb-block .y b { color: #ffd23f; }
  .lb-block .w { min-width: 0; } .lb-block .w b { overflow: hidden; text-overflow: ellipsis; }
  /* the talk has started: a dim page that says to watch the screen */
  .lobby.talk { transition: background .8s; }
  .lobby.talk .lb-hero, .lobby.talk .lb-hint { display: none; }
  .lobby.talk .lb-glow { opacity: .25; transition: opacity .8s; }
  .lobby.talk .lb-grid { opacity: .45; }
  .lobby.talk .lb-orbit { flex: none; height: clamp(110px, 17svh, 150px); min-height: 0; margin-top: 2px; }
  .lobby.talk .lb-orbit canvas { opacity: .5; }
  .lobby.talk .lb-count b { font-size: 34px; color: #b8932f; text-shadow: none; }
  .lobby.talk .lb-count span { font-size: 9px; letter-spacing: .2em; color: #74604d; }
  .lobby.talk .lb-top, .lobby.talk .lb-block { opacity: .55; }
  .lb-now { display: none; flex: 1; flex-direction: column; justify-content: center; padding: 0 4px 6svh; }
  .lobby.talk .lb-now { display: flex; }
  .lb-look { position: relative; display: flex; flex-direction: column; align-items: center; gap: 22px; margin: 0; color: #dcc4a6; text-align: center; }
  /* a warm glow that breathes behind the screen */
  .lb-look::before { content: ''; position: absolute; left: 50%; top: 58px; width: 340px; height: 260px; margin: -130px 0 0 -170px; pointer-events: none; z-index: -1;
    background: radial-gradient(closest-side, rgba(255,140,60,.34), rgba(255,90,31,.14) 45%, transparent 100%); filter: blur(8px);
    animation: lb-breathe 5.5s ease-in-out infinite; }
  @keyframes lb-breathe { 50% { opacity: .65; transform: scale(.94); } }
  .lb-screen { width: 168px; height: auto; overflow: visible; }
  .lb-screen .sweep { animation: lb-sweep 7s cubic-bezier(.45,0,.2,1) infinite; }
  @keyframes lb-sweep { 0%, 55% { transform: translateX(-150px); } 85%, 100% { transform: translateX(170px); } }
  .lb-screen .dot { animation: lb-dot 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes lb-dot { 50% { opacity: .45; transform: scale(.8); } }
  .lb-look span { font-weight: 700; font-size: 22px; letter-spacing: -.01em; text-shadow: 0 0 24px rgba(255,150,70,.35); }
  .lb-screen { filter: drop-shadow(0 0 14px rgba(255,140,60,.35)); }
  .lobby.out .lb-top, .lobby.out .lb-hero, .lobby.out .lb-foot, .lobby.out .lb-count { transition: opacity .5s, transform .7s cubic-bezier(.6,0,.4,1); opacity: 0; }
  .lobby.out .lb-hero { transform: translateY(-24px); } .lobby.out .lb-foot { transform: translateY(24px); } .lobby.out .lb-count { transform: translate(-50%, -50%) scale(.4); }
  .lb-flash { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; clip-path: circle(0% at 50% var(--cy, 56%));
    background: radial-gradient(circle at 50% var(--cy, 56%), var(--fa), var(--fb) 70%); }
  .lb-flash.go { transition: clip-path .65s cubic-bezier(.7,0,.2,1); clip-path: circle(150% at 50% var(--cy, 56%)); }
  .lb-mark { display: flex; align-items: baseline; gap: 4px; font-weight: 800; font-size: clamp(88px, 30vw, 150px); letter-spacing: -.06em; color: var(--ink);
    opacity: 0; transform: scale(.82); transition: opacity .5s, transform 1.4s cubic-bezier(.2,.8,.2,1); }
  .lb-mark i { width: .17em; height: .17em; border-radius: 50%; background: var(--ink); display: inline-block; }
  .lb-flash.mark .lb-mark { opacity: 1; transform: none; }
  .lobby.gone { transition: opacity .7s ease .1s; opacity: 0; }
  .lobby.gone .lb-mark { transform: scale(1.12); opacity: 0; transition: opacity .6s, transform .8s cubic-bezier(.4,0,.2,1); }
`;
document.head.append(css);

let el = null, cv, cx, W = 0, H = 0, dpr = 1, raf = 0, exiting = 0;
let people = [];               // { id, name, n, a (angle now), r (ring), pop, me }
let shown = 0;                  // the count as displayed (eases toward people.length)
let liveOn = false;
let where = '';                 // the talk's current part, from the deck's dividers

function mount() {
  if (el) return;
  el = document.createElement('div');
  el.className = 'lobby';
  el.innerHTML = `<div class="lb-grid"></div><div class="lb-glow"></div>
    <i class="lb-crop tl"></i><i class="lb-crop tr"></i><i class="lb-crop bl"></i><i class="lb-crop br"></i>
    <div class="lb-top"><span>10.12.2026</span><span class="lb-live"><i></i><span>Kobler til</span></span></div>
    <div class="lb-hero"><p class="lb-eye">Foredrag</p><h1 class="lb-title"><span><i>Fra idé til</i></span><span><i>lansering,</i></span><span><i>med AI</i></span></h1></div>
    <div class="lb-orbit"><canvas></canvas><div class="lb-count"><b>0</b><span>i salen</span></div></div>
    <div class="lb-now"><p class="lb-look"><svg class="lb-screen" viewBox="0 0 168 120" aria-hidden="true">
      <defs>
        <linearGradient id="lbScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a1c"/><stop offset="1" stop-color="#241911"/></linearGradient>
        <radialGradient id="lbGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a2f" stop-opacity=".3"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
        <linearGradient id="lbSweep" x1="0" x2="1"><stop offset="0" stop-color="#fff3e3" stop-opacity="0"/><stop offset=".5" stop-color="#fff3e3" stop-opacity=".14"/><stop offset="1" stop-color="#fff3e3" stop-opacity="0"/></linearGradient>
        <clipPath id="lbIn"><rect x="16" y="12" width="136" height="74" rx="3"/></clipPath>
      </defs>
      <ellipse cx="84" cy="56" rx="92" ry="58" fill="url(#lbGlow)"/>
      <path d="M74 94 L69 108 M94 94 L99 108 M56 108 H112" fill="none" stroke="#d1b493" stroke-width="3" stroke-linecap="round"/>
      <rect x="8" y="4" width="152" height="90" rx="8" fill="#16100b" stroke="#d1b493" stroke-width="3"/>
      <rect x="16" y="12" width="136" height="74" rx="3" fill="url(#lbScr)"/>
      <g clip-path="url(#lbIn)">
        <rect x="26" y="22" width="56" height="8" rx="2" fill="#d1b493" opacity=".9"/>
        <rect x="26" y="34" width="38" height="8" rx="2" fill="#d1b493" opacity=".6"/>
        <path d="M26 74 H140" stroke="#d1b493" stroke-width="2" opacity=".35"/>
        <path d="M30 70 L52 60 L72 64 L94 50 L112 54 L134 40" fill="none" stroke="#ffd23f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
        <circle class="dot" cx="134" cy="40" r="4" fill="#ff7a2f"/>
        <rect class="sweep" x="0" y="0" width="60" height="100" fill="url(#lbSweep)" transform="translate(-150 0)" style="transform-box: view-box"/>
      </g>
    </svg><span>Følg med på skjermen</span></p></div>
    <div class="lb-foot"><p class="lb-hint">Hold siden åpen. Den skifter av seg selv.</p>
      <div class="lb-block"><div class="y"><small>Ark</small><b>00</b></div><div class="w"><small>Del</small><b>Salen</b></div><div><small>Dato</small><b>10.12.26</b></div></div></div>`;
  document.body.append(el);
  cv = $('canvas', el); cx = cv.getContext('2d');
  size(); live(liveOn); setWhere(where); renderTalk(false);
  document.title = TITLE;
  $('meta[name="theme-color"]')?.setAttribute('content', '#16100b');
  document.documentElement.classList.add('lobby-on');
  shown = people.length; $('.lb-count b', el).textContent = shown;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
}
function size() {
  if (!el) return;
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, devicePixelRatio || 1);
  W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
}
addEventListener('resize', size);
function setWhere(label) { where = label || ''; if (el) $('.lb-block .w b', el).textContent = where || 'Salen'; }

function live(on) { liveOn = on; if (!el) return; $('.lb-live', el).classList.toggle('on', on); $('.lb-live span', el).textContent = on ? 'Live' : 'Kobler til'; }

// ---------- the talk: dim page, the current sheet ----------
let talk = false, tips = [], sheet = null;
const pad = (n) => String(n || 0).padStart(2, '0');
function setTalk(on, list) { talk = !!on; if (Array.isArray(list)) tips = list; renderTalk(false); }
function addTip(t) { if (t?.id) tips = [...tips.filter((x) => x.id !== t.id), t].sort((a, b) => a.n - b.n); } // kept for the end of the talk
function setSheet(sh, fresh) { if (!sh) return; const changed = sheet?.n !== sh.n; sheet = sh; renderTalk(fresh && changed); }
function renderTalk(fresh) {
  if (!el) return;
  const was = el.classList.contains('talk');
  el.classList.toggle('talk', talk);
  if (was !== talk) requestAnimationFrame(size);
  if (!sheet) return;
  $('.lb-block .y b', el).textContent = pad(sheet.n);
}

// ---------- the room ----------
const isMe = (p) => p.id && p.id === voterId;
function place() {
  // one ring up to 9, then an inner ring takes every other newcomer
  const two = people.length > 9;
  const rings = [[], []];
  people.forEach((p, k) => { p.r = two && k % 2 ? 1 : 0; rings[p.r].push(p); });
  rings.forEach((list) => list.forEach((p, k) => { p.slot = (k / list.length) * Math.PI * 2; }));
}
function setRoom(list) {
  const old = new Map(people.map((p) => [p.id, p]));
  people = list.map((q) => Object.assign(old.get(q.id) || { a: null, pop: 1 }, q, { me: isMe(q) }));
  people.sort((a, b) => a.n - b.n);
  place();
}
function addPerson(q) {
  const known = people.find((p) => p.id === q.id);
  if (known) { Object.assign(known, q); return; }
  people.push({ ...q, a: null, pop: 0, me: isMe(q) });
  people.sort((a, b) => a.n - b.n);
  place();
  if (isMe(q)) navigator.vibrate?.([30, 40, 60]);
}

// ---------- drawing ----------
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!W) size();
  const t = now / 1000;
  const k = exiting ? Math.min(1, (now - exiting) / 1100) : 0;  // the collapse
  const squeeze = 1 - ease(k);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);
  const ox = W / 2, oy = H / 2;
  // a tilted ring seen from above the room: flatter than a circle, so it reads as a floor plan in depth
  const rx0 = Math.min(W * 0.41, 230), ry0 = Math.min(rx0 * 0.7, H * 0.4);
  const R = [[rx0, ry0], [rx0 * 0.58, ry0 * 0.58]];
  const spin = [t * 0.16 + k * k * 9, -t * 0.22 - k * k * 12];

  // the rings, drawn like construction lines
  cx.lineWidth = 1.5; cx.setLineDash([3, 7]);
  R.forEach(([rx, ry], i) => {
    if (i === 1 && people.length <= 9) return;
    cx.strokeStyle = `rgba(255,190,120,${0.28 * squeeze})`;
    cx.beginPath(); cx.ellipse(ox, oy, rx * squeeze + .01, ry * squeeze + .01, 0, 0, Math.PI * 2); cx.stroke();
  });
  cx.setLineDash([]);
  // centre cross, as on a drawing
  cx.strokeStyle = `rgba(255,190,120,${0.35 * squeeze})`; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(ox - R[0][0] - 14, oy); cx.lineTo(ox - R[0][0] + 6, oy); cx.moveTo(ox + R[0][0] - 6, oy); cx.lineTo(ox + R[0][0] + 14, oy); cx.stroke();

  // the people, back to front
  const pts = people.map((p) => {
    const target = p.slot + spin[p.r];
    if (p.a == null) p.a = target;
    // glide toward the slot (re-spacing when someone joins), always the short way round
    let d = (target - p.a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    p.a += d * 0.06;
    if (p.pop < 1) p.pop = Math.min(1, p.pop + 1 / 55);
    const [rx, ry] = R[p.r];
    const x = ox + Math.cos(p.a) * rx * squeeze, y = oy + Math.sin(p.a) * ry * squeeze;
    const depth = (Math.sin(p.a) + 1) / 2;    // 0 back (top), 1 front (bottom)
    return { p, x, y, depth };
  }).sort((a, b) => a.depth - b.depth);

  for (const { p, x, y, depth } of pts) {
    const s = 0.72 + 0.5 * depth, al = (0.5 + 0.5 * depth) * (1 - k * 0.3);
    const col = DOT[(p.n - 1) % DOT.length];
    const pop = p.pop;
    // newcomer: sparks converge, then a ring flashes out
    if (pop < 1) {
      if (pop < 0.45) {
        const q = ease(pop / 0.45);
        for (let j = 0; j < 9; j++) {
          const ang = j / 9 * Math.PI * 2 + p.n, dist = (1 - q) * 70;
          cx.fillStyle = col; cx.globalAlpha = q;
          cx.beginPath(); cx.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 2.2, 0, 7); cx.fill();
        }
        cx.globalAlpha = 1;
        continue;
      }
      const q = (pop - 0.45) / 0.55;
      cx.strokeStyle = col; cx.globalAlpha = (1 - q) * 0.9; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(x, y, 8 + q * (p.me ? 70 : 40), 0, 7); cx.stroke(); cx.globalAlpha = 1;
    }
    const grow = pop < 1 ? Math.min(1, (pop - 0.45) / 0.2) * (1 + 0.6 * Math.sin(Math.min(1, (pop - 0.45) / 0.55) * Math.PI)) : 1;
    const r = (p.me ? 7.5 : 5.5) * s * grow;
    // glow
    const g = cx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.globalAlpha = al * (p.me ? 0.75 : 0.45) * (0.8 + 0.2 * Math.sin(t * 2.4 + p.n));
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 4, 0, 7); cx.fill();
    // the dot, with an ink outline
    cx.globalAlpha = al; cx.fillStyle = col; cx.strokeStyle = '#16100b'; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill(); cx.stroke();
    if (p.me) { cx.strokeStyle = '#fff3e3'; cx.lineWidth = 2; cx.globalAlpha = al * (0.55 + 0.45 * Math.sin(t * 3)); cx.beginPath(); cx.arc(x, y, r + 5, 0, 7); cx.stroke(); }
    // the name: below the dot in front, above it behind
    if (p.name && k < 0.3 && !talk) {
      cx.globalAlpha = al * (1 - k / 0.3) * Math.min(1, pop * 1.5);
      cx.font = `${p.me ? 800 : 700} ${Math.round((p.me ? 15 : 13) * (0.85 + 0.25 * depth))}px 'Bricolage Grotesque', sans-serif`;
      cx.textAlign = 'center'; cx.textBaseline = depth > 0.5 ? 'top' : 'bottom';
      cx.fillStyle = p.me ? '#fff3e3' : '#e6d2bb';
      const ly = depth > 0.5 ? y + r + 7 : y - r - 7;
      cx.fillText(p.name, Math.max(40, Math.min(W - 40, x)), ly);
    }
    cx.globalAlpha = 1;
    // the pencil note: which dot is yours
    if (p.me && pop >= 1 && k === 0 && !talk) pencil(x, y, r, depth);
  }

  // the count eases toward the room
  const target = people.length;
  if (Math.round(shown) !== target || Math.abs(shown - target) > 0.02) {
    shown += (target - shown) * 0.12;
    if (Math.abs(target - shown) < 0.02) shown = target;
    $('.lb-count b', el).textContent = Math.round(shown);
  }
  // the core: brightens as the orbit collapses into it
  if (k > 0) {
    const g = cx.createRadialGradient(ox, oy, 0, ox, oy, 30 + k * 60);
    g.addColorStop(0, `rgba(255,243,227,${k})`); g.addColorStop(0.4, `rgba(255,170,60,${k * 0.8})`); g.addColorStop(1, 'rgba(255,90,31,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(ox, oy, 30 + k * 60, 0, 7); cx.fill();
  }
}
function pencil(x, y, r, depth) {
  // "deg" sits outward from the orbit's centre, with a hand-drawn arrow to the dot
  // outward from the centre, unless that runs off the screen; then toward it
  let out = x < W / 2 ? -1 : 1; if (x + out * 70 < 0 || x + out * 70 > W) out = -out;
  const up = depth > 0.5 ? 1 : -1;
  const tx = x + out * 46, ty = y + up * 36;
  cx.save();
  cx.strokeStyle = '#ff6f9c'; cx.fillStyle = '#ff6f9c'; cx.lineWidth = 2; cx.lineCap = 'round';
  const ex = x + out * (r + 9), ey = y + up * (r + 6);
  cx.beginPath(); cx.moveTo(tx - out * 6, ty - up * 10); cx.quadraticCurveTo(tx - out * 4, ey + up * 2, ex, ey); cx.stroke();
  const ang = Math.atan2(ey - (ey + up * 2), ex - (tx - out * 4));
  cx.beginPath();
  cx.moveTo(ex, ey); cx.lineTo(ex - Math.cos(ang - 0.5) * 8, ey - Math.sin(ang - 0.5) * 8);
  cx.moveTo(ex, ey); cx.lineTo(ex - Math.cos(ang + 0.5) * 8, ey - Math.sin(ang + 0.5) * 8);
  cx.stroke();
  cx.translate(tx, ty + up * 6); cx.rotate(-0.06);
  cx.font = "700 26px 'Caveat', cursive"; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('deg', 0, 0);
  cx.restore();
}

// ---------- leaving: the shop opens ----------
function unmount(animate) {
  if (!el || exiting) return;
  document.documentElement.classList.remove('lobby-on');
  if (!animate || reduce) { cancelAnimationFrame(raf); el.remove(); el = null; return; }
  const me = el;
  const theme = document.documentElement.dataset.theme || 'peis';
  const [fa, fb] = ACC[theme] || ACC.peis;
  const orbit = $('.lb-orbit', me).getBoundingClientRect();
  const flash = document.createElement('div');
  flash.className = 'lb-flash';
  flash.style.cssText = `--fa:${fa};--fb:${fb};--ink:${INK[theme] || INK.peis};--cy:${((orbit.top + orbit.height / 2) / innerHeight) * 100}%`;
  flash.innerHTML = '<div class="lb-mark">Ved<i></i></div>';
  me.append(flash);
  exiting = performance.now();
  me.classList.add('out');
  setTimeout(() => { flash.classList.add('go'); navigator.vibrate?.([20, 30, 90]); }, 1000);
  setTimeout(() => flash.classList.add('mark'), 1450);
  setTimeout(() => {
    // the shop underneath plays its entrance again, now that it can be seen
    document.querySelectorAll('#shop .reveal').forEach((n) => { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; });
    me.classList.add('gone');
  }, 2650);
  setTimeout(() => { cancelAnimationFrame(raf); me.remove(); if (el === me) el = null; exiting = 0; }, 3500);
}

// ---------- wiring ----------
// index.html calls vedView on every render and vedLive on connection changes
let seen = false;
window.vedView = ({ lobby }) => {
  if (lobby) { if (!el || exiting) { exiting = 0; el?.remove(); el = null; mount(); } }
  else if (el) unmount(seen);   // animate only if this phone actually sat in the lobby
  seen = !!el;
};
window.vedLive = live;
if (window.vedViewNow) window.vedView(window.vedViewNow);
if (window.vedLiveNow != null) live(window.vedLiveNow);

const prev = window.vedHook;
window.vedHook = (m) => {
  prev?.(m);
  if (Array.isArray(m.room)) setRoom(m.room);
  if (typeof m.where === 'string') setWhere(m.where);
  if (m.type === 'where') setWhere(m.label);
  if (m.type === 'room-joined' && m.p) addPerson(m.p);
  if (m.type === 'me' && m.me) addPerson(m.me);
  if (m.type === 'room-reset') setRoom([]);
  if (typeof m.talk === 'boolean') setTalk(m.talk, m.tips);
  if (m.type === 'talk') setTalk(m.on, m.tips);
  if (m.type === 'tip') addTip(m.tip);
  if (m.sheet && m.type === 'state') setSheet(m.sheet, false);
  if (m.type === 'sheet') setSheet(m.sheet, true);
  if (el && m.theme) $('meta[name="theme-color"]')?.setAttribute('content', '#16100b'); // vote.js recolours the bar for the shop
};
if (window.vedRoomNow) setRoom(window.vedRoomNow);
if (window.vedWhereNow != null) setWhere(window.vedWhereNow);
if (window.vedTalkNow) { if (window.vedTalkNow.sheet) sheet = window.vedTalkNow.sheet; setTalk(window.vedTalkNow.on, window.vedTalkNow.tips); }
