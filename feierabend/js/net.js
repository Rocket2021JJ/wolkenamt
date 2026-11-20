// Online zu dritt über PeerJS (WebRTC). Der Host rechnet Requisiten, Tiere und Dorfleute;
// jeder Spieler rechnet seine eigene Figur und das Fahrzeug, das er gerade fährt.
// ?lokaltest: mehrere Tabs im gleichen Browser über BroadcastChannel (zum Testen ohne Internet).
const PFX = 'feierabend-v1-';
export const LOCALTEST = /[?&]lokaltest/.test(location.search);
export const net = { on: false, host: true, code: '', id: 'host', name: '', players: [], T: null, on_msg: null, on_close: null, on_join: null, on_lost: null };
const mkCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random() * 32) | 0]).join('');

function peerT() {
  let peer = null, hc = null; const conns = {};
  return {
    hostOpen(code, cb) {
      peer = new Peer(PFX + code);
      peer.on('open', () => cb.ready()); peer.on('error', e => cb.error(e.type || 'error'));
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      peer.on('connection', c => { c.on('open', () => { conns[c.peer] = c; cb.join(c.peer); }); c.on('data', d => cb.msg(c.peer, d)); c.on('close', () => { delete conns[c.peer]; cb.close(c.peer); }); });
    },
    join(code, cb) {
      peer = new Peer();
      peer.on('open', () => { hc = peer.connect(PFX + code, { reliable: true }); hc.on('open', () => cb.ready(peer.id)); hc.on('data', d => cb.msg(d)); hc.on('close', () => cb.close()); });
      peer.on('error', e => cb.error(e.type || 'error'));
    },
    to(id, m) { const c = conns[id]; if (c && c.open) c.send(m); },
    toHost(m) { if (hc && hc.open) hc.send(m); },
    destroy() { try { peer && peer.destroy(); } catch (e) {} },
  };
}
function localT() {
  let ch = null, joined = false, isHost = false; const me = 'c' + Math.random().toString(36).slice(2, 7);
  return {
    hostOpen(code, cb) { isHost = true; ch = new BroadcastChannel(PFX + code); ch.onmessage = e => { const m = e.data; if (m.to !== 'host') return; if (m.k === 'hi') { ch.postMessage({ to: m.from, k: 'ack' }); cb.join(m.from); } else if (m.k === 'bye') cb.close(m.from); else cb.msg(m.from, m.d); }; setTimeout(() => cb.ready(), 30); },
    join(code, cb) { ch = new BroadcastChannel(PFX + code); ch.onmessage = e => { const m = e.data; if (m.to !== me && m.to !== '*') return; if (m.k === 'ack') { if (!joined) { joined = true; cb.ready(me); } } else if (m.k === 'bye') cb.close(); else cb.msg(m.d); }; ch.postMessage({ to: 'host', from: me, k: 'hi' }); setTimeout(() => { if (!joined) cb.error('peer-unavailable'); }, 1500); },
    to(id, m) { ch.postMessage({ to: id, d: m }); },
    toHost(m) { ch.postMessage({ to: 'host', from: me, d: m }); },
    destroy() { try { ch && (ch.postMessage(isHost ? { to: '*', k: 'bye' } : { to: 'host', from: me, k: 'bye' }), ch.close()); } catch (e) {} },
  };
}
export const netAvailable = () => LOCALTEST || typeof Peer !== 'undefined';

export function host(name, cb) {
  net.name = name; net.code = mkCode(); net.host = true; net.id = 'host';
  net.T = LOCALTEST ? localT() : peerT();
  net.T.hostOpen(net.code, {
    ready() { net.on = true; net.players = [{ id: 'host', name, slot: 0 }]; cb.ok(net.code); },
    error(e) { if (!net.on) { reset(); cb.fail(e); } },
    join(id) { /* wartet auf hello */ },
    msg(id, m) {
      if (m.t === 'hello') {
        if (net.players.length >= 3) { net.T.to(id, { t: 'full' }); return; }
        const used = net.players.map(p => p.slot), slot = [0, 1, 2].find(s => !used.includes(s));
        net.players.push({ id, name: String(m.name || '?').slice(0, 14), slot });
        bcast({ t: 'roster', players: net.players });
        net.on_join && net.on_join(id);
        return;
      }
      net.on_msg && net.on_msg(id, m);
    },
    close(id) { const p = net.players.find(q => q.id === id); net.players = net.players.filter(q => q.id !== id); bcast({ t: 'roster', players: net.players }); net.on_close && net.on_close(id, p); },
  });
}
export function join(code, name, cb) {
  net.name = name; net.code = code.toUpperCase(); net.host = false;
  net.T = LOCALTEST ? localT() : peerT();
  let done = false;
  net.T.join(net.code, {
    ready(id) { net.id = id; net.on = true; net.T.toHost({ t: 'hello', name }); done = true; cb.ok(); },
    error(e) { if (!done) { reset(); cb.fail(e); } },
    msg(m) { if (m.t === 'roster') net.players = m.players; if (m.t === 'full') { reset(); cb.fail('full'); return; } net.on_msg && net.on_msg('host', m); },
    close() { if (net.on) { reset(); net.on_lost && net.on_lost(); } },
  });
  setTimeout(() => { if (!done) { reset(); cb.fail('timeout'); } }, 15000);
}
// an alle Clients (vom Host)
export function bcast(m, except) { if (!net.T || !net.host) return; for (const p of net.players) if (p.id !== 'host' && p.id !== except) net.T.to(p.id, m); }
export function toHost(m) { if (net.T && !net.host) net.T.toHost(m); }
export function toPeer(id, m) { if (net.T && net.host && id !== 'host') net.T.to(id, m); }
export function reset() { if (net.T) net.T.destroy(); net.T = null; net.on = false; net.host = true; net.id = 'host'; net.players = []; }
export const slotOf = id => (net.players.find(p => p.id === id) || { slot: 0 }).slot;
