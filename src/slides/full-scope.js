import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { lineModel } from '../engine/lines3d.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';
import { onRelay, relaySend } from '../engine/relay.js';

/*
  Tip: give the full scope before starting.
  A house is specified one prompt at a time and grows patches, braces and a
  staircase to nowhere. Then the same requirements arrive as one prompt and
  the house is drawn clean. With the whole scope known, the room builds it together
  (step 5): every phone gets its own bricks of the main block and places them; phones
  with no brick light the windows. The house is sized to the room (12, 24 or 48 bricks);
  with no phones it builds itself. Bricks still missing when the step ends stay holes
  until the next step fills them, then it lifts into 3D.
    build zone: bricks x 700–1100, y 480–760 (behind the line drawing); counter x 1150–1470, y 470–600
*/
const GRID = { 12: [4, 3], 24: [6, 4], 48: [8, 6] };
const BX = 700, BY = 480, BW = 400, BH = 280;
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const WINDOWS = [[740, 650, 70, 45], [980, 650, 70, 45], [740, 515, 70, 60], [860, 515, 70, 60], [980, 515, 70, 60]];

const CSS = `
.slide-full-scope .fs-tip { position: absolute; left: var(--pad); top: calc(var(--u) * 10.5); width: max-content; white-space: nowrap; font-size: calc(var(--u) * 3.4); }
.slide-full-scope .fs-revs { display: none; }
.slide-full-scope .revs .rev span { color: var(--fg); }
`;

// 3D clean house as line segments (world units), used for the final particle reveal.
function house3d() {
  const segs = [];
  const box = (x0, x1, y0, y1, z0, z1) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => segs.push([c[a], c[b]]));
  };
  const rectZ = (x0, x1, y0, y1, z) => {
    segs.push([[x0, y0, z], [x1, y0, z]], [[x1, y0, z], [x1, y1, z]], [[x1, y1, z], [x0, y1, z]], [[x0, y1, z], [x0, y0, z]]);
  };
  const D2 = 1.3;
  box(-3, 1, -2, 0.8, -D2, D2);          // main block, two storeys
  box(1, 3.2, -2, -0.6, -D2, D2);        // garage, flush with the floor line
  segs.push([[-3, -0.6, D2], [1, -0.6, D2]], [[-3, -0.6, -D2], [1, -0.6, -D2]]); // floor line
  // windows and doors on the front face
  rectZ(-2.6, -1.9, -1.4, -0.9, D2); rectZ(-0.1, 0.6, -1.4, -0.9, D2);
  rectZ(-2.6, -1.9, -0.1, 0.45, D2); rectZ(-1.4, -0.7, -0.1, 0.45, D2); rectZ(-0.1, 0.6, -0.1, 0.45, D2);
  rectZ(-1.25, -0.75, -2, -1.15, D2);
  rectZ(1.35, 2.85, -2, -1.0, D2);
  // roof terrace: railing posts + rail, pool
  for (let x = -3; x <= 1.001; x += 0.5) {
    segs.push([[x, 0.8, D2], [x, 1.15, D2]], [[x, 0.8, -D2], [x, 1.15, -D2]]);
  }
  segs.push([[-3, 1.15, D2], [1, 1.15, D2]], [[-3, 1.15, -D2], [1, 1.15, -D2]], [[-3, 1.15, -D2], [-3, 1.15, D2]], [[1, 1.15, -D2], [1, 1.15, D2]]);
  const py = 0.82;
  segs.push([[-2.2, py, -0.6], [-0.2, py, -0.6]], [[-0.2, py, -0.6], [-0.2, py, 0.6]], [[-0.2, py, 0.6], [-2.2, py, 0.6]], [[-2.2, py, 0.6], [-2.2, py, -0.6]]);
  return segs;
}

