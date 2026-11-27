// The room on the phone: joining (with a first name), the watchdog shift, the finale light-up
// and the evening's awards. Messages come through window.vedHook (chained after js/vote.js).
const $ = (s, r = document) => r.querySelector(s);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const ACC = { skog: '#a8d08d', nordisk: '#d2693a', rask: '#ffd23f', peis: '#ff7a2f' };
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const send = (m) => window.vedSend?.(m);

const css = document.createElement('style');
css.textContent = `
  .room-join, .room-alert, .room-award { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 24px;
    background: rgba(12, 7, 4, .86); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: r-in .4s var(--ease, ease) both; color: #fff3e3; text-align: center; }
  @keyframes r-in { from { opacity: 0; } }
  .room-card { width: min(380px, 100%); padding: 28px 24px; border-radius: 26px; background: #1d1510; border: 1.5px solid rgba(255,190,120,.4); box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); }
  .room-card h2 { font: 800 30px/1.05 var(--font-display); letter-spacing: -.03em; margin: 8px 0 6px; }
  .room-card p { color: #d9c6b0; font-size: 15px; }
  .room-eye { font: 700 12px var(--font-mono); letter-spacing: .2em; text-transform: uppercase; color: #ff7a2f; }
  .room-card input { width: 100%; margin: 18px 0 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(255,228,200,.2); background: rgba(0,0,0,.3);
    color: #fff3e3; font: 700 18px var(--font-display); outline: none; text-align: center; }
  .room-card input:focus { border-color: #ff7a2f; }
  .room-go { width: 100%; border: 0; border-radius: 99px; padding: 16px; font: 800 18px var(--font-display); color: #1a0d07; background: linear-gradient(180deg, #ffb25e, #ff6a24); cursor: pointer; }
  .room-skip { margin-top: 12px; background: none; border: 0; color: #9c8670; font: 600 14px var(--font-display); cursor: pointer; }
  .room-me { display: grid; place-items: center; gap: 14px; }
  .room-dot { width: 64px; height: 64px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 6px rgba(255,255,255,.06), 0 0 50px 10px var(--c); animation: r-pulse 1.8s ease-in-out infinite; }
  @keyframes r-pulse { 50% { transform: scale(1.12); } }

  .room-shift { position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 15; max-width: 440px; margin: 0 auto;
    display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 18px; background: rgba(20, 14, 10, .92); border: 1px solid rgba(143,227,162,.35);
    color: #fff3e3; font: 600 14px var(--font-display); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); animation: r-up .5s var(--ease, ease) both; }
  @keyframes r-up { from { transform: translateY(30px); opacity: 0; } }
  .room-shift i { width: 10px; height: 10px; border-radius: 50%; background: #8fe3a2; box-shadow: 0 0 12px #8fe3a2; animation: r-pulse 1.6s infinite; flex: none; }
  .room-shift b { font-weight: 800; }
  .room-alert { background: radial-gradient(circle at 50% 40%, rgba(255,60,60,.35), rgba(20,4,4,.94) 70%); animation: r-in .2s both, r-flash 1s ease-in-out infinite; }
  @keyframes r-flash { 50% { background-color: rgba(255,40,40,.12); } }
  .room-alert .room-card { border-color: #ff6f6f; }
  .room-alert h2 { color: #ffd2d2; }
  .room-alert .room-go { background: linear-gradient(180deg, #8fe3a2, #3fbf6a); margin-top: 18px; font-size: 22px; padding: 20px; }

  .room-light { position: fixed; inset: 0; z-index: 40; background: #000; opacity: 0; transition: opacity .25s; pointer-events: auto; overflow: hidden; }
  .room-light.on { opacity: 1; }
  .room-light .bg { position: absolute; inset: 0; }
  .room-light canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .room-award .room-card { border-color: #ffd23f; box-shadow: 0 0 0 2px #ffd23f, 0 0 90px -10px #ffd23f; }
  .room-medal { width: 96px; height: 96px; margin: 0 auto 6px; animation: r-pop .8s cubic-bezier(.2,1.5,.4,1) both; }
  @keyframes r-pop { from { transform: scale(.3) rotate(-20deg); opacity: 0; } }
`;
document.head.append(css);

