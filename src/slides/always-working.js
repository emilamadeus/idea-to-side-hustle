import gsap from 'gsap';
import { phones } from '../engine/relay.js';
import * as D from '../engine/draw.js';
import { speech as sharedSpeech } from '../engine/props.js';
import { figure, lyingHead, PALETTE } from '../engine/characters.js';

/*
  Humor: with AI sessions that notify you, you are always (a little) at work.

  Three scenes (meeting, dinner, night) around one main character (glasses, hoodie). In each: the phone
  buzzes and lights up their face, they look down at it, the notification pops out
  of the phone, a one-word reply, the next task starts, while the people around
  them keep talking to someone who isn't really there. An attention ring (HER /
  JOBB) shows how much of them is present. Ends on a week calendar.

  Layout zones (svg units):
    tip                 x  80–520, y 118–245
    clock               centre (200, 410), r 80; label y 525
    attention ring      centre (200, 680), r 58; labels x 290–480
    notification        x 560–900, y 165–380   (bubble, reply, chip)
    scene               x 560–1470, y 165–775
    others' speech      x 950–1470, y 165–240
    title block         x ≥ 1160, y ≥ 790 (engine)
*/

const CSS = `
.slide-always-working .aw-tip { position: absolute; left: var(--pad); top: calc(var(--u) * 7.4); font-size: calc(var(--u) * 3.8); }
.slide-always-working .aw-night { position: absolute; inset: -60vh -60vw; background: #05070f; opacity: 0; pointer-events: none; }
`;

const SCENES = [
  { time: '09:14', min: 9 * 60 + 14, day: 'tirsdag', here: 0.4, night: 0,
    msg: 'Trenger en produktbeslutning: ett eller to steg i onboardingen?', reply: 'Ett.',
    say: '… og for Q4 ser vi at …', note: null },
  { time: '11:47', min: 11 * 60 + 47, day: 'tirsdag', here: 0.65, night: 0,
    msg: 'Innloggingen er ferdig og testet. Neste?', reply: 'Varslene.',
    say: '… så sa jeg: legg vekk telefonen!', note: null },
  { time: '18:30', min: 18 * 60 + 30, day: 'tirsdag', here: 0.6, night: 0.15,
    msg: '2 av 40 tester feiler. Skal jeg fikse?', reply: 'Ja.',
    say: 'Så fint med en kveld for oss to.', note: null },
  { time: '03:12', min: 24 * 60 + 3 * 60 + 12, day: 'onsdag', here: 0.7, night: 0.55,
    msg: 'Watchdog: alt kjører. 3 sessions jobber.', reply: 'Bra.',
    say: null, note: null },
  { time: '19:42', min: 24 * 60 * 14 + 19 * 60 + 42, day: '24. desember', here: 0.75, night: 0.3,
    msg: 'Trenger en produktbeslutning.', reply: 'Ja.',
    say: 'Se hva jeg fikk!', note: null },
];

// The night scene repeats: two more interruptions after 03:12.
const NIGHT = [
  { time: '04:37', min: 24 * 60 + 4 * 60 + 37, day: 'onsdag', here: 0.6, night: 0.5,
    msg: 'Session 2 lurer på: Postgres eller SQLite?', reply: 'Postgres.' },
  { time: '05:58', min: 24 * 60 + 5 * 60 + 58, day: 'onsdag', here: 0.5, night: 0.3,
    msg: 'Alt ferdig. Starte neste batch?', reply: 'Ja.' },
];

