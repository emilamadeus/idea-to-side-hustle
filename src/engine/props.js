import { el, g as group, p as path, text, inkFor } from './draw.js';

/*
  Shared props for illustrated slides (svg units, 1600×900 frame).
  Everything is a group marked data-unit so the layout audit treats it as one piece.
*/

// filled object: dark ink outline (see inkFor in draw.js)
export const FILL = (fill, w = 2.6) => ({ style: `fill: ${fill}; stroke: ${inkFor(fill)}`, 'stroke-width': w, 'stroke-linejoin': 'round' });

export const wrap = (str, max) => {
  const out = [];
  let line = '';
  for (const w of String(str).split(' ')) {
    if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
};

/** Rounded rectangle path with per-corner radii [tl, tr, br, bl]. */
export function rr(x, y, w, h, [tl, tr, br, bl]) {
  return `M${x + tl} ${y} H${x + w - tr} Q${x + w} ${y} ${x + w} ${y + tr} V${y + h - br} Q${x + w} ${y + h} ${x + w - br} ${y + h} `
    + `H${x + bl} Q${x} ${y + h} ${x} ${y + h - bl} V${y + tl} Q${x} ${y} ${x + tl} ${y} Z`;
}

/**
 * Speech bubble (what people say out loud): warm paper, no outline, a seamless tail that
 * stops just short of the speaker, a soft drop shadow, display type.
 */
export function speech(parent, x, y, str, tailTo, { size = 21 } = {}) {
  const grp = group(parent, { 'data-unit': '' });
  const w = Math.round(str.length * size * 0.52 + 44), h = size + 32;
  const shape = (g, fill, body) => {
    path(g, rr(x, y, w, h, [18, 18, 18, 18]), '', { style: `fill: ${fill}`, 'data-body': body ? '' : null });
    if (!tailTo) return;
    const [tx, ty] = tailTo;
    const below = ty > y + h / 2;
    const ey = below ? y + h - 1 : y + 1;
    const bx = Math.max(x + 26, Math.min(x + w - 26, tx));
    // stop the tail a little short of its target so it never touches the face
    const dx = tx - bx, dy = ty - ey, len = Math.hypot(dx, dy) || 1, cut = Math.min(14, len * 0.3);
    const px = tx - (dx / len) * cut, py = ty - (dy / len) * cut;
    path(g, `M${bx - 11} ${ey} Q${bx - 2} ${ey + (py - ey) * 0.4} ${px} ${py} Q${bx + 4} ${ey + (py - ey) * 0.5} ${bx + 11} ${ey} Z`, '', { style: `fill: ${fill}` });
  };
  const shadow = group(grp, { transform: 'translate(0 6)', opacity: 0.45, 'data-bg': '' });
  shape(shadow, '#000');
  shape(grp, '#f3e9da', true);
  text(grp, x + 22, y + h / 2 + size * 0.36, str, 'say', { style: `font: 600 ${size}px var(--font-display); fill: #1a120c` });
  grp.width = w; grp.height = h;
  return grp;
}

/** Claude message card (orange border, CLAUDE label). */
export function claudeCard(parent, x, y, w, msg, { label = 'CLAUDE', size = 21, max } = {}) {
  const lines = wrap(msg, max ?? Math.floor((w - 40) / (size * 0.52)));
  const h = 50 + lines.length * (size + 7);
  const grp = group(parent, { 'data-unit': '' });
  el('rect', { x, y, width: w, height: h, rx: 14, style: 'fill: #2a1c12; stroke: var(--accent)', 'stroke-width': 2.5 }, grp);
  text(grp, x + 18, y + 28, label, 'lbl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
  lines.forEach((l, i) => text(grp, x + 18, y + 56 + i * (size + 7), l, 'msg', { style: `font: 600 ${size}px var(--font-display); fill: var(--fg)` }));
  grp.height = h;
  return grp;
}

/** Paper card with a small caps header and lines (task cards, specs, lists). */
export function paperCard(parent, x, y, w, header, lines, { size = 20, lineGap = 10 } = {}) {
  const first = 46 + size; // baseline of the first row, clear of the header
  const h = first + (lines.length - 1) * (size + lineGap) + 20;
  const grp = group(parent, { 'data-unit': '' });
  el('rect', { x, y, width: w, height: h, rx: 6, style: 'fill: #fff3e3; stroke: none' }, grp);
  text(grp, x + 18, y + 26, header, 'hdr', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: #7a5a3a' });
  const rows = lines.map((l, i) => text(grp, x + 18, y + first + i * (size + lineGap), l, 'row', { style: `font: 600 ${size}px var(--font-mono); fill: #1a120c` }));
  grp.height = h; grp.rows = rows;
  return grp;
}

/** Checkbox with a tick that can be animated (returns { grp, tick }). */
export function checkbox(parent, x, y, s = 26) {
  const grp = group(parent);
  el('rect', { x, y, width: s, height: s, rx: 4, style: 'fill: none; stroke: #1a120c', 'stroke-width': 2.5 }, grp);
  const tick = path(grp, `M${x + 5} ${y + s * 0.55} l${s * 0.25} ${s * 0.25} l${s * 0.45} ${-s * 0.6}`, '', { style: 'fill: none; stroke: #1f9d63', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 });
  return { grp, tick };
}

/** Horizontal meter with a label (returns { grp, fill, value }). */
export function meter(parent, x, y, w, label, color = 'var(--accent)') {
  const grp = group(parent, { 'data-unit': '' });
  text(grp, x, y - 10, label, 'mlbl', { style: 'font: 400 15px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
  el('rect', { x, y, width: w, height: 16, rx: 4, style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2 }, grp);
  const fill = el('rect', { x: x + 2, y: y + 2, width: 0, height: 12, rx: 3, style: `fill: ${color}` }, grp);
  const value = text(grp, x + w + 12, y + 14, '', 'mval', { style: 'font: 700 16px var(--font-mono); fill: var(--fg)' });
  return { grp, fill, value, w: w - 4 };
}

/**
 * Prompt box: what was typed to the AI. Optional image attachment drawn by a callback
 * attach(grp, x, y, w, h). Returns the group with .rows (text lines), .height and .chip.
 */
export function promptBox(parent, x, y, w, str, { attach = null, size = 20, label = 'PROMPT' } = {}) {
  const lines = Array.isArray(str) ? str : wrap(str, Math.floor((w - 76) / (size * 0.5)));
  const attH = attach ? 76 : 0;
  const h = 46 + attH + lines.length * (size + 9) + 14;
  const grp = group(parent, { 'data-unit': '' });
  el('rect', { x, y, width: w, height: h, rx: 18, style: 'fill: #1c140e; stroke: var(--deco)', 'stroke-width': 2 }, grp);
  text(grp, x + 20, y + 26, label, 'plbl', { style: 'font: 700 12px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
  let chip = null;
  if (attach) {
    chip = { x: x + 20, y: y + 38, w: 100, h: 64 };
    el('rect', { x: chip.x, y: chip.y, width: chip.w, height: chip.h, rx: 8, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, grp);
    attach(grp, chip.x, chip.y, chip.w, chip.h);
  }
  const top = y + 46 + attH;
  const rows = lines.map((l, i) => text(grp, x + 20, top + i * (size + 9) + size * 0.8, l, 'ptxt', { style: `font: 600 ${size}px var(--font-display); fill: var(--fg)` }));
  el('circle', { cx: x + w - 28, cy: y + h - 28, r: 15, style: 'fill: var(--accent)' }, grp);
  path(grp, `M${x + w - 28} ${y + h - 20} V${y + h - 36} M${x + w - 35} ${y + h - 29} l7 -7 l7 7`, '', { style: 'fill: none; stroke: #1a0d05', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  grp.rows = rows; grp.height = h; grp.chip = chip;
  return grp;
}

/**
 * Chat phone: a prompt conversation with Claude or ChatGPT on a phone screen.
 *   const chat = chatPhone(svg, x, y, w, h, { app: 'Claude' | 'ChatGPT', compact })
 *   chat.user(tl, text | [lines], at, { attach, label })   your message (right)
 *   chat.think(tl, at, dur, { label })                       "Tenker" animation (or another label), returns end time
 *   chat.reply(tl, text, at, { list })                       the answer (left); list → checkbox rows, returns .ticks
 *   chat.clear(tl, at)                                       start a new conversation
 * Messages scroll up when the screen fills. Positions are computed at build time.
 */
export function chatPhone(parent, x, y, w, h, { app = 'Claude', compact = false, size = 18 } = {}) {
  const root = group(parent, { 'data-unit': '' });
  const accent = app === 'ChatGPT' ? '#74aa9c' : 'var(--accent)';
  // data-body: the phone's frame is what it occupies (scrolled-out messages don't count)
  el('rect', { x, y, width: w, height: h, rx: compact ? 24 : 34, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 3, 'data-body': '' }, root);
  const sx = x + 10, sy = y + 10, sw = w - 20, sh = h - 20;
  el('rect', { x: sx, y: sy, width: sw, height: sh, rx: compact ? 16 : 24, style: 'fill: #1c140e' }, root);
  const head = compact ? 34 : 70;
  if (!compact) el('rect', { x: x + w / 2 - 36, y: y + 18, width: 72, height: 14, rx: 7, style: 'fill: #0f0a07' }, root);
  text(root, x + w / 2, sy + head - 12, app.toUpperCase(), 'app', { 'text-anchor': 'middle', style: `font: 700 13px var(--font-mono); letter-spacing: .18em; fill: ${accent}` });
  path(root, `M${sx + 14} ${sy + head} H${sx + sw - 14}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 1.5 });
  const id = `chat-${Math.random().toString(36).slice(2, 8)}`;
  const cp = el('clipPath', { id }, root);
  el('rect', { x: sx, y: sy + head + 2, width: sw, height: sh - head - 6 }, cp);
  // an invisible twin of the clip area, so the layout audit can tell what is scrolled out of view
  el('rect', { id: `${id}-box`, x: sx, y: sy + head + 2, width: sw, height: sh - head - 6, style: 'fill: none; stroke: none', 'data-bg': '' }, root);
  const view = group(root, { 'clip-path': `url(#${id})`, 'data-clip': `${id}-box` });
  let content = group(view);
  const pad = 14, maxW = sw - pad * 2 - 30, top = sy + head + 14, bottom = sy + sh - 12;
  let cursor = top, scroll = 0;
  const per = size * 0.5;

  const ensure = (tl, at, needBottom) => {
    if (needBottom - scroll > bottom) {
      scroll = needBottom - bottom;
      tl.to(content, { y: -scroll, duration: 0.45, ease: 'power2.inOut' }, at);
    }
  };
  const pop = (tl, node, at, origin) => tl.fromTo(node, { opacity: 0, scale: 0.85, transformOrigin: origin }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, at);

  const api = {
    root,
    get scroll() { return scroll; },
    user(tl, str, at, { attach = null, label = null } = {}) {
      // a new prompt: the earlier exchange steps back so the newest reads first
      const older = [...content.children].filter((n) => !n.classList.contains('chat-think'));
      if (older.length) tl.to(older, { opacity: 0.32, duration: 0.4 }, at);
      const lines = Array.isArray(str) ? str : wrap(str, Math.floor((maxW - 28) / per));
      const longest = Math.max(...lines.map((l) => l.length));
      const attH = attach ? 76 : 0;
      const bw = Math.min(maxW, Math.max(attach ? 140 : 0, longest * per * 1.04 + 30));
      const bh = 18 + attH + lines.length * (size + 8);
      const g = group(content);
      let by = cursor;
      if (label) { text(g, sx + sw - pad, by + 12, label, 'clbl', { 'text-anchor': 'end', style: 'font: 700 12px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' }); by += 20; }
      const bx = sx + sw - pad - bw;
      path(g, rr(bx, by, bw, bh, [18, 18, 5, 18]), '', { style: 'fill: #f3e9da' });
      let chip = null;
      if (attach) {
        chip = { x: bx + 12, y: by + 10, w: 100, h: 64 };
        attach(g, chip.x, chip.y, chip.w, chip.h);
      }
      const rows = lines.map((l, i) => text(g, bx + 14, by + 12 + attH + (i + 1) * (size + 8) - 8, l, 'cu', { style: `font: 600 ${size}px var(--font-display); fill: #1a120c` }));
      cursor = by + bh + 12;
      ensure(tl, at, cursor);
      pop(tl, g, at, '100% 100%');
      g.rows = rows;
      g.chip = chip && { ...chip, y: chip.y - scroll };
      return g;
    },
    think(tl, at, dur = 1.3, { label = 'Tenker' } = {}) {
      const g = group(content, { opacity: 0, class: 'chat-think' });
      const cx = sx + pad + 12, cy = cursor + 16;
      const spark = path(g, Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2;
        return `M${cx} ${cy} L${cx + Math.cos(a) * 11} ${cy + Math.sin(a) * 11}`;
      }).join(' '), '', { style: `fill: none; stroke: ${accent}`, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
      text(g, cx + 22, cy + 6, label, 'th', { style: 'font: 600 16px var(--font-mono); fill: var(--muted)' });
      const dots = [0, 1, 2].map((k) => el('circle', { cx: cx + 32 + label.length * 10 + k * 12, cy: cy + 1, r: 3.5, style: 'fill: var(--muted)' }, g));
      ensure(tl, at, cursor + 40);
      tl.to(g, { opacity: 1, duration: 0.2 }, at);
      tl.to(spark, { rotation: 360 * Math.max(1, Math.round(dur)), svgOrigin: `${cx} ${cy}`, duration: dur, ease: 'none' }, at);
      tl.fromTo(dots, { opacity: 0.2 }, { opacity: 1, duration: 0.25, stagger: 0.12, repeat: Math.max(1, Math.round(dur / 0.6)), yoyo: true }, at);
      tl.to(g, { opacity: 0, duration: 0.15 }, at + dur - 0.15);
      return at + dur;
    },
    reply(tl, str, at, { list = null } = {}) {
      const lines = str ? wrap(str, Math.floor((maxW - 28) / per)) : [];
      const listH = list ? list.length * (size + 14) + 6 : 0;
      const longest = Math.max(0, ...lines.map((l) => l.length), ...(list || []).map((l) => l.length + 4));
      const bw = Math.min(maxW, longest * per * 1.04 + 34);
      const bh = 18 + lines.length * (size + 8) + listH;
      const g = group(content);
      const bx = sx + pad;
      path(g, rr(bx, cursor, bw, bh, [18, 18, 18, 5]), '', { style: 'fill: #3d2f23' });
      lines.forEach((l, i) => text(g, bx + 14, cursor + 12 + (i + 1) * (size + 8) - 8, l, 'cr', { style: `font: 600 ${size}px var(--font-display); fill: var(--fg)` }));
      const ticks = [];
      if (list) {
        const ly = cursor + 12 + lines.length * (size + 8);
        list.forEach((item, i) => {
          const ry = ly + i * (size + 14);
          el('rect', { x: bx + 14, y: ry, width: size, height: size, rx: 3, style: 'fill: none; stroke: var(--fg)', 'stroke-width': 2 }, g);
          ticks.push(path(g, `M${bx + 17} ${ry + size * 0.55} l${size * 0.25} ${size * 0.25} l${size * 0.45} ${-size * 0.6}`, '', { style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0 }));
          text(g, bx + 22 + size, ry + size * 0.82, item, 'cl', { style: `font: 600 ${size}px var(--font-display); fill: var(--fg)` });
        });
      }
      cursor += bh + 12;
      ensure(tl, at, cursor);
      pop(tl, g, at, '0% 100%');
      g.ticks = ticks;
      return g;
    },
    clear(tl, at) {
      const old = content;
      tl.to(old, { opacity: 0, duration: 0.3 }, at);
      content = group(view);
      cursor = top; scroll = 0;
    },
  };
  return api;
}

/**
 * Attempt badge for slides that compare two tries: "FORSØK 1" → "FORSØK 2 · NY SESSION".
 *   const a = attempt(svg, x, y); a.show(tl, 'FORSØK 1', at); a.show(tl, 'FORSØK 2 · NY SESSION', at)
 * Sits at the top-left of the scene it labels; the old attempt is cleared before the new one starts.
 */
export function attempt(parent, x, y) {
  const g = group(parent, { 'data-unit': '', opacity: 0 });
  const box = el('rect', { x, y, width: 10, height: 34, rx: 17, style: 'fill: var(--accent-2); stroke: none' }, g);
  const t = text(g, x + 16, y + 23, '', 'att', { style: 'font: 700 17px var(--font-mono); letter-spacing: .12em; fill: #1a120c' });
  const set = (label) => { t.textContent = label; box.setAttribute('width', label.length * 17 * 0.6 + 32 + label.length * 17 * 0.12); };
  return {
    g,
    show(tl, label, at) {
      tl.to(g, { opacity: 0, duration: 0.15 }, at);
      tl.call(() => set(label), null, at + 0.15);
      tl.fromTo(g, { opacity: 0, scale: 0.7, transformOrigin: '0% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)', immediateRender: false }, at + 0.15);
    },
  };
}

/**
 * Token meter: how much context/usage a way of working burns.
 *   const t = tokenMeter(svg, x, y, w, { max: 50 }); t.set(tl, 38, at)   // values in k tokens
 * Bar turns pink near the top. Label "TOKENS" left, count right (e.g. "38k").
 */
export function tokenMeter(parent, x, y, w, { max = 50, label = 'TOKENS' } = {}) {
  const grp = group(parent, { 'data-unit': '' });
  text(grp, x, y - 12, label, 'tkl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
  const val = text(grp, x + w, y - 12, '0k', 'tkv', { 'text-anchor': 'end', style: 'font: 800 22px var(--font-display); fill: var(--fg)' });
  // the track is a real shape so the audit catches other text running into the meter
  el('rect', { x, y, width: w, height: 22, rx: 6, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, grp);
  const fill = el('rect', { x: x + 3, y: y + 3, width: 0, height: 16, rx: 4, style: 'fill: #ffd23f', 'data-bg': '' }, grp);
  const state = { v: 0 };
  const paint = () => {
    const f = Math.min(1, state.v / max);
    fill.setAttribute('width', (w - 6) * f);
    fill.setAttribute('style', `fill: ${f > 0.8 ? '#ff6f9c' : '#ffd23f'}`);
    val.textContent = `${Math.round(state.v)}k`;
  };
  return {
    grp,
    set(tl, v, at, d = 0.8) { tl.to(state, { v, duration: d, ease: 'power1.inOut', onUpdate: paint, onComplete: paint }, at); },
    reset(tl, at) { tl.to(state, { v: 0, duration: 0.3, onUpdate: paint, onComplete: paint }, at); },
  };
}

/**
 * The firewood truck: an orange cab, a flatbed with logs, ink outlines. Faces right; its origin is
 * where the rear of the wheels meets the road, about 80 wide and 48 tall. load: logs on the bed
 * (0–6). Returns the group.
 */
export function vedTruck(parent, attrs = {}, { load = 5 } = {}) {
  const INK = '#1a120c';
  const g = group(parent, attrs);
  const f = (fill) => ({ style: `fill: ${fill}; stroke: ${INK}; stroke-linejoin: round`, 'stroke-width': 2.5 });
  el('rect', { x: 2, y: -24, width: 48, height: 14, rx: 2, ...f('#7a4a2a') }, g);
  [[10, -30], [22, -30], [34, -30], [42, -30], [16, -40], [28, -40]].slice(0, load).forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 6.5, ...f('#b07a4a') }, g));
  path(g, 'M50 -10 V-34 H68 L76 -22 V-10 Z', '', f('#ff7a2f'));
  path(g, 'M55 -29 H66 L71 -22 H55 Z', '', f('#7fd0ff'));
  el('rect', { x: 0, y: -12, width: 78, height: 6, rx: 2, ...f('#3a2a1e') }, g);
  [14, 62].forEach((x) => { el('circle', { cx: x, cy: -4, r: 7, ...f('#2a1d14') }, g); el('circle', { cx: x, cy: -4, r: 2.5, style: 'fill: #9b8f83' }, g); });
  return g;
}
