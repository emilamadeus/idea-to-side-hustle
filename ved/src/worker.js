/*
  ved.atladeus.com: the firewood shop from the talk, live.
    GET  /            the order page (static, ./public)
    GET  /api/state   { open }
    POST /api/order   { bydel, sekker } → { id }     only while the shop is open
    GET  /api/ws      websocket
         ?role=deck&key=…   the talk: gets a snapshot and every new order; sends open/close/reset/notify
         ?role=customer&id= a phone: gets open/close, and messages addressed to its order
  One Durable Object ("Room") holds the state, so every connection sees the same shop.
  No payment and no personal data: an order is a district and a number of sacks.
*/

export const BYDELER = [
  'Alna', 'Bjerke', 'Frogner', 'Gamle Oslo', 'Grorud', 'Grünerløkka', 'Nordre Aker', 'Nordstrand',
  'Sagene', 'St. Hanshaugen', 'Stovner', 'Søndre Nordstrand', 'Ullern', 'Vestre Aker', 'Østensjø',
];
const MAX_ORDERS = 400;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const room = env.ROOM.get(env.ROOM.idFromName('talk'));
    return room.fetch(req);
  },
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.recent = new Map(); // ip → last order time (in memory; good enough against double taps)
    ctx.blockConcurrencyWhile(async () => {
      this.open = (await ctx.storage.get('open')) ?? false;
      this.orders = (await ctx.storage.get('orders')) ?? [];
    });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/state') return json({ open: this.open });
    if (url.pathname === '/api/order' && req.method === 'POST') return this.order(req);
    if (url.pathname === '/api/ws') return this.connect(url);
    return json({ error: 'not found' }, 404);
  }

  async order(req) {
    if (!this.open) return json({ error: 'closed' }, 403);
    if (this.orders.length >= MAX_ORDERS) return json({ error: 'full' }, 429);
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    const now = Date.now();
    if (now - (this.recent.get(ip) || 0) < 4000) return json({ error: 'slow down' }, 429);
    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
    const bydel = BYDELER.includes(body?.bydel) ? body.bydel : null;
    const sekker = Math.max(1, Math.min(4, Math.round(Number(body?.sekker) || 1)));
    if (!bydel) return json({ error: 'bydel' }, 400);
    this.recent.set(ip, now);
    const o = { id: crypto.randomUUID().slice(0, 8), bydel, sekker, t: now };
    this.orders.push(o);
    await this.ctx.storage.put('orders', this.orders);
    this.send('deck', { type: 'order', order: o });
    return json({ id: o.id });
  }

  connect(url) {
    const role = url.searchParams.get('role');
    if (role === 'deck' && url.searchParams.get('key') !== this.env.DECK_KEY) return json({ error: 'forbidden' }, 403);
    if (role !== 'deck' && role !== 'customer') return json({ error: 'role' }, 400);
    const [client, server] = Object.values(new WebSocketPair());
    const id = (url.searchParams.get('id') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 12);
    this.ctx.acceptWebSocket(server, role === 'deck' ? ['deck'] : ['cust', ...(id ? [`c:${id}`] : [])]);
    server.send(JSON.stringify(role === 'deck'
      ? { type: 'snapshot', open: this.open, orders: this.orders }
      : { type: 'state', open: this.open }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (!this.ctx.getTags(ws).includes('deck')) return; // phones only listen
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'open' || m.type === 'close') {
      this.open = m.type === 'open';
      await this.ctx.storage.put('open', this.open);
      this.send('cust', { type: 'state', open: this.open });
      this.send('deck', { type: 'state', open: this.open });
    }
    if (m.type === 'reset') {
      this.orders = [];
      await this.ctx.storage.put('orders', this.orders);
      this.send('cust', { type: 'reset' });
      this.send('deck', { type: 'snapshot', open: this.open, orders: [] });
    }
    // a message to the phones behind some orders: { type: 'notify', ids: [...], title, text }
    if (m.type === 'notify' && Array.isArray(m.ids)) {
      const msg = { type: 'notify', title: String(m.title || '').slice(0, 60), text: String(m.text || '').slice(0, 140) };
      for (const id of m.ids.slice(0, MAX_ORDERS)) this.send(`c:${id}`, msg);
    }
  }

  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch {} }

  send(tag, msg) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets(tag)) { try { ws.send(s); } catch {} }
  }
}
