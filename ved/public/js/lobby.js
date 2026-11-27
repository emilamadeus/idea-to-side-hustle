// The lobby: what a phone shows before the talk opens the shop. It wears the talk's look
// (Arbeidstegning: warm grid, crop marks, a title block, one pencil note) and shows the room
// itself: every phone that joined orbits the count in the middle, yours marked.
// Once the talk starts (the title slide's first click), the hero and hint give way to the tip
// list: the orbit shrinks to a strip at the top, the current slide's tip sits large under it, and
// the tips so far collect below, newest first. The audience takes the list home.
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
  /* the talk has started: the tip list */
  .lobby.talk .lb-hero, .lobby.talk .lb-hint { display: none; }
  .lobby.talk .lb-orbit { flex: none; height: clamp(110px, 17svh, 150px); min-height: 0; margin-top: 2px; }
  .lobby.talk .lb-count b { font-size: 34px; text-shadow: 0 0 24px rgba(255,160,40,.4); }
  .lobby.talk .lb-count span { font-size: 9px; letter-spacing: .2em; }
  .lb-tips { display: none; flex: 1; min-height: 0; overflow-y: auto; margin: 4px -22px 12px; padding: 0 26px 30px;
    -webkit-mask-image: linear-gradient(#000 82%, transparent); mask-image: linear-gradient(#000 82%, transparent); scrollbar-width: none; }
  .lb-tips::-webkit-scrollbar { display: none; }
  .lobby.talk .lb-tips { display: block; }
  .lb-now { padding: 18px 0 22px; border-bottom: 2px solid rgba(255,190,120,.22); }
  .lb-now h2 { font-weight: 800; font-size: clamp(32px, 10vw, 44px); line-height: .98; letter-spacing: -.04em; margin: 12px 0 0; }
  .lb-now h2 em { font-style: normal; color: #ff7a2f; }
  .lb-now p { margin: 12px 0 0; color: #c9ad92; font-size: 15px; }
  .lb-now.new h2 { animation: lb-tip .8s cubic-bezier(.2,.8,.2,1) both; }
  .lb-now.new .lb-eye { animation: lb-tip .6s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes lb-tip { from { opacity: 0; transform: translateY(18px); } }
  .lb-so { font: 700 10.5px 'Space Mono', monospace; letter-spacing: .2em; text-transform: uppercase; color: #8a7360; margin: 20px 0 6px; }
  .lb-list { list-style: none; margin: 0; padding: 0; }
  .lb-list li { display: grid; grid-template-columns: 34px 1fr 18px; gap: 10px; align-items: baseline; padding: 12px 0; border-bottom: 1.5px dashed rgba(255,190,120,.16); }
  .lb-list li.new { animation: lb-tip .7s .15s cubic-bezier(.2,.8,.2,1) both; }
  .lb-list b { font: 700 12px 'Space Mono', monospace; color: #ffd23f; }
  .lb-list span { font-weight: 700; font-size: 18px; line-height: 1.2; letter-spacing: -.015em; color: #f0dfca; }
  .lb-list span em { font-style: normal; color: #ffb25e; }
  .lb-list i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #8fe3a2; position: relative; top: 2px; }
  .lb-list i::after { content: ''; position: absolute; left: 3px; top: 0; width: 4px; height: 7px; border: solid #8fe3a2; border-width: 0 2px 2px 0; transform: rotate(40deg); }
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
    <div class="lb-tips"></div>
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

// ---------- the tip list ----------
let talk = false, tips = [], nowId = null;
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const withEm = (t) => { const s = esc(t.text), e = esc(t.em); return e && s.includes(e) ? s.replace(e, `<em>${e}</em>`) : s; };
const pad = (n) => String(n || 0).padStart(2, '0');
function setTalk(on, list) {
  talk = !!on;
  if (Array.isArray(list)) { tips = list; nowId = list.length ? list[list.length - 1].id : null; }
  renderTalk(false);
}
function addTip(t) {
  if (!t?.id) return;
  tips = [...tips.filter((x) => x.id !== t.id), t].sort((a, b) => a.n - b.n);
  const fresh = nowId !== t.id;
  nowId = t.id;
  talk = true;
  renderTalk(fresh);
  if (fresh && el) navigator.vibrate?.(15);
}
function renderTalk(fresh) {
  if (!el) return;
  const was = el.classList.contains('talk');
  el.classList.toggle('talk', talk);
  if (was !== talk) requestAnimationFrame(size);
  const box = $('.lb-tips', el);
  if (!talk) { box.innerHTML = ''; return; }
  const now = tips.find((t) => t.id === nowId);
  const rest = tips.filter((t) => t.id !== nowId).sort((a, b) => b.n - a.n);
  box.innerHTML = (now
    ? `<div class="lb-now${fresh ? ' new' : ''}"><p class="lb-eye">Nå · Ark ${pad(now.n)}${now.part ? ` · ${esc(now.part)}` : ''}</p><h2>${withEm(now)}</h2></div>`
    : `<div class="lb-now"><p class="lb-eye">Grepene</p><h2>Grepene fra foredraget samles <em>her</em>.</h2><p>Ett for ett, mens vi går. Listen er din etterpå.</p></div>`)
    + (rest.length ? `<p class="lb-so">Så langt · ${tips.length}</p><ul class="lb-list">${rest.map((t, k) => `<li class="${fresh && k === 0 ? 'new' : ''}"><b>${pad(t.n)}</b><span>${withEm(t)}</span><i></i></li>`).join('')}</ul>` : '');
  if (now) $('.lb-block .y b', el).textContent = pad(now.n);
}
function live(on) { liveOn = on; if (!el) return; $('.lb-live', el).classList.toggle('on', on); $('.lb-live span', el).textContent = on ? 'Live' : 'Kobler til'; }

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
  if (el && m.theme) $('meta[name="theme-color"]')?.setAttribute('content', '#16100b'); // vote.js recolours the bar for the shop
};
if (window.vedRoomNow) setRoom(window.vedRoomNow);
if (window.vedWhereNow != null) setWhere(window.vedWhereNow);
if (window.vedTalkNow) setTalk(window.vedTalkNow.on, window.vedTalkNow.tips);
