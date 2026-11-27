import { createZoom } from './zoom.js';
import { relaySend, roomCue } from './relay.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { createStage } from './stage.js';
import { createSync } from './sync.js';
import { focus as focusOn, dimOnly } from './draw.js';
import * as shapes from './shapes.js';
import * as fx from './fx.js';
import { audit, auditMid, auditMotion, findOverlaps } from './audit.js';

/*
  Slide lifecycle (see src/slides/_template.js):
    def.create(ctx) -> instance
    instance.enter({ step, dir })   render cumulative state up to `step`
    instance.step(step, dir)        advance/rewind one build step
    instance.leave({ dir })         optional; may return a Promise
    instance.dispose()              optional
  Tweens made through ctx.track()/ctx.tl() and ticks made with ctx.tick()
  are cleaned up automatically.
*/

export async function start(defs, role, theme) {
  const FONTS = [
    `${theme.display.weight} 100px "${theme.display.family}"`,
    `400 100px "${theme.display.family}"`,
    `500 100px "${theme.mono}"`,
  ];
  const preview = role === 'preview';
  const app = document.getElementById('app');
  app.innerHTML = `
    <canvas class="stage"></canvas>
    <div class="backdrop"></div>
    <div class="deco">
      <i class="crop tl"></i><i class="crop tr"></i><i class="crop bl"></i><i class="crop br"></i>
      <div class="title-block">
        <div class="tb-room"><i></i><span>Ta frem<b>telefonen</b></span></div>
        <div>Tegning<b class="tb-title"></b></div>
        <div class="tb-sheet">Ark<b class="tb-n"></b></div>
        <div class="tb-step">Steg<b class="tb-dots"></b></div>
      </div>
    </div>
    <div class="slides"></div>
    <div class="hud-progress"><i></i></div>
    <div class="jump"></div>
    <div class="blackout"></div>
    <nav class="overview"></nav>`;

  await Promise.race([
    Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  const stage = createStage(app.querySelector('canvas'), { preview, theme });
  stage.particles.set(shapes.nebula(stage));

  const sync = preview ? null : createSync();
  const deck = new Deck(defs, { stage, layer: app.querySelector('.slides'), preview, sync });
  gsap.ticker.add(() => deck.tickProgress());
  window.deck = deck; // handy from the devtools console
  deck.audit = (opts) => audit(deck, opts);
  deck.auditMid = (opts) => auditMid(deck, opts);
  deck.auditMotion = (opts) => auditMotion(deck, opts);
  deck.overlaps = () => findOverlaps(deck.current.el);

  const fromHash = () => {
    const [, id, step] = location.hash.match(/^#\/([^/]+)(?:\/(\d+))?/) || [];
    const i = defs.findIndex((d) => d.id === id);
    return { index: i < 0 ? 0 : i, step: Number(step) || 0 };
  };
  const h = fromHash();
  deck.go(h.index, h.step, { dir: 1 });

  if (preview) {
    window.addEventListener('hashchange', () => { const s = fromHash(); deck.go(s.index, s.step); });
    return;
  }

  buildOverview(deck, app.querySelector('.overview'));
  deck.zoom = createZoom(deck, stage); // zoom-out: Z / Shift+Z / O / Esc
  bindKeys(deck, app);
  sync.on((m) => {
    if (m.type === 'hello') deck.emit();
    if (m.type !== 'cmd') return;
    const z = deck.zoom;
    if (m.action === 'next') { if (!z.key({ key: 'ArrowRight' })) deck.next(); }
    if (m.action === 'prev') { if (!z.key({ key: 'ArrowLeft' })) deck.prev(); }
    if (m.action === 'goto') z.open(m.index, m.step ?? 0);
    if (m.action === 'black') deck.toggleBlack();
    if (m.action === 'overview') z.toggle(2);
    if (m.action === 'zoom-out') z.out();
    if (m.action === 'zoom-in') z.in();
    if (m.action === 'zoom-section') z.toggle(2);
    if (m.action === 'zoom-close') z.close();
  });
}

class Deck {
  constructor(defs, { stage, layer, preview, sync }) {
    Object.assign(this, { defs, stage, layer, preview, sync });
    this.index = -1;
    this.step = 0;
    this.current = null;
    this.black = false;
  }

  stepsOf(i) { return Math.max(1, this.defs[i]?.steps ?? 1); }

  /*
    Step progress: how far the current build step's animation has played, so the
    presenter can tell when to click. Slides using D.stepper report their timeline;
    anything else counts as done. Shown as dots in the title block and in the console.
  */
  trackStep(tl) { this.stepTl = tl; }
  stepProgress() {
    const t = this.stepTl;
    if (!t || this.instant) return 1;
    return t.totalDuration() ? Math.min(1, t.progress()) : 1;
  }
  tickProgress() {
    const p = this.stepProgress();
    const done = p >= 0.999;
    if (done) this.showHelp(true);
    const cur = document.querySelector('.tb-dots i.cur');
    if (cur) {
      cur.style.setProperty('--p', p.toFixed(3));
      cur.classList.toggle('ready', done);
    }
    if (this.sync && (Math.abs(p - (this._sentP ?? -1)) > 0.03 || done !== this._sentDone)) {
      this._sentP = p; this._sentDone = done;
      this.sync.send({ type: 'progress', p, done });
    }
  }

  next() {
    if (this.step < this.stepsOf(this.index) - 1) this.go(this.index, this.step + 1);
    else if (this.index < this.defs.length - 1) this.go(this.index + 1, 0);
  }

  prev() {
    if (this.step > 0) this.go(this.index, this.step - 1);
    else if (this.index > 0) this.go(this.index - 1, this.stepsOf(this.index - 1) - 1);
  }

  go(index, step = 0, { dir } = {}) {
    index = Math.max(0, Math.min(this.defs.length - 1, index));
    step = Math.max(0, Math.min(this.stepsOf(index) - 1, step));

    if (index === this.index) {
      if (step === this.step) return;
      const d = step > this.step ? 1 : -1;
      // Jumping several steps (e.g. from the console) replays one at a time.
      this.stepTl = null;
      this.current.el.classList.toggle('settled', step > 0);
      while (this.step !== step) {
        this.step += d;
        this.current.inst.step?.(this.step, d);
      }
      this.setHelp();
      this.emit();
      return;
    }

    dir ??= index > this.index ? 1 : -1;
    if (this.current) this.retire(this.current, dir);

    const def = this.defs[index];
    const el = document.createElement('section');
    el.className = `slide slide-${def.id}`;
    this.layer.appendChild(el);

    this.stepTl = null;
    const ctx = makeCtx({ el, stage: this.stage, deck: this, preview: this.preview });
    const inst = def.create?.(ctx) ?? {};
    // help line: one short sentence per step, under the scene (def.help[step])
    const help = document.createElement('p');
    help.className = def.helpAt === 'top' ? 'help top' : 'help';
    el.appendChild(help);
    // journey marker: where on the way from idea to launch this slide sits
    if (def.stage !== undefined && !def.id.startsWith('kap-')) {
      const j = document.createElement('div');
      j.className = 'journey';
      j.innerHTML = ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering']
        .map((n, k) => `<span class="${k < def.stage ? 'past' : k === def.stage ? 'cur' : ''}">${n}</span>`).join('<i></i>');
      el.appendChild(j);
    } else if (def.part) {
      // after the journey: the part's own name
      const j = document.createElement('div');
      j.className = 'journey';
      j.innerHTML = `<span class="cur">${def.part}</span>`;
      el.appendChild(j);
    }
    this.current = { def, inst, el, ctx, help };
    this.index = index;
    this.step = step;
    el.classList.toggle('settled', step > 0);
    this.emit();

    const tipHtml = def.pocket ? el.querySelector('.tip')?.innerHTML : null; // before enter: its text effects split the markup
    if (inst.enter) inst.enter({ step, dir });
    else gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.8 });
    this.setHelp(); // after enter, so it can wait for the step's animation
    this.pocket(def, tipHtml, index);
    // the phones show which sheet the talk is on (dimmed, under "look at the screen")
    if (!this.preview && !this.instant) {
      const part = def.stage !== undefined ? ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering'][def.stage] : def.part || '';
      relaySend({ type: 'sheet', n: index + 1, total: this.defs.length, part, title: def.title || '' });
    }
    if (!def.room) roomCue(false);
  }

  // A slide with def.pocket sends its tip to the phones, which collect them into a list the
  // audience takes home. Only the audience window sends (relaySend skips previews), and not in
  // audit runs. The relay keeps one entry per slide, so going back and forth adds nothing.
  pocket(def, html, index) {
    if (!def.pocket || !html || this.preview || this.instant) return;
    const h = document.createElement('div');
    h.innerHTML = html;
    const text = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const em = h.querySelector('em')?.textContent.trim() || '';
    const part = def.stage !== undefined ? ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering'][def.stage] : def.part || '';
    relaySend({ type: 'tip', id: def.id, n: index + 1, total: this.defs.length, part, text, em });
  }

  // The help line waits until the step's animation has played: action first, words after.
  setHelp() {
    const c = this.current;
    if (!c?.help) return;
    const text = c.def.help?.[this.step] ?? '';
    gsap.killTweensOf(c.help);
    c.help.textContent = text;
    c.help.dataset.shown = '';
    gsap.set(c.help, { opacity: 0, y: 6 });
    if (this.instant || this.stepProgress() >= 0.999) this.showHelp(false);
  }
  showHelp(animate = true) {
    const h = this.current?.help;
    if (!h || h.dataset.shown || !h.textContent) return;
    h.dataset.shown = '1';
    if (animate) gsap.to(h, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    else gsap.set(h, { opacity: 1, y: 0 });
  }

  retire(s, dir) {
    if (this.instant) { s.ctx._dispose(); s.inst.dispose?.(); s.el.remove(); return; }
    s.el.style.pointerEvents = 'none';
    s.el.style.zIndex = 0;
    const leave = Promise.resolve(s.inst.leave?.({ dir }));
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([leave, timeout]).then(() =>
      gsap.to(s.el, {
        opacity: 0, duration: 0.45,
        onComplete: () => {
          s.ctx._dispose();
          s.inst.dispose?.();
          s.el.remove();
        },
      }));
  }

  toggleBlack() {
    this.black = !this.black;
    document.body.classList.toggle('black', this.black);
    this.emit();
  }

  emit() {
    const total = this.defs.length;
    const bar = document.querySelector('.hud-progress i');
    if (bar) {
      const frac = (this.index + (this.step + 1) / this.stepsOf(this.index)) / total;
      bar.style.width = `${frac * 100}%`;
    }
    const tbTitle = document.querySelector('.tb-title');
    if (tbTitle) {
      tbTitle.textContent = this.defs[this.index]?.title ?? '';
      document.querySelector('.tb-n').textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      const n = this.stepsOf(this.index);
      document.querySelector('.tb-dots').innerHTML = Array.from({ length: n }, (_, k) =>
        `<i class="${k < this.step ? 'past' : k === this.step ? 'cur' : ''}"></i>`).join('');
      this.tickProgress();
    }
    if (this.preview) return;
    const id = this.defs[this.index]?.id;
    history.replaceState(null, '', `#/${id}/${this.step}`);
    document.querySelectorAll('.overview button').forEach((b, i) => b.classList.toggle('current', i === this.index));
    this.sync?.send({ type: 'state', index: this.index, step: this.step, id, steps: this.stepsOf(this.index), total, black: this.black });
  }
}

function makeCtx({ el, stage, deck, preview }) {
  const tracked = [];
  const unticks = [];
  const ctx = {
    el, stage, deck, preview, gsap, THREE, shapes, fx,
    $: (sel) => el.querySelector(sel),
    $$: (sel) => [...el.querySelectorAll(sel)],
    /** Track a tween/timeline so it's killed when the slide is disposed. */
    track(t) { tracked.push(t); return t; },
    tl(opts) { return ctx.track(gsap.timeline(opts)); },
    /** Put one thing in focus for this step; see draw.js focus(). */
    focus(tl, nodes, at) { focusOn(ctx, tl, nodes, at); },
    /** Dim exactly these nodes (inverse of focus). */
    dim(tl, nodes, at) { dimOnly(ctx, tl, nodes, at); },
    /** Per-frame callback for this slide's lifetime. */
    tick(fn) { unticks.push(stage.tick(fn)); },
    _dispose() {
      tracked.forEach((t) => t.kill?.());
      unticks.forEach((u) => u());
    },
  };
  return ctx;
}

/* ---------------------------------------------------------------- */

function buildOverview(deck, nav) {
  nav.innerHTML = deck.defs.map((d, i) =>
    `<button data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}${d.section ? ` · ${d.section}` : ''}</span><span class="t">${d.title ?? d.id}</span></button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    deck.go(Number(b.dataset.i), 0);
    toggleOverview(deck, false);
  });
}

function toggleOverview(deck, force) {
  const open = document.body.classList.toggle('overview-open', force);
  if (open) document.querySelector('.overview button.current')?.scrollIntoView({ block: 'center' });
}

/*
  Open the presenter console on the other screen (the laptop) when the audience window is on
  the TV. Uses Chrome's window-management permission (asked once); without it, or in a browser
  that lacks it, the console opens where the browser puts it. From a fullscreen window macOS
  would otherwise open it in the same fullscreen space, on top of the audience view.
*/
async function openPresenter(hint) {
  const url = `${location.pathname}?presenter${location.hash}`;
  let features = 'popup,width=1440,height=900';
  try {
    if ('getScreenDetails' in window) {
      const sd = await window.getScreenDetails();
      const here = sd.currentScreen;
      const same = (s) => s.availLeft === here.availLeft && s.availTop === here.availTop;
      const others = sd.screens.filter((s) => !same(s));
      const target = others.find((s) => s.isInternal) || others[0];
      if (target) features = `popup,left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`;
    }
  } catch { /* permission denied or unsupported: default placement */ }
  const w = window.open(url, 'presenter', features);
  if (!w) {
    // the permission prompt can use up the key press; the second press opens it
    hint.textContent = 'Trykk P igjen';
    hint.classList.add('on');
    setTimeout(() => hint.classList.remove('on'), 2500);
  }
}

function bindKeys(deck, app) {
  let digits = '';
  const jump = app.querySelector('.jump');
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) { digits += k; jump.textContent = `→ ${digits}`; jump.classList.add('on'); return; }
    if (k === 'Enter' && digits && !deck.zoom?.level) {
      deck.go(Number(digits) - 1, 0);
      digits = ''; jump.classList.remove('on');
      return;
    }
    digits = ''; jump.classList.remove('on');
    // zoomed out: arrows move between panels, Enter opens one, Esc goes back
    if (deck.zoom?.key(e)) { e.preventDefault(); return; }

    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
        e.preventDefault(); deck.next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); deck.prev(); break;
      case 'Home': deck.go(0, 0); break;
      case 'End': deck.go(deck.defs.length - 1, 0); break;
      case 'z': deck.zoom.out(); break;      // zoom out to the whole talk
      case 'Z': deck.zoom.in(); break;       // Shift+Z: back to the slide
      case 'o': case 'O': deck.zoom.toggle(2); break;
      case 'Escape': deck.zoom.close(); toggleOverview(deck, false); break;
      case 'b': case 'B': case '.': deck.toggleBlack(); break;
      case 'h': case 'H': document.body.classList.toggle('hud-off'); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
      case 'p': case 'P':
        openPresenter(jump);
        break;
    }
  });
}