// ---------- joining ----------
let joined = store.get('ved-joined') === '1';
let me = null;
function join(name) {
  store.set('ved-name', name || '');
  store.set('ved-joined', '1');
  joined = true;
  const tryJoin = () => { if (!send({ type: 'join', name: name || '' })) setTimeout(tryJoin, 500); };
  tryJoin();
  const f = $('#nameInput'); if (f && name && !f.value) f.value = name; // the order form gets the name too
}
function askJoin() {
  const o = document.createElement('div');
  o.className = 'room-join';
  o.innerHTML = `<div class="room-card"><p class="room-eye">Bli med</p><h2>Hva heter du?</h2><p>Fornavnet ditt vises på skjermen. Du kan også hoppe over.</p>
    <input type="text" maxlength="18" autocomplete="given-name" placeholder="Fornavn"><button class="room-go" type="button">Bli med</button><button class="room-skip" type="button">Hopp over</button></div>`;
  document.body.append(o);
  const input = $('input', o);
  const go = (name) => { join(name.trim()); o.remove(); navigator.vibrate?.(20); };
  $('.room-go', o).addEventListener('click', () => go(input.value));
  $('.room-skip', o).addEventListener('click', () => go(''));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(input.value); });
}
function welcome(m) {
  const o = document.createElement('div');
  o.className = 'room-join';
  o.innerHTML = `<div class="room-card room-me"><div class="room-dot" style="--c:${DOT[(m.n - 1) % DOT.length]}"></div><h2>Du er med${m.name ? `, ${m.name}` : ''}.</h2><p>Se opp på skjermen, og hold siden åpen.</p></div>`;
  document.body.append(o);
  setTimeout(() => { o.style.transition = 'opacity .5s'; o.style.opacity = '0'; setTimeout(() => o.remove(), 500); }, 3200);
}

// ---------- the watchdog shift ----------
let shift = null, alertEl = null;
function onShift(m) {
  shift?.remove();
  shift = document.createElement('div');
  shift.className = 'room-shift';
  shift.innerHTML = `<i></i><span>Du er vakt for <b>${m.session}</b></span>`;
  document.body.append(shift);
}
function onAlert(m) {
  alertEl?.remove();
  alertEl = document.createElement('div');
  alertEl.className = 'room-alert';
  alertEl.innerHTML = `<div class="room-card"><p class="room-eye" style="color:#ff8a8a">Vakt · ${m.session}</p><h2>${m.session} står stille!</h2><p>${m.text || 'Den venter på deg.'}</p><button class="room-go" type="button">Fortsett</button></div>`;
  document.body.append(alertEl);
  const buzz = setInterval(() => navigator.vibrate?.([200, 100, 200]), 900);
  navigator.vibrate?.([200, 100, 200]);
  $('.room-go', alertEl).addEventListener('click', () => { send({ type: 'watch-ack', k: m.k }); }, { once: true });
  alertEl._buzz = buzz;
}
function closeAlert(by) {
  if (!alertEl) return;
  clearInterval(alertEl._buzz);
  const card = $('.room-card', alertEl);
  card.innerHTML = `<p class="room-eye" style="color:#8fe3a2">Fortsetter</p><h2>${by ? `${by} tok den.` : 'Tatt.'}</h2>`;
  alertEl.style.animation = 'none';
  setTimeout(() => { alertEl?.remove(); alertEl = null; }, 1600);
}

