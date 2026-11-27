/*
  The talk's line to the audience's phones (the relay behind ved.atladeus.com).

    phones({ app, title, text }, live)   a banner (and a buzz, where the phone allows it) on every
                                         phone that has the order page open
    relaySend(msg, live)                 a command to the relay (vote-open, vote-close, …)
    onRelay(fn) → off                    every message from the relay: snapshot, vote-state, voted,
                                         chopped, theme, order …
    relayState                           the latest { theme, vote, connected }

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
export const relayState = { theme: 'peis', vote: null, connected: false };

function connect() {
  if (!KEY) return null;
  if (ws && ws.readyState <= 1) return ws;
  try { ws = new WebSocket(`${WS}/api/ws?role=deck&key=${encodeURIComponent(KEY)}`); } catch { return null; }
  ws.onopen = () => { relayState.connected = true; queue.forEach((m) => ws.send(m)); queue = []; };
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.theme) relayState.theme = m.theme;
    if (m.vote) relayState.vote = m.vote;
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
export const relayControl = control;
