import * as THREE from 'three';
import gsap from 'gsap';
import * as shapes from './shapes.js';
import { relayState, onRelay } from './relay.js';

/*
  Zoom-out: the slides as panels floating in the particle space, joined as a linked list by
  streams of light particles that run from edge to edge through the gaps, never across a panel.
    level 1  the current section (e.g. Plan) in a gently curved row
    level 2  the whole talk: one column per section, in talk order, joined into one chain
  The wheel zooms smoothly toward the pointer; scrolling on past the closest zoom opens the slide
  under the pointer, and scrolling out on a slide lifts you into the view.
  The current slide starts as a full-size panel exactly over the 16:9 frame, so the slide
  seems to shrink into its place. Hover lifts a panel and shows its title; click flies into it
  and opens it. Pictures come from public/thumbs/<id>.jpg (npm run thumbs); a missing picture
  falls back to a card with the title.

    const z = createZoom(deck, stage);
    z.out() / z.in() / z.close() / z.toggle(2) / z.key(e) → handled?
*/

const ACCENT = new THREE.Color('#ff5a1f');
const EDGE = new THREE.Color('#5a4636');
const STAGES = ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering'];

export function createZoom(deck, stage) {
  const { scene, camera, rig, particles, pointer } = stage;
  const defs = deck.defs;
  const { w: W0, h: H0 } = stage.viewSize(14); // a panel at scale 1, z 0 covers the slide frame exactly

  // ── sections, in talk order ──
  const sectionOf = (i) => {
    const d = defs[i];
    if (d.stage !== undefined) return STAGES[d.stage];
    if (d.part) return d.part;
    if (d.id.startsWith('del-')) return defs[i + 1]?.part ?? 'Del';
    const firstStaged = defs.findIndex((x) => x.stage !== undefined);
    return i < firstStaged ? 'Start' : 'Slutt';
  };
  const groups = [];
  defs.forEach((d, i) => {
    const name = sectionOf(i);
    if (!groups.length || groups[groups.length - 1].name !== name) groups.push({ name, items: [] });
    groups[groups.length - 1].items.push(i);
  });
  const groupOf = (i) => groups.findIndex((g) => g.items.includes(i));

  // ── the world ──
  const world = new THREE.Group();
  world.visible = false;
  scene.add(world);
  const loader = new THREE.TextureLoader();
  const geo = new THREE.PlaneGeometry(W0, H0);

  function fallback(d, i) {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 270;
    const x = c.getContext('2d');
    x.fillStyle = '#1b1511'; x.fillRect(0, 0, 480, 270);
    x.fillStyle = '#9a8a78'; x.font = '700 18px "Space Mono", monospace';
    x.fillText(String(i + 1).padStart(2, '0'), 28, 48);
    x.fillStyle = '#f3e9da'; x.font = '800 40px "Bricolage Grotesque", sans-serif';
    x.fillText(d.title ?? d.id, 28, 150, 424);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // a slide's picture; slides that show the room's design choice (def.themed) have one per design
  const setMap = (mat, t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = stage.renderer.capabilities.getMaxAnisotropy(); mat.map = t; mat.needsUpdate = true; };
  function loadPicture(d, i, mat) {
    const plain = () => loader.load(`/thumbs/${d.id}.jpg`, (t) => setMap(mat, t), undefined, () => { mat.map = fallback(d, i); mat.needsUpdate = true; });
    if (!d.themed) return plain();
    loader.load(`/thumbs/${d.id}-${relayState.theme}.jpg`, (t) => setMap(mat, t), undefined, plain);
  }
  const panels = defs.map((d, i) => {
    const holder = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xe6e6e6, transparent: true, opacity: 0, toneMapped: false });
    loadPicture(d, i, mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.index = i;
    const edgeMat = new THREE.MeshBasicMaterial({ color: EDGE.clone(), transparent: true, opacity: 0, toneMapped: false });
    const edge = new THREE.Mesh(geo, edgeMat);
    edge.scale.set(1.035, 1.06, 1);
    edge.position.z = -0.02;
    holder.add(edge, mesh);
    world.add(holder);
    return { i, holder, mesh, mat, edge, edgeMat, phase: Math.random() * Math.PI * 2, lift: { v: 0 } };
  });

  // section names, as flat text in the world
  function label(text, size = 1) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 160;
    const x = c.getContext('2d');
    x.fillStyle = '#f3e9da';
    x.font = '800 104px "Bricolage Grotesque", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 512, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4 * size, 1 * size), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    world.add(m);
    return m;
  }
  const labels = groups.map((g) => label(g.name));

  // the chain between consecutive panels: streams of light particles. Each stream runs from
  // the edge of one panel to the edge of the next, recomputed every frame (the panels float),
  // and goes round through the gaps (never across a panel): straight down a column, straight
  // along a row, or an elbow through the gap between two columns.
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,220,180,.55)'); g.addColorStop(1, 'rgba(255,160,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const streamMat = new THREE.PointsMaterial({ size: 0.12, map: dot, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true, toneMapped: false });
  const K = 46; // particles per stream
  let streams = [];
  function rebuildStreams(L) {
    streams.forEach((st) => { world.remove(st.points); st.points.geometry.dispose(); });
    streams = [];
    const warm = new THREE.Color('#ff7a2f'), cream = new THREE.Color('#ffe2b8');
    for (let k = 0; k < L.order.length - 1; k++) {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(K * 3), col = new Float32Array(K * 3);
      const phase = new Float32Array(K), wob = new Float32Array(K);
      for (let j = 0; j < K; j++) {
        phase[j] = Math.random(); wob[j] = Math.random() * Math.PI * 2;
        const c = warm.clone().lerp(cream, Math.random()).multiplyScalar(0.8 + Math.random() * 0.7);
        col.set([c.r, c.g, c.b], j * 3);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const points = new THREE.Points(geom, streamMat);
      points.frustumCulled = false;
      world.add(points);
      streams.push({ a: L.order[k], b: L.order[k + 1], points, phase, wob });
    }
    streamMat.size = L.r * 4.4;
  }
  // where a panel is right now (it floats and lifts), and its half size including the edge
  const box = (p) => {
    const s = p.holder.scale.x, k = p.mesh.scale.x;
    return {
      x: p.holder.position.x, y: p.holder.position.y + p.mesh.position.y * s, z: p.holder.position.z + p.mesh.position.z * s,
      hw: (W0 / 2) * s * k * 1.035, hh: (H0 / 2) * s * k * 1.06,
    };
  };
  function route(A, B, m) {
    const dx = B.x - A.x, dy = B.y - A.y;
    if (Math.abs(dx) < A.hw * 0.5) { // same column
      const sy = Math.sign(dy) || -1;
      return [[A.x, A.y + sy * (A.hh + m), A.z], [B.x, B.y - sy * (B.hh + m), B.z]];
    }
    const sx = Math.sign(dx);
    const ax = A.x + sx * (A.hw + m), bx = B.x - sx * (B.hw + m);
    if (Math.abs(dy) < A.hh * 0.5) return [[ax, A.y, A.z], [bx, B.y, B.z]]; // same row
    const mx = (A.x + sx * A.hw + B.x - sx * B.hw) / 2; // the middle of the gap between the columns
    const mz = (A.z + B.z) / 2;
    return [[ax, A.y, A.z], [mx, A.y, mz], [mx, B.y, mz], [bx, B.y, B.z]];
  }
  function flowStreams(t) {
    const m = layout ? layout.r * 2.2 : 0.1;
    streams.forEach((st) => {
      const pts = route(box(panels[st.a]), box(panels[st.b]), m);
      const seg = [], len = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[i + 1];
        const l = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
        seg.push([x0, y0, z0, x1, y1, z1, l]); len.push(total); total += l;
      }
      const arr = st.points.geometry.attributes.position.array;
      for (let j = 0; j < K; j++) {
        const u = ((st.phase[j] + t * 0.55 / Math.max(total, 0.3)) % 1) * total;
        let i = seg.length - 1;
        while (i > 0 && len[i] > u) i--;
        const [x0, y0, z0, x1, y1, z1, l] = seg[i];
        const f = l ? (u - len[i]) / l : 0;
        // a little sideways wobble, across the direction of travel
        const w = Math.sin(t * 2.4 + st.wob[j]) * layout.r * 1.4;
        const nx = l ? -(y1 - y0) / l : 0, ny = l ? (x1 - x0) / l : 0;
        arr[j * 3] = x0 + (x1 - x0) * f + nx * w;
        arr[j * 3 + 1] = y0 + (y1 - y0) * f + ny * w;
        arr[j * 3 + 2] = z0 + (z1 - z0) * f;
      }
      st.points.geometry.attributes.position.needsUpdate = true;
    });
  }

  // ── layouts ──
  const viewW = (dist) => W0 * dist / 14, viewH = (dist) => H0 * dist / 14;
  function layoutAll() {
    const C = groups.length, rows = Math.max(...groups.map((g) => g.items.length));
    const zP = -8, d = 18 - zP;
    const s = Math.min((0.94 * viewW(d)) / (C * 1.3 * W0), (0.86 * viewH(d)) / ((rows - 1) * 1.62 * H0 + H0 + 1.1 * 1.62 * H0));
    const colStep = 1.3 * W0 * s, rowStep = 1.62 * H0 * s; // tall gaps, so the streams down a column read
    const top = ((rows - 1) / 2) * rowStep;
    // centre the whole thing, labels included, in the view
    const cy = (top + rowStep * 0.72 + 0.25 + top - (rows - 1) * rowStep - (H0 * s) / 2) / 2;
    const cam = { pos: [0, cy, 18], look: [0, cy, zP] };
    const pos = {}, order = [], lab = [];
    // every section starts at the top of its column; the link to the next column leaves the
    // bottom slide sideways, runs up through the gap between the columns, and enters the next
    // column's first slide from the side (see route), so it never crosses a slide
    groups.forEach((g, c) => {
      const x = (c - (C - 1) / 2) * colStep;
      g.items.forEach((i, r) => {
        pos[i] = { x, y: top - r * rowStep, z: zP + Math.sin(c * 0.9) * 0.6, s };
        order.push(i);
      });
      lab.push({ gi: c, x, y: top + rowStep * 0.72, z: zP, size: 0.42 });
    });
    return { cam, pos, order, lab, r: 0.035 };
  }

  // ── state ──
  let level = 0, layout = null, sel = deck.index, hover = -1, busy = false;
  let baseSize = null; // the particles' normal size, restored on the way back to a slide
  let view = null; // wheel zoom within a level: centre, depth of the panels, base distance, factor
  const tip = document.createElement('div');
  tip.className = 'zoom-tip';
  document.body.appendChild(tip);

  function apply(L, { dur = 1.4, from = null } = {}) {
    layout = L;
    rebuildStreams(L);
    gsap.fromTo(streamMat, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: dur * 0.7 });
    panels.forEach((p) => {
      const t = L.pos[p.i];
      gsap.killTweensOf([p.holder.position, p.holder.scale, p.mat, p.edgeMat]);
      if (!t) {
        gsap.to([p.mat, p.edgeMat], { opacity: 0, duration: 0.4 });
        gsap.delayedCall(0.4, () => { if (!layout.pos[p.i]) p.holder.visible = false; });
        return;
      }
      p.holder.visible = true;
      if (from && from.i === p.i) { p.holder.position.set(0, 0, 0); p.holder.scale.setScalar(1); p.mat.opacity = 1; }
      else if (p.mat.opacity < 0.05) { p.holder.position.set(t.x * 1.6, t.y * 1.6, t.z - 10); p.holder.scale.setScalar(t.s); }
      gsap.to(p.holder.position, { x: t.x, y: t.y, z: t.z, duration: dur, ease: 'power3.inOut' });
      gsap.to(p.holder.scale, { x: t.s, y: t.s, z: t.s, duration: dur, ease: 'power3.inOut' });
      gsap.to(p.mat, { opacity: 1, duration: 0.6, delay: from && from.i === p.i ? 0 : 0.3 + Math.random() * 0.4 });
      gsap.to(p.edgeMat, { opacity: 1, duration: 0.6, delay: 0.4 });
    });
    labels.forEach((m, gi) => {
      const l = L.lab.find((x) => x.gi === gi);
      gsap.killTweensOf(m.material);
      if (!l) { gsap.to(m.material, { opacity: 0, duration: 0.3 }); return; }
      m.position.set(l.x, l.y, l.z);
      m.scale.setScalar(l.size);
      gsap.to(m.material, { opacity: 0.95, duration: 0.6, delay: dur * 0.5 });
    });
    view = { cx: L.cam.look[0], cy: L.cam.look[1], zP: L.cam.look[2], d: L.cam.pos[2] - L.cam.look[2], f: 1 };
    // coming out of a slide: land at the closest zoom, on that slide; scrolling out takes it from there
    if (from && L.pos[from.i]) { view.cx = L.pos[from.i].x; view.cy = L.pos[from.i].y; view.f = FMIN; }
    const cz = view.zP + view.d * view.f;
    stage.fly({ pos: [view.cx, view.cy, cz], look: [view.cx, view.cy, view.zP], duration: dur, ease: 'power3.inOut' });
    paintEdges();
  }

  function paintEdges() {
    panels.forEach((p) => {
      const on = p.i === hover || p.i === sel;
      p.edgeMat.color.copy(p.i === deck.index || on ? ACCENT : EDGE);
      gsap.to(p.lift, { v: p.i === hover ? 1 : 0, duration: 0.25 });
    });
    const h = hover >= 0 ? hover : (level ? sel : -1);
    if (h >= 0 && level) {
      tip.textContent = `${String(h + 1).padStart(2, '0')} · ${defs[h].title ?? defs[h].id}`;
      tip.classList.add('on');
    } else tip.classList.remove('on');
  }

  function enter(n, focus = null) {
    if (busy) return;
    const from = level === 0 ? { i: deck.index } : null;
    if (level === 0) {
      world.visible = true;
      document.body.classList.add('zoom-open');
      stage.setFrameMask(false);
      stage.particles.morphTo(shapes.space(stage), { duration: 1.6, turbulence: 0.2 });
      // the field sits far back, where points come out tiny: grow them while zoomed out
      if (baseSize == null) baseSize = particles.uniforms.uSize.value;
      gsap.to(particles.uniforms.uSize, { value: baseSize * 3.2, duration: 1.4 });
      stage.setBloom({ strength: 0.08, duration: 0.8 });
      gsap.to(rig, { parallax: 3, duration: 1 });
      gsap.to(roomFade, { v: 1, duration: 1.2, delay: 0.8 });
      sel = deck.index;
    }
    if (focus != null) sel = focus;
    level = n;
    apply(layoutAll(), { from });
    deck.sync?.send({ type: 'zoom', level });
  }

  function close(open = deck.index, step = open === deck.index ? deck.step : 0) {
    if (!level || busy) return;
    busy = true;
    hover = -1; document.body.style.cursor = ''; // the panel pointer must not outlive the view
    const p = panels[open];
    panels.forEach((q) => { if (q !== p) gsap.to([q.mat, q.edgeMat], { opacity: 0, duration: 0.4 }); });
    labels.forEach((m) => gsap.to(m.material, { opacity: 0, duration: 0.3 }));
    gsap.to(streamMat, { opacity: 0, duration: 0.3 });
    gsap.to(roomFade, { v: 0, duration: 0.4 });
    p.holder.visible = true;
    gsap.to(p.holder.position, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(p.holder.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(p.mat, { opacity: 1, duration: 0.3 });
    gsap.to(p.edgeMat, { opacity: 0, duration: 0.3 });
    stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 1.1, ease: 'power3.inOut' });
    gsap.to(rig, { parallax: 1, duration: 1.1 });
    stage.setBloom({ strength: stage.theme.bloom.strength, duration: 1.1 });
    if (baseSize != null) gsap.to(particles.uniforms.uSize, { value: baseSize, duration: 1.1 });
    level = 0; hover = -1; tip.classList.remove('on');
    deck.sync?.send({ type: 'zoom', level });
    gsap.delayedCall(1.1, () => {
      stage.setFrameMask(true);
      document.body.classList.remove('zoom-open');
      deck.go(open, step, { dir: 1 });
      gsap.to(p.mat, { opacity: 0, duration: 0.5, delay: 0.3, onComplete: () => { world.visible = false; busy = false; } });
    });
  }

  // ── pointer: hover and click ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let px = 0, py = 0;
  function pick() {
    if (!level || !layout) return -1;
    ndc.set(pointer.x, -pointer.y);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(panels.filter((p) => layout.pos[p.i]).map((p) => p.mesh), false);
    return hits.length ? hits[0].object.userData.index : -1;
  }
  window.addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    tip.style.left = `${px}px`; tip.style.top = `${py}px`;
  });
  window.addEventListener('click', (e) => {
    if (!level || busy || e.target.closest?.('.zoom-ui')) return;
    const i = pick();
    if (i >= 0) close(i, 0);
  });

  // ── wheel: smooth zoom toward the pointer; past the limits, the next level ──
  const FMIN = 0.18, FMAX = 1.12, PUSH = 520; // range inside a level, and how hard you push past it to change level
  let acc = 0, lock = 0;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  function underPointer() {
    plane.constant = -view.zP;
    ndc.set(pointer.x, -pointer.y);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.y } : { x: view.cx, y: view.cy };
  }
  function bounds() {
    const ps = Object.values(layout.pos);
    const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }
  function setView(dur = 0.5) {
    const b = bounds();
    view.cx = Math.max(b.x0, Math.min(b.x1, view.cx));
    view.cy = Math.max(b.y0, Math.min(b.y1, view.cy));
    const z = view.zP + view.d * view.f;
    gsap.to(rig.pos, { x: view.cx, y: view.cy, z, duration: dur, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(rig.look, { x: view.cx, y: view.cy, z: view.zP, duration: dur, ease: 'power2.out', overwrite: 'auto' });
  }
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!level) {
      // on a slide: scrolling out lifts you into the section
      if (busy || now < lock || dy <= 0) { acc = 0; return; }
      acc += dy;
      if (acc > 140) { acc = 0; lock = now + 1100; enter(2); }
      return;
    }
    e.preventDefault();
    if (busy || now < lock || !view) return;
    const nf = view.f * Math.exp(dy * 0.0008); // about 8 % per wheel notch
    if (nf < FMIN) {
      view.f = FMIN; acc += -dy;
      if (acc > PUSH) {
        acc = 0; lock = now + 1200;
        const i = pick();
        close(i >= 0 ? i : sel);
        return;
      }
    } else if (nf > FMAX) {
      view.f = FMAX; acc += dy;
      acc = 0;
    } else {
      acc = 0;
      const r = nf / view.f;
      if (dy < 0) {
        // in: toward whatever is under the pointer
        const p = underPointer();
        view.cx = p.x + (view.cx - p.x) * r;
        view.cy = p.y + (view.cy - p.y) * r;
      } else {
        // out: drift back toward the middle of the whole talk, so the full view ends centred
        const c = layout.cam.look, k = 1 - 1 / r;
        const pull = Math.min(1, k * 2.2 + (nf > 0.9 ? 0.3 : 0));
        view.cx += (c[0] - view.cx) * pull;
        view.cy += (c[1] - view.cy) * pull;
      }
      view.f = nf;
    }
    setView();
  }, { passive: false });

  // ── per frame: float, lift, hover ──
  stage.tick((t) => {
    if (!world.visible) return;
    panels.forEach((p) => {
      if (!p.holder.visible) return;
      const m = p.mesh;
      const bob = level ? 1 : 0;
      m.position.y = Math.sin(t * 0.6 + p.phase) * 0.18 * bob;
      m.rotation.z = Math.sin(t * 0.4 + p.phase) * 0.012 * bob;
      p.edge.position.y = m.position.y; p.edge.rotation.z = m.rotation.z;
      const k = 1 + p.lift.v * 0.12;
      m.scale.set(k, k, 1); p.edge.scale.set(1.035 * k, 1.06 * k, 1);
      m.position.z = p.lift.v * 0.6; p.edge.position.z = m.position.z - 0.02;
    });
    if (streams.length) flowStreams(t);
    if (level && !busy) {
      const h = pick();
      if (h !== hover) { hover = h; document.body.style.cursor = h >= 0 ? 'pointer' : ''; paintEdges(); }
    }
  });

  // the room picked another design: themed panels swap their pictures
  onRelay((m) => { if (m.theme) panels.forEach((p, i) => { if (defs[i].themed) loadPicture(defs[i], i, p.mesh.material); }); });

  // ── the room: everyone who joined from a phone drifts in the space behind the panels, by
  // name. They sit at different depths, so the view's pointer parallax moves them like the rest
  // of the space; spread over the whole view in join order (a Halton sequence, so they never bunch).
  const ROOM_C = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
  const roomGroup = new THREE.Group();
  world.add(roomGroup);
  const room = new Map(); // id → { g, glow, tag, home, ph, pop }
  const roomFade = { v: 0 };
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const CAMZ = 18, ZP = -8;
  function nameSprite(name, color) {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    const font = '800 88px "Bricolage Grotesque", sans-serif';
    x.font = font;
    c.width = Math.ceil(x.measureText(name).width + 60); c.height = 128;
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 18;
    x.fillStyle = color; x.fillText(name, c.width / 2, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    sp.userData.aspect = c.width / c.height;
    return sp;
  }
  function addPerson(p, burst = false) {
    const known = room.get(p.id);
    if (known) {
      if (p.name && known.name !== p.name) { known.tag?.removeFromParent(); known.tag = nameSprite(p.name, known.color); known.name = p.name; known.g.add(known.tag); sizeTag(known); }
      return;
    }
    const color = ROOM_C[(p.n - 1) % ROOM_C.length];
    const z = ZP - 2 - halton(p.n, 5) * 8;              // behind the panels, at different depths
    const dist = CAMZ - z;
    const L = layoutAll();
    // a spot in a gap: seen from the camera, the name must not land behind a panel
    const k = (CAMZ - ZP) / dist, u = viewH(dist) * 0.038;
    // (and not on a section name, or on another name: every name keeps its own patch of sky)
    const U = u * k; // a name's height, on the panel plane
    const boxes = [
      ...Object.values(L.pos).map((q) => ({ x: q.x, y: q.y, hw: (W0 * q.s) / 2, hh: (H0 * q.s) / 2 })),
      ...L.lab.map((l) => ({ x: l.x, y: l.y, hw: 3.2 * l.size, hh: 0.5 * l.size })),
      ...[...room.values()].map((o) => ({ x: o.seen.x, y: o.seen.y, hw: U * 2.6, hh: U * 1.4 })),
    ];
    const seenAt = (x, y) => ({ x: x * k, y: L.cam.look[1] + (y - L.cam.look[1]) * k - U * 0.5 });
    const clear = (x, y) => { const c = seenAt(x, y); return boxes.every((b) => Math.abs(c.x - b.x) > b.hw + U * 2.8 || Math.abs(c.y - b.y) > b.hh + U * 1.5); };
    let hx = 0, hy = 0;
    for (let j = 0; j < 80; j++) {
      const i = p.n + j * 97;
      hx = (halton(i, 2) - 0.5) * viewW(dist) * 0.92; hy = (halton(i, 3) - 0.5) * viewH(dist) * 0.84 + L.cam.look[1];
      if (clear(hx, hy)) break;
    }
    const g = new THREE.Group();
    g.position.set(hx, hy, z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(glow);
    const m = { g, glow, tag: null, name: p.name, color, dist, seen: seenAt(hx, hy), home: new THREE.Vector3(hx, hy, z), ph: Math.random() * Math.PI * 2, pop: { v: burst ? 0 : 1 } };
    if (p.name) { m.tag = nameSprite(p.name, color); g.add(m.tag); }
    sizeTag(m);
    roomGroup.add(g);
    room.set(p.id, m);
    if (burst) gsap.to(m.pop, { v: 1, duration: 1.2, ease: 'power2.out' });
  }
  function sizeTag(m) {
    const u = viewH(m.dist) * 0.038;                      // about the same size on screen at any depth
    m.unit = u;
    if (m.tag) { m.tag.scale.set(u * m.tag.userData.aspect, u, 1); m.tag.position.set(0, -u * 0.95, 0); }
  }
  function syncRoom(list) {
    const ids = new Set(list.map((p) => p.id));
    room.forEach((m, id) => { if (!ids.has(id)) { m.g.removeFromParent(); room.delete(id); } });
    list.forEach((p) => addPerson(p));
  }
  syncRoom(relayState.people || []);
  onRelay((m) => {
    if (m.type === 'joined' && m.p) addPerson(m.p, !m.again && world.visible);
    if (m.people) syncRoom(m.people);
  });
  stage.tick((t) => {
    if (!world.visible || !room.size) return;
    room.forEach((m) => {
      m.g.position.set(
        m.home.x + (Math.sin(t * 0.38 + m.ph) * 1.7 + Math.sin(t * 0.61 + m.ph * 2.1) * 0.6) * m.unit,
        m.home.y + (Math.cos(t * 0.31 + m.ph * 1.3) * 1.0 + Math.sin(t * 0.53 + m.ph * 0.7) * 0.4) * m.unit,
        m.home.z);
      const pop = m.pop.v, flash = pop < 1 ? (1 - pop) * 5 : 0;  // a newcomer flares, then settles
      const pulse = 0.85 + Math.sin(t * 1.4 + m.ph) * 0.15;
      m.glow.scale.setScalar(m.unit * (1.1 + flash) * pulse);
      m.glow.material.opacity = roomFade.v * Math.min(1, pop * 1.5) * 0.95;
      if (m.tag) m.tag.material.opacity = roomFade.v * Math.max(0, pop * 1.4 - 0.4) * 0.92;
    });
  });

  // ── keys ──
  function move(dk) {
    const order = layout.order;
    const k = Math.max(0, Math.min(order.length - 1, order.indexOf(sel) + dk));
    sel = order[k];
    paintEdges();
    tip.style.left = '50%'; tip.style.top = '88%';
  }

  return {
    get level() { return level; },
    get view() { return view && { ...view }; },
    out() { if (!level) enter(2); },
    in() { if (level) close(); },
    toggle(n = 2) { if (level === n) close(); else enter(n); },
    close: () => close(),
    /** Fly into a slide from the zoomed-out view (or just go there when not zoomed). */
    open(i, step = 0) { if (level) close(i, step); else deck.go(i, step); },
    /** Handle a key while zoomed out; returns true when it was used. */
    key(e) {
      if (!level) return false;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': move(1); return true;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': move(-1); return true;
        case 'Enter': close(sel, sel === deck.index ? deck.step : 0); return true;
        case 'Escape': close(); return true;
        default: return false;
      }
    },
  };
}