export default {
  id: 'full-scope',
  title: 'Hele omfanget først',
  steps: 8,
  notes: [
    'Én prompt om gangen. Først en hytte.',
    'Så garasje. Den blir boltet på, i en annen høyde.',
    'Andre etasje. Ingen planla for den, så den balanserer på mønet.',
    'Takterrasse med basseng. Ingen trapp opp, så den boltes på utenpå. Og AI-en melder at alt fungerer.',
    'Spol tilbake. Samme krav, men alt i én prompt. Ett hus.',
    'Når hele omfanget er kjent, kan alle bygge samtidig. Ta frem telefonen: dere har fått hver deres del. Klikk når det står.',
    'Og siden hele omfanget var kjent, kunne det bygges ordentlig.',
    'Så kommer kunden med REV 1.',
  ],

  create(ctx) {
    const { el, stage, shapes } = ctx;
    el.innerHTML = `
      <style>${CSS}</style>
      <div class="pin-tl label">Omfang</div>
      <h2 class="tip fs-tip">Definer hele scopet<br><em>før</em> du starter.</h2>
      <div class="revs fs-revs"></div>`;
    const svg = D.stage(el);
    const revs = ctx.$('.fs-revs');
    const tip = ctx.$('.fs-tip');
    let parts = {};
    let wobble = null;
    let spinning = false;

    const addRev = (code, txt) => {
      const r = document.createElement('div');
      r.className = 'rev';
      r.innerHTML = `<b>${code}</b><span>${txt}</span>`;
      revs.append(r);
      return r;
    };

    // ----- drawings -----
    const draw = {
      ground() {
        const grp = D.g(svg);
        D.p(grp, 'M620 760 H1540', 'thin');
        for (let x = 630; x < 1540; x += 26) D.p(grp, `M${x} 762 l-14 16`, 'thin');
        return grp;
      },
      cabin() {
        const grp = D.g(svg);
        D.p(grp, D.rect(760, 620, 240, 140));
        D.p(grp, 'M740 620 L880 520 L1020 620');
        D.p(grp, D.rect(860, 690, 40, 70), 'thin');
        D.p(grp, D.rect(790, 650, 40, 35), 'thin');
        D.p(grp, 'M810 650 V685 M790 667 H830', 'thin');
        return grp;
      },
      garage() {
        const grp = D.g(svg);
        D.p(grp, 'M1000 760 V656 L1180 672 V760');
        D.p(grp, D.rect(1030, 698, 120, 62), 'thin');
        D.p(grp, 'M1030 714 H1150 M1030 730 H1150 M1030 746 H1150', 'thin');
        D.p(grp, D.rect(994, 664, 18, 90), 'acc');
        [682, 708, 734].forEach((y) => D.el('circle', { cx: 1003, cy: y, r: 4, class: 'fill-acc' }, grp));
        return grp;
      },
      floor2() {
        const grp = D.g(svg);
        D.p(grp, 'M800 500 L760 620', 'acc');
        D.p(grp, 'M1060 500 L1112 666', 'acc');
        D.p(grp, 'M880 500 V520', 'acc');
        D.p(grp, 'M820 500 L862 532', 'acc');
        const box = D.g(grp);
        D.p(box, D.rect(800, 400, 260, 100));
        D.p(box, D.rect(830, 425, 50, 40), 'thin');
        D.p(box, D.rect(980, 425, 50, 40), 'thin');
        return { grp, box };
      },
      terrace(box) {
        const grp = D.g(box);
        let d = '';
        for (let x = 790; x <= 1070; x += 28) d += `M${x} 400 V368 `;
        D.p(grp, d + 'M790 368 H1070', 'thin');
        D.p(grp, D.rect(860, 378, 140, 22), 'water');
        D.p(grp, 'M872 390 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0', 'water');
        D.p(grp, 'M1000 378 H1046', 'ln');
        return grp;
      },
      stairs() {
        const grp = D.g(svg);
        let d = 'M1230 760';
        for (let i = 0; i < 14; i++) d += ' h18 v-22';
        D.p(grp, d);
        D.p(grp, 'M1230 722 L1482 414', 'thin');
        return grp;
      },
      note() {
        // Claude's confident reply now lives in the chat phone
        return D.g(svg);
      },
      clean() {
        const grp = D.g(svg);
        const main = D.g(grp);
        D.p(main, D.rect(700, 480, 400, 280));
        D.p(main, 'M700 620 H1100', 'thin');
        D.p(main, D.rect(1100, 620, 220, 140));
        D.p(main, D.rect(1135, 665, 150, 95), 'thin');
        D.p(main, 'M1135 685 H1285 M1135 705 H1285 M1135 725 H1285 M1135 745 H1285', 'thin');
        D.p(main, D.rect(880, 690, 50, 70), 'thin');
        [[740, 650, 70, 45], [980, 650, 70, 45], [740, 515, 70, 60], [860, 515, 70, 60], [980, 515, 70, 60]]
          .forEach(([x, y, w, h]) => D.p(main, D.rect(x, y, w, h), 'thin'));
        let d = '';
        for (let x = 700; x <= 1100; x += 25) d += `M${x} 480 V448 `;
        D.p(main, d + 'M700 448 H1100', 'thin');
        D.p(main, D.rect(800, 458, 200, 22), 'water');
        D.p(main, 'M812 470 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0', 'water');
        D.p(main, 'M960 760 L1060 620', 'dash');
        D.p(main, 'M960 620 L1060 480', 'dash');
        const dim = D.g(grp);
        D.p(dim, 'M700 410 H1320 M700 397 V423 M1320 397 V423', 'acc2');
        D.text(dim, 1010, 385, 'REV 0  ·  ÉN PROMPT', 'mono', { 'text-anchor': 'middle', fill: 'var(--accent-2)' });
        const note = D.g(grp);
        return { grp, main, dim, note };
      },
    };

    // The 3D house is three line models (left half, right half, pool) under one parent,
    // so REV 1 can crack it down the middle and drop the pool.
    let model = null;
    const dropModel = () => {
      if (!model) return;
      model.parts.forEach((m) => m.dispose());
      stage.scene.remove(model.group);
      model = null;
    };
    const CRACK_X = -1.0;
    function splitHouse(segs) {
      const left = [], right = [], pool = [];
      for (const [a, b] of segs) {
        const isPool = a[1] === 0.82 && b[1] === 0.82;
        if (isPool) { pool.push([a, b]); continue; }
        const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
        if (hi <= CRACK_X) left.push([a, b]);
        else if (lo >= CRACK_X) right.push([a, b]);
        else {
          // cut the segment at the crack
          const t = (CRACK_X - a[0]) / (b[0] - a[0]);
          const m = [CRACK_X, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
          (a[0] < CRACK_X ? left : right).push([a, m]);
          (b[0] < CRACK_X ? left : right).push([m, b]);
        }
      }
      return { left, right, pool };
    }
    const reset = () => {
      wobble?.kill(); wobble = null;
      clearTimeout(autoT);
      dropModel();
      svg.innerHTML = '';
      revs.innerHTML = '';
      gsap.set(svg, { opacity: 1 });
      parts = {};
    };

    const drawStep = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        parts.ground = draw.ground();
        tl.add(D.drawOn(parts.ground, { duration: 0.8, stagger: 0.005 }), 0.2);
        const r = addRev('REV A', 'Lag et hus.');
        tl.add(D.fadeIn(r, { y: 10 }), 0.6);
        parts.cabin = draw.cabin();
        tl.add(D.drawOn(parts.cabin, { duration: 1.2 }), 0.8);
      }
      if (i === 1) {
        const r = addRev('REV B', 'Legg til garasje.');
        tl.add(D.fadeIn(r, { y: 10 }), 0);
        parts.garage = draw.garage();
        tl.add(D.drawOn(parts.garage, { duration: 1 }), 0.2);
      }
      if (i === 2) {
        const r = addRev('REV C', 'Og en andre etasje.');
        tl.add(D.fadeIn(r, { y: 10 }), 0);
        parts.floor2 = draw.floor2();
        tl.add(D.drawOn(parts.floor2.box, { duration: 1 }), 0.2);
        tl.add(D.drawOn(parts.floor2.grp.querySelectorAll(':scope > path'), { duration: 0.5, stagger: 0.12 }), 1.0);
        gsap.set(parts.floor2.box, { rotation: -1.4, transformOrigin: '30% 100%' });
        wobble = ctx.track(gsap.to(parts.floor2.box, { rotation: 1.4, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
      }
      if (i === 3) {
        const r = addRev('REV D', 'Takterrasse med basseng.');
        tl.add(D.fadeIn(r, { y: 10 }), 0);
        parts.terrace = draw.terrace(parts.floor2.box);
        tl.add(D.drawOn(parts.terrace, { duration: 0.9, stagger: 0.05 }), 0.2);
        parts.stairs = draw.stairs();
        tl.add(D.drawOn(parts.stairs, { duration: 1.4 }), 0.8);
        parts.note = draw.note();
        tl.fromTo(parts.note, { opacity: 0, scale: 0.7, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, 2.2);
      }
      if (i === 4) {
        wobble?.kill();
        const rows = [...revs.children];
        rows.forEach((r, k) => tl.call(() => r.classList.add('struck'), null, k * 0.15));
        const falling = [parts.note, parts.stairs, parts.floor2.grp, parts.garage, parts.cabin];
        falling.forEach((f, k) => {
          tl.to(f, {
            y: 420, rotation: (k % 2 ? 1 : -1) * (8 + k * 4), opacity: 0, transformOrigin: '50% 100%',
            duration: 0.8, ease: 'power2.in',
          }, 0.7 + k * 0.1);
        });
        tl.to(rows, { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.4, stagger: 0.05 }, 1.6);
        tl.call(() => { rows.forEach((r) => r.remove()); falling.forEach((f) => f.remove()); }, null, 2.2);
        parts.r0 = addRev('REV 0', 'Hus med garasje, to etasjer og takterrasse med basseng.');
        gsap.set(parts.r0, { opacity: 0 });
        parts.clean = draw.clean();
        tl.add(D.fadeIn(parts.r0, { y: 10 }), 2.3);
        tl.add(D.drawOn(parts.clean.main, { duration: 1.6, stagger: 0.03 }), 2.4);
        tl.add(D.drawOn(parts.clean.dim, { duration: 0.6 }), 3.8);
        tl.add(D.fadeIn(parts.clean.note), 4.2);
      }
      if (i === 5) {
        // anything the room left open is filled in first: the scope was complete
        if (parts.build) fillHoles(tl, 0);
        tl.to([parts.clean?.grp, parts.ground, parts.build?.g, parts.build?.cnt].filter(Boolean), { opacity: 0, duration: 0.8 }, parts.build ? 0.9 : 0);
        // The clean house lifts into 3D as thick glowing lines, built bottom-up.
        const segs = house3d().sort((a, b) => Math.min(a[0][1], a[1][1]) - Math.min(b[0][1], b[1][1]));
        dropModel();
        const parts3 = splitHouse(segs);
        const group = new stage.THREE.Group();
        stage.scene.add(group);
        const models = ['left', 'right', 'pool'].map((k) => {
          const m = lineModel(stage, parts3[k], { color: k === 'pool' ? '#7fd0ff' : '#f3d3a0', width: 3.5 });
          stage.scene.remove(m.group);
          group.add(m.group);
          return m;
        });
        model = { group, parts: models, byName: { left: models[0], right: models[1], pool: models[2] }, state: { p: 0 } };
        group.rotation.set(0.12, -0.55, 0);
        tl.to(model.state, { p: 1, duration: 2.6, ease: 'power1.inOut', onUpdate: () => model?.parts.forEach((m) => m.draw(model.state.p)) }, 0.4);
        stage.fly({ pos: [-3.6, 1.2, 15.5], look: [-3.6, -0.6, 0], duration: 3 });
        if (!spinning) {
          spinning = true;
          let t0 = null;
          ctx.tick((t) => { t0 ??= t; if (model) model.group.rotation.y = -0.55 + Math.sin((t - t0) * 0.3) * 0.35; });
        }
      }
      if (i === 6) {
        // REV 1 from the customer: the house cracks, the pool heads for the basement
        const r1 = addRev('REV 1', 'Kan bassenget være i kjelleren?');
        tl.add(D.fadeIn(r1, { y: 10 }), 0);
        const { left, right, pool } = model.byName;
        tl.to(left.group.position, { x: -0.5, y: -0.08, duration: 0.5, ease: 'back.out(3)' }, 1.0);
        tl.to(left.group.rotation, { z: 0.07, duration: 0.5, ease: 'back.out(3)' }, 1.0);
        tl.to(right.group.position, { x: 0.35, y: -0.05, duration: 0.5, ease: 'back.out(3)' }, 1.0);
        tl.to(right.group.rotation, { z: -0.05, duration: 0.5, ease: 'back.out(3)' }, 1.0);
        tl.to(pool.group.position, { y: -3.4, duration: 1.1, ease: 'power3.in' }, 1.5);
        tl.to(pool.group.rotation, { z: 0.25, duration: 1.1, ease: 'power2.in' }, 1.5);
      }
      return tl;
    };

    // Each revision is a prompt to Claude: message, thinking, reply, and only then the drawing.
    const CHAT = {
      0: { label: 'REV A', msg: 'Lag et hus.', reply: 'Ferdig.' },
      1: { label: 'REV B', msg: 'Legg til garasje.', reply: 'Garasje lagt til.' },
      2: { label: 'REV C', msg: 'Og en andre etasje.', reply: 'Andre etasje lagt til.' },
      3: { label: 'REV D', msg: 'Takterrasse med basseng.', reply: 'Takterrasse med basseng lagt til. Alt fungerer.' },
      4: { label: 'REV 0', msg: 'Hus med garasje, to etasjer og takterrasse med basseng.', reply: 'Ferdig.', fresh: true },
      6: { label: 'REV 1', msg: 'Kunden spør: kan bassenget være i kjelleren?', reply: null },
    };
    // ----- step 5: the room builds the house -----
    let buildOn = false, autoT = null;
    const brickAt = (N, k) => {
      const [cols, rows] = GRID[N];
      const w = BW / cols, h = BH / rows, c = k % cols, r = rows - 1 - Math.floor(k / cols);
      return { x: BX + c * w, y: BY + r * h, w, h };
    };
    const placeBrick = (k, color, animate = true) => {
      const B = parts.build;
      if (!B || B.placed.has(k) || k >= B.N) return;
      B.placed.add(k);
      const { x, y, w, h } = brickAt(B.N, k);
      const b = D.el('rect', { x: x + 2, y: y + 2, width: w - 4, height: h - 4, rx: 3, ...FILL(color, 2), opacity: 0.78 }, B.bricks);
      if (animate) gsap.fromTo(b, { opacity: 0, y: -18 }, { opacity: 0.78, y: 0, duration: 0.35, ease: 'power3.out' });
      B.num.textContent = `${B.placed.size} / ${B.N}`;
    };
    const lightWindow = (name) => {
      const B = parts.build;
      if (!B) return;
      const w = B.lights[Math.floor(Math.random() * B.lights.length)];
      gsap.killTweensOf(w);
      gsap.fromTo(w, { opacity: 1 }, { opacity: 0.55, duration: 2.5, ease: 'power2.out' });
      if (name) B.last.textContent = `Lys: ${name}`;
    };
    const fillHoles = (tl, at) => {
      const B = parts.build;
      const missing = [...Array(B.N).keys()].filter((k) => !B.placed.has(k));
      missing.forEach((k, n) => tl.call(() => placeBrick(k, '#c9ad92'), null, at + n * (0.8 / Math.max(1, missing.length))));
    };
    const autoBuild = (N) => {
      // nobody on the line: the house builds itself, bottom up
      const B = parts.build;
      if (!B) return;
      B.N = N;
      for (let k = 0; k < N; k++) setTimeout(() => { if (parts.build === B) placeBrick(k, DOT[k % DOT.length]); }, 150 * k);
    };
    const offRelay = onRelay((m) => {
      const B = parts.build;
      if (!B || !buildOn) return;
      if (m.type === 'build-ready') {
        clearTimeout(autoT);
        drawHoles(m.N);
        if (!m.phones) autoBuild(m.N);
      }
      if (m.type === 'built') { placeBrick(m.k, DOT[((m.p?.n || 1) - 1) % DOT.length]); if (m.p?.name) B.last.textContent = `Sist: ${m.p.name}`; }
      if (m.type === 'build-light') lightWindow(m.p?.name);
    });
    function drawHoles(N) {
      const B = parts.build;
      B.N = N;
      B.holes.innerHTML = '';
      for (let k = 0; k < N; k++) {
        const { x, y, w, h } = brickAt(N, k);
        D.el('rect', { x: x + 2, y: y + 2, width: w - 4, height: h - 4, rx: 3, style: 'fill: none; stroke: var(--deco); stroke-dasharray: 6 6', 'stroke-width': 2 }, B.holes);
      }
      B.num.textContent = `${B.placed.size} / ${N}`;
    }
    function buildStep(instant) {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      const g = D.g(svg, { 'data-bg': '' });
      svg.insertBefore(g, parts.clean.grp);        // behind the line drawing
      const holes = D.g(g), bricks = D.g(g);
      const lights = WINDOWS.map(([x, y, w, h]) => D.el('rect', { x: x + 3, y: y + 3, width: w - 6, height: h - 6, rx: 2, style: 'fill: #ffd23f', opacity: 0 }, g));
      const cnt = D.g(svg, { 'data-unit': '' });
      D.text(cnt, 1150, 494, 'SALEN BYGGER', 'bl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      const num = D.text(cnt, 1150, 552, '0 / 12', 'bn', { style: 'font: 700 46px var(--font-mono); fill: var(--accent-2)' });
      const last = D.text(cnt, 1150, 590, '', 'bs', { style: 'font: 700 17px var(--font-display); fill: var(--fg)' });
      parts.build = { g, holes, bricks, lights, cnt, num, last, N: 12, placed: new Set() };
      tl.fromTo(cnt, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.2);
      if (live) {
        buildOn = true;
        drawHoles(12);
        tl.call(() => relaySend({ type: 'build-start' }), null, 0.3);
        // no relay, or it never answers: build it ourselves
        autoT = setTimeout(() => { if (parts.build && !parts.build.placed.size) autoBuild(parts.build.N); }, 2500);
      } else {
        // a replay: the house as built
        drawHoles(24);
        for (let k = 0; k < 24; k++) placeBrick(k, DOT[k % DOT.length], false);
      }
      ctx.focus(tl, [parts.clean.grp, g, cnt], 0.1);
      return tl;
    }
    const endBuild = () => { if (buildOn) { buildOn = false; clearTimeout(autoT); relaySend({ type: 'build-end' }); } };

    const play = (i, instant) => {
      if (i === 5) return buildStep(instant);
      if (i === 6) endBuild();
      return playOld(i > 5 ? i - 1 : i, instant);
    };
    const playOld = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        tl.add(ctx.fx.rise(tip, { stagger: 0.015 }), 0);
        parts.chat = chatPhone(svg, 80, 330, 440, 470, { app: 'Claude' });
        tl.fromTo(parts.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        parts.att = attempt(svg, 700, 150);
        parts.att.show(tl, 'FORSØK 1', 0.5);
        parts.tok = tokenMeter(svg, 1180, 150, 280, { max: 40 });
        tl.fromTo(parts.tok.grp, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
      }
      if (i === 4) { parts.att.show(tl, 'FORSØK 2 · NY SESSION', 0.1); parts.tok.reset(tl, 0.2); }
      const c = CHAT[i];
      let at = 0;
      if (c) {
        if (c.fresh) parts.chat.clear(tl, 0.3);
        const u = i === 0 ? 0.8 : c.fresh ? 0.7 : 0.1;
        parts.chat.user(tl, c.msg, u, { label: c.label });
        const t = parts.chat.think(tl, u + 0.6, c.fresh ? 1.8 : 1.2);
        if (c.reply) parts.chat.reply(tl, c.reply, t);
        at = t;
      }
      // the old house collapses while Claude thinks about REV 0; the crack lands as the thinking ends
      // tokens: each patch re-reads and rewrites what is there; one full prompt is cheap
      const TOK = { 0: 4, 1: 10, 2: 19, 3: 33, 4: 9, 6: 24 };
      if (TOK[i] !== undefined) parts.tok.set(tl, TOK[i], at || 0.4, 1.0);
      const offset = i === 4 ? 1.0 : i === 6 ? at - 0.9 : i === 5 ? 0 : at;
      tl.add(drawStep(i, instant), offset);
      // focus: the patch this revision added; the house it was bolted onto steps back
      const FOC = { 1: () => [parts.garage], 2: () => [parts.floor2.grp], 3: () => [parts.terrace, parts.stairs, parts.note] };
      if (FOC[i]) ctx.focus(tl, [...FOC[i](), parts.chat.root, parts.tok.grp], offset);
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, leave() { wobble?.kill(); }, dispose() { dropModel(); offRelay(); endBuild(); } };
  },
};
