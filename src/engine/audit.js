import gsap from 'gsap';

/*
  Layout audit: finds text that overlaps other text, bars/boxes, or straight lines,
  separate drawn units (cards, bubbles, phones, signs) that overlap each other, and units
  that cover a character's face.
  Run in the browser console:   await deck.audit()
  (Use a preview window, ?view=preview, so the presenter console can't interfere.)

  Opt-outs:
    data-bg      on an SVG group: background art (grids) that text may sit on.
    data-unit    on a group/element: its text belongs inside its own shapes (bar labels, stamps).
    data-overlap-ok  on a unit: may overlap other units by design (e.g. zoom lines); text checks still apply.
    data-picture  on a group: a picture of something else (a website, a screenshot); the text and
                  shapes drawn inside it are part of the picture and are not checked.
*/

// Visible box of an element, clipped by a scrolling area (data-clip) if it sits in one.
const box = (el) => {
  const r = el.getBoundingClientRect();
  const c = el.closest?.('[data-clip]');
  if (!c) return r;
  const k = document.getElementById(c.dataset.clip)?.getBoundingClientRect();
  if (!k) return r;
  const left = Math.max(r.left, k.left), right = Math.min(r.right, k.right);
  const top = Math.max(r.top, k.top), bottom = Math.min(r.bottom, k.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, right, top, bottom, width: right - left, height: bottom - top };
};

const visible = (el) => {
  // Stop at the slide section: its own enter/leave fade is not a layout state.
  for (let n = el; n && !n.classList?.contains('slide'); n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
  }
  const r = box(el);
  return !!r && r.width > 0 && r.height > 0;
};

