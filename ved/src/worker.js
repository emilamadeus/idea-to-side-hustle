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
  The vote (the talk's prototypes slide): phones pick one of four visual directions for this very
  site. Deck: vote-open → vote-close. A tie becomes a 15-second sudden death: phones chop at the
  tied contenders and the most chops wins. The winner becomes the site's theme. No votes, or a
  tie that stays tied, keeps the default (peis) when it is in the running.
    deck: sudden-start skips the vote: all four go straight into a 15-second sudden death.
    deck: theme-set { theme } sets the look by hand (the presenter console's Design switch).
    phone → { type: 'vote', choice } · { type: 'chop', choice }
    deck  ← { type: 'vote-state', vote } on every change · { type: 'voted', choice, prev } ·
            { type: 'chopped', choice }
  The room (the talk's audience):
    phone → { type: 'join', name }            first name, optional; a word filter keeps the screen clean
    deck  ← { type: 'joined', p }              p = { id, name, n } (n: join order)
    phone ← state.room (the roster) · { type: 'room-joined', p }   the lobby's orbit
    deck  → watch-start { sessions } · watch-alert { k, text } · watch-end      the room keeps watch
    phone → { type: 'watch-ack', k }           deck ← { type: 'watch-acked', k, name, ms }
    deck  → light { mode, delay, dur } · light-off                              the finale light-up (runs until light-off; capped at 10 min)
    deck  → price-open · price-close         phone ← price-open · price-set { price, mine }   phone → price { kr }
            deck ← price-state · price-vote { p, kr } · price-set { price, count }
    deck  → bug-start · bug-end              phone ← bug-start · bug-ok { ms, rank } · bug-wrong   phone → bug-tap { card }
            deck ← bug-found { p, ms, rank }
    deck  → clicker-start · clicker-end      phone ← clicker · clicker-done · clicker-end   phone → clicker-next
            deck ← clicker-holder { p } · clicker-next { p }
    deck  → arena-open { R } · arena-go { delay } · arena-out { id, rank, total, by } · arena-end { winner, name }
            arena-roster { list } · arena-state { … } (passed straight to the phones)
            phone ← arena { phase, R, at, now } · the deck's arena-* messages        phone → apos { x, y, a } · afire { x, y, a } · acheer
            deck ← apos / afire { id, x, y, a } · acheer { id }
    deck  → where { label }                    phone ← where { label }       the talk's current part, shown in the lobby
    deck  → awards                             deck ← { type: 'awards', list }; winners' phones glow
  One Durable Object ("Room") holds the state, so every connection sees the same shop.
  No payment. An order is an address (any address; it is shown on the screen) and a number of sacks.
*/

const MAX_ORDERS = 400;
const THEMES = ['skog', 'nordisk', 'rask', 'peis'];
const DEFAULT_THEME = 'peis';
const SUDDEN_MS = 15000;
const DEPOT = [10.7522, 59.9139]; // the truck's start, for "furthest away"
// names go on a big screen: a short filter keeps it clean (anything matching becomes "Gjest")
const BLOCK = /(faen|fitte|kuk|pikk|hore|jævl|dritt|helvete|fuck|shit|dick|cunt|puss|nigg|neger|nazi|hitler|penis|rumpe|ræv|tiss|bæsj)/i;
const cleanName = (v) => {
  const n = String(v ?? '').replace(/[^\p{L}\p{M} .'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return n && !BLOCK.test(n) ? n : '';
};
const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

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
      this.theme = (await ctx.storage.get('theme')) ?? DEFAULT_THEME;
      this.vote = (await ctx.storage.get('vote')) ?? { phase: 'idle', votes: {}, chops: {}, contenders: [], endsAt: 0, winner: null };
      this.people = (await ctx.storage.get('people')) ?? {}; // voter → { name, n, t, chops, watch }
      this.alert = (await ctx.storage.get('alert')) ?? null;         // survives hibernation between alarm and tap
      this.watchNames = (await ctx.storage.get('watchNames')) ?? null;
      this.where = (await ctx.storage.get('where')) ?? '';
      this.g = (await ctx.storage.get('game')) ?? null;               // the running room game (price, bug, clicker, arena)
      this.price = (await ctx.storage.get('price')) ?? 129;          // kr per sack; the room can set it            // the talk's current part, for the phones' lobby
    });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/state') return json({ open: this.open, theme: this.theme, price: this.price });
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
    const voter = String(body?.voter ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    const o = { id: crypto.randomUUID().slice(0, 8), navn, adresse, sted, lat: +lat.toFixed(5), lon: +lon.toFixed(5), sekker, t: now, voter };
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
    const voter = (url.searchParams.get('voter') || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    this.ctx.acceptWebSocket(server, role === 'deck' ? ['deck'] : ['cust', ...ids.map((x) => `c:${x}`)]);
    server.serializeAttachment({ voter, chopT: 0, chopN: 0 });
    server.send(JSON.stringify(role === 'deck'
      ? { type: 'snapshot', open: this.open, orders: this.orders, theme: this.theme, vote: this.public(), people: this.roster(), price: this.price }
      : { type: 'state', open: this.open, theme: this.theme, vote: this.public(voter), me: this.people[voter] ? this.person(voter) : null, room: this.roster(), where: this.where, price: this.price, game: this.gameFor(voter) }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!this.ctx.getTags(ws).includes('deck')) return this.fromPhone(ws, m); // phones: vote and chop only
    if (m.type === 'open' || m.type === 'close') {
      this.open = m.type === 'open';
      await this.ctx.storage.put('open', this.open);
      this.send('cust', { type: 'state', open: this.open });
      this.send('deck', { type: 'state', open: this.open });
    }
    if (m.type === 'vote-open') {
      this.vote = { phase: 'open', votes: {}, chops: {}, contenders: [...THEMES], endsAt: 0, winner: null };
      await this.saveVote();
    }
    if (m.type === 'vote-close' && this.vote.phase === 'open') await this.closeVote();
    // straight to sudden death, all four in it (the presenter's choice instead of a regular vote)
    if (m.type === 'sudden-start' && (this.vote.phase === 'idle' || this.vote.phase === 'open' || this.vote.phase === 'closed')) {
      this.vote = { phase: 'sudden', votes: {}, chops: Object.fromEntries(THEMES.map((k) => [k, 0])), contenders: [...THEMES], endsAt: Date.now() + SUDDEN_MS, winner: null, only: true };
      await this.ctx.storage.setAlarm(this.vote.endsAt + 200);
      await this.saveVote();
    }
    // the presenter picks a look by hand (the console's Design switch)
    if (m.type === 'theme-set' && THEMES.includes(m.theme)) {
      this.theme = m.theme;
      await this.ctx.storage.put('theme', this.theme);
      this.send('cust', { type: 'theme', theme: this.theme });
      this.send('deck', { type: 'theme', theme: this.theme });
    }
    if (m.type === 'vote-reset') {
      this.vote = { phase: 'idle', votes: {}, chops: {}, contenders: [], endsAt: 0, winner: null };
      this.theme = DEFAULT_THEME;
      await this.ctx.storage.put('theme', this.theme);
      await this.saveVote();
      this.send('cust', { type: 'theme', theme: this.theme });
      this.send('deck', { type: 'theme', theme: this.theme });
    }
    // ---- the room ----
    if (m.type === 'watch-start' && Array.isArray(m.sessions) && m.sessions.length) {
      const names = m.sessions.map((x) => String(x).slice(0, 24));
      Object.entries(this.people).sort((a, b) => a[1].n - b[1].n).forEach(([v, p], i) => { p.watch = i % names.length; });
      this.watchNames = names;
      await this.ctx.storage.put('people', this.people);
      await this.ctx.storage.put('watchNames', names);
      this.eachPhone((ws, v) => { const p = this.people[v]; if (p) ws.send(JSON.stringify({ type: 'watch', k: p.watch, session: names[p.watch] })); });
      const roster = names.map((n, k) => Object.values(this.people).filter((p) => p.watch === k).map((p) => p.name || 'Gjest'));
      this.send('deck', { type: 'watch-roster', roster });
    }
    if (m.type === 'watch-alert' && Number.isInteger(m.k)) {
      this.alert = { k: m.k, t: Date.now(), acked: false };
      await this.ctx.storage.put('alert', this.alert);
      const msg = JSON.stringify({ type: 'watch-alert', k: m.k, session: this.watchNames?.[m.k] || `Session ${m.k + 1}`, text: String(m.text || '').slice(0, 80) });
      this.eachPhone((ws, v) => { if (this.people[v]?.watch === m.k) ws.send(msg); });
    }
    if (m.type === 'watch-end') { this.alert = null; await this.ctx.storage.delete('alert'); this.send('cust', { type: 'watch-end' }); }
    if (m.type === 'light') {
      // a synchronised light-up: each phone gets its place in the join order, for the wave
      const total = Object.keys(this.people).length || 1;
      const start = Date.now() + (Number(m.delay) || 1500);
      this.eachPhone((ws, v) => ws.send(JSON.stringify({ type: 'light', mode: m.mode || 'wave', start, now: Date.now(), dur: Math.min(Number(m.dur) || 14000, 600000), n: this.people[v]?.n || 1, total, theme: this.theme })));
    }
    if (m.type === 'light-off') this.send('cust', { type: 'light-off' });
    if (['price-open', 'price-close', 'bug-start', 'bug-end', 'clicker-start', 'clicker-end'].includes(m.type)) await this.deckGame(m);
    if (typeof m.type === 'string' && m.type.startsWith('arena-')) await this.arenaDeck(m, raw);
    if (m.type === 'where') { this.where = String(m.label || '').slice(0, 40); await this.ctx.storage.put('where', this.where); this.send('cust', { type: 'where', label: this.where }); }
    if (m.type === 'awards') {
      const list = this.awards();
      this.send('deck', { type: 'awards', list });
      this.eachPhone((ws, v) => { const won = list.filter((a) => a.voter === v); if (won.length) ws.send(JSON.stringify({ type: 'award', titles: won.map((a) => a.title) })); });
    }
    if (m.type === 'people-reset') { this.people = {}; await this.ctx.storage.put('people', this.people); this.send('deck', { type: 'roster', people: [] }); this.send('cust', { type: 'room-reset' }); }
    if (m.type === 'reset') {
      this.orders = [];
      this.price = 129; await this.ctx.storage.put('price', this.price);
      await this.ctx.storage.put('orders', this.orders);
      this.send('cust', { type: 'reset' });
      this.send('deck', { type: 'snapshot', open: this.open, orders: [] });
    }
    // a message to every open phone: { type: 'broadcast', app, title, text } (the talk's own buzzes)
    if (m.type === 'broadcast') {
      this.send('cust', { type: 'notify', app: String(m.app || '').slice(0, 20), title: String(m.title || '').slice(0, 60), text: String(m.text || '').slice(0, 140), all: true });
    }
    // a message to the phones behind some orders: { type: 'notify', ids: [...], title, text }
    if (m.type === 'notify' && Array.isArray(m.ids)) {
      const msg = { type: 'notify', title: String(m.title || '').slice(0, 60), text: String(m.text || '').slice(0, 140) };
      for (const id of m.ids.slice(0, MAX_ORDERS)) this.send(`c:${id}`, msg);
    }
  }

  // ---- the vote ----
  tally() {
    const t = Object.fromEntries(THEMES.map((k) => [k, 0]));
    Object.values(this.vote.votes).forEach((c) => { if (c in t) t[c]++; });
    return t;
  }
  // what a phone (or the deck) may see: counts, never who voted for what; a phone also gets its own vote
  public(voter = null) {
    const v = this.vote;
    return { phase: v.phase, tally: this.tally(), chops: v.chops, contenders: v.contenders, endsAt: v.endsAt, winner: v.winner, only: !!v.only, mine: voter ? v.votes[voter] ?? null : undefined, now: Date.now() };
  }
  async saveVote() {
    await this.ctx.storage.put('vote', this.vote);
    this.send('deck', { type: 'vote-state', vote: this.public() });
    for (const ws of this.ctx.getWebSockets('cust')) {
      const a = ws.deserializeAttachment() || {};
      try { ws.send(JSON.stringify({ type: 'vote-state', vote: this.public(a.voter) })); } catch {}
    }
  }
  async fromPhone(ws, m) {
    const a = ws.deserializeAttachment() || {};
    const v = this.vote;
    if (m.type === 'join' && a.voter) {
      const name = cleanName(m.name);
      const known = this.people[a.voter];
      const p = known ?? { n: Object.keys(this.people).length + 1, t: Date.now(), chops: 0 };
      p.name = name;
      this.people[a.voter] = p;
      await this.ctx.storage.put('people', this.people);
      this.send('deck', { type: 'joined', p: this.person(a.voter), again: !!known });
      this.send('cust', { type: 'room-joined', p: this.person(a.voter) }); // the lobby on every phone
      ws.send(JSON.stringify({ type: 'me', me: this.person(a.voter), total: Object.keys(this.people).length }));
      return;
    }
    if (['price', 'bug-tap', 'clicker-next'].includes(m.type) && a.voter) return this.phoneGame(ws, a.voter, m);
    if (['apos', 'afire', 'acheer'].includes(m.type) && a.voter && this.g?.kind === 'arena') return this.arenaPhone(ws, a, m);
    if (m.type === 'watch-ack' && this.alert && !this.alert.acked && m.k === this.alert.k && this.people[a.voter]?.watch === m.k) {
      this.alert.acked = true;
      await this.ctx.storage.put('alert', this.alert);
      this.send('deck', { type: 'watch-acked', k: m.k, name: this.people[a.voter].name || 'Gjest', ms: Date.now() - this.alert.t });
      const done = JSON.stringify({ type: 'watch-done', k: m.k, by: this.people[a.voter].name || 'Gjest' });
      this.eachPhone((w, vv) => { if (this.people[vv]?.watch === m.k) w.send(done); });
      return;
    }
    if (m.type === 'vote' && v.phase === 'open' && a.voter && THEMES.includes(m.choice)) {
      const prev = v.votes[a.voter] ?? null;
      if (prev === m.choice) return;
      v.votes[a.voter] = m.choice;
      this.send('deck', { type: 'voted', choice: m.choice, prev });
      await this.saveVote();
    }
    if (m.type === 'chop' && v.phase === 'sudden' && v.contenders.includes(m.choice) && Date.now() < v.endsAt) {
      // at most 12 chops a second per phone: fast thumbs, not scripts
      const now = Date.now();
      if (now - a.chopT > 1000) { a.chopT = now; a.chopN = 0; }
      if (++a.chopN > 12) return;
      ws.serializeAttachment(a);
      v.chops[m.choice] = (v.chops[m.choice] || 0) + 1;
      if (this.people[a.voter]) this.people[a.voter].chops = (this.people[a.voter].chops || 0) + 1;
      this.send('deck', { type: 'chopped', choice: m.choice });
      // the running count goes out at most every 250 ms
      if (!this.chopTimer) this.chopTimer = setTimeout(async () => { this.chopTimer = null; await this.saveVote(); }, 250);
    }
  }
  async closeVote() {
    const t = this.tally();
    const max = Math.max(...Object.values(t));
    const top = THEMES.filter((k) => t[k] === max);
    if (max === 0) return this.finish(DEFAULT_THEME);
    if (top.length === 1) return this.finish(top[0]);
    // a tie: sudden death between the tied contenders
    this.vote.phase = 'sudden';
    this.vote.contenders = top;
    this.vote.chops = Object.fromEntries(top.map((k) => [k, 0]));
    this.vote.endsAt = Date.now() + SUDDEN_MS;
    await this.ctx.storage.setAlarm(this.vote.endsAt + 200);
    await this.saveVote();
  }
  async alarm() {
    if (this.vote.phase !== 'sudden') return;
    const c = this.vote.chops;
    const max = Math.max(...Object.values(c));
    const top = this.vote.contenders.filter((k) => c[k] === max);
    // still tied: the default if it is in the running, else the first of them
    await this.finish(top.length === 1 ? top[0] : (top.includes(DEFAULT_THEME) ? DEFAULT_THEME : top[0]));
  }
  async finish(winner) {
    this.vote.phase = 'closed';
    this.vote.winner = winner;
    this.theme = winner;
    await this.ctx.storage.put('theme', this.theme);
    await this.saveVote();
    this.send('cust', { type: 'theme', theme: this.theme });
    this.send('deck', { type: 'theme', theme: this.theme });
  }

  // ---- room games: one runs at a time, kept in storage (the object sleeps between messages) ----
  //   price   the room sets the price of a sack: a slider on every phone, the median wins
  //   bug     spot the bug: the first to tap the wrong card, with times
  //   clicker one random phone gets the deck's next button for a single click
  async saveGame() { if (this.g) await this.ctx.storage.put('game', this.g); else await this.ctx.storage.delete('game'); }
  // the phones on the line now, in join order (named people first, then the rest)
  connected() {
    const seen = new Set();
    for (const ws of this.ctx.getWebSockets('cust')) { const a = ws.deserializeAttachment() || {}; if (a.voter) seen.add(a.voter); }
    const n = (v) => this.people[v]?.n ?? 1e9;
    return [...seen].sort((x, y) => n(x) - n(y));
  }
  who(v) { const p = this.people[v]; return { id: v.slice(0, 6), name: p?.name || 'Gjest', n: p?.n || 0 }; }
  gameFor(v) {
    const g = this.g;
    if (!g || !v) return null;
    if (g.kind === 'price') return { type: 'price-open', mine: g.votes[v] ?? null, price: this.price };
    if (g.kind === 'bug') return g.found[v] ? null : { type: 'bug-start' };
    if (g.kind === 'clicker' && g.holder === v) return { type: 'clicker' };
    if (g.kind === 'arena') return { type: 'arena', phase: g.phase, R: g.R, at: g.at, now: Date.now(), out: g.out?.[v.slice(0, 6)] || null };
    return null;
  }
  async deckGame(m) {
    if (m.type === 'price-open') {
      this.g = { kind: 'price', votes: {} };
      await this.saveGame();
      this.send('cust', { type: 'price-open', mine: null, price: this.price });
      this.send('deck', { type: 'price-state', votes: [] });
    }
    if (m.type === 'price-close' && this.g?.kind === 'price') {
      const vals = Object.values(this.g.votes).sort((a, b) => a - b);
      if (vals.length) {
        const mid = vals.length >> 1;
        this.price = vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 20) * 10;
        await this.ctx.storage.put('price', this.price);
      }
      const votes = this.g.votes;
      this.g = null; await this.saveGame();
      this.eachPhone((ws, v) => ws.send(JSON.stringify({ type: 'price-set', price: this.price, mine: votes[v] ?? null })));
      this.send('deck', { type: 'price-set', price: this.price, count: vals.length });
    }
    if (m.type === 'bug-start') {
      this.g = { kind: 'bug', t: Date.now(), found: {} };
      await this.saveGame();
      this.send('cust', { type: 'bug-start' });
    }
    if (m.type === 'clicker-start') {
      const phones = this.connected();
      const named = phones.filter((v) => this.people[v]?.name);
      const pool = named.length ? named : phones;
      const holder = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      this.g = holder ? { kind: 'clicker', holder } : null;
      await this.saveGame();
      if (holder) this.send('cust', { type: 'clicker-pick', holder: holder.slice(0, 6) });
      this.eachPhone((ws, v) => { if (v === holder) ws.send(JSON.stringify({ type: 'clicker' })); });
      this.send('deck', { type: 'clicker-holder', p: holder ? this.who(holder) : null });
    }
    if (m.type.endsWith('-end')) {
      const kind = m.type.slice(0, -4);
      if (this.g?.kind === kind) { this.g = null; await this.saveGame(); }
      this.send('cust', { type: m.type });
    }
  }
  async phoneGame(ws, v, m) {
    const g = this.g;
    if (!g) return;
    if (m.type === 'price' && g.kind === 'price') {
      const kr = Math.max(50, Math.min(300, Math.round(Number(m.kr) / 10) * 10 || 130));
      if (g.votes[v] === kr) return;
      g.votes[v] = kr;
      this.send('deck', { type: 'price-vote', p: this.who(v), kr });
      if (!this.priceTimer) this.priceTimer = setTimeout(async () => { this.priceTimer = null; await this.saveGame(); }, 400);
    }
    if (m.type === 'bug-tap' && g.kind === 'bug' && !g.found[v]) {
      if (m.card !== 'sms-grunerlokka') { ws.send(JSON.stringify({ type: 'bug-wrong' })); return; }
      const ms = Date.now() - g.t, rank = Object.keys(g.found).length + 1;
      g.found[v] = { ms, rank };
      if (this.people[v] && (!this.people[v].bugMs || ms < this.people[v].bugMs)) { this.people[v].bugMs = ms; await this.ctx.storage.put('people', this.people); }
      await this.saveGame();
      ws.send(JSON.stringify({ type: 'bug-ok', ms, rank }));
      this.send('deck', { type: 'bug-found', p: this.who(v), ms, rank });
    }
    if (m.type === 'clicker-next' && g.kind === 'clicker' && g.holder === v) {
      this.g = null; await this.saveGame();
      ws.send(JSON.stringify({ type: 'clicker-done' }));
      this.send('deck', { type: 'clicker-next', p: this.who(v) });
    }
  }

  // ---- the arena: last one standing. The deck runs the game; the relay only passes things along.
  //   Phones own their position (so steering is instant there) and send it ~15 times a second;
  //   the deck decides every hit and sends the whole state back ~12 times a second.
  //   Inputs are never stored: only the phase changes are (the object may sleep between rounds).
  async arenaDeck(m, raw) {
    if (m.type === 'arena-open') {
      this.g = { kind: 'arena', phase: 'lobby', R: Number(m.R) || 400, at: 0, out: {} };
      await this.saveGame();
      this.send('cust', { type: 'arena', phase: 'lobby', R: this.g.R, now: Date.now() });
      return;
    }
    if (this.g?.kind !== 'arena') return;
    if (m.type === 'arena-go') {
      this.g.phase = 'fight'; this.g.at = Date.now() + (Number(m.delay) || 3000);
      await this.saveGame();
      this.send('cust', { type: 'arena', phase: 'fight', R: this.g.R, at: this.g.at, now: Date.now() });
      return;
    }
    if (m.type === 'arena-out') {
      // one phone is out: its place, for the ghost card (kept, for a phone that reloads)
      const id = String(m.id || '').slice(0, 6);
      this.g.out[id] = { rank: m.rank, total: m.total, by: String(m.by || '').slice(0, 18) };
      this.eachPhone((ws, v) => { if (v && v.slice(0, 6) === id) ws.send(raw); });
      if (!this.outTimer) this.outTimer = setTimeout(async () => { this.outTimer = null; await this.saveGame(); }, 500);
      return;
    }
    if (m.type === 'arena-end') {
      const id = String(m.winner || '').slice(0, 6);
      const v = id && Object.keys(this.people).find((x) => x.slice(0, 6) === id);
      if (v) { this.people[v].arenaWin = (this.people[v].arenaWin || 0) + 1; this.people[v].arenaT = Date.now(); await this.ctx.storage.put('people', this.people); }
      this.g = null; await this.saveGame();
      this.send('cust', raw);
      return;
    }
    // the roster, the state, the cheers: straight through to every phone
    this.send('cust', raw);
  }
  arenaPhone(ws, a, m) {
    const id = a.voter.slice(0, 6);
    if (m.type === 'acheer') {
      const now = Date.now();
      if (now - (a.cheerT || 0) < 300) return;
      a.cheerT = now; ws.serializeAttachment(a);
    }
    const n = (x) => Math.round(Number(x) || 0);
    this.send('deck', m.type === 'acheer' ? { type: 'acheer', id } : { type: m.type, id, x: n(m.x), y: n(m.y), a: n(m.a) });
  }

  // ---- the room ----
  person(v) { const p = this.people[v]; return p && { id: v.slice(0, 6), name: p.name || '', n: p.n }; }
  roster() { return Object.keys(this.people).map((v) => this.person(v)).sort((a, b) => a.n - b.n); }
  eachPhone(fn) {
    for (const ws of this.ctx.getWebSockets('cust')) { const a = ws.deserializeAttachment() || {}; try { fn(ws, a.voter); } catch {} }
  }
  // the evening's awards, from what the room actually did
  awards() {
    const P = this.people, nameOf = (v, fallback) => (P[v]?.name || fallback || 'Gjest');
    const out = [];
    const chop = Object.entries(P).filter(([, p]) => p.chops > 0).sort((a, b) => b[1].chops - a[1].chops)[0];
    if (chop) out.push({ title: 'Raskeste øks', voter: chop[0], name: nameOf(chop[0]), detail: `${chop[1].chops} hogg` });
    const first = [...this.orders].sort((a, b) => a.t - b.t)[0];
    if (first) out.push({ title: 'Første kunde', voter: first.voter, name: nameOf(first.voter, first.navn), detail: first.sted || first.adresse });
    const far = [...this.orders].sort((a, b) => km(DEPOT, [b.lon, b.lat]) - km(DEPOT, [a.lon, a.lat]))[0];
    if (far) out.push({ title: 'Lengst unna', voter: far.voter, name: nameOf(far.voter, far.navn), detail: `${far.sted || far.adresse}, ${Math.round(km(DEPOT, [far.lon, far.lat])).toLocaleString('nb-NO')} km` });
    const sacks = {};
    this.orders.forEach((o) => { const k = o.voter || o.id; sacks[k] = (sacks[k] || { n: 0, o }); sacks[k].n += o.sekker; });
    const most = Object.entries(sacks).sort((a, b) => b[1].n - a[1].n)[0];
    if (most) out.push({ title: 'Mest ved', voter: most[1].o.voter, name: nameOf(most[1].o.voter, most[1].o.navn), detail: `${most[1].n} sekker` });
    const arena = Object.entries(P).filter(([, p]) => p.arenaWin).sort((a, b) => b[1].arenaT - a[1].arenaT)[0];
    if (arena) out.push({ title: 'Sist igjen', voter: arena[0], name: nameOf(arena[0]), detail: 'arenaen' });
    const early = Object.entries(P).sort((a, b) => a[1].n - b[1].n)[0];
    if (early) out.push({ title: 'Først inne', voter: early[0], name: nameOf(early[0]), detail: `først av ${Object.keys(P).length}` });
    return out;
  }

  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch {} }

  send(tag, msg) {
    const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets(tag)) { try { ws.send(s); } catch {} }
  }
}
