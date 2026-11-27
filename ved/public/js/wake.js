// The wake-up: when a room activity opens on the phone, the dim page lights up yellow from the
// centre, a phone badge and the activity's name hold for a moment, then the activity shows.
// A lit phone always means "your turn"; the page is otherwise dim (js/lobby.js).
//   window.vedWake(label)   the activities call this as they open (js/play.js, arena.js, vote.js, room.js)
// A phone that is locked or in the background plays it when it comes back, if within a minute.
// A classic script (not a module), so it exists before the modules that call it.
(() => {
  const css = document.createElement('style');
  css.textContent = `
    .wake { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; pointer-events: none;
      background: radial-gradient(circle at 50% 46%, #fff1b8 0, #ffd23f 38%, #ff9a3d 100%);
      clip-path: circle(0% at 50% 46%); transition: clip-path .6s cubic-bezier(.7,0,.2,1), opacity .5s; }
    .wake.go { clip-path: circle(150% at 50% 46%); }
    .wake.out { opacity: 0; }
    .wake > div { display: grid; justify-items: center; gap: 18px; color: #1a120c; text-align: center; padding: 0 30px;
      opacity: 0; transform: scale(.86); transition: opacity .4s .25s, transform .9s .2s cubic-bezier(.2,.8,.2,1); }
    .wake.go > div { opacity: 1; transform: none; }
    .wake-phone { position: relative; width: 54px; height: 88px; border: 5px solid #1a120c; border-radius: 13px; }
    .wake-phone::after { content: ''; position: absolute; left: 50%; bottom: 9px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: #1a120c; }
    .wake-phone i { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
      border: 4px solid #1a120c; opacity: 0; animation: wake-ring 1.2s .35s ease-out 2; }
    @keyframes wake-ring { from { opacity: .55; transform: scale(.5); } to { opacity: 0; transform: scale(1.6); } }
    .wake small { font: 700 12px 'Space Mono', monospace; letter-spacing: .24em; text-transform: uppercase; }
    .wake b { font: 800 clamp(34px, 11vw, 52px)/1 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: -.04em; }
  `;
  document.head.append(css);
  let last = { label: '', t: 0 }, pending = null;
  function play(label) {
    const w = document.createElement('div');
    w.className = 'wake';
    w.innerHTML = '<div><span class="wake-phone"><i></i></span><small>Din tur</small><b></b></div>';
    w.querySelector('b').textContent = label;
    document.body.append(w);
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('go')));
    try { navigator.vibrate?.([30, 50, 30]); } catch {}
    setTimeout(() => w.classList.add('out'), 1700);
    setTimeout(() => w.remove(), 2300);
  }
  window.vedWake = (label) => {
    const now = Date.now();
    if (label === last.label && now - last.t < 5000) return; // the same activity, again (a reconnect)
    last = { label, t: now };
    if (document.hidden) { pending = { label, t: now }; return; }
    play(label);
  };
  window.vedWakeCancel = () => { pending = null; }; // the activity closed before the phone came back
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !pending) return;
    const p = pending; pending = null;
    if (Date.now() - p.t < 60000) play(p.label);
  });
})();