// ---------- the finale: the room lights up ----------
// The screen pulses in the site's colours on the relay's clock (a wave in join order), and a
// mirror ball drops in on its string, turns, throws beams and spots, and glints.
let light = null;
function onLight(m) {
  stopLight(true);
  light = document.createElement('div');
  light.className = 'room-light';
  light.innerHTML = '<div class="bg"></div><canvas></canvas>';
  document.body.append(light);
  const bg = $('.bg', light), cv = $('canvas', light), cx = cv.getContext('2d');
  const off = (m.now || Date.now()) - Date.now();          // server clock offset
  const acc = ACC[m.theme] || '#ff7a2f';
  const palette = [acc, '#ffd23f', '#ff5a1f', '#fff3e3', acc];
  const wave = ((m.n - 1) / Math.max(1, m.total)) * 2400;  // the wave rolls through the room in join order
  const t0 = m.start + wave, end = m.start + m.dur;
  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  const ball = mirrorBall();
  const spots = Array.from({ length: 26 }, (_, k) => ({ a: Math.random() * 6.28, d: 0.25 + Math.random() * 0.75, r: 3 + Math.random() * 6, ph: Math.random() * 6.28 }));
  let shown = 0;
  const frame = () => {
    if (!light || light._cv !== cv) return;
    const now = Date.now() + off;
    if (now >= end) { stopLight(); return; }
    if (now >= t0) {
      if (!shown) { shown = now; light.classList.add('on'); navigator.vibrate?.([60, 40, 60]); }
      // everyone pulses in phase off the shared clock; the colour walks through the palette
      const ph = ((now - m.start) % 1200) / 1200;
      const c = palette[Math.floor((now - m.start) / 2400) % palette.length];
      bg.style.background = `radial-gradient(120% 85% at 50% 38%, ${c} 10%, color-mix(in srgb, ${c} 45%, #000) 100%)`;
      bg.style.filter = `brightness(${0.7 + 0.35 * Math.sin(ph * Math.PI * 2) ** 2}) saturate(1.15)`;
      const t = (now - shown) / 1000;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, W, H);
      const R = Math.min(W, H) * 0.24;
      // the ball drops in on its string and settles with a little swing
      const drop = Math.min(1, t / 1.1), ease = 1 - (1 - drop) ** 3;
      const swing = Math.sin(t * 1.6) * 0.035 * Math.exp(-t * 0.25);
      const ox = W / 2 + Math.sin(swing) * H * 0.38, oy = (H * 0.38) * ease - R * (1 - ease) * 2;
      // beams: white light sweeping the room, strongest near the ball
      cx.globalCompositeOperation = 'lighter';
      const L = Math.hypot(W, H);
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2 + t * 0.5, w = 0.05 + (k % 3) * 0.02;
        const g = cx.createRadialGradient(ox, oy, R * 0.6, ox, oy, L * 0.8);
        g.addColorStop(0, `rgba(255,248,232,${0.28 * ease})`); g.addColorStop(1, 'rgba(255,248,232,0)');
        cx.fillStyle = g;
        cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); cx.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); cx.fill();
      }
      // spots thrown on the walls, turning with the ball
      for (const sp of spots) {
        const a = sp.a + t * 0.5, d = sp.d * L * 0.55;
        const x = ox + Math.cos(a) * d, y = oy + Math.sin(a) * d * 0.9;
        cx.fillStyle = `rgba(255,248,232,${(0.35 + 0.5 * Math.max(0, Math.sin(t * 2 + sp.ph))) * ease})`;
        cx.beginPath(); cx.arc(x, y, sp.r, 0, 7); cx.fill();
      }
      cx.globalCompositeOperation = 'source-over';
      // string
      cx.strokeStyle = 'rgba(255,243,227,.7)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(W / 2, 0); cx.lineTo(ox, oy - R); cx.stroke();
      ball(cx, ox, oy, R, t, c);
    }
    requestAnimationFrame(frame);
  };
  light._cv = cv;
  requestAnimationFrame(frame);
  light.addEventListener('click', () => stopLight(), { once: true });
}
function stopLight(now) { if (!light) return; const l = light; light = null; l.classList.remove('on'); setTimeout(() => l.remove(), now ? 0 : 300); }

