/*
  ved.atladeus.com: the firewood shop from the talk, live.
    GET  /            the order page (static, ./public)
    GET  /api/state   { open }
    GET  /api/sok?q=  address suggestions from Kartverket (all of Norway)
    POST /api/order   { navn, adresse, sted, lat, lon, sekker } → { id }     only while the shop is open
    POST /api/route   { points: [[lon, lat], …] } → { legs: [[[lon, lat], …], …] }  real roads (OSRM),
                      a straight line for any leg the router can't answer
    GET  /api/ws      websocket
         ?role=deck&key=…   the talk: gets a snapshot and every new order; sends open/close/reset/notify
         ?role=customer&id=a,b  a phone: gets open/close, and messages addressed to its orders
  One Durable Object ("Room") holds the state, so every connection sees the same shop.
  No payment. An order is an address (any address; it is shown on the screen) and a number of sacks.
*/

const MAX_ORDERS = 400;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (url.pathname === '/api/sok') return search(url.searchParams.get('q') || '');
    if (url.pathname === '/api/route' && req.method === 'POST') return route(req);
    const room = env.ROOM.get(env.ROOM.idFromName('talk'));
    return room.fetch(req);
  },
};

const UA = { 'user-agent': 'ved-atladeus-demo/1.0 (talk demo)' };

// address suggestions: Kartverket's open address register
async function search(q) {
  q = q.trim().slice(0, 80);
  if (q.length < 3) return json([]);
  const u = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}&fuzzy=true&treffPerSide=6&utkoordsys=4258`;
  try {
    const r = await fetch(u, { headers: UA, cf: { cacheTtl: 3600, cacheEverything: true } });
    const d = await r.json();
    return json((d.adresser || []).filter((a) => a.representasjonspunkt).map((a) => ({
      adresse: a.adressetekst, sted: titleCase(a.poststed || a.kommunenavn || ''), postnr: a.postnummer,
      lat: a.representasjonspunkt.lat, lon: a.representasjonspunkt.lon,
    })));
  } catch { return json([]); }
}
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

// the drive: one router call per leg, in parallel; a straight line when a leg fails
async function route(req) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  const pts = (body?.points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).slice(0, 41);
  const legs = await Promise.all(pts.slice(1).map(async (b, k) => {
    const a = pts[k];
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=simplified&geometries=geojson`,
        { headers: UA, signal: AbortSignal.timeout(7000), cf: { cacheTtl: 86400, cacheEverything: true } });
      const d = await r.json();
      const c = d.routes?.[0]?.geometry?.coordinates;
      if (c?.length > 1) return [a, ...c, b];
    } catch {}
    return [a, b];
  }));
  return json({ legs });
}

// the talk (another origin) reads /api/route, so answers carry an open CORS header
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
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
    const clean = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
    const navn = clean(body?.navn, 24), adresse = clean(body?.adresse, 70), sted = clean(body?.sted, 40);
    const lat = Number(body?.lat), lon = Number(body?.lon);
    const sekker = Math.max(1, Math.min(4, Math.round(Number(body?.sekker) || 1)));
    // anywhere in Norway, roughly (Svalbard included)
    if (!adresse || !(lat > 57 && lat < 81 && lon > 3 && lon < 34)) return json({ error: 'adresse' }, 400);
    this.recent.set(ip, now);
    const o = { id: crypto.randomUUID().slice(0, 8), navn, adresse, sted, lat: +lat.toFixed(5), lon: +lon.toFixed(5), sekker, t: now };
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
    // a phone may hold several orders: ?id=a,b,c (a socket takes at most ten tags)
    const ids = (url.searchParams.get('id') || '').split(',').map((x) => x.replace(/[^a-z0-9-]/gi, '').slice(0, 12)).filter(Boolean).slice(0, 8);
    this.ctx.acceptWebSocket(server, role === 'deck' ? ['deck'] : ['cust', ...ids.map((x) => `c:${x}`)]);
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