const label = (el) => {
  const t = (el.getAttribute?.('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
  const cls = typeof el.className === 'string' ? el.className : el.className?.baseVal;
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls.split(' ')[0] : ''} "${t.slice(0, 32)}"`;
};

function textElements(root) {
  const set = new Set();
  root.querySelectorAll('svg text').forEach((t) => { if (t.textContent.trim() && !t.closest('[data-picture]')) set.add(t); });
  root.querySelectorAll('*').forEach((el) => {
    if (el.closest('svg') || el.tagName === 'STYLE') return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    // split-text spans: audit the whole heading, not each letter
    const host = el.closest('.c, .w') ? el.closest('.c, .w').parentElement.closest(':not(.c):not(.w)') : el;
    set.add(host);
  });
  return [...set].filter(visible);
}

function shapeElements(root) {
  return [...root.querySelectorAll('svg rect, svg path, svg ellipse, svg circle')].filter((s) => {
    if (s.closest('[data-bg], [data-picture]')) return false;
    if (!visible(s)) return false;
    const r = box(s);
    if (s.tagName === 'path') return r.width < 8 || r.height < 8; // straight lines only
    return true;
  });
}

const hit = (a, b, pad = 1.5) =>
  a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;

export function findOverlaps(root = document.querySelector('.slides'), { facesOnly = false } = {}) {
  const texts = facesOnly ? [] : textElements(root);
  const shapes = facesOnly ? [] : shapeElements(root);
  const out = [];
  // HTML headings with tight line-height let descenders (g, j, y) hang below their box: add them
  const textBox = (t) => {
    const r = box(t);
    if (!r || t.closest('svg') || !/[gjpqyJQ,;(){}]/.test(t.textContent)) return r; // only letters that hang
    const cs = getComputedStyle(t);
    const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.2;
    const hang = Math.max(0, fs * 0.24 - (lh - fs) / 2);
    return hang ? { left: r.left, right: r.right, top: r.top, width: r.width, bottom: r.bottom + hang, height: r.height + hang } : r;
  };
  const rects = new Map(texts.map((t) => [t, textBox(t)]));
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (hit(rects.get(a), rects.get(b))) out.push(`text × text: ${label(a)}  ↔  ${label(b)}`);
    }
  }
  for (const t of texts) {
    // a text may sit inside any of its enclosing units (drawer inside cabinet, label inside card)
    const units = [];
    for (let u = t.closest('[data-unit]'); u; u = u.parentElement?.closest('[data-unit]')) units.push(u);
    for (const s of shapes) {
      if (units.some((u) => u.contains(s))) continue;
      if (hit(rects.get(t), box(s), 2)) out.push(`text × shape: ${label(t)}  ↔  ${s.tagName}.${s.className?.baseVal || ''}`);
    }
  }
  // drawn pieces that collide: two separate units (cards, bubbles, phones, signs) overlapping
  const units = [...root.querySelectorAll('svg [data-unit]')].filter((u) =>
    !u.parentElement.closest('[data-unit]') && !u.closest('[data-bg]') && !u.hasAttribute('data-overlap-ok') && visible(u));
  const ub = new Map(units.map((u) => [u, box(u)]));
  for (let i = 0; i < (facesOnly ? 0 : units.length); i++) {
    for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = ub.get(a), rb = ub.get(b);
      // one sitting wholly on the other (a card on a board, a stamp on a card) is placement, not a collision
      const inside = (x, y) => x.left >= y.left - 2 && x.right <= y.right + 2 && x.top >= y.top - 2 && x.bottom <= y.bottom + 2;
      if (inside(ra, rb) || inside(rb, ra)) continue;
      if (hit(ra, rb, 4)) out.push(`unit × unit: ${label(a)}  ↔  ${label(b)}`);
    }
  }
  // bubbles, cards and phones must not cover a character's face
  const heads = [...root.querySelectorAll('svg [data-head]')].filter(visible);
  for (const u of units) {
    for (const hd of heads) {
      if (u.contains(hd)) continue;
      // a bubble's tail may point at the face; its body may not
      const b = u.querySelector('[data-body]');
      if (hit(b ? box(b) : ub.get(u), box(hd), 3)) out.push(`unit × face: ${label(u)}`);
    }
  }
  return [...new Set(out)];
}

/** Step through every slide and step; return overlaps found at the end state of each. */
/**
 * Mid-animation pass: plays every step and samples it at a few points, reporting bubbles,
 * cards or phones that cover a character's face while they are on screen (most bubbles are
 * gone by the end of a step, so the end-state audit never sees them).
 */
export async function auditMid(deck, { slides, samples = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9] } = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const report = [];
  const ids = slides ?? deck.defs.map((d) => d.id);
  for (const id of ids) {
    const i = deck.defs.findIndex((d) => d.id === id);
    for (let s = 0; s < deck.stepsOf(i); s++) {
      deck.instant = true;
      if (deck.index === i) deck.go(i === 0 ? 1 : 0, 0);
      deck.go(i, Math.max(0, s - 1));
      deck.instant = false;
      if (s > 0) deck.go(i, s);
      else { deck.go(i === 0 ? 1 : 0, 0); deck.go(i, 0); }
      const tl = deck.stepTl;
      if (!tl) continue;
      tl.pause();
      const found = new Set();
      for (const f of samples) {
        tl.progress(f);
        gsap.ticker.tick();
        await sleep(30);
        findOverlaps(deck.current.el, { facesOnly: true }).forEach((o) => found.add(`${o} @${Math.round(f * 100)}%`));
      }
      tl.progress(1);
      if (found.size) report.push({ slide: id, step: s, overlaps: [...found] });
    }
  }
  return report;
}

/**
 * Motion audit: plays every step and samples it; anything that moves (its box differs from
 * where it ends up, or it is gone by the end) must not cross other things on the way:
 * cards, bubbles, phones, signs, characters or text. Reports each crossing pair once per step.
 */
export async function auditMotion(deck, { slides, samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] } = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const report = [];
  const ids = slides ?? deck.defs.map((d) => d.id);
  const pieces = (root) => {
    const units = [...root.querySelectorAll('svg [data-unit], svg [data-figure]')].filter((u) =>
      !u.parentElement.closest('[data-unit], [data-figure]') && !u.closest('[data-bg]') && !u.closest('[data-clip]'));
    const texts = [...root.querySelectorAll('svg text')].filter((t) => t.textContent.trim() && !t.closest('[data-unit], [data-figure], [data-bg], [data-clip]'));
    return [...units, ...texts];
  };
  const name = (el) => (el.hasAttribute?.('data-figure') ? 'figure' : label(el));
  // what to measure: a figure's body (not its torch beam), a unit's body (not its zoom line)
  const pbox = (el) => {
    if (!visible(el)) return null;
    if (el.hasAttribute('data-figure')) {
      const parts = [...el.querySelectorAll(':scope > g > g')].filter((g) => !g.hasAttribute('data-bg'));
      const bs = parts.map((g) => g.getBoundingClientRect()).filter((r) => r.width && r.height);
      if (!bs.length) return box(el);
      const left = Math.min(...bs.map((b) => b.left)), right = Math.max(...bs.map((b) => b.right));
      const top = Math.min(...bs.map((b) => b.top)), bottom = Math.max(...bs.map((b) => b.bottom));
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }
    const b = el.querySelector?.('[data-body]');
    return b ? box(b) : box(el);
  };
  for (const id of ids) {
    const i = deck.defs.findIndex((d) => d.id === id);
    for (let s = 0; s < deck.stepsOf(i); s++) {
      deck.instant = true;
      if (deck.index === i) deck.go(i === 0 ? 1 : 0, 0);
      deck.go(i, Math.max(0, s - 1));
      deck.instant = false;
      if (s > 0) deck.go(i, s);
      else { deck.go(i === 0 ? 1 : 0, 0); deck.go(i, 0); }
      const tl = deck.stepTl;
      if (!tl) continue;
      tl.pause();
      const root = deck.current.el;
      tl.progress(1); gsap.ticker.tick(); await sleep(20);
      const all = pieces(root);
      const end = new Map(all.map((el) => [el, pbox(el)]));
      const found = new Set();
      let prev = null;
      for (const f of samples) {
        tl.progress(f); gsap.ticker.tick(); await sleep(15);
        const now = new Map(all.map((el) => [el, pbox(el)]));
        // travelling = its box shifts between samples (fades and wipes don't count)
        const delta = (el) => {
          const a = now.get(el), p = prev?.get(el);
          if (!a || !p) return null;
          return [a.left - p.left, a.top - p.top];
        };
        const moving = prev ? all.filter((el) => { const d = delta(el); return d && Math.hypot(d[0], d[1]) > 6; }) : [];
        for (const m of moving) {
          const dm = delta(m);
          for (const o of all) {
            if (o === m || o.contains(m) || m.contains(o) || o.hasAttribute('data-overlap-ok') || m.hasAttribute('data-overlap-ok')) continue;
            const ob = now.get(o), mb = now.get(m);
            if (!ob || !mb) continue;
            // moving together (a whole scene sliding) is not a crossing
            const dol = delta(o);
            if (dol && Math.hypot(dol[0] - dm[0], dol[1] - dm[1]) < 4) continue;
            // moving inside its own container (a row in its panel, a card on its board) is fine
            const eb = end.get(m) || mb;
            const inside = (x, y) => x.left >= y.left - 4 && x.right <= y.right + 4 && x.top >= y.top - 4 && x.bottom <= y.bottom + 4;
            if (inside(mb, ob) && inside(eb, ob)) continue;
            if (hit(mb, ob, 6)) found.add(`${name(m)}  ✕  ${name(o)}`);
          }
        }
        prev = now;
      }
      tl.progress(1);
      if (found.size) report.push({ slide: id, step: s, crossings: [...found] });
    }
  }
  return report;
}

export async function audit(deck, { slides, timeScale = 30, settle = 250 } = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const prev = gsap.globalTimeline.timeScale();
  gsap.globalTimeline.timeScale(timeScale);
  deck.instant = true;
  const report = [];
  try {
    const ids = slides ?? deck.defs.map((d) => d.id);
    for (const id of ids) {
      const i = deck.defs.findIndex((d) => d.id === id);
      const steps = deck.stepsOf(i);
      for (let s = 0; s < steps; s++) {
        if (deck.index === i) deck.go(i === 0 ? 1 : 0, 0); // force a fresh, instant build
        deck.go(i, s);
        gsap.ticker.tick();
        await sleep(settle);
        const o = findOverlaps(deck.current.el);
        if (o.length) report.push({ slide: id, step: s, overlaps: o });
      }
    }
  } finally {
    deck.instant = false;
    gsap.globalTimeline.timeScale(prev);
  }
  return report;
}