// A mirror ball on a 2D canvas: facets projected on a turning, slightly tilted sphere, lit from
// the top left, tinted by the room's colour, with the odd facet flashing and throwing a glint.
function mirrorBall() {
  const LAT = 12, LON = 24, TILT = 0.32, K = 0.93;
  const Lv = (() => { const v = [-0.55, 0.65, 0.55]; const l = Math.hypot(...v); return v.map((c) => c / l); })();
  const facets = [];
  for (let i = 0; i < LAT; i++) for (let j = 0; j < LON; j++) facets.push({ i, j, ph: Math.random() * 1000, sp: 0.6 + Math.random() * 1.4, jit: (Math.random() - 0.5) * 0.3, col: Math.random() < 0.12 });
  const glints = [];
  const proj = (phi, lam, rot) => {
    const x = Math.cos(phi) * Math.sin(lam + rot), y = Math.sin(phi), z = Math.cos(phi) * Math.cos(lam + rot);
    return [x, y * Math.cos(TILT) + z * Math.sin(TILT), z * Math.cos(TILT) - y * Math.sin(TILT)];
  };
  const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  return (cx, ox, oy, R, t, tint) => {
    const [tr, tg, tb] = hex(tint);
    const rot = t * 0.6;
    // glow and grout
    const glow = cx.createRadialGradient(ox, oy, R * 0.8, ox, oy, R * 2.2);
    glow.addColorStop(0, 'rgba(255,248,232,.35)'); glow.addColorStop(1, 'rgba(255,248,232,0)');
    cx.fillStyle = glow; cx.beginPath(); cx.arc(ox, oy, R * 2.2, 0, 7); cx.fill();
    cx.save();
    cx.beginPath(); cx.arc(ox, oy, R, 0, 7); cx.clip();
    cx.fillStyle = '#4a3f36'; cx.fillRect(ox - R, oy - R, R * 2, R * 2);
    for (const f of facets) {
      const p0 = -Math.PI / 2 + f.i / LAT * Math.PI, p1 = -Math.PI / 2 + (f.i + 1) / LAT * Math.PI;
      const l0 = f.j / LON * Math.PI * 2, l1 = (f.j + 1) / LON * Math.PI * 2;
      const pm = (p0 + p1) / 2, lm = (l0 + l1) / 2;
      const n = proj(pm, lm, rot);
      if (n[2] < 0.02) continue;
      const lam = Math.max(0, n[0] * Lv[0] + n[1] * Lv[1] + n[2] * Lv[2]);
      const spark = Math.max(0, Math.sin(t * f.sp + f.ph)) ** 40;
      const v = Math.max(0, Math.min(1, 0.25 + 0.6 * lam + f.jit + spark));
      // silver mirrors reflecting the room: mix toward the current colour in the mid tones; a few catch it fully
      const mix = f.col ? 0.75 : 0.35 * (1 - Math.abs(v - 0.5) * 2);
      const r = Math.round((70 + 185 * v) * (1 - mix) + tr * mix), g = Math.round((60 + 185 * v) * (1 - mix) + tg * mix), b = Math.round((52 + 170 * v) * (1 - mix) + tb * mix);
      cx.fillStyle = `rgb(${r},${g},${b})`;
      cx.beginPath();
      [[p0, l0], [p0, l1], [p1, l1], [p1, l0]].forEach(([a, c], k) => {
        const q = proj(pm + (a - pm) * K, lm + (c - lm) * K, rot);
        const x = ox + q[0] * R, y = oy - q[1] * R;
        k ? cx.lineTo(x, y) : cx.moveTo(x, y);
      });
      cx.fill();
      if (spark > 0.6 && glints.length < 3 && !glints.some((q) => t - q.t < 0.3)) glints.push({ t, x: n[0], y: n[1] });
    }
    // shading: a soft highlight top left, darkness at the rim
    const sh = cx.createRadialGradient(ox - R * 0.3, oy - R * 0.35, R * 0.1, ox, oy, R);
    sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
    cx.fillStyle = sh; cx.fillRect(ox - R, oy - R, R * 2, R * 2);
    cx.restore();
    cx.strokeStyle = '#1a120c'; cx.lineWidth = 3; cx.beginPath(); cx.arc(ox, oy, R, 0, 7); cx.stroke();
    // glints: four-point stars
    for (let k = glints.length - 1; k >= 0; k--) {
      const q = glints[k], a = (t - q.t) / 0.6;
      if (a > 1) { glints.splice(k, 1); continue; }
      const s = Math.sin(a * Math.PI) * R * 0.3, x = ox + q.x * R, y = oy - q.y * R;
      cx.save(); cx.translate(x, y); cx.rotate(a * 0.8);
      cx.fillStyle = `rgba(255,250,236,${Math.sin(a * Math.PI)})`;
      cx.beginPath(); cx.moveTo(0, -s); cx.lineTo(s * 0.18, -s * 0.18); cx.lineTo(s, 0); cx.lineTo(s * 0.18, s * 0.18); cx.lineTo(0, s); cx.lineTo(-s * 0.18, s * 0.18); cx.lineTo(-s, 0); cx.lineTo(-s * 0.18, -s * 0.18); cx.closePath(); cx.fill();
      cx.restore();
    }
  };
}

