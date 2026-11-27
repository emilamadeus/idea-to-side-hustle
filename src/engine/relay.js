/*
  The talk's line to the audience's phones (the relay behind ved.atladeus.com).

    phones({ app, title, text }, live)   a banner (and a buzz, where the phone allows it) on every
                                         phone that has the order page open
    relaySend(msg, live)                 a command to the relay (vote-open, vote-close, …)
    onRelay(fn) → off                    every message from the relay: snapshot, vote-state, voted,
                                         chopped, theme, order …
    relayState                           the latest { theme, vote, connected, people }

  Every window listens (the presenter's previews show the votes too), but only the audience
  window sends, so a command goes out once. Slides should also skip sending on instant replays
  (going back, jumping in): pass live = false.
  URL and key come from .env.local (VITE_VED_WS, VITE_VED_KEY); without them this does nothing.
*/

const WS = import.meta.env.VITE_VED_WS || 'wss://ved.atladeus.com';
const KEY = import.meta.env.VITE_VED_KEY || '';
const control = typeof location !== 'undefined' && new URLSearchParams(location.search).get('view') !== 'preview';

let ws = null, timer = null;
let queue = [];
const subs = new Set();
// ?theme=skog forces a design (the picture script uses it to draw each version); the relay's
// theme is then ignored in this window
const forcedTheme = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('theme') : null;
export const relayState = { theme: forcedTheme || 'peis', vote: null, connected: false, people: [], awards: null, price: 129 };
if (typeof window !== 'undefined') window.relayState = relayState; // handy from the devtools console (try other themes)

function connect() {
  if (!KEY) return null;
  if (ws && ws.readyState <= 1) return ws;
  try { ws = new WebSocket(`${WS}/api/ws?role=deck&key=${encodeURIComponent(KEY)}`); } catch { return null; }
  ws.onopen = () => { relayState.connected = true; queue.forEach((m) => ws.send(m)); queue = []; };
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.theme && !forcedTheme) relayState.theme = m.theme;
    if (m.theme && forcedTheme) m = { ...m, theme: forcedTheme };
    if (m.vote) relayState.vote = m.vote;
    // the room: everyone who joined from a phone ({ id, name, n }), in join order
    if (m.people) relayState.people = m.people;
    if (m.type === 'awards') relayState.awards = m.list || [];
    if (typeof m.price === 'number' && (m.type === 'snapshot' || m.type === 'price-set')) relayState.price = m.price; // the room's price for a sack
    if (m.type === 'joined' && m.p && !relayState.people.some((p) => p.id === m.p.id)) relayState.people = [...relayState.people, m.p];
    if (m.type === 'joined' && m.p) relayState.people = relayState.people.map((p) => (p.id === m.p.id ? m.p : p));
    subs.forEach((fn) => { try { fn(m); } catch (err) { console.error(err); } });
  };
  ws.onclose = () => { relayState.connected = false; ws = null; clearTimeout(timer); timer = setTimeout(connect, 2000); };
  return ws;
}
connect();

export function relaySend(msg, live = true) {
  if (!live || !control || !KEY) return;
  const m = JSON.stringify(msg);
  const s = connect();
  if (s?.readyState === 1) s.send(m); else queue.push(m);
}
export function phones({ app = 'claude', title = 'Claude Code', text = '' }, live = true) {
  relaySend({ type: 'broadcast', app, title, text }, live);
}
export function onRelay(fn) { subs.add(fn); return () => subs.delete(fn); }

// Rehearsal keys, on every slide (audience window only), with a small confirmation on screen:
//   X  empty the shop's orders (phones go back to the shop)
//   C  close the shop (phones show "Åpner straks")
//   V  reset the vote and the site's look (back to Varm peis)
//   N  empty the room: everyone who joined is gone, and open phones ask for a name again
function toast(text) {
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:9999;padding:10px 18px;border-radius:99px;background:rgba(20,12,8,.92);border:1.5px solid rgba(255,190,120,.55);color:#fff3e3;font:700 15px var(--font-mono,monospace);letter-spacing:.06em;pointer-events:none;transition:opacity .4s';
  document.body.append(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, 1600);
}
if (control && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target?.closest?.('input, textarea, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    const msg = { x: [{ type: 'reset' }, 'Bestillingene er tømt'], c: [{ type: 'close' }, 'Butikken er stengt'], v: [{ type: 'vote-reset' }, 'Avstemningen er nullstilt'], n: [{ type: 'people-reset' }, 'Salen er tømt'] }[k];
    if (!msg) return;
    if (!KEY) { toast('Ingen kobling til ved.atladeus.com'); return; }
    relaySend(msg[0]);
    toast(relayState.connected ? msg[1] : `${msg[1]} (sendes når koblingen er oppe)`);
  });
}
export const relayControl = control;
