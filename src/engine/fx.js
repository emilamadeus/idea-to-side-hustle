import gsap from 'gsap';

/* DOM text effects. All return gsap tweens/timelines so slides can sequence and kill them. */

/** Split an element's text into word + char spans. Returns the char spans. */
export function split(el) {
  // Keep <br> line breaks; everything else is treated as plain text.
  const tmp = document.createElement('div');
  const lines = el.innerHTML.split(/<br\s*\/?>/i).map((h) => { tmp.innerHTML = h; return tmp.textContent; });
  el.textContent = '';
  el.setAttribute('aria-label', lines.join(' '));
  const chars = [];
  lines.forEach((line, li) => {
    if (li > 0) el.append(document.createElement('br'));
    splitLine(line, el, chars);
  });
  return chars;
}

function splitLine(text, el, chars) {
  text.split(/(\s+)/).forEach((part) => {
    if (/^\s+$/.test(part)) { el.append(part); return; }
    const w = document.createElement('span');
    w.className = 'w';
    for (const ch of part) {
      const c = document.createElement('span');
      c.className = 'c';
      c.textContent = ch;
      w.append(c);
      chars.push(c);
    }
    el.append(w);
  });
  return chars;
}

/** Characters rise and sharpen into place. */
export function rise(el, { stagger = 0.022, duration = 1.1, delay = 0, y = 70 } = {}) {
  const chars = el.querySelectorAll('.c').length ? [...el.querySelectorAll('.c')] : split(el);
  return gsap.fromTo(chars,
    { yPercent: y, opacity: 0, filter: 'blur(10px)' },
    { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration, delay, stagger, ease: 'expo.out', clearProps: 'filter' });
}

/** Characters fall away. */
export function sink(el, { stagger = 0.012, duration = 0.6 } = {}) {
  const chars = el.querySelectorAll('.c').length ? [...el.querySelectorAll('.c')] : split(el);
  return gsap.to(chars, { yPercent: -60, opacity: 0, filter: 'blur(8px)', duration, stagger, ease: 'power2.in' });
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/\\=_';

/** Decode text from random glyphs, left to right. */
export function scramble(el, finalText, { duration = 1.2, delay = 0 } = {}) {
  const target = finalText ?? el.textContent;
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1, duration, delay, ease: 'power2.out',
    onStart() { el.style.opacity = 1; el.style.filter = 'none'; },
    onUpdate() {
      const n = target.length;
      const done = Math.floor(state.p * n);
      let s = target.slice(0, done);
      for (let i = done; i < n; i++) {
        s += target[i] === ' ' ? ' ' : (Math.random() < 0.6 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : '');
      }
      el.textContent = s;
    },
    onComplete() { el.textContent = target; },
  });
}

/** Count a number up into an element. */
export function count(el, to, { from = 0, duration = 1.6, decimals = 0, suffix = '', delay = 0 } = {}) {
  const s = { v: from };
  return gsap.to(s, {
    v: to, duration, delay, ease: 'power3.out',
    onUpdate() { el.textContent = s.v.toFixed(decimals) + suffix; },
  });
}

/** Fade + lift a set of elements in. */
export function appear(targets, { stagger = 0.08, duration = 0.9, delay = 0, y = 24 } = {}) {
  return gsap.fromTo(targets,
    { y, opacity: 0, filter: 'blur(6px)' },
    { y: 0, opacity: 1, filter: 'blur(0px)', duration, delay, stagger, ease: 'power3.out', clearProps: 'filter' });
}

export function vanish(targets, { duration = 0.5, y = -16 } = {}) {
  return gsap.to(targets, { y, opacity: 0, filter: 'blur(6px)', duration, ease: 'power2.in' });
}
