import gsap from 'gsap';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/*
  A live map of Norway in the talk's colours, for the go-live slide.

    const lm = liveMap(container, { depot: [lon, lat] });
    await lm.ready
    lm.add(order, { fresh })   pin an order ({ id, lat, lon, adresse, sted, sekker })
    lm.clear()                 remove every pin and the route
    lm.frame()                 ease the camera to frame every pin (and the depot)
    lm.drive(stops, legs, { duration, onArrive(k) }) → tween
                               stops: [{ lon, lat, ids }] in driving order after the depot;
                               legs:  one [[lon, lat], …] per stop, from the previous point
    lm.destroy()

  Tiles: OpenFreeMap (OpenStreetMap data, no key). Its dark style is fetched once and
  recoloured warm; if that fails the map still draws the pins on a plain background.
*/

const C = {
  bg: '#120905', water: '#0d1f26', waterLine: '#163640', land: '#160e08', park: '#1a120a', building: '#21160e',
  road: '#3b2a1e', roadMid: '#5a3a24', roadMajor: '#8a4f28', boundary: '#5a4636', label: '#a08a74', place: '#efe2cf',
};

let stylePromise = null;
function warmStyle() {
  stylePromise ??= fetch('https://tiles.openfreemap.org/styles/dark')
    .then((r) => r.json())
    .then((s) => {
      s.layers = s.layers.filter((l) => l.type !== 'raster' && !/^poi|housenumber|aeroway|ferry/.test(l.id));
      for (const l of s.layers) {
        const id = l.id;
        l.paint ??= {};
        if (l.type === 'background') l.paint['background-color'] = C.bg;
        if (l.type === 'fill') {
          l.paint['fill-color'] = /water/.test(id) ? C.water : /building/.test(id) ? C.building : /park|wood|grass|forest|landcover|landuse/.test(id) ? C.park : C.land;
          if (/water/.test(id)) l.paint['fill-opacity'] = 1;
          delete l.paint['fill-outline-color'];
          delete l.paint['fill-pattern'];
        }
        if (l.type === 'fill-extrusion') l.paint['fill-extrusion-color'] = C.building;
        if (l.type === 'line') {
          delete l.paint['line-pattern'];
          if (/water|river|stream|canal/.test(id)) l.paint['line-color'] = C.waterLine;
          else if (/boundary|admin/.test(id)) { l.paint['line-color'] = C.boundary; }
          else if (/casing/.test(id)) l.paint['line-color'] = C.bg;
          else if (/motorway|trunk/.test(id)) l.paint['line-color'] = C.roadMajor;
          else if (/primary|secondary/.test(id)) l.paint['line-color'] = C.roadMid;
          else l.paint['line-color'] = C.road;
        }
        if (l.type === 'symbol') {
          if (l.layout?.['icon-image']) delete l.layout['icon-image'];
          l.paint['text-color'] = /place|city|town|country|state/.test(id) ? C.place : C.label;
          // Norwegian names where the tiles have them
          if (l.layout?.['text-field']) l.layout['text-field'] = ['coalesce', ['get', 'name:nb'], ['get', 'name:no'], ['get', 'name']];
          l.paint['text-halo-color'] = C.bg;
          l.paint['text-halo-width'] = 1.5;
        }
      }
      return s;
    })
    .catch(() => ({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': C.bg } }] }));
  return stylePromise;
}

let cssDone = false;
function css() {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement('style');
  s.textContent = `
    .lm { position: absolute; overflow: hidden; background: ${C.bg}; }
    .lm .maplibregl-ctrl-attrib { background: rgba(18,9,5,.7) !important; color: #8a7666; font: 600 10px/1.4 var(--font-mono, monospace); }
    .lm .maplibregl-ctrl-attrib a { color: #8a7666; }
    .lm .maplibregl-ctrl-attrib-button { filter: invert(.6) sepia(1); }
    .lm-credit { position: absolute; right: 10px; bottom: 8px; z-index: 2; font: 600 11px/1 var(--font-mono, monospace); color: #6f5e4e; pointer-events: none; }
    .lm-pin { width: 16px; height: 16px; border-radius: 50%; position: relative;
      background: radial-gradient(circle at 40% 35%, #ffe08a, #ff7a2f 60%); box-shadow: 0 0 0 3px #1a120c, 0 0 22px 7px rgba(255,122,47,.55); }
    .lm-pin.done { background: radial-gradient(circle at 40% 35%, #e6ffef, #6fd497 60%); box-shadow: 0 0 0 3px #1a120c, 0 0 20px 6px rgba(111,212,151,.5); }
    .lm-pin.fresh::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 3px solid #ffb25e; animation: lm-ring 1.4s ease-out 3; opacity: 0; }
    @keyframes lm-ring { 0% { transform: scale(.6); opacity: 1; } 100% { transform: scale(3.4); opacity: 0; } }
    .lm-tag { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); white-space: nowrap; padding: 6px 11px; border-radius: 10px;
      background: rgba(26,15,9,.92); border: 2px solid #ff7a2f; color: #fff3e3; font: 700 15px/1.15 var(--font-display, sans-serif); transition: opacity .8s; }
    .lm-tag small { display: block; font: 600 12px/1.2 var(--font-mono, monospace); color: #b8a48e; }
    .lm-depot { display: grid; justify-items: center; gap: 4px; }
    .lm-depot i { width: 22px; height: 16px; border-radius: 3px; background: #4a3020; box-shadow: 0 0 0 2.5px #1a120c, 0 0 0 4px #8a7666; }
    .lm-depot b { font: 700 11px/1 var(--font-mono, monospace); letter-spacing: .14em; color: #b8a48e; }
    .lm-truck { width: 64px; height: 40px; filter: drop-shadow(0 4px 10px rgba(0,0,0,.6)); }
    .lm-truck svg { width: 100%; height: 100%; transition: transform .25s; }
    .lm-truck.west svg { transform: scaleX(-1); }
  `;
  document.head.append(s);
}

const TRUCK = `<svg viewBox="-34 -26 68 42"><rect x="-30" y="-2" width="40" height="10" rx="2" fill="#6b4a30" stroke="#1a120c" stroke-width="2.4"/>
  <g fill="#c9935a" stroke="#1a120c" stroke-width="2"><circle cx="-22" cy="-8" r="6"/><circle cx="-10" cy="-8" r="6"/><circle cx="2" cy="-8" r="6"/><circle cx="-16" cy="-17" r="6"/><circle cx="-4" cy="-17" r="6"/></g>
  <path d="M10 8V-12H22L30-2V8Z" fill="#ff5a1f" stroke="#1a120c" stroke-width="2.4"/><rect x="13" y="-9" width="8" height="6" rx="1" fill="#a9c6d6"/>
  <g fill="#2a1d14" stroke="#1a120c" stroke-width="2"><circle cx="-20" cy="10" r="6"/><circle cx="20" cy="10" r="6"/></g></svg>`;

// metres between two [lon, lat]
const hav = (a, b) => {
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export function liveMap(container, { depot }) {
  css();
  container.classList.add('lm');
  const pins = new Map();
  let map = null, truck = null, dead = false;

  const ready = warmStyle().then((style) => new Promise((res) => {
    if (dead) return;
    map = new maplibregl.Map({
      container, style, center: [12, 64], zoom: 3.4, interactive: false, fadeDuration: 0,
      attributionControl: false, pixelRatio: Math.min(2, devicePixelRatio || 1),
    });
    map.on('load', () => {
      map.addSource('route-all', { type: 'geojson', data: line([]) });
      map.addSource('route', { type: 'geojson', data: line([]) });
      map.addLayer({ id: 'route-all', type: 'line', source: 'route-all', paint: { 'line-color': '#ff7a2f', 'line-width': 2.5, 'line-opacity': 0.45, 'line-dasharray': [1, 2] }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'route-glow', type: 'line', source: 'route', paint: { 'line-color': '#ff7a2f', 'line-width': 12, 'line-blur': 8, 'line-opacity': 0.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#ffc46b', 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      const d = document.createElement('div');
      d.className = 'lm-depot';
      d.innerHTML = '<i></i><b>LAGER</b>';
      new maplibregl.Marker({ element: d, anchor: 'top', offset: [0, -8] }).setLngLat(depot).addTo(map);
      res(map);
    });
    map.on('error', () => {}); // a missing tile must not break the slide
    // the credit OpenStreetMap asks for, small and quiet
    const credit = document.createElement('div');
    credit.className = 'lm-credit';
    credit.textContent = '© OpenStreetMap · OpenFreeMap';
    container.append(credit);
  }));

  function line(coords) { return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }; }

  function add(o, { fresh = false } = {}) {
    if (!map || pins.has(o.id) || !Number.isFinite(o.lat) || !Number.isFinite(o.lon)) return;
    const el = document.createElement('div');
    el.className = `lm-pin${fresh ? ' fresh' : ''}`;
    if (fresh) {
      const tag = document.createElement('div');
      tag.className = 'lm-tag';
      tag.innerHTML = `<span></span><small></small>`;
      tag.querySelector('span').textContent = o.adresse || '';
      tag.querySelector('small').textContent = o.sted || '';
      el.append(tag);
      setTimeout(() => { tag.style.opacity = 0; setTimeout(() => tag.remove(), 900); }, 4200);
    }
    const m = new maplibregl.Marker({ element: el }).setLngLat([o.lon, o.lat]).addTo(map);
    pins.set(o.id, { m, el });
  }
  function done(ids) { ids.forEach((id) => pins.get(id)?.el.classList.add('done')); }
  function clear() {
    pins.forEach((p) => p.m.remove());
    pins.clear();
    truck?.remove(); truck = null;
    if (map?.getSource('route')) { map.getSource('route').setData(line([])); map.getSource('route-all').setData(line([])); }
  }
  function bounds(points) {
    const b = new maplibregl.LngLatBounds(depot, depot);
    points.forEach((p) => b.extend(p));
    return b;
  }
  function frame({ duration = 1600 } = {}) {
    if (!map) return;
    const pts = [...pins.values()].map((p) => p.m.getLngLat().toArray());
    if (!pts.length) { map.easeTo({ center: [12, 64], zoom: 3.4, duration }); return; }
    map.fitBounds(bounds(pts), { padding: 90, maxZoom: 13, duration, essential: true });
  }

  // drive the route: draw it as the truck goes, call onArrive(k) at each stop
  function drive(stops, legs, { duration = 14, onArrive = () => {} } = {}) {
    if (!map || !legs.length) return null;
    const coords = [];
    const ends = [];
    legs.forEach((leg, k) => { leg.forEach((c, i) => { if (k && !i) return; coords.push(c); }); ends.push(coords.length - 1); });
    const dist = [0];
    for (let i = 1; i < coords.length; i++) dist.push(dist[i - 1] + hav(coords[i - 1], coords[i]));
    const total = dist[dist.length - 1] || 1;
    map.getSource('route-all').setData(line(coords));
    map.fitBounds(bounds(coords), { padding: 90, maxZoom: 13, duration: 1400, essential: true });
    const el = document.createElement('div');
    el.className = 'lm-truck';
    el.innerHTML = TRUCK;
    truck = new maplibregl.Marker({ element: el }).setLngLat(coords[0]).addTo(map);
    let i = 0, next = 0, lastLon = coords[0][0];
    const s = { p: 0 };
    return gsap.to(s, {
      p: 1, duration, delay: 1.6, ease: 'none',
      onUpdate() {
        const d = s.p * total;
        while (i < coords.length - 2 && dist[i + 1] < d) i++;
        const seg = dist[i + 1] - dist[i] || 1, f = Math.min(1, Math.max(0, (d - dist[i]) / seg));
        const pt = [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f];
        truck.setLngLat(pt);
        if (Math.abs(pt[0] - lastLon) > 1e-5) { el.classList.toggle('west', pt[0] < lastLon); lastLon = pt[0]; }
        map.getSource('route').setData(line([...coords.slice(0, i + 1), pt]));
        while (next < ends.length && dist[ends[next]] <= d + 1) { onArrive(next); next++; }
      },
      onComplete() { while (next < ends.length) { onArrive(next); next++; } },
    });
  }

  function destroy() { dead = true; try { map?.remove(); } catch {} }
  return { ready, add, done, clear, frame, drive, destroy, get map() { return map; } };
}
