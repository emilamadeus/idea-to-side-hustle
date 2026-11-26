import * as THREE from 'three';
import gsap from 'gsap';

/*
  Zoom-out: the slides as panels floating in the particle space, joined as a linked list.
    level 1  the current section (e.g. Plan) in a gently curved row
    level 2  the whole talk: one column per section, in talk order, joined into one chain
  The current slide starts as a full-size panel exactly over the 16:9 frame, so the slide
  seems to shrink into its place. Hover lifts a panel and shows its title; click flies into it
  and opens it. Pictures come from public/thumbs/<id>.jpg (npm run thumbs); a missing picture
  falls back to a card with the title.

    const z = createZoom(deck, stage);
    z.out() / z.in() / z.close() / z.toggle(2) / z.key(e) → handled?
*/

const ACCENT = new THREE.Color('#ff5a1f');
const EDGE = new THREE.Color('#5a4636');
const LINK = '#8a6a4a';
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

  const panels = defs.map((d, i) => {
    const holder = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xe6e6e6, transparent: true, opacity: 0, toneMapped: false });
    loader.load(`/thumbs/${d.id}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.needsUpdate = true; },
      undefined, () => { mat.map = fallback(d, i); mat.needsUpdate = true; });
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

  // the chain between consecutive panels: thick enough for AirPlay (no 1px lines)
  let links = [];
  const linkMat = new THREE.MeshBasicMaterial({ color: LINK, transparent: true, opacity: 0, toneMapped: false });
  const nodeGeo = new THREE.SphereGeometry(1, 12, 8);
  function rebuildLinks(layout, r) {
    links.forEach((m) => { world.remove(m); m.geometry.dispose?.(); });
    links = [];
    const order = layout.order;
    for (let k = 0; k < order.length - 1; k++) {
      const a = layout.pos[order[k]], b = layout.pos[order[k + 1]];
      const A = new THREE.Vector3(a.x, a.y, a.z - 0.05), B = new THREE.Vector3(b.x, b.y, b.z - 0.05);
      const len = A.distanceTo(B);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), linkMat);
      tube.position.copy(A).add(B).multiplyScalar(0.5);
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      world.add(tube);
      links.push(tube);
      // a node where the chain leaves each panel
      const dir = B.clone().sub(A).normalize();
      const out = A.clone().add(dir.multiplyScalar(Math.min(len * 0.5, (a.s * W0) * 0.5 * Math.abs(dir.x) + (a.s * H0) * 0.5 * Math.abs(dir.y) + 0.12)));
      const node = new THREE.Mesh(nodeGeo, linkMat);
      node.scale.setScalar(r * 2.6);
      node.position.copy(out);
      world.add(node);
      links.push(node);
    }
  }

  // ── layouts ──
  const viewW = (dist) => W0 * dist / 14, viewH = (dist) => H0 * dist / 14;
  function layoutSection(gi) {
    const items = groups[gi].items, n = items.length;
    const cam = { pos: [0, 0, 16], look: [0, 0, -4] }, zP = -4, d = 16 - zP;
    const s = Math.min(0.3, (0.86 * viewW(d)) / (n * 1.22 * W0));
    const step = 1.22 * W0 * s;
    const pos = {};
    items.forEach((i, k) => {
      const x = (k - (n - 1) / 2) * step;
      pos[i] = { x, y: -0.4, z: zP - x * x * 0.012, s };
    });
    const lab = [{ gi, x: 0, y: -0.4 + (H0 * s) / 2 + 1.1, z: zP, size: 1.1 }];
    return { cam, pos, order: items, lab, r: 0.05 };
  }
  function layoutAll() {
    const C = groups.length, rows = Math.max(...groups.map((g) => g.items.length));
    const cam = { pos: [0, -0.6, 18], look: [0, -0.6, -8] }, zP = -8, d = 18 - zP;
    const s = Math.min((0.92 * viewW(d)) / (C * 1.3 * W0), (0.74 * viewH(d)) / (rows * 1.3 * H0));
    const colStep = 1.3 * W0 * s, rowStep = 1.3 * H0 * s;
    const top = ((rows - 1) / 2) * rowStep - 0.6;
    const pos = {}, order = [], lab = [];
    // a snake: down one column, up the next, so every link is short and crosses nothing
    let end = -1, down = true;
    groups.forEach((g, c) => {
      const x = (c - (C - 1) / 2) * colStep, n = g.items.length;
      let start;
      if (down) start = Math.min(Math.max(0, end), rows - n);
      else start = Math.max(Math.min(rows - 1, end), n - 1);
      g.items.forEach((i, k) => {
        const r = down ? start + k : start - k;
        pos[i] = { x, y: top - r * rowStep, z: zP + Math.sin(c * 0.9) * 0.6, s };
        order.push(i);
      });
      end = down ? start + n - 1 : start - n + 1;
      down = !down;
      lab.push({ gi: c, x, y: top + rowStep * 0.72, z: zP, size: 0.42 });
    });
    return { cam, pos, order, lab, r: 0.035 };
  }

  // ── state ──
  let level = 0, layout = null, sel = deck.index, hover = -1, busy = false;
  const tip = document.createElement('div');
  tip.className = 'zoom-tip';
  document.body.appendChild(tip);

  function apply(L, { dur = 1.4, from = null } = {}) {
    layout = L;
    rebuildLinks(L, L.r);
    gsap.fromTo(linkMat, { opacity: 0 }, { opacity: 0.9, duration: 0.5, delay: dur * 0.6 });
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
    stage.fly({ pos: L.cam.pos, look: L.cam.look, duration: dur, ease: 'power3.inOut' });
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

  function enter(n) {
    if (busy) return;
    const from = level === 0 ? { i: deck.index } : null;
    if (level === 0) {
      world.visible = true;
      document.body.classList.add('zoom-open');
      stage.setFrameMask(false);
      stage.setBloom({ strength: 0.08, duration: 0.8 });
      gsap.to(rig, { parallax: 3, duration: 1 });
      sel = deck.index;
    }
    level = n;
    apply(n === 1 ? layoutSection(groupOf(deck.index)) : layoutAll(), { from });
    deck.sync?.send({ type: 'zoom', level });
  }

  function close(open = deck.index, step = open === deck.index ? deck.step : 0) {
    if (!level || busy) return;
    busy = true;
    const p = panels[open];
    panels.forEach((q) => { if (q !== p) gsap.to([q.mat, q.edgeMat], { opacity: 0, duration: 0.4 }); });
    labels.forEach((m) => gsap.to(m.material, { opacity: 0, duration: 0.3 }));
    gsap.to(linkMat, { opacity: 0, duration: 0.3 });
    p.holder.visible = true;
    gsap.to(p.holder.position, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(p.holder.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(p.mat, { opacity: 1, duration: 0.3 });
    gsap.to(p.edgeMat, { opacity: 0, duration: 0.3 });
    stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 1.1, ease: 'power3.inOut' });
    gsap.to(rig, { parallax: 1, duration: 1.1 });
    stage.setBloom({ strength: stage.theme.bloom.strength, duration: 1.1 });
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
    if (level && !busy) {
      const h = pick();
      if (h !== hover) { hover = h; document.body.style.cursor = h >= 0 ? 'pointer' : ''; paintEdges(); }
    }
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
    out() { if (level < 2) enter(level + 1); },
    in() { if (level === 2) enter(1); else if (level === 1) close(); },
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
