/*
  The talk's line to the audience's phones (the relay behind ved.atladeus.com).

    phones({ app, title, text })   a banner (and a buzz, where the phone allows it) on every phone
                                   that has the order page open

  Only the audience window talks to the relay: preview iframes (the presenter console) and audits
  stay silent, so a message goes out once. Slides should also skip it on instant replays (going
  back, jumping in): pass live = false.
  URL and key come from .env.local (VITE_VED_WS, VITE_VED_KEY); without them this does nothing.
*/

const WS = import.meta.env.VITE_VED_WS || 'wss://ved.atladeus.com';
const KEY = import.meta.env.VITE_VED_KEY || '';
const control = typeof location !== 'undefined' && new URLSearchParams(location.search).get('view') !== 'preview';

let ws = null;
let queue = [];

function connect() {
  if (!KEY || !control) return null;
  if (ws && ws.readyState <= 1) return ws;
  try { ws = new WebSocket(`${WS}/api/ws?role=deck&key=${encodeURIComponent(KEY)}`); } catch { return null; }
  ws.onopen = () => { queue.forEach((m) => ws.send(m)); queue = []; };
  ws.onclose = () => { ws = null; };
  return ws;
}
// open the line early, so the first message isn't late
connect();

export function phones({ app = 'claude', title = 'Claude Code', text = '' }, live = true) {
  if (!live || !control || !KEY) return;
  const m = JSON.stringify({ type: 'broadcast', app, title, text });
  const s = connect();
  if (s?.readyState === 1) s.send(m); else queue.push(m);
}
