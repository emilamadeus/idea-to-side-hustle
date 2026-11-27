import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { inkFor } from '../engine/draw.js';
import { onRelay, relaySend, relayState, relayControl } from '../engine/relay.js';

/*
  The arena (Bak kulissene, after the game): every phone is a controller. A joystick to move,
  a button to shoot, three lives. Last one standing wins. The TV shows the whole arena; each phone
  shows the whole arena too, with its own player ringed in white.
    0. The arena opens. Phones join as dots and can move (no shooting yet).
    1. Start: 3-2-1, then the fight. After 20 s the ring closes in; outside it you lose lives.
       The last one left is named on the left. The presenter can click on at any moment.

  Who decides what:
    phones   their own position and facing (so steering is instant on the phone), and when they fire
    deck     everything else: bullets, hits, lives, the ring, who is out, the winner; and bots when
             fewer than three phones play (six bots with none, so the slide always works)
    relay    passes positions in and the state (~12 a second) out. See ved/src/worker.js.

  Layout zones (svg units):
    tip      x 80–540, y 110–240
    count    x 80–540: label y 296, number y 450, sub y 524
    winner   x 80–540: label y 600, name y 670
    arena    canvas, circle centred (1060, 470), radius 370 (x 690–1430, y 100–840); countdown over it
*/

// the same numbers are in ved/public/js/arena.js (the phone)
const PR = 18, SPEED = 210, BSPD = 420, BLIFE = 1.15, BR = 6, CD = 0.45, INV = 0.7, HP = 3;
const HOLD = 20, SHRINK = 45, RING_MIN = 0.12, RING_HIT = 2.5;
const CX = 1060, CY = 470, RAD = 370;
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const colorOf = (n) => DOT[((n || 1) - 1 + DOT.length * 100) % DOT.length];
const arenaR = (n) => Math.round(Math.max(300, Math.min(720, 250 + 48 * Math.sqrt(Math.max(1, n)))));
let memo = null; // the last round's winner, for going back to this slide

