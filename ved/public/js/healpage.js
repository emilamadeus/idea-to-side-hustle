// "Ring rundt feilen": the firewood order page with five planted bugs, shared by the phone
// (js/play.js), the relay (src/worker.js, which judges every circle) and the TV (src/slides/heal.js).
// Everything is in page units: a 360 × 780 phone page, busy on purpose so the bugs hide in it.
//   pageSVG(uid)          the page as SVG markup; add class "hp-fixed" to [data-bug=id] to heal a bug
//   judge(pts, fixed)     { ok, bug, reason } for one circle: a list of [x, y] points
// A circle counts only if it goes round exactly one bug, and is not much bigger than that bug:
// a ring round half the page, or round two bugs at once, is a miss.

export const W = 360, H = 780;

// box: [x, y, w, h] of what is wrong; the bug's centre must be inside the ring
export const BUGS = [
  { id: 'clip', label: 'Kuttet tittel', box: [170, 118, 190, 46] },
  { id: 'typo', label: 'Skrivefeil', box: [38, 378, 152, 20] },
  { id: 'tile', label: 'Skjev boks', box: [184, 468, 68, 70] },
  { id: 'over', label: 'Knapp over prisen', box: [200, 612, 144, 52] },
  { id: 'faint', label: 'Usynlig tekst', box: [36, 712, 288, 20] },
];

