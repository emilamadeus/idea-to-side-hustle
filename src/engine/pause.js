import gsap from 'gsap';
import { relaySend } from './relay.js';
import arenaDef from '../slides/arena.js';

/*
  The break. K (or the console's Pause button) lays a pause sheet over the slide; the slide stays
  exactly as it was underneath (nothing is re-entered), so K again puts you back where you were.
  Every phone shows the same countdown (ved/public/js/pause.js, through the relay).

    K           pause / back to the talk
    ↑ ↓         one minute more / less          (or drag the ruler, or the console's slider)
    A           the arena during the break: the arena slide is mounted on top of the pause, as a
                guest; → starts the fight; A again closes it. The arena slide itself stays where
                it is in the talk and plays as usual when you get there.
    → ← Space   while paused they drive the arena (if open) and nothing else

  The countdown is a ruler (0–30 minutes) under the clock: the handle shows the minutes left
  and moves as time runs; drag it to set the time. At zero the clock pulses: time to start.
*/

const MAX = 30;
const two = (n) => String(n).padStart(2, '0');
const fmt = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${two(s % 60)}`; };

export function createPause(deck, { makeCtx, layer, sync }) {
  const P = { on: false, until: 0, el: null, guest: null, timer: null, sentAt: 0, pending: null };

  const css = document.createElement('style');
  css.textContent = `
    .slide.pause-sheet { z-index: 40; background: var(--bg, #120905); }
    .pause-sheet .pz-cup { position: absolute; left: 50%; top: calc(var(--u)*8); width: calc(var(--u)*9); margin-left: calc(var(--u)*-4.5); overflow: visible; }
    .pause-sheet .pz-cup .steam { fill: none; stroke: var(--muted); stroke-width: 4; stroke-linecap: round; opacity: 0; animation: pzs 3s ease-in-out infinite; }
    .pause-sheet .pz-cup .steam:nth-of-type(2) { animation-delay: 1s; } .pause-sheet .pz-cup .steam:nth-of-type(3) { animation-delay: 2s; }
    @keyframes pzs { 0% { opacity: 0; transform: translateY(8px); } 40% { opacity: .8; } 100% { opacity: 0; transform: translateY(-14px); } }
    .pause-sheet .pz-time { position: absolute; left: 0; right: 0; top: calc(var(--u)*17.5); text-align: center; font-family: var(--font-display); font-weight: 800;
      font-size: calc(var(--u)*15); line-height: 1; letter-spacing: -.05em; color: var(--fg); font-variant-numeric: tabular-nums; }
    .pause-sheet.zero .pz-time { color: var(--accent-2); animation: pzp 1.4s ease-in-out infinite; }
    @keyframes pzp { 50% { opacity: .55; } }
    .pause-sheet .pz-back { position: absolute; left: 0; right: 0; top: calc(var(--u)*41.5); text-align: center; font-size: calc(var(--u)*2.1); color: var(--muted); }
    .pause-sheet .pz-ruler { position: absolute; left: 22%; width: 56%; top: calc(var(--u)*33); height: calc(var(--u)*6.5); cursor: ew-resize; touch-action: none; }
    .pause-sheet .pz-ruler svg { width: 100%; height: 100%; overflow: visible; }
    .pause-chip { position: absolute; left: 50%; top: calc(var(--u)*1.6); transform: translateX(-50%); z-index: 45; padding: calc(var(--u)*.5) calc(var(--u)*1.4);
      border-radius: 99px; background: #1d1510; border: 2px solid var(--deco); font: 700 calc(var(--u)*1.3) var(--font-mono); letter-spacing: .14em; color: var(--fg); }
  `;
  document.head.append(css);

  const left = () => P.until - Date.now();
  // the phones follow, at most a few times a second while dragging
  const tell = () => {
    const now = Date.now();
    clearTimeout(P.pending);
    if (now - P.sentAt < 250) { P.pending = setTimeout(tell, 250); return; }
    P.sentAt = now;
    relaySend({ type: 'pause', on: P.on, left: Math.max(0, left()) });
    sync?.send({ type: 'pause', on: P.on, until: P.until, arena: !!P.guest });
  };

  function ruler(svg) {
    const W = 1000, H = 120, x0 = 20, x1 = W - 20, y = 60;
    const xs = (m) => x0 + (m / MAX) * (x1 - x0);
    let s = `<path d="M${x0} ${y} H${x1}" stroke="var(--deco)" stroke-width="3"/>`;
    for (let m = 0; m <= MAX; m++) {
      const big = m % 5 === 0;
      s += `<path d="M${xs(m)} ${y} v${big ? -26 : -12}" stroke="var(--deco)" stroke-width="${big ? 3 : 2}"/>`;
      if (big) s += `<text x="${xs(m)}" y="${y + 34}" text-anchor="middle" style="font: 700 26px var(--font-mono); fill: var(--muted)">${m}</text>`;
    }
    s += `<path class="pz-run" d="M${x0} ${y} H${x0}" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>
      <g class="pz-knob"><circle r="18" fill="var(--accent)" stroke="#1a120c" stroke-width="3"/></g>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
    return { xs, x0, x1, y };
  }

  function build() {
    const el = document.createElement('section');
    el.className = 'slide pause-sheet';
    el.innerHTML = `
      <div class="pin-tl label">Pause</div>
      <svg class="pz-cup" viewBox="0 0 120 120" aria-hidden="true">
        <path class="steam" d="M46 34 q-8 -10 0 -20 q8 -10 0 -20"/><path class="steam" d="M60 34 q-8 -10 0 -20 q8 -10 0 -20"/><path class="steam" d="M74 34 q-8 -10 0 -20 q8 -10 0 -20"/>
        <path d="M26 44 h68 v28 a30 30 0 0 1 -30 30 h-8 a30 30 0 0 1 -30 -30 z" fill="#ff7a2f" stroke="#1a120c" stroke-width="4" stroke-linejoin="round"/>
        <path d="M94 54 h6 a12 12 0 0 1 0 24 h-8" fill="none" stroke="#ff7a2f" stroke-width="7" stroke-linecap="round"/>
        <path d="M18 108 h84" stroke="var(--deco)" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <div class="pz-time"></div>
      <div class="pz-ruler" data-interactive><svg></svg></div>
      <div class="pz-back"></div>`;
    layer.appendChild(el);
    const r = ruler(el.querySelector('.pz-ruler svg'));
    // drag the ruler: the minutes under the pointer become the time left
    const area = el.querySelector('.pz-ruler');
    const fromX = (cx) => {
      const b = area.getBoundingClientRect();
      const vx = ((cx - b.left) / b.width) * 1000;
      return Math.max(0, Math.min(MAX, Math.round(((vx - r.x0) / (r.x1 - r.x0)) * MAX)));
    };
    let dragging = false;
    area.addEventListener('pointerdown', (e) => { dragging = true; area.setPointerCapture(e.pointerId); setMinutes(fromX(e.clientX)); });
    area.addEventListener('pointermove', (e) => { if (dragging) setMinutes(fromX(e.clientX)); });
    area.addEventListener('pointerup', () => { dragging = false; });
    return { el, r, time: el.querySelector('.pz-time'), back: el.querySelector('.pz-back'), run: el.querySelector('.pz-run'), knob: el.querySelector('.pz-knob') };
  }

  function render() {
    const ms = left();
    if (P.el) {
      const { el, r, time, back, run, knob } = P.el;
      time.textContent = fmt(ms);
      el.classList.toggle('zero', ms <= 0);
      const at = new Date(P.until);
      back.textContent = ms > 0 ? `Vi starter igjen kl. ${two(at.getHours())}:${two(at.getMinutes())}` : 'Vi starter nå.';
      const x = r.xs(Math.min(MAX, Math.max(0, ms / 60000)));
      run.setAttribute('d', `M${r.x0} ${r.y} H${x}`);
      knob.setAttribute('transform', `translate(${x} ${r.y})`);
    }
    if (P.chip) P.chip.textContent = `PAUSE · ${fmt(ms)}`;
  }

  function setMinutes(m) {
    P.until = Date.now() + Math.max(0, Math.min(MAX, m)) * 60000;
    render(); tell();
  }

  // the arena as a guest on top of the pause: its own section, a ctx whose camera and particles
  // are left alone (the paused slide's world stays as it was)
  function arenaOpen() {
    if (P.guest) return;
    const el = document.createElement('section');
    el.className = 'slide slide-arena';
    el.style.zIndex = 42;
    el.style.background = 'var(--bg, #120905)';
    layer.appendChild(el);
    const stage = deck.stage;
    const quiet = Object.assign(Object.create(stage), { fly() {}, particles: Object.assign(Object.create(stage.particles), { morphTo() {} }) });
    const guestDeck = { instant: false, trackStep() {}, next() {}, step: 0 };
    const ctx = makeCtx({ el, stage: quiet, deck: guestDeck, preview: false });
    const inst = arenaDef.create(ctx) || {};
    P.guest = { el, ctx, inst, step: 0 };
    inst.enter?.({ step: 0, dir: 1 });
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    if (P.el) P.el.el.style.visibility = 'hidden';
    P.chip = document.createElement('div');
    P.chip.className = 'pause-chip';
    layer.appendChild(P.chip);
    render(); tell();
  }
  function arenaClose() {
    const g = P.guest;
    if (!g) return;
    P.guest = null;
    g.ctx._dispose(); g.inst.dispose?.(); g.el.remove();
    P.chip?.remove(); P.chip = null;
    if (P.el) P.el.el.style.visibility = '';
    tell();
  }
  function arenaNext() {
    const g = P.guest;
    if (!g || g.step >= 1) return;
    g.step = 1;
    g.inst.step?.(1, 1);
  }

  function start(minutes = 10) {
    if (P.on) return;
    P.on = true;
    deck.zoom?.close?.();
    P.until = Date.now() + minutes * 60000;
    P.el = build();
    gsap.fromTo(P.el.el, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    P.timer = setInterval(render, 250);
    document.body.classList.add('paused');
    const tb = document.querySelector('.tb-title');
    if (tb) tb.textContent = 'Pause';
    render();
    P.sentAt = 0; tell();
  }
  function stop() {
    if (!P.on) return;
    arenaClose();
    P.on = false;
    clearInterval(P.timer);
    const el = P.el?.el; P.el = null;
    if (el) gsap.to(el, { opacity: 0, duration: 0.45, onComplete: () => el.remove() });
    document.body.classList.remove('paused');
    deck.emit(); // the title block shows the slide again
    P.sentAt = 0; tell();
  }

  const api = {
    get on() { return P.on; },
    toggle() { if (P.on) stop(); else start(); },
    setMinutes,
    arena() { if (!P.on) return; if (P.guest) arenaClose(); else arenaOpen(); },
    next() { if (P.guest) arenaNext(); },
    // keys while paused; K starts it. Returns true when the key was used.
    key(e) {
      const k = e.key;
      if (k === 'k' || k === 'K') { api.toggle(); return true; }
      if (!P.on) return false;
      if (k === 'ArrowUp') { setMinutes(Math.round(left() / 60000) + 1); return true; }
      if (k === 'ArrowDown') { setMinutes(Math.round(left() / 60000) - 1); return true; }
      if (k === 'a' || k === 'A') { api.arena(); return true; }
      if (['ArrowRight', 'PageDown', ' '].includes(k)) { api.next(); return true; }
      if (['ArrowLeft', 'PageUp', 'Home', 'End'].includes(k)) return true;
      return false;
    },
    state() { return { on: P.on, until: P.until, arena: !!P.guest }; },
  };
  return api;
}