export default {
  id: 'arena',
  title: 'Arenaen',
  steps: 2,
  notes: [
    'Telefonene er kontrollere nå. Styr med venstre tommel, skyt med høyre. Øv dere litt.',
    'Klikk for start. Tre liv hver. Ringen krymper etter 20 sekunder. Klikk videre når dere vil.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Spillet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Sist <em>igjen</em><br>vinner.</h2>
      <canvas data-bg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>`;
    const cv = ctx.$('canvas');
    const g2 = cv.getContext('2d');
    const svg = D.stage(el);
    const tip = ctx.$('.tip');

    let P = {};
    let G = null; // the game
    const fresh = () => ({
      R: 400, phase: 'idle', t: 0, start: 0, players: new Map(), list: [], bullets: [], fx: [], hits: [],
      sendT: 0, rosterT: 0, rosterDirty: false, idx: 0, total: 0, winner: null, ringR: 400, shown: 0,
    });

    // ---------- players ----------
    const add = (id, { name, n, bot = false, x, y } = {}) => {
      if (G.players.has(id)) return G.players.get(id);
      const k = G.idx++;
      const a = Math.random() * Math.PI * 2, d = G.R * (0.35 + Math.random() * 0.45);
      const p = {
        k, id, name: name || 'Gjest', n: n || 0, bot, color: bot ? DOT[(k + 3) % DOT.length] : colorOf(n || k + 1),
        x: x ?? Math.cos(a) * d, y: y ?? Math.sin(a) * d, a: Math.random() * 6.28, hp: HP, alive: true,
        sx: 0, sy: 0, inv: 0, cd: 0, ringT: 0, shake: 0, flash: 0, rank: 0,
        // the drawn position eases toward the reported one (phones report ~15 times a second)
        dx: 0, dy: 0, tx: 0, ty: 0, wander: 0, aim: 0,
      };
      p.dx = p.tx = p.x; p.dy = p.ty = p.y;
      G.players.set(id, p); G.list.push(p); G.rosterDirty = true;
      return p;
    };
    const personFor = (id) => (relayState.people || []).find((q) => q.id === id);
    const alive = () => G.list.filter((p) => p.alive);

    // ---------- the relay ----------
    const offRelay = onRelay((m) => {
      if (!G || G.phase === 'idle' || G.phase === 'done') return;
      if (m.type === 'apos' || m.type === 'afire') {
        let p = G.players.get(m.id);
        if (!p) {
          if (G.phase !== 'lobby') return;          // the round has started: watch this one
          const q = personFor(m.id);
          p = add(m.id, { name: q?.name, n: q?.n, x: m.x, y: m.y });
          pop(p);
        }
        if (!p.alive) return;
        p.tx = m.x; p.ty = m.y; p.a = m.a / 100;
        if (m.type === 'afire') fire(p, m.x, m.y, m.a / 100);
      }
      if (m.type === 'acheer') {
        const live = alive();
        const from = G.players.get(m.id);
        if (live.length) sparks(live[Math.floor(Math.random() * live.length)], from?.color || '#ffd23f');
      }
    });

    // ---------- the game ----------
    const fire = (p, x, y, a) => {
      if (G.phase !== 'fight' || G.t < G.start) return;
      if (p.cd > 0.05 && !p.bot) return;           // phones keep their own cooldown; this only stops floods
      p.cd = CD;
      G.bullets.push({ o: p, x: x + Math.cos(a) * (PR + 4), y: y + Math.sin(a) * (PR + 4), vx: Math.cos(a) * BSPD, vy: Math.sin(a) * BSPD, life: BLIFE, px: x, py: y });
    };
    const hurt = (p, by) => {
      if (!p.alive || p.inv > 0) return;
      p.hp -= 1; p.inv = INV; p.shake = 0.3; p.flash = 1;
      G.hits.push(p.k, by ? by.k : -1);
      burst(p, by ? by.color : '#ff5a1f');
      if (p.hp <= 0) die(p, by);
    };
    const die = (p, by) => {
      p.alive = false;
      const left = alive().length;
      p.rank = left + 1;
      shatter(p);
      if (!p.bot) relaySend({ type: 'arena-out', id: p.id, rank: p.rank, total: G.total, by: by ? by.name : 'Ringen' }, relayControl);
      if (left <= 1) finish(left === 1 ? alive()[0] : p);
    };
    const finish = (w) => {
      if (G.phase !== 'fight') return;
      G.phase = 'done';
      G.winner = w;
      w.rank = 1;
      memo = { name: w.name, color: w.color, total: G.total };
      relaySend({ type: 'arena-end', winner: w.bot ? '' : w.id, name: w.name }, relayControl);
      showWinner(w, true);
    };

    // a bot: keeps some distance from the nearest player, circles, shoots when it is roughly aimed
    const bot = (p, dt) => {
      const others = alive().filter((q) => q !== p);
      let vx = 0, vy = 0;
      const t = others.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      p.wander -= dt;
      if (p.wander <= 0) { p.wander = 1 + Math.random() * 1.5; p.aim = (Math.random() - 0.5) * 2.2; }
      if (t && G.phase === 'fight') {
        const ang = Math.atan2(t.y - p.y, t.x - p.x), d = Math.hypot(t.x - p.x, t.y - p.y);
        const side = ang + Math.PI / 2 * Math.sign(p.aim || 1);
        const toward = d > 260 ? 1 : d < 160 ? -1 : 0;
        vx = Math.cos(ang) * toward + Math.cos(side) * 0.8; vy = Math.sin(ang) * toward + Math.sin(side) * 0.8;
        p.a = ang + p.aim * 0.12;
        if (p.cd <= 0 && d < 420 && G.t > G.start && Math.random() < dt * 2.2) fire(p, p.x, p.y, p.a);
      } else {
        p.a += p.aim * dt; vx = Math.cos(p.a) * 0.5; vy = Math.sin(p.a) * 0.5;
      }
      // stay inside the ring
      const r = Math.hypot(p.x, p.y), lim = Math.min(G.R, G.ringR) - PR * 2;
      if (r > lim * 0.85) { vx -= p.x / r * 1.4; vy -= p.y / r * 1.4; }
      const m = Math.hypot(vx, vy) || 1, s = Math.min(1, m) * SPEED * 0.85;
      p.tx = p.x + (vx / m) * s * dt; p.ty = p.y + (vy / m) * s * dt;
      const rr = Math.hypot(p.tx, p.ty);
      if (rr > G.R - PR) { p.tx *= (G.R - PR) / rr; p.ty *= (G.R - PR) / rr; }
      p.x = p.tx; p.y = p.ty;
    };

    const step = (dt) => {
      G.t += dt;
      const fight = G.phase === 'fight' && G.t >= G.start;
      // the ring: still for 20 s, then it closes in over 45 s
      if (G.phase === 'fight') {
        const k = Math.max(0, Math.min(1, (G.t - G.start - HOLD) / SHRINK));
        G.ringR = G.R * (1 - (1 - RING_MIN) * (k * k * (3 - 2 * k)));
      }
      for (const p of G.list) {
        if (p.bot && p.alive) bot(p, dt);
        else if (p.alive) { p.x = p.tx; p.y = p.ty; }
        // the drawn dot eases after the reported one: smooth at 15 updates a second
        const e = 1 - Math.exp(-dt * (p.bot ? 30 : 14));
        p.dx += (p.x - p.dx) * e; p.dy += (p.y - p.dy) * e;
        p.cd = Math.max(0, p.cd - dt); p.inv = Math.max(0, p.inv - dt);
        p.shake = Math.max(0, p.shake - dt); p.flash = Math.max(0, p.flash - dt * 3);
        if (fight && p.alive) {
          if (Math.hypot(p.x, p.y) > G.ringR) {
            p.ringT += dt;
            if (p.ringT >= RING_HIT) { p.ringT = 0; p.inv = 0; hurt(p, null); }
          } else p.ringT = Math.max(0, p.ringT - dt);
        }
      }
      // bullets
      for (const b of G.bullets) {
        b.px = b.x; b.py = b.y;
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (Math.hypot(b.x, b.y) > G.R) b.life = 0;
        if (b.life <= 0 || !fight) continue;
        for (const p of G.list) {
          if (p === b.o || !p.alive) continue;
          if (Math.hypot(p.x - b.x, p.y - b.y) < PR + BR) { b.life = 0; hurt(p, b.o); break; }
        }
      }
      G.bullets = G.bullets.filter((b) => b.life > 0);
      // effects
      for (const f of G.fx) { f.t += dt; if (f.parts) f.parts.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2.2; q.vy *= 1 - dt * 2.2; q.r += q.vr * dt; }); }
      G.fx = G.fx.filter((f) => f.t < f.dur);
      // the count on the left
      const n = G.phase === 'lobby' ? G.list.length : alive().length;
      if (n !== G.shown && P.num) { G.shown = n; P.num.textContent = n; gsap.fromTo(P.num, { scale: 1.12, transformOrigin: '0% 80%' }, { scale: 1, duration: 0.3 }); }
      if (P.sub && G.phase !== 'lobby') P.sub.textContent = `av ${G.total}`;
      // out to the phones
      G.sendT -= dt; G.rosterT -= dt;
      if (G.rosterDirty || G.rosterT <= 0) {
        G.rosterDirty = false; G.rosterT = 3;
        relaySend({ type: 'arena-roster', list: G.list.map((p) => [p.k, p.id, p.name, p.color]) }, relayControl);
      }
      if (G.sendT <= 0) {
        G.sendT = 1 / 12;
        const r = (v) => Math.round(v);
        relaySend({
          type: 'arena-state', r: r(G.ringR), R: G.R,
          p: G.list.filter((p) => p.alive).flatMap((p) => [p.k, r(p.x), r(p.y), r(p.a * 100), p.hp]),
          b: G.bullets.flatMap((b) => [b.o.k, r(b.x), r(b.y), r(Math.atan2(b.vy, b.vx) * 100)]),
          h: G.hits, alive: alive().length, total: G.total || G.list.length,
        }, relayControl);
        G.hits = [];
      }
    };

    // ---------- effects ----------
    const pop = (p) => G.fx.push({ kind: 'pop', p, t: 0, dur: 0.5 });
    const burst = (p, color) => {
      const parts = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * 6.28 + Math.random() * 0.6, s = 140 + Math.random() * 120;
        return { x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10 };
      });
      G.fx.push({ kind: 'hit', p, color, parts, t: 0, dur: 0.6 });
    };
    const shatter = (p) => {
      const parts = Array.from({ length: 6 }, (_, i) => {
        const a = (i + 0.5) / 6 * 6.28, s = 70 + Math.random() * 60;
        return { x: p.dx, y: p.dy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 0, vr: (Math.random() - 0.5) * 6, a0: i / 6 * 6.28 };
      });
      G.fx.push({ kind: 'die', p, parts, t: 0, dur: 1.1 });
    };
    const sparks = (p, color) => {
      const parts = Array.from({ length: 5 }, () => {
        const a = Math.random() * 6.28, s = 40 + Math.random() * 50;
        return { x: p.dx + Math.cos(a) * (PR + 8), y: p.dy + Math.sin(a) * (PR + 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, r: 0, vr: 0 };
      });
      G.fx.push({ kind: 'spark', color, parts, t: 0, dur: 0.9 });
    };

    // ---------- drawing (canvas, in the slide's 1600×900 units) ----------
    const S = () => RAD / G.R;
    const X = (x) => CX + x * S(), Y = (y) => CY + y * S();
    const disc = (x, y, r, fill, ink, w = 2.5) => {
      g2.beginPath(); g2.arc(x, y, r, 0, 6.2832);
      g2.fillStyle = fill; g2.fill();
      if (ink) { g2.lineWidth = w; g2.strokeStyle = ink; g2.stroke(); }
    };
    const draw = (time) => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g2.setTransform(1, 0, 0, 1, 0, 0);
      g2.clearRect(0, 0, cv.width, cv.height);
      if (!G || !P.on) return;
      const k = (w * dpr) / 1600;
      g2.setTransform(k, 0, 0, k, 0, 0);
      g2.globalAlpha = P.on;
      const s = S();
      // the floor: a dark disc, a faint grid, the wall
      g2.save();
      g2.beginPath(); g2.arc(CX, CY, RAD, 0, 6.2832); g2.clip();
      g2.fillStyle = 'rgba(26,18,12,.82)'; g2.fillRect(CX - RAD, CY - RAD, RAD * 2, RAD * 2);
      g2.strokeStyle = 'rgba(255,190,120,.08)'; g2.lineWidth = 2;
      const step = 80 * s;
      for (let gx = CX - Math.floor(RAD / step) * step; gx < CX + RAD; gx += step) { g2.beginPath(); g2.moveTo(gx, CY - RAD); g2.lineTo(gx, CY + RAD); g2.stroke(); }
      for (let gy = CY - Math.floor(RAD / step) * step; gy < CY + RAD; gy += step) { g2.beginPath(); g2.moveTo(CX - RAD, gy); g2.lineTo(CX + RAD, gy); g2.stroke(); }
      // outside the ring: the danger zone
      if (G.ringR < G.R - 1) {
        g2.beginPath(); g2.arc(CX, CY, RAD, 0, 6.2832); g2.arc(CX, CY, G.ringR * s, 0, 6.2832, true);
        g2.fillStyle = `rgba(255,90,31,${0.16 + 0.05 * Math.sin(time * 4)})`; g2.fill();
      }
      g2.restore();
      g2.beginPath(); g2.arc(CX, CY, RAD, 0, 6.2832); g2.lineWidth = 3; g2.strokeStyle = 'rgba(255,190,120,.55)'; g2.stroke();
      if (G.phase === 'fight' || G.phase === 'done') {
        g2.save(); g2.setLineDash([14, 10]); g2.lineDashOffset = -time * 30;
        g2.beginPath(); g2.arc(CX, CY, Math.max(4, G.ringR * s), 0, 6.2832); g2.lineWidth = 4; g2.strokeStyle = '#ff5a1f'; g2.stroke();
        g2.restore();
      }
      // bullets: a short trail and a bright head
      for (const b of G.bullets) {
        const x = X(b.x), y = Y(b.y), tx = X(b.x - b.vx * 0.05), ty = Y(b.y - b.vy * 0.05);
        g2.lineCap = 'round'; g2.lineWidth = BR * s * 1.3; g2.strokeStyle = b.o.color + '66';
        g2.beginPath(); g2.moveTo(tx, ty); g2.lineTo(x, y); g2.stroke();
        disc(x, y, Math.max(4, BR * s), b.o.color, '#1a120c', 2);
      }
      // players
      const named = alive().length <= 24;
      for (const p of G.list) {
        if (!p.alive) continue;
        const sh = p.shake > 0 ? Math.sin(p.shake * 90) * 5 * (p.shake / 0.3) : 0;
        const x = X(p.dx) + sh, y = Y(p.dy), r = Math.max(10, PR * s);
        // facing: a small cream wedge in front
        const a = p.a;
        g2.beginPath();
        g2.moveTo(x + Math.cos(a) * (r + 11), y + Math.sin(a) * (r + 11));
        g2.lineTo(x + Math.cos(a + 0.42) * (r + 2), y + Math.sin(a + 0.42) * (r + 2));
        g2.lineTo(x + Math.cos(a - 0.42) * (r + 2), y + Math.sin(a - 0.42) * (r + 2));
        g2.closePath(); g2.fillStyle = '#fff3e3'; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = '#1a120c'; g2.stroke();
        // the body: a dark disc that fills up from the bottom, a third per life
        disc(x, y, r, '#2a1d14');
        g2.save(); g2.beginPath(); g2.arc(x, y, r, 0, 6.2832); g2.clip();
        g2.fillStyle = p.color; g2.fillRect(x - r, y + r - (2 * r * p.hp) / HP, r * 2, (2 * r * p.hp) / HP);
        if (p.flash > 0) { g2.fillStyle = `rgba(255,243,227,${p.flash})`; g2.fillRect(x - r, y - r, r * 2, r * 2); }
        g2.restore();
        g2.beginPath(); g2.arc(x, y, r, 0, 6.2832); g2.lineWidth = 3; g2.strokeStyle = inkFor(p.color); g2.stroke();
        if (p.inv > 0 && G.phase === 'fight') { g2.beginPath(); g2.arc(x, y, r + 5, 0, 6.2832); g2.lineWidth = 2; g2.strokeStyle = `rgba(255,243,227,${p.inv / INV * 0.6})`; g2.stroke(); }
        if (G.winner === p) { g2.beginPath(); g2.arc(x, y, r + 10 + Math.sin(time * 5) * 3, 0, 6.2832); g2.lineWidth = 4; g2.strokeStyle = '#ffd23f'; g2.stroke(); }
        if (named || G.winner === p) {
          g2.font = '700 15px "Space Mono", monospace'; g2.textAlign = 'center';
          g2.lineWidth = 5; g2.strokeStyle = 'rgba(22,16,11,.9)'; g2.strokeText(p.name, x, y - r - 12);
          g2.fillStyle = '#fff3e3'; g2.fillText(p.name, x, y - r - 12);
        }
      }
      // hits, deaths, cheers, arrivals
      for (const f of G.fx) {
        const q = f.t / f.dur;
        if (f.kind === 'pop') { g2.beginPath(); g2.arc(X(f.p.dx), Y(f.p.dy), PR * s + 6 + q * 30, 0, 6.2832); g2.lineWidth = 3; g2.strokeStyle = `rgba(255,210,63,${1 - q})`; g2.stroke(); }
        if (f.kind === 'hit') {
          g2.beginPath(); g2.arc(X(f.p.dx), Y(f.p.dy), PR * s + 4 + q * 46, 0, 6.2832); g2.lineWidth = 5 * (1 - q) + 2;
          g2.globalAlpha = P.on * (1 - q); g2.strokeStyle = f.color; g2.stroke();
          for (const c of f.parts) {
            g2.save(); g2.translate(X(c.x), Y(c.y)); g2.rotate(c.r);
            g2.fillStyle = f.p.color; g2.strokeStyle = '#1a120c'; g2.lineWidth = 2;
            g2.beginPath(); g2.moveTo(-5, -4); g2.lineTo(6, -2); g2.lineTo(1, 5); g2.closePath(); g2.fill(); g2.stroke();
            g2.restore();
          }
          g2.globalAlpha = P.on;
        }
        if (f.kind === 'die') {
          // the dot breaks in six pieces that drift apart and fade
          g2.globalAlpha = P.on * Math.max(0, 1 - q * 1.1);
          const r = Math.max(10, PR * s);
          for (const c of f.parts) {
            g2.save(); g2.translate(X(c.x), Y(c.y)); g2.rotate(c.r);
            g2.beginPath(); g2.moveTo(0, 0); g2.arc(0, 0, r * (1 - q * 0.3), c.a0, c.a0 + 1.047); g2.closePath();
            g2.fillStyle = f.p.color; g2.fill(); g2.lineWidth = 2.5; g2.strokeStyle = '#1a120c'; g2.stroke();
            g2.restore();
          }
          g2.beginPath(); g2.arc(X(f.parts[0].x - f.parts[0].vx * f.t * 0.6), Y(f.parts[0].y), r + q * 40, 0, 6.2832);
          g2.lineWidth = 2; g2.strokeStyle = `rgba(255,243,227,${0.4 * (1 - q)})`; g2.stroke();
          g2.globalAlpha = P.on;
        }
        if (f.kind === 'spark') {
          g2.globalAlpha = P.on * (1 - q);
          for (const c of f.parts) disc(X(c.x), Y(c.y), 4, f.color, '#1a120c', 2);
          g2.globalAlpha = P.on;
        }
      }
      g2.globalAlpha = 1;
    };

    ctx.tick((t, dt) => { if (G && G.phase !== 'idle') step(dt); draw(t); });

    // ---------- the left column ----------
    const count = (label, sub) => {
      const g = D.g(svg, { 'data-unit': '' });
      P.label = D.text(g, 80, 296, label, 'al', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      P.num = D.text(g, 80, 450, '0', 'an', { style: 'font: 700 120px var(--font-mono); letter-spacing: -.05em; fill: var(--accent-2)' });
      P.sub = D.text(g, 80, 524, sub, 'as', { style: 'font: 700 17px var(--font-mono); fill: var(--muted)' });
      return g;
    };
    const showWinner = (w, animate) => {
      P.win?.remove();
      const g = D.g(svg, { 'data-unit': '' });
      D.text(g, 80, 600, 'SIST IGJEN', 'wl', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
      D.text(g, 80, 670, w.name, 'wn', { style: `font: 800 60px var(--font-display); letter-spacing: -.03em; fill: ${w.color}` });
      P.win = g;
      if (animate) gsap.fromTo(g, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    };
    const countdown = (at) => {
      const g = D.g(svg, { 'data-unit': '' });
      const t = D.text(g, CX, CY + 50, '3', 'cd', { 'text-anchor': 'middle', style: 'font: 800 160px var(--font-display); fill: var(--fg); paint-order: stroke; stroke: #16100b; stroke-width: 10px' });
      const tl = gsap.timeline({ delay: at });
      ['3', '2', '1', 'Kjør!'].forEach((s, i) => {
        tl.call(() => { t.textContent = s; t.style.fill = i === 3 ? 'var(--accent)' : 'var(--fg)'; }, null, i);
        tl.fromTo(t, { opacity: 0, scale: 1.4, svgOrigin: `${CX} ${CY}` }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, i);
        tl.to(t, { opacity: 0, duration: 0.3 }, i + 0.65);
      });
      tl.call(() => g.remove());
      ctx.track(tl);
      gsap.set(t, { opacity: 0 });
    };

    const stop = () => {
      if (G && relayControl && (G.phase === 'lobby' || G.phase === 'fight') && G.live) relaySend({ type: 'arena-end', winner: '', name: '' });
    };
    const reset = () => { stop(); svg.innerHTML = ''; P = {}; G = null; };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        G = fresh();
        G.R = arenaR((relayState.people || []).length);
        G.ringR = G.R;
        G.phase = live ? 'lobby' : 'idle';
        G.live = live;
        P.count = count('PÅ BANEN', 'ved.atladeus.com');
        tl.fromTo(P.count, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
        P.on = 0;
        tl.to(P, { on: 1, duration: 0.8 }, 0.5);
        if (live) tl.call(() => relaySend({ type: 'arena-open', R: G.R }), null, 0.6);
      }
      if (i === 1) {
        P.label.textContent = 'IGJEN';
        if (!live) {
          // going back: the last round's result, the arena empty
          if (G) G.phase = 'idle';
          if (memo) { P.num.textContent = '1'; P.sub.textContent = `av ${memo.total}`; showWinner(memo, false); }
          return tl;
        }
        // fewer than three phones: bots make up the field (six with no phones at all)
        const phones = G.list.length;
        const bots = phones === 0 ? 6 : Math.max(0, 3 - phones);
        for (let b = 0; b < bots; b++) add(`bot${b}`, { name: ['Robo', 'Bit', 'Pixel', 'Chip', 'Byte', 'Kode'][b], bot: true });
        G.total = G.list.length;
        G.start = G.t + 3;
        G.phase = 'fight';
        G.shown = -1;
        P.sub.textContent = `av ${G.total}`;
        relaySend({ type: 'arena-go', delay: 3000 });
        countdown(0);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { offRelay(); stop(); G = null; } };
  },
};