const centre = (b) => [b.box[0] + b.box[2] / 2, b.box[1] + b.box[3] / 2];
function inside([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function area(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

// reasons: line (not a ring), many (round more than one bug), big (far bigger than the bug),
// none (no bug inside), done (already fixed)
export function judge(pts, fixed = []) {
  if (!Array.isArray(pts) || pts.length < 6) return { ok: false, reason: 'line' };
  const a = area(pts);
  if (a < 240) return { ok: false, reason: 'line' };
  const hit = BUGS.filter((b) => inside(centre(b), pts));
  if (hit.length > 1) return { ok: false, reason: 'many' };
  if (!hit.length) return { ok: false, reason: 'none' };
  const b = hit[0];
  if (a > Math.max(3 * b.box[2] * b.box[3], 6000)) return { ok: false, bug: b.id, reason: 'big' };
  if (fixed.includes(b.id)) return { ok: false, bug: b.id, reason: 'done' };
  return { ok: true, bug: b.id };
}

const DISP = "'Bricolage Grotesque', system-ui, sans-serif";
const MONO = "'Space Mono', monospace";
export function pageSVG(uid = 'p') {
  const L = 32, R = 328;
  const t = (x, y, str, font, fill, extra = '') => `<text x="${x}" y="${y}" style="font: ${font}" fill="${fill}" ${extra}>${str}</text>`;
  const step = (n, y, label) => `<circle cx="${L + 8}" cy="${y - 4}" r="8" fill="#e9d6bf"/>${t(L + 8, y, n, `800 10px ${DISP}`, '#1a120c', 'text-anchor="middle"')}${label}`;
  const field = (y, icon, text) => `<rect x="${L}" y="${y}" width="${R - L}" height="34" rx="10" fill="#1a110b" stroke="#3d2d22" stroke-width="1.5"/>
    ${icon(L + 18, y + 17)}${t(L + 36, y + 22, text, `500 13px ${DISP}`, '#74604d')}`;
  const person = (x, y) => `<circle cx="${x}" cy="${y - 4}" r="4" fill="none" stroke="#ff7a2f" stroke-width="2"/><path d="M${x - 7} ${y + 7} q7 -9 14 0" fill="none" stroke="#ff7a2f" stroke-width="2"/>`;
  const pin = (x, y) => `<path d="M${x} ${y + 8} c-7 -8 -7 -10 -7 -13 a7 7 0 0 1 14 0 c0 3 0 5 -7 13z" fill="none" stroke="#ff7a2f" stroke-width="2"/><circle cx="${x}" cy="${y - 5}" r="2.4" fill="#ff7a2f"/>`;
  const tiles = [1, 2, 3, 4].map((n, k) => {
    const tw = 68, x = L + k * (tw + 8), y = 468, on = k === 0;
    const dots = Array.from({ length: n }, (_, j) => `<circle cx="${x + tw / 2 + (j - (n - 1) / 2) * 9}" cy="${y + 13}" r="3.2" fill="#b9824e"/>`).join('');
    const body = `<rect x="${x}" y="${y}" width="${tw}" height="58" rx="11" fill="#1d130d" stroke="${on ? '#ff7a2f' : '#3d2d22'}" stroke-width="${on ? 2.5 : 1.5}"/>${dots}
      ${t(x + tw / 2, y + 35, n, `800 15px ${DISP}`, '#fff3e3', 'text-anchor="middle"')}${t(x + tw / 2, y + 50, n === 1 ? 'sekk' : 'sekker', `500 9.5px ${DISP}`, '#a08a74', 'text-anchor="middle"')}`;
    return k === 2 ? `<g data-bug="tile"><g class="hp-tile">${body}</g></g>` : body;
  }).join('');
  const days = ['Man', 'Tir', 'Ons', 'Tor', 'Fre'].map((d, k) => {
    const w = 54, x = L + k * (w + 6.5), on = k === 1;
    return `<rect x="${x}" y="566" width="${w}" height="28" rx="14" fill="${on ? '#3a2210' : '#1d130d'}" stroke="${on ? '#ff7a2f' : '#3d2d22'}" stroke-width="1.5"/>${t(x + w / 2, 585, d, `700 12px ${DISP}`, on ? '#ffb25e' : '#c9ad92', 'text-anchor="middle"')}`;
  }).join('');
  return `<svg class="hp" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <defs><clipPath id="hp-cut-${uid}"><rect width="${W}" height="${H}" rx="26"/></clipPath></defs>
  <style>
    .hp text { font-kerning: normal; }
    .hp-h2 { font-size: 68px; transition: font-size .8s cubic-bezier(.2,.9,.2,1), transform .8s cubic-bezier(.2,.9,.2,1); }
    .hp-fixed .hp-h2 { font-size: 40px; transform: translateY(-12px); }
    .hp-l { opacity: 1; transition: opacity .3s; } .hp-r { opacity: 0; transition: opacity .3s .25s; }
    .hp-fixed .hp-l { opacity: 0; } .hp-fixed .hp-r { opacity: 1; }
    .hp-tile { transform: translate(0px, 7px) rotate(2.5deg); transform-box: fill-box; transform-origin: center; transition: transform .7s cubic-bezier(.2,1.4,.4,1); }
    .hp-fixed .hp-tile { transform: none; }
    .hp-bad { transition: transform .6s cubic-bezier(.6,0,.4,1), opacity .5s .1s; }
    .hp-fixed .hp-bad { transform: translate(-60px, 50px) scale(.9); opacity: 0; }
    .hp-ok { opacity: 0; transform: translateY(-8px); transition: opacity .5s .35s, transform .6s .35s cubic-bezier(.2,1.4,.4,1); }
    .hp-fixed .hp-ok { opacity: 1; transform: none; }
    .hp-faint { fill: #352820; transition: fill .8s; }
    .hp-fixed .hp-faint { fill: #a08a74; }
  </style>
  <g clip-path="url(#hp-cut-${uid})">
    <rect width="${W}" height="${H}" fill="#150d08"/>
    ${t(18, 40, 'Ved', `800 24px ${DISP}; letter-spacing: -.03em`, '#fff3e3')}<circle cx="69" cy="36" r="4" fill="#ff7a2f"/>
    <rect x="214" y="20" width="88" height="28" rx="14" fill="#1d130d" stroke="#3d2d22" stroke-width="1.5"/><circle cx="231" cy="34" r="3.6" fill="#8fe3a2"/>
    ${t(242, 39, 'Åpen nå', `600 12px ${DISP}`, '#e9d6bf')}
    <path d="M318 27 H340 M318 34 H340 M318 41 H340" stroke="#c9ad92" stroke-width="2" stroke-linecap="round"/>
    ${t(18, 78, 'VEDLEVERING · HELE NORGE', `700 9.5px ${MONO}; letter-spacing: .16em`, '#ff7a2f')}
    ${t(16, 114, 'Ved på døra,', `800 40px ${DISP}; letter-spacing: -.04em`, '#fff3e3')}
    <g data-bug="clip"><text class="hp-h2" x="16" y="164" style="font-family: ${DISP}; font-weight: 800; letter-spacing: -.04em" fill="#ffb25e">hele vinteren.</text></g>
    ${t(18, 178, 'Tørr bjørkeved, levert og stablet ved døra.', `500 12.5px ${DISP}`, '#c9ad92')}
    ${t(18, 196, 'Fra 129 kr per sekk. Pause når du vil.', `500 12.5px ${DISP}`, '#c9ad92')}
    <rect x="16" y="208" width="98" height="26" rx="13" fill="#1d130d" stroke="#3d2d22" stroke-width="1.5"/>${t(65, 225, '★ 4,8 · 312', `700 11px ${DISP}`, '#ffd23f', 'text-anchor="middle"')}
    <rect x="120" y="208" width="80" height="26" rx="13" fill="#1d130d" stroke="#3d2d22" stroke-width="1.5"/>${t(160, 225, 'Fri frakt', `700 11px ${DISP}`, '#e9d6bf', 'text-anchor="middle"')}
    <rect x="206" y="208" width="104" height="26" rx="13" fill="#1d130d" stroke="#3d2d22" stroke-width="1.5"/>${t(258, 225, 'Ingen binding', `700 11px ${DISP}`, '#e9d6bf', 'text-anchor="middle"')}
    <rect x="8" y="248" width="344" height="500" rx="22" fill="#22170f" stroke="#3d2d22" stroke-width="2"/>
    ${t(L, 280, 'Bestill ved', `800 22px ${DISP}; letter-spacing: -.02em`, '#fff3e3')}
    ${t(L, 299, 'Første levering i morgen. Deretter hver 14. dag.', `500 11.5px ${DISP}`, '#a08a74')}
    ${step(1, 328, t(L + 24, 328, 'Hvem bestiller?', `700 13px ${DISP}`, '#fff3e3'))}
    ${field(336, person, 'Fornavn')}
    <g data-bug="typo">${step(2, 394, `<text x="${L + 24}" y="394" style="font: 700 13px ${DISP}" fill="#fff3e3"><tspan>Hvor skal </tspan><tspan class="hp-l">vedne?</tspan></text><text x="${L + 24}" y="394" style="font: 700 13px ${DISP}" fill="#fff3e3"><tspan opacity="0">Hvor skal </tspan><tspan class="hp-r">veden?</tspan></text>`)}</g>
    ${field(402, pin, 'Gateadresse')}
    ${step(3, 460, t(L + 24, 460, 'Hvor mye per levering?', `700 13px ${DISP}`, '#fff3e3'))}
    ${tiles}
    ${step(4, 558, t(L + 24, 558, 'Hvilken dag passer?', `700 13px ${DISP}`, '#fff3e3'))}
    ${days}
    <path d="M${L} 606 H${R}" stroke="#3d2d22" stroke-width="1.5" stroke-dasharray="5 5" fill="none"/>
    ${t(L, 634, '1 sekk · 40 liter · fri frakt', `500 11.5px ${DISP}`, '#a08a74')}
    ${t(R, 638, '129 kr', `800 24px ${DISP}`, '#fff3e3', 'text-anchor="end"')}
    ${t(R, 655, '/ levering', `500 10px ${DISP}`, '#a08a74', 'text-anchor="end"')}
    <g data-bug="over">
      <g class="hp-ok"><rect x="${L}" y="668" width="${R - L}" height="40" rx="20" fill="#ff7a2f" stroke="#1a120c" stroke-width="2"/>
        ${t(180, 693, 'Bestill', `800 15px ${DISP}`, '#1a120c', 'text-anchor="middle"')}</g>
      <g class="hp-bad"><rect x="222" y="624" width="110" height="38" rx="19" fill="#ff7a2f" stroke="#1a120c" stroke-width="2"/>
        ${t(277, 648, 'Bestill', `800 14px ${DISP}`, '#1a120c', 'text-anchor="middle"')}</g>
    </g>
    <g data-bug="faint"><text class="hp-faint" x="180" y="727" text-anchor="middle" style="font: 500 11px ${DISP}">Ingen betaling i dag. Avbestill når du vil.</text></g>
    ${t(18, 770, 'Ved · Hele Norge', `500 11px ${DISP}`, '#6f5848')}${t(342, 770, 'Personvern · Vilkår', `500 11px ${DISP}`, '#6f5848', 'text-anchor="end"')}
  </g>
</svg>`;
}