// ---------- awards ----------
function onAward(m) {
  const o = document.createElement('div');
  o.className = 'room-award';
  o.innerHTML = `<div class="room-card"><svg class="room-medal" viewBox="0 0 96 96"><path d="M34 6h28l-6 30H40z" fill="#ff5a1f"/><circle cx="48" cy="58" r="30" fill="#ffd23f" stroke="#1a120c" stroke-width="4"/><circle cx="48" cy="58" r="20" fill="none" stroke="#b8860b" stroke-width="3"/><path d="M48 44l4 9 10 1-7.5 6.5 2.5 9.5-9-5-9 5 2.5-9.5L34 54l10-1z" fill="#fff3c0"/></svg>
    <p class="room-eye" style="color:#ffd23f">Du vant</p><h2>${m.titles.join(' + ')}</h2><p>Se opp på skjermen.</p></div>`;
  document.body.append(o);
  navigator.vibrate?.([80, 60, 80, 60, 240]);
  o.addEventListener('click', () => o.remove());
  setTimeout(() => o.remove(), 9000);
}

// ---------- messages ----------
const prev = window.vedHook;
window.vedHook = (m) => {
  prev?.(m);
  if (m.type === 'state' && joined) send({ type: 'join', name: store.get('ved-name') || '' }); // every (re)connect
  // the lobby greets you itself, so the welcome card is only for phones past it
  if (m.type === 'me') { const first = !me; me = m.me; if (first && sessionStorage.getItem('ved-welcomed') !== '1' && !document.documentElement.classList.contains('lobby-on')) { sessionStorage.setItem('ved-welcomed', '1'); welcome(m.me); } }
  if (m.type === 'watch') onShift(m);
  if (m.type === 'watch-alert') onAlert(m);
  if (m.type === 'watch-done') closeAlert(m.by);
  if (m.type === 'watch-end') { shift?.remove(); shift = null; closeAlert(); }
  if (m.type === 'light') onLight(m);
  if (m.type === 'light-off') stopLight();
  if (m.type === 'award') onAward(m);
  if (m.type === 'room-reset') { // the presenter emptied the room: forget we joined, ask again
    store.set('ved-joined', ''); try { sessionStorage.removeItem('ved-welcomed'); } catch {}
    joined = false; me = null; shift?.remove(); shift = null; closeAlert(); stopLight();
    if (!document.querySelector('.room-join')) askJoin();
  }
};
if (joined) { const n = store.get('ved-name'); const tryJoin = () => { if (!send({ type: 'join', name: n || '' })) setTimeout(tryJoin, 600); }; tryJoin(); const f = $('#nameInput'); if (f && n && !f.value) f.value = n; }
else askJoin();
