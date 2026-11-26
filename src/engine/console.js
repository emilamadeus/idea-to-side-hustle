import gsap from 'gsap';
import { el, g as group, p as path, text } from './draw.js';
import { wrap, rr } from './props.js';

/*
  The Claude Code app, drawn large enough to read on the TV: a window with the session list
  on the left and the open session's conversation on the right.

    const app = codeApp(svg, x, y, w, h, { sidebar: 250, size: 18 });
    const s = app.session('varsler', 'Varsler', 'work');   // a row in the sidebar + its own transcript
    app.show(tl, 'varsler', at);                            // open it (header, highlight, transcript)
    s.user(tl, 'Lag varsler.', at)                          // your message, right-aligned bubble
    s.say(tl, 'Ferdig. 24 tester bestått.', at)             // Claude's text
    s.tool(tl, 'Edit', 'src/push.ts', '+48 −3', at)         // a tool row with its result
    s.agent(tl, 'Finn ut hvordan …', '3 verktøykall · 12s', at, { result })  // a helper (subagent)
    s.ask(tl, 'Kjøre migreringen mot prod?', ['Ja', 'Nei'], at)            // a question card
    const sp = s.spin(tl, 'Lager varsler', at, { from, to, dur }); sp.end(tl, at, '✓ Ferdig', 'ok')
    s.state(tl, 'work' | 'wait' | 'block' | 'done' | 'idle', at)          // sidebar status
    s.ctx(tl, 400, at, dur)                                                // context meter (header)

  The window frame is the unit's body for the layout audit; transcripts scroll and clip.
*/

const C = { fg: '#f3e9da', muted: '#9a8a78', ok: '#8fe3a2', warn: '#ffd23f', pink: '#ff6f9c', orange: '#ff7a2f', user: '#3a2d22' };
export const STATE = {
  work: [C.orange, 'jobber', '✻'], wait: [C.warn, 'venter på deg', '!'], block: [C.warn, 'venter', '…'],
  done: [C.ok, 'ferdig', '✓'], idle: [C.muted, 'inaktiv', '·'],
};

