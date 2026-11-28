// The break on the phone: a calm screen with a steaming cup and the countdown the presenter set
// (and may drag while it runs). It sits over the dim talk page and any open card, but under the
// arena (z 35), which the presenter can open during the break.
//   relay → { type: 'pause', on, left }   left: ms until the talk starts again
// Messages come through window.vedHook; a state that arrived before this script loaded is in
// window.vedPauseNow.
const css = document.createElement('style');
css.textContent = `
  .pz { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; text-align: center; padding: 30px;
    background: radial-gradient(70% 50% at 50% 42%, rgba(255,140,50,.16), transparent 70%), #120b07; color: #fff3e3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif; animation: pz-in .6s cubic-bezier(.2,.8,.2,1) both; }
  .pz.out { transition: opacity .5s; opacity: 0; }
  @keyframes pz-in { from { opacity: 0; } }
  .pz > div { display: grid; justify-items: center; gap: 14px; }
  .pz svg { width: 120px; height: 120px; overflow: visible; }
  .pz .steam { fill: none; stroke: #c9ad92; stroke-width: 4; stroke-linecap: round; opacity: 0; animation: pz-steam 3s ease-in-out infinite; }
  .pz .steam:nth-of-type(2) { animation-delay: 1s; } .pz .steam:nth-of-type(3) { animation-delay: 2s; }
  @keyframes pz-steam { 0% { opacity: 0; transform: translateY(8px); } 40% { opacity: .8; } 100% { opacity: 0; transform: translateY(-14px); } }
  .pz small { font: 700 12px 'Space Mono', monospace; letter-spacing: .3em; color: #ff7a2f; }
  .pz b { font: 800 clamp(72px, 26vw, 120px)/1 'Bricolage Grotesque', sans-serif; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
  .pz p { margin: 0; color: #c9ad92; font-size: 17px; }
  .pz.zero b { color: #ffd23f; animation: pz-pulse 1.4s ease-in-out infinite; }
  @keyframes pz-pulse { 50% { opacity: .55; } }
  @media (prefers-reduced-motion: reduce) { .pz, .pz * { animation: none !important; } }
`;
document.head.append(css);

let el = null, until = 0, timer = null;
const two = (n) => String(n).padStart(2, '0');
function render() {
  if (!el) return;
  const left = Math.max(0, until - Date.now());
  const s = Math.ceil(left / 1000);
  el.querySelector('b').textContent = `${Math.floor(s / 60)}:${two(s % 60)}`;
  el.classList.toggle('zero', left <= 0);
  const at = new Date(until);
  el.querySelector('p').textContent = left > 0 ? `Vi starter igjen kl. ${two(at.getHours())}:${two(at.getMinutes())}` : 'Vi starter nå. Finn plassen din.';
}
function show(left) {
  until = Date.now() + Math.max(0, Number(left) || 0);
  if (!el) {
    el = document.createElement('div');
    el.className = 'pz';
    el.innerHTML = `<div>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path class="steam" d="M46 34 q-8 -10 0 -20 q8 -10 0 -20"/><path class="steam" d="M60 34 q-8 -10 0 -20 q8 -10 0 -20"/><path class="steam" d="M74 34 q-8 -10 0 -20 q8 -10 0 -20"/>
        <path d="M26 44 h68 v28 a30 30 0 0 1 -30 30 h-8 a30 30 0 0 1 -30 -30 z" fill="#ff7a2f" stroke="#1a120c" stroke-width="4" stroke-linejoin="round"/>
        <path d="M94 54 h6 a12 12 0 0 1 0 24 h-8" fill="none" stroke="#ff7a2f" stroke-width="7" stroke-linecap="round"/>
        <path d="M18 108 h84" stroke="#6f5848" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <small>PAUSE</small><b></b><p></p></div>`;
    document.body.append(el);
    timer = setInterval(render, 250);
  }
  render();
}
function hide() {
  if (!el) return;
  const e = el; el = null; clearInterval(timer);
  e.classList.add('out'); setTimeout(() => e.remove(), 500);
}
const handle = (p) => { if (p?.on) show(p.left); else hide(); };

const prev = window.vedHook;
window.vedHook = (m) => {
  prev?.(m);
  if (m.type === 'pause') handle(m);
  if (m.type === 'state') handle(m.pause);
};
if (window.vedPauseNow) handle(window.vedPauseNow);