const wrap = (str, max) => {
  const out = [];
  let line = '';
  for (const w of str.split(' ')) {
    if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
};

// Shared look for the main character
const ME = { hair: 'messy', hairColor: PALETTE.hair.brown, skin: PALETTE.skin[0], outfit: 'hoodie', color: PALETTE.cloth.slate, glasses: true };
const WOOD = '#4a3020', WOOD_DARK = '#2e1d13', CLOTH = '#e7dccb', CREAM = '#efe4d2';
const F = (fill) => ({ style: `fill: ${fill}; stroke: ${D.inkFor(fill)}`, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }); // dark ink, like a render

// Build steps: each scene is one step, the dinner gets two extra beats.
// (Scenes 1, lunch, and 4, Christmas Eve, are kept in SCENES but no longer played.)
const STEPS = [
  { scene: 0, beat: 0 },
  { scene: 2, beat: 0 }, { scene: 2, beat: 1 }, { scene: 2, beat: 2 },
  { scene: 3, beat: 0 },
  { calendar: true },
];

export default {
  id: 'always-working',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Alltid på jobb',
  steps: STEPS.length,
  notes: [
    'Møte. Telefonen under bordet.',
    'Middag med dama. Så kommer varselet.',
    '«Gymbro spurte om jeg ville henge.» «2 sek.»',
    'Hun går. «Ferdig!»',
    'Natten: 03:12, 04:37, 05:58. Vekket, svarer, sover videre. Hun våkner også. 06:00: vekkerklokka. Spilles av uten klikk.',
    'Uka.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <style>${CSS}</style>
      <div class="aw-night"></div>
      <div class="pin-tl label">Bivirkning</div>
      <h2 class="tip aw-tip">Du er alltid<br><em>litt</em> på jobb.</h2>`;
    const svg = D.stage(el);
    const night = ctx.$('.aw-night');
    const tip = ctx.$('.aw-tip');
    let P = {};
    let loops = [];
    let sceneLoops = [];
    const killScene = () => { sceneLoops.forEach((l) => l.kill()); sceneLoops = []; };

    function defs() {
      const d = D.el('defs', {}, svg);
      const rg = D.el('radialGradient', { id: 'aw-glow' }, d);
      D.el('stop', { offset: '0%', 'stop-color': '#ffd23f', 'stop-opacity': 0.5 }, rg);
      D.el('stop', { offset: '45%', 'stop-color': '#ffd23f', 'stop-opacity': 0.2 }, rg);
      D.el('stop', { offset: '100%', 'stop-color': '#ffd23f', 'stop-opacity': 0 }, rg);
      const cone = D.el('linearGradient', { id: 'aw-cone', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
      D.el('stop', { offset: '0%', 'stop-color': '#ffd23f', 'stop-opacity': 0.22 }, cone);
      D.el('stop', { offset: '100%', 'stop-color': '#ffd23f', 'stop-opacity': 0 }, cone);
    }

    // ---------- the main character + their phone ----------
    function phoneAt(g, px, py) {
      // a soft light around the phone itself, not the whole person
      const glow = D.el('ellipse', { cx: px + 12, cy: py + 21, rx: 78, ry: 66, fill: 'url(#aw-glow)', opacity: 0, 'data-bg': '' }, g);
      const phone = D.g(g);
      D.el('rect', { x: px, y: py, width: 24, height: 42, rx: 5, fill: '#0f0a07', style: 'stroke: var(--deco)', 'stroke-width': 2.5 }, phone);
      const screen = D.el('rect', { x: px + 4, y: py + 5, width: 16, height: 30, rx: 2, style: 'fill: var(--accent-2)', opacity: 0.15 }, phone);
      const arcs = D.g(g, { opacity: 0 });
      D.p(arcs, `M${px - 8} ${py + 6} q-10 15 0 30 M${px - 18} ${py} q-12 21 0 42 M${px + 32} ${py + 6} q10 15 0 30 M${px + 42} ${py} q12 21 0 42`, 'acc2', { 'stroke-width': 3 });
      return { glow, phone, screen, arcs, px, py };
    }
    function me(g, H) {
      if (H.lying) {
        const fig = lyingHead(g, { x: H.x, y: H.y, s: H.s, ...ME, eyes: 'closed' });
        return { fig, head: fig.head, ...phoneAt(g, H.phone[0], H.phone[1]) };
      }
      const fig = figure(g, { x: H.x, y: H.y, s: H.s ?? 1, arms: H.arms ?? 'phone', ...ME, eyes: 'open', mouth: 'neutral' });
      return { fig, head: fig.head, ...phoneAt(g, fig.phone.x, fig.phone.y) };
    }

    // Others keep talking.
    function speech(g, x, y, str, tailTo) { return sharedSpeech(g, x, y, str, tailTo, { size: 21 }); }

    // The phone's screen, zoomed in: everything Claude says or he answers lives inside it.
    const PH = { x: 540, y: 136, w: 236, h: 258 };
    function notification(g, s, h, tailTo) {
      const { x, y, w } = PH;
      const lines = wrap(s.msg, 19);
      // phone + everything shown on it; its zoom line reaches down to the real phone, so its box
      // overlaps the scene by design (data-overlap-ok)
      const unit = D.g(g, { 'data-unit': '', 'data-overlap-ok': '' });
      const grp = D.g(unit);
      // one zoom line from the real phone to the big one
      const [tx, ty] = tailTo || [h.px + 12, h.py];
      D.p(grp, `M${tx} ${ty} L${x + w / 2} ${y + PH.h}`, 'dash', { opacity: 0.7 });
      // body, screen, notch, clock
      D.el('rect', { x, y, width: w, height: PH.h, rx: 30, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 3, 'data-body': '' }, grp);
      D.el('rect', { x: x + 10, y: y + 10, width: w - 20, height: PH.h - 20, rx: 22, style: 'fill: #1c140e' }, grp);
      D.el('rect', { x: x + w / 2 - 34, y: y + 16, width: 68, height: 14, rx: 7, style: 'fill: #0f0a07' }, grp);
      D.text(grp, x + 28, y + 30, s.time ?? '', 'st', { style: 'font: 700 14px var(--font-mono); fill: var(--fg)' });
      // notification card
      const cx = x + 20, cy = y + 44, cw = w - 40, ch = 38 + lines.length * 24;
      D.el('rect', { x: cx, y: cy, width: cw, height: ch, rx: 16, style: 'fill: #30251c' }, grp);
      D.text(grp, cx + 14, cy + 22, 'CLAUDE', 'lbl', { style: 'font: 700 12px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
      lines.forEach((l, i) => D.text(grp, cx + 14, cy + 46 + i * 24, l, 'msg', { style: 'font: 600 18px var(--font-display); fill: var(--fg)' }));
      // his reply, as a chat bubble on the same screen
      const rw = s.reply.length * 12 + 34, ry = cy + ch + 10;
      const reply = D.g(unit);
      D.el('rect', { x: cx + cw - rw, y: ry, width: rw, height: 34, rx: 12, style: 'fill: var(--accent)' }, reply);
      D.text(reply, cx + cw - rw / 2, ry + 23, s.reply, 'rep', { 'text-anchor': 'middle', style: 'font: 800 19px var(--font-display); fill: #1a0d05' });
      const chip = D.text(unit, x + w / 2, y + PH.h - 22, '→ NESTE OPPGAVE STARTET', 'chip', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .06em; fill: var(--accent-2)' });
      return { grp, reply, chip };
    }

    // ---------- props ----------
    const steam = (g, x, y) => {
      const st = D.g(g, { 'data-bg': '' });
      D.p(st, `M${x} ${y} q-8 -14 0 -28 q8 -14 0 -28 M${x + 14} ${y} q-8 -14 0 -28 q8 -14 0 -28`, 'thin', { opacity: 0.7 });
      sceneLoops.push(gsap.fromTo(st, { y: 6, opacity: 0.2 }, { y: -10, opacity: 0.8, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    };
    const candle = (g, x, y) => {
      D.el('rect', { x: x - 8, y, width: 16, height: 74, rx: 3, ...F(CREAM) }, g);
      const flame = D.p(g, `M${x} ${y - 4} q-11 -18 0 -36 q11 16 0 36 Z`, '', { style: 'fill: var(--accent-2); stroke: var(--accent)', 'stroke-width': 2 });
      sceneLoops.push(gsap.to(flame, { scaleY: 0.86, scaleX: 1.12, transformOrigin: '50% 100%', duration: 0.18, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() * 0.3 }));
      return flame;
    };
    const wineGlass = (g, x, y, level = 0.5) => {
      D.p(g, `M${x - 18} ${y} q18 46 36 0 Z`, '', F('rgba(255,255,255,.06)'));
      D.p(g, `M${x - 18 + 18 * (1 - level) * 0.6} ${y + 46 * (1 - level) * 0.4} q${18 * level + 8} ${30 * level} ${36 * level + 4} 0 Z`, '', { style: 'fill: #7e1f2f' });
      D.p(g, `M${x} ${y + 34} V${y + 66} M${x - 14} ${y + 66} H${x + 14}`, 'ln');
    };
    const plate = (g, x, y, food = 'pasta') => {
      D.el('ellipse', { cx: x, cy: y, rx: 74, ry: 17, ...F(CREAM) }, g);
      if (food === 'pasta') D.p(g, `M${x - 36} ${y - 2} q12 -22 30 -10 q14 -18 34 -4 q12 -6 14 8 Z`, '', F('#d9a441'));
      if (food === 'sandwich') {
        D.p(g, `M${x - 40} ${y - 4} L${x + 30} ${y - 22} L${x + 40} ${y - 4} Z`, '', F('#d4a35a'));
        D.p(g, `M${x - 38} ${y - 8} q10 -6 20 -2 t20 -4 t20 -2 t14 0`, '', { fill: 'none', style: 'stroke: #7aa043', 'stroke-width': 4 });
      }
    };
    const presents = (g, x, y, w, h, fill, ribbon) => {
      D.el('rect', { x, y, width: w, height: h, rx: 3, ...F(fill) }, g);
      D.p(g, `M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`, '', { fill: 'none', style: `stroke: ${ribbon}`, 'stroke-width': 6 });
      D.p(g, `M${x + w / 2} ${y} q-18 -22 -26 -6 q8 10 26 6 q18 -22 26 -6 q-8 10 -26 6`, '', { fill: 'none', style: `stroke: ${ribbon}`, 'stroke-width': 4 });
    };

    // ---------- scenes ----------
    const SC = [
      function meeting(g) {
        // back wall: screen with chart, window with blinds
        const scr = D.g(g, { 'data-unit': '' });
        D.el('rect', { x: 930, y: 268, width: 250, height: 150, rx: 6, ...F('#120c08') }, scr);
        D.p(scr, 'M955 393 L1010 363 L1060 373 L1110 318 L1160 334', 'acc');
        D.text(scr, 950, 296, 'Q4', 'mono', { style: 'font: 700 18px var(--font-mono); fill: var(--muted)' });
        D.el('rect', { x: 1320, y: 250, width: 140, height: 170, ...F('#1b2330') }, g);
        D.p(g, Array.from({ length: 9 }, (_, k) => `M1320 ${266 + k * 17} H1460`).join(' '), 'thin', { opacity: 0.6 });
        // colleagues behind the table, facing the screen
        const c1 = figure(g, { x: 860, y: 530, s: 0.78, arms: 'table', hair: 'bun', hairColor: PALETTE.hair.blonde, skin: PALETTE.skin[2], outfit: 'sweater', color: PALETTE.cloth.olive });
        const c2 = figure(g, { x: 1000, y: 530, s: 0.78, arms: 'table', hair: 'short', hairColor: PALETTE.hair.dark, skin: PALETTE.skin[3], outfit: 'shirt', color: PALETTE.cloth.teal });
        // presenter
        const pres = figure(g, { x: 1250, y: 330, s: 0.82, pose: 'stand', arms: 'point', flip: true, hair: 'curly', hairColor: PALETTE.hair.brown, skin: PALETTE.skin[1], outfit: 'blazer', color: PALETTE.cloth.wine, mouth: 'talk' });
        sceneLoops.push(pres.talk(0.16));
        return {
          hero: { x: 600, y: 545, s: 0.92, arms: 'phone' }, speechAt: [960, 170], tail: [1215, 258], noteAt: [770, 770],
          front(g2) {
            // the table sits in front of everyone at it, the developer included
            D.p(g2, 'M600 660 L1460 660 L1390 560 L680 560 Z', '', F(WOOD));
            D.p(g2, 'M600 660 V684 H1460 V660', '', F(WOOD_DARK));
            // laptop with stickers, rubber duck, coffee
            D.el('rect', { x: 860, y: 590, width: 70, height: 46, rx: 4, ...F('#1d1d22') }, g2);
            D.el('circle', { cx: 878, cy: 604, r: 6, style: 'fill: var(--accent)' }, g2);
            D.el('rect', { x: 892, y: 612, width: 16, height: 10, rx: 2, style: 'fill: #7fd0ff' }, g2);
            D.el('rect', { x: 912, y: 598, width: 10, height: 10, rx: 5, style: 'fill: #8fe3a2' }, g2);
            D.el('ellipse', { cx: 972, cy: 624, rx: 20, ry: 13, ...F('#ffd23f') }, g2);
            D.el('circle', { cx: 984, cy: 604, r: 10, ...F('#ffd23f') }, g2);
            D.p(g2, 'M993 604 l10 3 l-10 3 Z', '', F('#ff8a3d'));
            D.el('circle', { cx: 987, cy: 601, r: 1.8, fill: '#1a120c' }, g2);
            D.el('rect', { x: 1110, y: 586, width: 34, height: 40, rx: 4, ...F(CREAM) }, g2);
          },
          extra(tl) {
            // the reveal: lights dim and the others look down too; only his phone glows
            tl.to(night, { opacity: 0.32, duration: 0.8 }, 4.0);
            c1.expr(tl, { eyes: 'down' }, 4.3);
            c2.expr(tl, { eyes: 'down' }, 4.55);
            pres.expr(tl, { eyes: 'down' }, 4.9);
          },
        };
      },
      function lunch(g) {
        // pendant lamp with a light cone
        D.p(g, 'M1080 165 V230', 'thin');
        D.p(g, 'M1040 262 L1080 228 L1120 262 Z', '', F('var(--accent)'));
        D.p(g, 'M1046 262 L960 600 H1200 L1114 262 Z', '', { style: 'fill: url(#aw-cone)', 'data-bg': '' });
        // colleague mid-story, then the table on top of both
        const col = figure(g, { x: 1250, y: 480, s: 1, arms: 'open', hair: 'short', hairColor: PALETTE.hair.blonde, skin: PALETTE.skin[2], outfit: 'shirt', color: PALETTE.cloth.sand, mouth: 'talk', brows: 'raised' });
        sceneLoops.push(col.talk(0.15));
        return {
          hero: { x: 720, y: 508, s: 1, arms: 'fork' }, speechAt: [960, 170], tail: [1230, 400], noteAt: [1000, 700],
          front(g2) {
            D.el('rect', { x: 560, y: 610, width: 900, height: 26, rx: 4, ...F(WOOD) }, g2);
            D.p(g2, 'M600 636 V770 M1420 636 V770', 'ln');
            D.el('rect', { x: 700, y: 584, width: 260, height: 26, rx: 6, ...F('#2f3a44') }, g2); // tray
            plate(g2, 820, 590, 'sandwich');
            D.p(g2, 'M1060 560 h40 v40 q0 10 -10 10 h-20 q-10 0 -10 -10 Z M1100 570 q16 0 16 14 q0 14 -16 14', '', F(CREAM));
            steam(g2, 1072, 550);
            plate(g2, 1250, 600, 'pasta');
          },
        };
      },
      function dinner(g) {
        // window with curtains, evening light
        D.el('rect', { x: 1110, y: 250, width: 200, height: 170, ...F('#1b2330') }, g);
        D.p(g, 'M1210 250 V420 M1110 335 H1310', 'thin');
        D.p(g, 'M1095 244 q20 90 0 182 h40 q-14 -90 0 -182 Z M1325 244 q-20 90 0 182 h-40 q14 -90 0 -182 Z', '', F(PALETTE.cloth.wine));
        // her chair: stays when she leaves
        D.p(g, 'M1232 600 V440 q0 -12 12 -12 h92 q12 0 12 12 V600', '', F(WOOD_DARK));
        D.p(g, 'M1252 450 h76 M1252 470 h76', 'thin', { opacity: 0.5 });
        // her, in four versions: happy, annoyed, standing up texting (leaves)
        const wife = { x: 1290, y: 480, s: 1, hair: 'long', hairColor: PALETTE.hair.golden, skin: PALETTE.skin[2], outfit: 'dress', color: PALETTE.cloth.wine, slim: true, lashes: true };
        const happy = figure(g, { ...wife, arms: 'table', mouth: 'smile', eyes: 'open' });
        const cross = figure(g, { ...wife, arms: 'cross', mouth: 'frown', brows: 'annoyed', eyes: 'open' });
        const leaving = figure(g, { ...wife, pose: 'stand', arms: 'phone', mouth: 'smile', eyes: 'down', brows: 'raised' });
        cross.root.setAttribute('opacity', 0); leaving.root.setAttribute('opacity', 0);
        const herPhone = D.g(leaving.inner);
        D.el('rect', { x: -12, y: 16, width: 24, height: 40, rx: 5, fill: '#0f0a07', style: 'stroke: var(--deco)', 'stroke-width': 2.5 }, herPhone);
        D.el('rect', { x: -8, y: 21, width: 16, height: 28, rx: 2, style: 'fill: var(--accent-2)' }, herPhone);
        const flames = [], smoke = [];
        let sp2 = null, meSay = null, done = null;
        const herScreen = (root) => {
          // left of her and up high: the zoom line runs diagonally past her face, not through it
          const x = 930, y = 78, w = 236, h = 258;
          const unit = D.g(root, { 'data-unit': '' });
          D.p(unit, `M1291 486 L${x + w / 2} ${y + h}`, 'dash', { opacity: 0.7 });
          D.el('rect', { x, y, width: w, height: h, rx: 30, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 3, 'data-body': '' }, unit);
          D.el('rect', { x: x + 10, y: y + 10, width: w - 20, height: h - 20, rx: 22, style: 'fill: #1c140e' }, unit);
          D.el('rect', { x: x + w / 2 - 34, y: y + 16, width: 68, height: 14, rx: 7, style: 'fill: #0f0a07' }, unit);
          D.text(unit, x + 28, y + 30, '18:41', 'st', { style: 'font: 700 14px var(--font-mono); fill: var(--fg)' });
          D.text(unit, x + w / 2, y + 58, 'CLAUDE', 'lbl', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
          // her message, right-aligned chat bubble
          const lines = wrap('Hvordan får jeg typen til å legge vekk telefonen?', 17);
          const bh = 18 + lines.length * 23;
          D.el('rect', { x: x + 34, y: y + 74, width: w - 54, height: bh, rx: 16, style: 'fill: #f3e9da' }, unit);
          lines.forEach((l, i) => D.text(unit, x + 48, y + 96 + i * 23, l, 'msg', { style: 'font: 600 17px var(--font-display); fill: #1a120c' }));
          // Claude is typing
          const typing = D.g(unit, { class: 'typing' });
          D.el('rect', { x: x + 20, y: y + 86 + bh, width: 70, height: 32, rx: 16, style: 'fill: #30251c' }, typing);
          [0, 1, 2].forEach((k) => D.el('circle', { cx: x + 38 + k * 17, cy: y + 102 + bh, r: 4.5, fill: '#fff3e3' }, typing));
          return unit;
        };
        return {
          hero: { x: 720, y: 508, s: 1, arms: 'phone' }, speechAt: [960, 170], tail: [1265, 400], noteAt: [600, 735],
          t: { buzz: 2.6, notif: 3.0, reply: 4.0, chip: 4.4 },
          front(g2) {
            // tablecloth, candles, wine, plates
            D.p(g2, 'M560 610 H1460 L1474 700 H546 Z', '', F(CLOTH));
            D.p(g2, 'M640 612 q-4 40 -10 86 M820 612 q-2 44 -6 86 M1000 612 v88 M1180 612 q2 44 6 86 M1360 612 q4 40 10 86', 'thin', { opacity: 0.5 });
            plate(g2, 800, 616); plate(g2, 1230, 616);
            flames.push(candle(g2, 970, 520)); flames.push(candle(g2, 1050, 520));
            for (const x of [970, 1050]) smoke.push(D.p(g2, `M${x} 516 q-10 -20 0 -40 q10 -20 0 -40`, 'thin', { opacity: 0 }));
            D.p(g2, 'M1006 610 V530 q0 -14 8 -20 V478 h12 v32 q8 6 8 20 V610 Z', '', F('#1f3324'));
            wineGlass(g2, 900, 540, 0.5); wineGlass(g2, 1130, 540, 0.7);
          },
          beats: [
            (tl, h, root) => {
              // she gets annoyed; a pause; he answers without looking up
              tl.to(happy.root, { opacity: 0, duration: 0.4 }, 0);
              tl.to(cross.root, { opacity: 1, duration: 0.4 }, 0);
              tl.to(root.querySelector('[data-first-say]'), { opacity: 0, duration: 0.2 }, 0.3);
              sp2 = speech(root, 960, 170, 'Gymbro spurte om jeg ville henge.', [1265, 400]);
              tl.fromTo(sp2, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 0.5);
              tl.call(() => gsap.killTweensOf(flames), null, 0.79);
              tl.to(flames, { scaleX: 0.6, scaleY: 0.5, transformOrigin: '50% 100%', duration: 1.2, ease: 'power2.in' }, 0.8);
              meSay = speech(root, 800, 404, '2 sek.', [752, 452]);
              tl.fromTo(meSay, { opacity: 0, scale: 0.7, transformOrigin: '20% 100%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, 2.2);
              setAttention(tl, 0.35, 2.2);
            },
            (tl, h, root) => {
              // she stands up, smiling at her own phone... and we see what she is typing
              tl.to([sp2, meSay], { opacity: 0, duration: 0.3 }, 0);
              tl.to(cross.root, { opacity: 0, duration: 0.3 }, 0.1);
              tl.set(leaving.root, { opacity: 1 }, 0.1);
              tl.fromTo(leaving.root, { y: 70 }, { y: -10, duration: 0.7, ease: 'power2.out' }, 0.1);
              const her = herScreen(root);
              tl.fromTo(her, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, 1.0);
              tl.fromTo(her.querySelectorAll('.typing circle'), { opacity: 0.2 }, { opacity: 1, duration: 0.3, stagger: 0.15, repeat: 5, yoyo: true }, 1.8);
              tl.to(her, { opacity: 0, duration: 0.4 }, 4.4);
              // then she walks out; candles die
              tl.to(leaving.root, { x: 480, duration: 2.2, ease: 'power1.in' }, 4.6);
              tl.to(leaving.root, { y: -18, duration: 0.18, yoyo: true, repeat: 11, ease: 'sine.inOut' }, 4.6);
              tl.to(leaving.root, { opacity: 0, duration: 0.4 }, 6.4);
              tl.call(() => gsap.killTweensOf(flames), null, 5.19);
              tl.to(flames, { scaleX: 0, scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'power2.in' }, 5.2);
              tl.fromTo(smoke, { opacity: 0, y: 0 }, { opacity: 0.8, y: -20, duration: 1.2 }, 5.5);
              tl.to(smoke, { opacity: 0, duration: 0.8 }, 6.7);
              // he finally looks up: done, and alone
              h.fig.expr(tl, { eyes: 'open', brows: 'raised', mouth: 'grin' }, 7.0);
              tl.to(h.head, { rotation: 0, transformOrigin: '50% 100%', duration: 0.4 }, 7.0);
              done = speech(root, 800, 404, 'Ferdig!', [752, 452]);
              tl.fromTo(done, { opacity: 0, scale: 0.7, transformOrigin: '20% 100%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, 7.2);
              h.fig.expr(tl, { mouth: 'neutral', brows: 'neutral' }, 8.2);
              tl.to(h.glow, { opacity: 0, duration: 0.6 }, 8.2);
              tl.to(h.screen, { opacity: 0.15, duration: 0.6 }, 8.2);
              setAttention(tl, 1, 8.2);
            },
          ],
        };
      },
      function bed(g) {
        // bedroom: window, nightstand + lamp, bed, two sleepers, blanket
        D.el('rect', { x: 1160, y: 175, width: 220, height: 170, ...F('#141a26') }, g);
        D.p(g, 'M1270 175 V345 M1160 260 H1380', 'thin');
        D.p(g, 'M1320 205 a24 24 0 1 0 24 32 a20 20 0 1 1 -24 -32 Z', '', { style: 'fill: var(--accent-2); stroke: none' });
        for (const [x, y] of [[1190, 200], [1230, 300], [1350, 300]]) D.el('circle', { cx: x, cy: y, r: 2.5, fill: '#fff3e3' }, g);
        const dawn = D.el('rect', { x: 1162, y: 290, width: 216, height: 53, fill: '#ff8a3d', opacity: 0, 'data-bg': '' }, g);
        D.el('rect', { x: 552, y: 640, width: 92, height: 120, rx: 4, ...F(WOOD) }, g);
        D.p(g, 'M560 690 H636', 'thin');
        // alarm clock on the nightstand (rings at 06:00)
        const alarm = D.g(g);
        D.el('circle', { cx: 612, cy: 610, r: 7, ...F('#c9ad92') }, alarm);
        D.el('circle', { cx: 632, cy: 610, r: 7, ...F('#c9ad92') }, alarm);
        D.el('circle', { cx: 622, cy: 622, r: 16, ...F(CREAM) }, alarm);
        D.p(alarm, 'M622 622 V612 M622 622 h7', 'ln', { 'stroke-width': 2 });
        D.p(alarm, 'M612 636 l-4 5 M632 636 l4 5', 'ln', { 'stroke-width': 2 });
        const ring = D.g(g, { opacity: 0 });
        D.p(ring, 'M596 604 q-10 14 0 28 M586 598 q-12 20 0 40 M648 604 q10 14 0 28 M658 598 q12 20 0 40', 'acc', { 'stroke-width': 3 });
        // energy drinks on the floor: one more per wake-up
        const cans = [0, 1, 2, 3].map((k) => {
          const c = D.g(g, { opacity: k === 0 ? 1 : 0 });
          D.el('rect', { x: 498 + k * 15 - (k > 1 ? 30 : 0), y: k > 1 ? 708 : 734, width: 13, height: 26, rx: 2, ...F(k % 2 ? '#7fd0ff' : '#8fe3a2') }, c);
          return c;
        });
        D.el('rect', { x: 662, y: 520, width: 26, height: 240, rx: 6, ...F(WOOD_DARK) }, g); // headboard
        D.el('rect', { x: 688, y: 660, width: 790, height: 100, rx: 10, ...F('#d8cdbb') }, g); // mattress
        D.el('ellipse', { cx: 790, cy: 640, rx: 64, ry: 24, ...F(CREAM) }, g);
        D.el('ellipse', { cx: 1040, cy: 640, rx: 64, ry: 24, ...F(CREAM) }, g);
        const partner = lyingHead(g, { x: 1080, y: 622, s: 1.0, hair: 'long', hairColor: PALETTE.hair.golden, skin: PALETTE.skin[2], lashes: true });
        const zzzThem = D.text(g, 1120, 560, 'z z z', 'z', { style: 'font: 700 30px var(--font-note); fill: var(--muted)' });
        sceneLoops.push(gsap.fromTo(zzzThem, { y: 10, opacity: 0.2 }, { y: -16, opacity: 0.9, duration: 1.6, repeat: -1, ease: 'sine.out' }));
        const up = [790, 470];
        let zMe = null, zThem = sceneLoops[sceneLoops.length - 1];
        // one wake-up: zzz stops, eyes open, phone up, answer, phone back, asleep again (base = buzz time)
        const cycle = (tl, h, base, { tired = 'tired' } = {}) => {
          tl.call(() => zMe?.pause(), null, base);
          tl.to(h.zzz, { opacity: 0, duration: 0.2 }, base);
          h.fig.expr(tl, { eyes: 'wide', brows: 'raised' }, base + 0.3);
          tl.to([h.phone, h.glow], { x: up[0] - h.px, y: up[1] - h.py, duration: 0.6, ease: 'power2.inOut' }, base + 0.5);
          h.fig.expr(tl, { eyes: 'down', brows: tired }, base + 0.9);
          tl.to([h.phone, h.glow], { x: 0, y: 0, duration: 0.6, ease: 'power2.inOut' }, base + 2.6);
          tl.to(h.screen, { opacity: 0.15, duration: 0.3 }, base + 3.1);
          tl.to(h.glow, { opacity: 0, duration: 0.4 }, base + 3.1);
          h.fig.expr(tl, { eyes: 'closed', brows: 'neutral' }, base + 3.2);
          tl.call(() => zMe?.restart(), null, base + 3.3);
        };
        return {
          hero: { lying: true, x: 830, y: 622, s: 1.0, phone: [558, 600] },
          speechAt: null, noteAt: [1060, 470], tailTo: [up[0] + 12, up[1] - 4],
          t: { buzz: 1.8, notif: 2.9, reply: 3.6, chip: 3.9, note: 5.0 },
          noHeadTurn: true,
          front(g2, h) {
            // blanket over both sleepers
            D.p(g2, 'M700 660 C800 610 920 630 1080 650 C1240 668 1360 650 1470 660 V752 H700 Z', '', F(PALETTE.cloth.navy));
            D.p(g2, 'M760 700 C900 670 1100 690 1460 690 M760 730 C900 700 1100 720 1460 720', 'thin', { opacity: 0.5 });
            const zzzMe = D.text(g2, 870, 560, 'z z', 'z', { style: 'font: 700 30px var(--font-note); fill: var(--muted)' });
            zMe = gsap.fromTo(zzzMe, { y: 10, opacity: 0.2 }, { y: -16, opacity: 0.9, duration: 1.4, repeat: -1, ease: 'sine.out' });
            sceneLoops.push(zMe);
            h.zzz = zzzMe;
          },
          extra(tl, h, n, root) {
            partner.set({ eyes: 'closed' });
            cycle(tl, h, 1.8);
            // the next two interruptions play on their own, no clicks
            this.beats.forEach((beat, k) => {
              const sub = gsap.timeline();
              beat(sub, h, root);
              tl.add(sub, 5.8 + k * 5.6);
            });
          },
          beats: [
            (tl, h, root) => {
              // 04:37: woken again; the partner wakes too and gives a look
              interruption(tl, h, root, NIGHT[0], 1.6, [up[0] + 12, up[1] - 4]);
              tl.to(cans[1], { opacity: 1, duration: 0.3 }, 4.4);
              tl.call(() => zThem?.pause(), null, 1.6);
              tl.to(zzzThem, { opacity: 0, duration: 0.2 }, 1.6);
              partner.expr(tl, { eyes: 'open', brows: 'tired', mouth: 'frown' }, 1.9);
              cycle(tl, h, 1.6);
              partner.expr(tl, { eyes: 'closed', brows: 'neutral', mouth: 'neutral' }, 4.9);
              tl.call(() => zThem?.restart(), null, 5.0);
            },
            (tl, h, root) => {
              // 05:58: dawn; the partner stays awake, unimpressed
              interruption(tl, h, root, NIGHT[1], 1.6, [up[0] + 12, up[1] - 4]);
              tl.call(() => zThem?.pause(), null, 1.6);
              tl.to(zzzThem, { opacity: 0, duration: 0.2 }, 1.6);
              partner.expr(tl, { eyes: 'open', brows: 'annoyed', mouth: 'frown' }, 1.8);
              cycle(tl, h, 1.6, { tired: 'tired' });
              tl.to(dawn, { opacity: 1, duration: 2.5 }, 0.2);
              tl.to(cans[2], { opacity: 1, duration: 0.3 }, 4.4);
              // 06:00: two minutes later, the alarm
              const hands = { m: NIGHT[1].min };
              tl.to(hands, { m: 24 * 60 + 6 * 60, duration: 0.6, ease: 'power1.inOut', onUpdate: () => setHands(hands.m) }, 6.0);
              tl.call(() => { P.min = 24 * 60 + 6 * 60; P.clock.label.textContent = 'ONSDAG 06:00'; }, null, 6.3);
              tl.call(() => zMe?.pause(), null, 6.6);
              tl.to(h.zzz, { opacity: 0, duration: 0.2 }, 6.6);
              tl.to(ring, { opacity: 1, duration: 0.1 }, 6.6);
              tl.fromTo(alarm, { rotation: -8 }, { rotation: 8, svgOrigin: '622 638', duration: 0.06, repeat: 23, yoyo: true }, 6.6);
              tl.to(ring, { opacity: 0.3, duration: 0.1, repeat: 11, yoyo: true }, 6.7);
              h.fig.expr(tl, { eyes: 'wide', brows: 'raised' }, 6.7);
            },
          ],
        };
      },
      function christmas(g) {
        // tree with blinking lights, presents, someone opening one
        D.p(g, 'M1350 250 L1262 370 H1438 Z', '', F('#2f4a2c'));
        D.p(g, 'M1350 320 L1244 452 H1456 Z', '', F('#2f4a2c'));
        D.p(g, 'M1350 400 L1226 560 H1474 Z', '', F('#2f4a2c'));
        D.el('rect', { x: 1332, y: 560, width: 36, height: 46, ...F(WOOD) }, g);
        D.p(g, 'M1350 214 l9 18 l20 3 l-15 13 l4 20 l-18 -10 l-18 10 l4 -20 l-15 -13 l20 -3 Z', '', { style: 'fill: var(--accent-2); stroke: var(--accent)', 'stroke-width': 2 });
        const bulbs = [[1320, 350], [1385, 400], [1300, 470], [1410, 520], [1350, 440], [1270, 540], [1390, 300]]
          .map(([x, y], k) => D.el('circle', { cx: x, cy: y, r: 9, fill: ['#ff5a1f', '#ffd23f', '#ff6f9c', '#7fd0ff'][k % 4], style: 'stroke: #1a120c', 'stroke-width': 1.5 }, g));
        sceneLoops.push(gsap.to(bulbs, { opacity: 0.25, duration: 0.5, yoyo: true, repeat: -1, stagger: { each: 0.15, repeat: -1, yoyo: true } }));
        presents(g, 1240, 600, 80, 60, PALETTE.cloth.wine, '#ffd23f');
        presents(g, 1340, 616, 60, 44, PALETTE.cloth.teal, '#ff6f9c');
        const opener = figure(g, { x: 1090, y: 470, s: 0.95, arms: 'open', hair: 'bun', hairColor: PALETTE.hair.blonde, skin: PALETTE.skin[2], outfit: 'sweater', color: '#8b2a2a', mouth: 'grin', brows: 'raised' });
        opener.root.setAttribute('data-unit', '');
        return {
          hero: { x: 720, y: 508, s: 1, arms: 'phone' }, speechAt: [960, 170], tail: [1080, 340], noteAt: [760, 720],
          front(g2) {
            D.p(g2, 'M1030 560 h120 v70 h-120 Z', '', F('#ffd23f'));
            D.p(g2, 'M1022 548 l68 -30 l68 30', '', { fill: 'none', style: 'stroke: var(--fg)', 'stroke-width': 3 });
            D.p(g2, 'M1090 560 V630', '', { fill: 'none', style: 'stroke: #ff5a1f', 'stroke-width': 6 });
            // sofa in front of the main character
            D.p(g2, 'M580 600 q0 -40 40 -40 h200 q40 0 40 40 v100 h-280 Z', '', F(PALETTE.cloth.rust));
            D.p(g2, 'M600 640 h240', 'thin');
            D.el('ellipse', { cx: 1000, cy: 735, rx: 420, ry: 26, fill: '#3a2418', opacity: 0.6, 'data-bg': '' }, g2);
          },
        };
      },
    ];

    // ---------- clock and attention ring ----------
    const CX = 200, CY = 410, R = 80;
    function clock() {
      const grp = D.g(svg);
      D.p(grp, `M${CX - R} ${CY} a${R} ${R} 0 1 0 ${R * 2} 0 a${R} ${R} 0 1 0 ${-R * 2} 0`);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, r1 = R - (k % 3 ? 8 : 16), r2 = R - 3;
        D.p(grp, `M${CX + Math.sin(a) * r1} ${CY - Math.cos(a) * r1} L${CX + Math.sin(a) * r2} ${CY - Math.cos(a) * r2}`, k % 3 ? 'thin' : 'ln');
      }
      const hour = D.p(grp, `M${CX} ${CY + 8} V${CY - R * 0.5}`, 'ln', { 'stroke-width': 6 });
      const minute = D.p(grp, `M${CX} ${CY + 10} V${CY - R * 0.8}`, 'acc');
      D.el('circle', { cx: CX, cy: CY, r: 5, class: 'fill-acc' }, grp);
      const label = D.text(grp, CX, CY + R + 40, '', 'clk', { 'text-anchor': 'middle', style: 'font: 400 21px var(--font-mono); fill: var(--fg); letter-spacing: .04em' });
      return { grp, hour, minute, label };
    }
    const setHands = (min) => {
      gsap.set(P.clock.minute, { rotation: min * 6, svgOrigin: `${CX} ${CY}` });
      gsap.set(P.clock.hour, { rotation: min * 0.5, svgOrigin: `${CX} ${CY}` });
    };
    const AX = 200, AY = 680, AR = 58, C = 2 * Math.PI * AR;
    function attention() {
      const grp = D.g(svg, { 'data-unit': '' });
      D.el('circle', { cx: AX, cy: AY, r: AR, fill: 'none', style: 'stroke: var(--fg)', 'stroke-width': 16, opacity: 0.85 }, grp);
      const work = D.el('circle', { cx: AX, cy: AY, r: AR, fill: 'none', style: 'stroke: var(--accent)', 'stroke-width': 16, 'stroke-dasharray': `${C} ${C}`, 'stroke-dashoffset': C, transform: `rotate(-90 ${AX} ${AY})` }, grp);
      const here = D.text(svg, 290, 668, '', 'att', { style: 'font: 700 20px var(--font-mono); fill: var(--fg); letter-spacing: .06em' });
      const job = D.text(svg, 290, 700, '', 'att', { style: 'font: 700 20px var(--font-mono); fill: var(--accent); letter-spacing: .06em' });
      const lbl = D.text(svg, 120, 600, 'OPPMERKSOMHET', 'att', { style: 'font: 400 15px var(--font-mono); fill: var(--muted); letter-spacing: .14em' });
      return { grp, work, here, job, lbl, v: 0 };
    }
    // A repeat interruption inside an existing scene: clock moves on, phone buzzes, new message, reply.
    const interruption = (tl, h, root, s, base, tailTo) => {
      const old = P.notif;
      if (old) tl.to([old.grp, old.reply, old.chip], { opacity: 0, duration: 0.3 }, 0);
      const hands = { m: P.min };
      tl.to(hands, { m: s.min, duration: 1.3, ease: 'power2.inOut', onUpdate: () => setHands(hands.m) }, 0.1);
      P.min = s.min;
      tl.call(() => { P.clock.label.textContent = `${s.day.toUpperCase()} ${s.time}`; }, null, 0.2);
      tl.to(night, { opacity: s.night, duration: 1.2 }, 0.1);
      setAttention(tl, 1, 0.3);
      tl.call(() => phones({ text: s.msg }, liveNow), null, base);
      tl.to(h.arcs, { opacity: 1, duration: 0.12, yoyo: true, repeat: 5 }, base);
      tl.to(h.screen, { opacity: 1, duration: 0.2 }, base);
      tl.to(h.glow, { opacity: 1, duration: 0.5 }, base + 0.05);
      const n = notification(root, s, h, tailTo);
      P.notif = n;
      tl.fromTo(n.grp, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, base + 1.1);
      setAttention(tl, s.here, base + 1.1);
      tl.fromTo(n.reply, { opacity: 0, scale: 0.6, transformOrigin: '100% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, base + 1.8);
      tl.fromTo(n.chip, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.4 }, base + 2.1);
    };

    const setAttention = (tl, hereFrac, at) => {
      const a = P.att, s = { v: a.v };
      tl.to(s, {
        v: 1 - hereFrac, duration: 0.9, ease: 'power2.inOut',
        onUpdate: () => {
          a.v = s.v;
          a.work.setAttribute('stroke-dashoffset', C * (1 - s.v));
          a.here.textContent = `HER  ${Math.round((1 - s.v) * 100)} %`;
          a.job.textContent = `JOBB ${Math.round(s.v * 100)} %`;
        },
      }, at);
    };

    // ---------- week calendar (final step) ----------
    function calendar(grp) {
      const days = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN'];
      const x0 = 520, x1 = 1520, y0 = 380, y1 = 740;
      const cw = (x1 - x0) / 7, hours = 16, rh = (y1 - y0) / hours;
      days.forEach((d, k) => D.text(grp, x0 + k * cw + cw / 2, y0 - 16, d, 'mono', { 'text-anchor': 'middle', style: 'font: 400 18px var(--font-mono); fill: var(--muted)' }));
      for (let h = 0; h <= hours; h += 4) D.text(grp, x0 - 14, y0 + h * rh + 7, String(7 + h).padStart(2, '0'), 'mono', { 'text-anchor': 'end', style: 'font: 400 18px var(--font-mono); fill: var(--muted)' });
      let d = '';
      for (let k = 0; k <= 7; k++) d += `M${x0 + k * cw} ${y0} V${y1} `;
      for (let h = 0; h <= hours; h++) d += `M${x0} ${y0 + h * rh} H${x1} `;
      D.p(grp, d, 'thin', { opacity: 0.5, 'data-bg': '' });
      const blocks = D.g(grp, { 'data-unit': '' });
      const items = [];
      const FERIE = { k: 6, h0: 3, h1: 10 }; // Sunday 10–17, left for last
      for (let k = 0; k < 7; k++) {
        let h = 0;
        while (h < hours) {
          if (k === FERIE.k && h === FERIE.h0) { h = FERIE.h1; continue; }
          let len = 1 + ((Math.random() * 3) | 0);
          if (k === FERIE.k && h < FERIE.h0) len = Math.min(len, FERIE.h0 - h);
          items.push(D.el('rect', { x: x0 + k * cw + 4, y: y0 + h * rh + 3, width: cw - 8, height: Math.min(len, hours - h) * rh - 6, rx: 4, fill: (k + h) % 3 ? 'var(--accent)' : 'var(--accent-2)', opacity: 0 }, blocks));
          if (len >= 3 && h + len <= hours) items.push(D.text(blocks, x0 + k * cw + 14, y0 + h * rh + 28, 'jobb (litt)', 'cal', { fill: '#1a0d05', opacity: 0, style: 'font: 700 17px var(--font-mono)' }));
          h += len;
        }
      }
      // the one day off
      const fx0 = x0 + FERIE.k * cw + 4, fy0 = y0 + FERIE.h0 * rh + 3, fh = (FERIE.h1 - FERIE.h0) * rh - 6;
      const ferie = D.g(grp, { 'data-unit': '', opacity: 0 });
      const fRect = D.el('rect', { x: fx0, y: fy0, width: cw - 8, height: fh, rx: 4, fill: '#8fe3a2' }, ferie);
      const fText = D.text(ferie, fx0 + (cw - 8) / 2, fy0 + fh / 2 + 7, 'FERIE', 'cal', { 'text-anchor': 'middle', style: 'font: 800 20px var(--font-mono); fill: #1a120c' });
      return { items, ferie, fRect, fText };
    }

    // ---------- steps ----------
    let liveNow = false; // set per step: whether this step plays for real
    const reset = () => {
      loops.forEach((l) => l.kill()); loops = [];
      killScene();
      svg.innerHTML = '';
      P = {};
      defs();
      P.clock = clock();
      P.att = attention();
      gsap.set(night, { opacity: 0 });
      P.min = SCENES[0].min - 90;
      setHands(P.min);
    };

    const scene = (i, instant) => {
      const s = SCENES[i];
      const tl = gsap.timeline();
      if (P.vig) {
        const old = P.vig;
        killScene();
        tl.to(old, { opacity: 0, duration: 0.4 }, 0).call(() => old.remove(), null, 0.4);
      }
      const hands = { m: P.min };
      tl.to(hands, { m: s.min, duration: i === 4 ? 2.2 : 1.3, ease: 'power2.inOut', onUpdate: () => setHands(hands.m) }, 0.1);
      P.min = s.min;
      tl.call(() => { P.clock.label.textContent = `${s.day.toUpperCase()} ${s.time}`; }, null, 0.2);
      tl.to(night, { opacity: s.night, duration: 1 }, 0.1);

      // scene: background + others, then the main character, then foreground props
      const g = D.g(svg);
      P.vig = g;
      const back = D.g(g);
      const cfg = SC[i](back);
      const h = me(g, cfg.hero);
      const front = D.g(g);
      cfg.front?.(front, h);
      tl.fromTo([back, front], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, 0.4);
      tl.fromTo(h.fig.root, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.7);
      tl.fromTo([h.phone], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9);
      if (cfg.speechAt) {
        const sp = speech(g, cfg.speechAt[0], cfg.speechAt[1], s.say, cfg.tail);
        sp.setAttribute('data-first-say', '');
        tl.fromTo(sp, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 1.3);
      }
      const T = { buzz: 1.8, notif: 2.0, reply: 2.9, chip: 3.3, note: 3.5, ...(cfg.t || {}) };
      setAttention(tl, 1, 0.4);

      // the buzz: phone vibrates and lights up, eyes drop to it, notification pops out
      // … and every phone in the room gets the same notification
      tl.call(() => phones({ text: s.msg }, liveNow), null, T.buzz);
      tl.to(h.arcs, { opacity: 1, duration: 0.12, yoyo: true, repeat: 5 }, T.buzz);
      if (!instant) tl.fromTo(h.phone.querySelectorAll('rect'), { x: -3 }, { x: 3, duration: 0.05, repeat: 9, yoyo: true, clearProps: 'x' }, T.buzz);
      tl.to(h.screen, { opacity: 1, duration: 0.2 }, T.buzz);
      tl.to(h.glow, { opacity: 1, duration: 0.5 }, T.buzz + 0.05);
      if (!cfg.noHeadTurn) {
        h.fig.expr(tl, { eyes: 'down' }, T.buzz + 0.1);
        tl.to(h.head, { rotation: -8, transformOrigin: '50% 100%', duration: 0.5, ease: 'back.out(2)' }, T.buzz + 0.1);
      }
      const n = notification(g, s, h, cfg.tailTo);
      P.notif = n;
      tl.fromTo(n.grp, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, T.notif);
      setAttention(tl, s.here, T.notif);
      tl.fromTo(n.reply, { opacity: 0, scale: 0.6, transformOrigin: '100% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, T.reply);
      tl.fromTo(n.chip, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.4 }, T.chip);
      cfg.extra?.(tl, h, n, g);
      P.cfg = cfg; P.h = h; P.root = g;
      if (s.note) {
        const [nx, ny] = cfg.noteAt;
        const note = D.pencil(g, nx, ny, s.note, { size: 40, rotate: -4 });
        tl.add(D.fadeIn(note), T.note);
      }
      return tl;
    };

    const play = (i, instant) => {
      liveNow = !instant && !ctx.deck?.instant; // replays and audits never buzz the room
      const tl = gsap.timeline();
      const st = STEPS[i];
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        tl.add(D.drawOn(P.clock.grp, { duration: 1, stagger: 0.02 }), 0.2);
        tl.add(D.fadeIn([P.att.grp, P.att.lbl, P.att.here, P.att.job]), 0.3);
      }
      if (!st.calendar) {
        if (st.beat === 0) tl.add(scene(st.scene, instant), i === 0 ? 0.5 : 0);
        else P.cfg.beats[st.beat - 1](tl, P.h, P.root, instant);
        return tl;
      }

      killScene();
      tl.to([P.clock.grp, P.vig, P.att.grp, P.att.lbl, P.att.here, P.att.job], { opacity: 0, duration: 0.5 }, 0);
      tl.to(night, { opacity: 0, duration: 0.8 }, 0);
      const cal = D.g(svg);
      const { items, ferie, fRect, fText } = calendar(cal);
      tl.add(D.fadeIn(cal.querySelectorAll(':scope > text, :scope > path')), 0.4);
      tl.to(items, { opacity: 0.92, duration: 0.12, stagger: { each: 0.025, from: 'random' } }, 0.8);
      // last: one day off appears... and flips
      const tF = 0.8 + items.length * 0.025 + 0.4;
      tl.fromTo(ferie, { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, tF);
      tl.to(ferie, { scaleY: 0, transformOrigin: '50% 50%', duration: 0.2, ease: 'power2.in' }, tF + 1.6);
      tl.call(() => { fRect.setAttribute('fill', 'var(--accent)'); fText.textContent = 'jobb (litt)'; fText.setAttribute('style', 'font: 700 17px var(--font-mono); fill: #1a0d05'); }, null, tF + 1.8);
      tl.to(ferie, { scaleY: 1, duration: 0.25, ease: 'back.out(2)' }, tF + 1.8);
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); killScene(); } };
  },
};
