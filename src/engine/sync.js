/*
  Same-machine sync between the audience window (TV) and the presenter console
  (MacBook). The audience window owns the state; the console sends commands.

  Messages:
    { type: 'state', index, step, id, steps, total, black }   audience -> console
    { type: 'progress', p, done }                              audience -> console (current step's animation)
    { type: 'cmd', action: 'next'|'prev'|'goto'|'black'|'overview', index?, step? }
    { type: 'hello' }                                          console -> audience
*/
export function createSync() {
  const ch = new BroadcastChannel('ai-deck');
  const handlers = new Set();
  ch.onmessage = (e) => handlers.forEach((h) => h(e.data));
  return {
    send: (msg) => ch.postMessage(msg),
    on: (h) => { handlers.add(h); return () => handlers.delete(h); },
  };
}