export function codeApp(parent, x, y, w, h, { sidebar = 250, size = 18, title = 'Claude Code', panel = 0 } = {}) {
  const root = group(parent, { 'data-unit': '' });
  el('rect', { x, y, width: w, height: h, rx: 14, style: 'fill: #1b1511; stroke: var(--fg)', 'stroke-width': 2.5, 'data-body': '' }, root);
  const bar = 36;
  [0, 1, 2].forEach((k) => el('circle', { cx: x + 22 + k * 20, cy: y + bar / 2 + 2, r: 6, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, root));
  text(root, x + w / 2, y + bar / 2 + 7, title, 'apt', { 'text-anchor': 'middle', style: `font: 700 14px var(--font-mono); letter-spacing: .08em; fill: ${C.muted}` });
  // sidebar
  const SX = x + 2, SW = sidebar;
  el('rect', { x: SX, y: y + bar, width: SW, height: h - bar - 2, style: 'fill: #130f0c' }, root);
  path(root, `M${SX + SW} ${y + bar} V${y + h - 2}`, '', { style: 'fill: none; stroke: #33271d', 'stroke-width': 2 });
  text(root, SX + 18, y + bar + 30, 'SESSIONS', 'sbh', { style: `font: 700 13px var(--font-mono); letter-spacing: .16em; fill: ${C.muted}` });
  const rowsG = group(root);
  // main area
  const PXL = x + w - panel; // left edge of the helper panel (= right edge of the main area)
  const MX = SX + SW + 2, MW = PXL - MX - 2;
  const head = group(root);
  const headTitle = text(head, MX + 22, y + bar + 32, '', 'mht', { style: 'font: 800 22px var(--font-display); fill: #f3e9da' });
  path(root, `M${MX + 14} ${y + bar + 50} H${PXL - 14}`, '', { style: 'fill: none; stroke: #33271d', 'stroke-width': 2 });
  // context meter, top right of the main area
  const CW = 130, cmx = PXL - 22 - CW, cmy = y + bar + 22;
  el('rect', { x: cmx, y: cmy, width: CW, height: 12, rx: 4, style: 'fill: none; stroke: #4a3c30', 'stroke-width': 2 }, root);
  const ctxFill = el('rect', { x: cmx + 2, y: cmy + 2, width: 0, height: 8, rx: 3, style: 'fill: #7a6a58' }, root);
  const ctxText = text(root, cmx - 10, cmy + 11, '', 'mcx', { 'text-anchor': 'end', style: `font: 700 14px var(--font-mono); fill: ${C.muted}` });
  const ctxMarks = group(root);
  // composer
  const CY = y + h - 66;
  path(root, rr(MX + 16, CY, MW - 32, 48, [12, 12, 12, 12]), '', { style: 'fill: #241b15; stroke: #4a3c30', 'stroke-width': 2 });
  text(root, MX + 34, CY + 31, 'Svar til Claude …', 'cph', { style: `font: 400 16px var(--font-mono); fill: ${C.muted}` });
  const TOP = y + bar + 66, BOTTOM = CY - 12;
  const id = `app-${Math.random().toString(36).slice(2, 8)}`;
  const cp = el('clipPath', { id }, root);
  el('rect', { x: MX, y: TOP - 6, width: MW, height: BOTTOM - TOP + 6 }, cp);
  el('rect', { id: `${id}-box`, x: MX, y: TOP - 6, width: MW, height: BOTTOM - TOP + 6, style: 'fill: none; stroke: none', 'data-bg': '' }, root);
  const view = group(root, { 'clip-path': `url(#${id})`, 'data-clip': `${id}-box` });

  const lh = Math.round(size * 1.45), cw = size * 0.6, pad = 22;
  const maxChars = Math.floor((MW - pad * 2) / cw);
  const font = (wt, c, sz = size, fam = 'mono') => `font: ${wt} ${sz}px var(--font-${fam}); fill: ${c}`;
  const sessions = {};
  let order = 0, current = null;

  function session(key, name, st = 'work') {
    // sidebar row
    const ry = y + bar + 50 + order * 58;
    order += 1;
    const rg = group(rowsG);
    const hi = el('rect', { x: SX + 8, y: ry - 4, width: SW - 16, height: 50, rx: 8, style: 'fill: #2c2119', opacity: 0 }, rg);
    const badge = text(rg, SX + 26, ry + 28, STATE[st][2], 'sbg', { 'text-anchor': 'middle', style: font(700, STATE[st][0], 19) });
    text(rg, SX + 46, ry + 17, name, 'sbn', { style: font(700, C.fg, 17) });
    const sub = text(rg, SX + 46, ry + 40, STATE[st][1], 'sbs', { style: font(400, STATE[st][0], 13) });
    // transcript
    const tg = group(view, { opacity: 0 });
    const content = group(tg);
    let cursor = TOP, scroll = 0, k = 0;
    const ensure = (tl, at, need) => {
      if (need - scroll > BOTTOM) { scroll = need - BOTTOM; tl.to(content, { y: -scroll, duration: 0.35, ease: 'power2.inOut' }, at); }
    };
    const appear = (tl, g, at) => tl.fromTo(g, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 }, at);
    const s = {
      key, name, row: rg, body: tg,
      user(tl, str, at) {
        const g = group(content);
        const lines = wrap(str, Math.floor(maxChars * 0.7));
        const bw = Math.max(...lines.map((l) => l.length)) * cw * 1.02 + 30, bh = lines.length * lh + 16;
        const bx = MX + MW - pad - bw;
        path(g, rr(bx, cursor, bw, bh, [14, 14, 4, 14]), '', { style: `fill: ${C.user}` });
        lines.forEach((l, i) => text(g, bx + 15, cursor + 8 + (i + 1) * lh - 7, l, 'ux', { style: font(400, C.fg) }));
        cursor += bh + 14; ensure(tl, at, cursor); appear(tl, g, at);
        return g;
      },
      say(tl, str, at, { color = C.fg } = {}) {
        const g = group(content);
        text(g, MX + pad, cursor + size, '✻', 'cl', { style: font(700, C.orange) });
        wrap(str, maxChars - 3).forEach((l, i) => text(g, MX + pad + 26, cursor + size + i * lh, l, 'cx', { style: font(400, color) }));
        cursor += wrap(str, maxChars - 3).length * lh + 10; ensure(tl, at, cursor); appear(tl, g, at);
        return g;
      },
      tool(tl, name, arg, result, at, { tone = C.muted } = {}) {
        const g = group(content);
        const bh = result ? lh * 2 + 12 : lh + 12;
        path(g, rr(MX + pad, cursor, MW - pad * 2, bh, [8, 8, 8, 8]), '', { style: 'fill: #221a14; stroke: #3a2d22', 'stroke-width': 2 });
        const t = text(g, MX + pad + 14, cursor + 6 + size, '', 'tn', { style: font(700, C.fg) });
        const a = el('tspan', {}, t); a.textContent = name;
        if (arg) { const b = el('tspan', { style: `font-weight: 400; fill: ${C.muted}` }, t); b.textContent = `  ${arg}`; }
        if (result) text(g, MX + pad + 14, cursor + 6 + size + lh, result, 'tr', { style: font(400, tone) });
        cursor += bh + 10; ensure(tl, at, cursor); appear(tl, g, at);
        return g;
      },
      agent(tl, task, meta, at, { result = null, tone = C.ok } = {}) {
        const g = group(content);
        const lines = 2 + (result ? 1 : 0);
        const bh = lines * lh + 14;
        path(g, rr(MX + pad, cursor, MW - pad * 2, bh, [8, 8, 8, 8]), '', { style: 'fill: #1f2420; stroke: #3f5a48', 'stroke-width': 2 });
        text(g, MX + pad + 14, cursor + 6 + size, `Hjelper · ${task}`, 'an', { style: font(700, C.fg) });
        const m = text(g, MX + pad + 14, cursor + 6 + size + lh, meta, 'am', { style: font(400, C.muted) });
        if (result) text(g, MX + pad + 14, cursor + 6 + size + lh * 2, result, 'ar', { style: font(400, tone) });
        cursor += bh + 10; ensure(tl, at, cursor); appear(tl, g, at);
        g.meta = m;
        return g;
      },
      ask(tl, q, options, at) {
        const g = group(content);
        const bh = lh * 2 + 22;
        path(g, rr(MX + pad, cursor, MW - pad * 2, bh, [10, 10, 10, 10]), '', { style: `fill: #2a2412; stroke: ${C.warn}`, 'stroke-width': 2.5 });
        text(g, MX + pad + 16, cursor + 8 + size, q, 'aq', { style: font(700, C.warn) });
        let ox = MX + pad + 16;
        const opts = options.map((o, i) => {
          const ow = o.length * cw + 28;
          const og = group(g);
          path(og, rr(ox, cursor + lh + 8, ow, lh + 4, [8, 8, 8, 8]), '', { style: 'fill: #3a2f18; stroke: #6b5a2a', 'stroke-width': 2 });
          text(og, ox + 14, cursor + lh + 8 + size + 1, o, 'ao', { style: font(700, C.fg) });
          ox += ow + 12;
          return og;
        });
        cursor += bh + 12; ensure(tl, at, cursor); appear(tl, g, at);
        g.options = opts;
        return g;
      },
      spin(tl, label, at, { from = 0, to = 60, dur = 2 } = {}) {
        const g = group(content);
        const t = text(g, MX + pad, cursor + size, '', 'sp', { style: font(700, C.orange) });
        cursor += lh + 6; ensure(tl, at, cursor);
        const glyphs = ['✻', '✶', '✳', '✢'];
        const fmt = (v) => { v = Math.round(v); const m = Math.floor(v / 60); return m ? `${m}m ${String(v % 60).padStart(2, '0')}s` : `${v}s`; };
        const st = { v: from };
        const show = () => { t.textContent = `${glyphs[Math.floor(st.v / 3) % 4]} ${label} … ${fmt(st.v)}`; };
        show();
        tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at);
        tl.fromTo(st, { v: from }, { v: to, duration: dur, ease: 'none', onUpdate: show }, at);
        return {
          g, node: t,
          end(tl2, at2, str, kind = 'ok') {
            tl2.call(() => { t.textContent = str; t.setAttribute('style', font(700, { ok: C.ok, warn: C.warn, dim: C.muted }[kind] ?? C.fg)); }, null, at2);
          },
        };
      },
      list(tl, items, at) {
        // a todo list: [[label, done], ...]
        const g = group(content);
        items.forEach(([l, done], i) => {
          const yy = cursor + size + i * lh;
          text(g, MX + pad + 26, yy, done ? '☒' : '☐', 'lb', { style: font(400, done ? C.ok : C.muted) });
          text(g, MX + pad + 52, yy, l, 'll', { style: font(400, done ? C.muted : C.fg) + (done ? '; text-decoration: line-through' : '') });
        });
        cursor += items.length * lh + 10; ensure(tl, at, cursor); appear(tl, g, at);
        return g;
      },
      fadeOld(tl, at, to = 0.3) {
        const kids = [...content.children];
        if (kids.length) tl.to(kids, { opacity: to, duration: 0.3 }, at);
      },
      gap(px = 8) { cursor += px; },
      state(tl, stt, at) {
        tl.call(() => {
          const [c, label, glyph] = STATE[stt];
          badge.textContent = glyph; badge.setAttribute('style', font(700, c, 19));
          sub.textContent = label; sub.setAttribute('style', font(400, c, 13));
        }, null, at);
        tl.fromTo(badge, { scale: 1.8, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, at);
      },
      ctxK: 0,
      ctx(tl, kk, at, dur = 0.8) {
        const v = { k: s.ctxK };
        s.ctxK = kk;
        const paint = () => {
          if (current !== s) return;
          ctxFill.setAttribute('width', Math.max(0, (CW - 4) * Math.min(1, v.k / 1000)));
          ctxFill.setAttribute('style', `fill: ${v.k > 350 ? C.pink : '#7a6a58'}`);
          ctxText.textContent = `${Math.round(v.k)}k`;
        };
        tl.to(v, { k: kk, duration: dur, ease: 'power1.inOut', onUpdate: paint, onComplete: paint }, at);
      },
      blinkRow() { return [badge, sub]; },
      hi,
    };
    sessions[key] = s;
    return s;
  }

  // right-hand panel: running helpers with their run time
  const helpers = [];
  if (panel) {
    el('rect', { x: PXL, y: y + bar, width: panel - 2, height: h - bar - 2, style: 'fill: #130f0c' }, root);
    path(root, `M${PXL} ${y + bar} V${y + h - 2}`, '', { style: 'fill: none; stroke: #33271d', 'stroke-width': 2 });
    text(root, PXL + 18, y + bar + 30, 'HJELPERE', 'hph', { style: `font: 700 13px var(--font-mono); letter-spacing: .16em; fill: ${C.muted}` });
  }
  const fmtT = (v) => {
    v = Math.round(v); const t = Math.floor(v / 3600), m = Math.floor((v % 3600) / 60);
    if (t) return `${t}t ${String(m).padStart(2, '0')}m`;
    return m ? `${m}m ${String(v % 60).padStart(2, '0')}s` : `${v}s`;
  };
  function helper(name) {
    const hy = y + bar + 50 + helpers.length * 88;
    const g = group(root);
    const card = path(g, rr(PXL + 10, hy, panel - 22, 78, [10, 10, 10, 10]), '', { style: 'fill: #1f2420; stroke: #3f5a48', 'stroke-width': 2 });
    const badge = text(g, PXL + 28, hy + 30, '✻', 'hpb', { 'text-anchor': 'middle', style: font(700, C.orange, 19) });
    text(g, PXL + 46, hy + 30, name, 'hpn', { style: font(700, C.fg, 16) });
    const time = text(g, PXL + 46, hy + 60, '', 'hpt', { style: font(700, C.orange, 15) });
    const st = { v: 0 };
    let label = 'jobber';
    const show = () => { time.textContent = `${label} · ${fmtT(st.v)}`; };
    show();
    const hp = {
      g,
      run(tl, at, { from = 0, to = 60, dur = 2 } = {}) {
        tl.call(() => { label = 'jobber'; time.setAttribute('style', font(700, C.orange, 15)); badge.textContent = '✻'; badge.setAttribute('style', font(700, C.orange, 19)); show(); }, null, at);
        tl.fromTo(st, { v: from }, { v: to, duration: dur, ease: 'none', onUpdate: show, immediateRender: false }, at);
      },
      done(tl, at, l = 'ferdig') {
        tl.call(() => { label = l; time.setAttribute('style', font(700, C.ok, 15)); badge.textContent = '✓'; badge.setAttribute('style', font(700, C.ok, 19)); show(); }, null, at);
        tl.fromTo(badge, { scale: 1.8, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, at);
      },
    };
    helpers.push(hp);
    return hp;
  }

  const app = {
    root, session, sessions, helper,
    /** Open a session: header title, sidebar highlight, its transcript. */
    show(tl, key, at) {
      const s = sessions[key];
      tl.call(() => {
        current = s;
        headTitle.textContent = s.name;
        Object.values(sessions).forEach((o) => { o.hi.setAttribute('opacity', o === s ? 1 : 0); });
        const v = s.ctxK;
        ctxFill.setAttribute('width', Math.max(0, (CW - 4) * Math.min(1, v / 1000)));
        ctxFill.setAttribute('style', `fill: ${v > 350 ? C.pink : '#7a6a58'}`);
        ctxText.textContent = `${Math.round(v)}k`;
      }, null, at);
      Object.values(sessions).forEach((o) => tl.to(o.body, { opacity: o === s ? 1 : 0, duration: 0.3 }, at));
    },
    /** A tick on the context meter (e.g. the auto-compact limit). */
    mark(k, label) {
      const mx = cmx + 2 + (CW - 4) * (k / 1000);
      path(ctxMarks, `M${mx} ${cmy - 7} V${cmy + 19}`, '', { style: `fill: none; stroke: ${C.warn}`, 'stroke-width': 3, 'data-bg': '' });
      return ctxMarks;
    },
    lh, maxChars,
  };
  return app;
}
