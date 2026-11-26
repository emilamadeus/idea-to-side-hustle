import './presenter.css';
import { createSync } from '../engine/sync.js';

/*
  Presenter console. Lives on the MacBook screen while the audience window
  is full-screen on the TV. Drives the audience window over BroadcastChannel.
*/
export function start(defs) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header>
      <div class="pos"><b class="cur">–</b><span>/ ${defs.length}</span><em class="stp"></em><span class="sprog" title="How far the current step has played"><i></i></span><span class="sready"></span></div>
      <div class="title"></div>
      <div class="status"></div>
      <span class="zoom-btns"><button data-z="zoom-section" title="Zoom ut: denne seksjonen (Z)">Seksjon</button><button data-z="overview" title="Zoom ut: hele foredraget (O)">Hele</button></span>
      <button class="timer" title="Click to start/pause, double-click to reset">00:00</button>
      <div class="clock"></div>
    </header>
    <main>
      <section class="now">
        <div class="cap">Now</div>
        <div class="frame"><iframe class="f-now" tabindex="-1"></iframe></div>
      </section>
      <section class="side">
        <div class="cap">Next</div>
        <div class="frame small"><iframe class="f-next" tabindex="-1"></iframe></div>
        <div class="cap">Notes</div>
        <div class="notes"></div>
      </section>
    </main>
    <footer class="list"></footer>
    <div class="nolink">
      <p>No audience window connected.</p>
      <button class="open">Open audience window</button>
      <p class="hint">Drag it to the TV, click it, press F for full screen. Then come back here.</p>
    </div>`;

  const $ = (s) => app.querySelector(s);
  const sync = createSync();
  const base = `${location.pathname}?view=preview`;
  const fNow = $('.f-now'), fNext = $('.f-next');
  fNow.src = `${base}#/${defs[0].id}/0`;
  fNext.src = `${base}#/${defs[Math.min(1, defs.length - 1)].id}/0`;

  $('.list').innerHTML = defs.map((d, i) =>
    `<button data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${d.title ?? d.id}</button>`).join('');
  $('.list').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) sync.send({ type: 'cmd', action: 'goto', index: Number(b.dataset.i), step: 0 });
  });
  app.querySelector('.zoom-btns').addEventListener('click', (e) => {
    const z = e.target.closest('button')?.dataset.z;
    if (z) sync.send({ type: 'cmd', action: z });
  });

  let linked = false;
  let state = { index: 0, step: 0 };
  // step progress: fills while the step's animation plays; "KLAR" when it is time to click
  const sbar = $('.sprog i'), sready = $('.sready');
  const showProgress = (p, done) => {
    sbar.style.width = `${Math.round(p * 100)}%`;
    sbar.parentElement.classList.toggle('done', done);
    sready.textContent = done ? 'KLAR' : '';
  };
  sync.on((m) => {
    if (m.type === 'progress') { showProgress(m.p, m.done); return; }
    if (m.type !== 'state') return;
    linked = true;
    document.body.classList.add('linked');
    state = m;
    render();
    if (!timer.running && !timer.elapsed && (m.index > 0 || m.step > 0)) timer.toggle();
  });
  sync.send({ type: 'hello' });
  setInterval(() => { if (!linked) sync.send({ type: 'hello' }); }, 1000);
  $('.open').addEventListener('click', () => window.open(`${location.pathname}${location.hash}`, 'audience'));

  function stepsOf(i) { return Math.max(1, defs[i]?.steps ?? 1); }

  function render() {
    const { index, step } = state;
    const def = defs[index];
    $('.cur').textContent = index + 1;
    $('.stp').textContent = stepsOf(index) > 1 ? `step ${step + 1}/${stepsOf(index)}` : '';
    $('.title').textContent = def.title ?? def.id;
    $('.status').textContent = state.black ? 'BLACKED OUT' : '';
    document.body.classList.toggle('black', !!state.black);

    setHash(fNow, def.id, step);
    let ni = index, ns = step + 1;
    if (ns >= stepsOf(index)) { ni = index + 1; ns = 0; }
    if (ni < defs.length) setHash(fNext, defs[ni].id, ns);
    $('.side .frame.small').classList.toggle('end', ni >= defs.length);

    const notes = Array.isArray(def.notes) ? def.notes : [def.notes ?? ''];
    $('.notes').innerHTML = notes.map((n, i) =>
      `<p class="${i === step ? 'on' : i < step ? 'past' : ''}">${n || '<span class="empty">—</span>'}</p>`).join('');
    $('.notes p.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    app.querySelectorAll('.list button').forEach((b, i) => b.classList.toggle('on', i === index));
    app.querySelector('.list button.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function setHash(frame, id, step) {
    const h = `#/${id}/${step}`;
    try {
      if (frame.contentWindow?.location.hash !== h) frame.contentWindow.location.hash = h;
    } catch { frame.src = `${base}${h}`; }
  }

  // Timer
  const timer = {
    running: false, elapsed: 0, t0: 0,
    toggle() {
      if (this.running) this.elapsed += Date.now() - this.t0;
      else this.t0 = Date.now();
      this.running = !this.running;
    },
    reset() { this.running = false; this.elapsed = 0; },
    value() { return this.elapsed + (this.running ? Date.now() - this.t0 : 0); },
  };
  $('.timer').addEventListener('click', () => timer.toggle());
  $('.timer').addEventListener('dblclick', () => timer.reset());
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  setInterval(() => {
    $('.timer').textContent = fmt(timer.value());
    $('.timer').classList.toggle('paused', !timer.running);
    $('.clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, 250);

  // Keys: same as the audience window, forwarded as commands.
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const send = (action) => { e.preventDefault(); sync.send({ type: 'cmd', action }); };
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': send('next'); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': send('prev'); break;
      case 'b': case 'B': case '.': send('black'); break;
      case 'o': case 'O': send('overview'); break;
      case 'z': send('zoom-out'); break;
      case 'Z': send('zoom-in'); break;
      case 'Escape': send('zoom-close'); break;
      case 't': case 'T': timer.toggle(); break;
    }
  });
}
