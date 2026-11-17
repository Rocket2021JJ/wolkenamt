// Online-Mehrspieler (bis 3 Personen) über PeerJS (WebRTC) oder BroadcastChannel (?lokaltest).
// Der Host ist die «Zentrale»: Er sammelt Stimmen und Ergebnisse und verteilt den Stand an alle.
// Nachrichten: hello, players, deny, chat, vote, pick, picked, start, prog, done, doneack, results, final
// neu in v0.4: pos (Position, Richtung, Animationszustand, 12 Hz)
import { ORDERS } from './data.js';
import { THRESH } from './cut2d.js';
import * as POW from './power.js';
export const partyOf = id => POW.PLAYABLE[Math.max(0, net.players.findIndex(p => p.id === id)) % 3];

const NETPFX = 'wolkenamt-v1-';
export const LOCALTEST = /[?&]lokaltest/.test(location.search);
export const MP_POINTS = [3, 1, 0];
export const net = { on: false, host: false, code: '', id: '', name: '', players: [], rounds: 5, round: 0, T: null, phase: '', prog: {}, picked: [], doneIds: [], myPick: null, voteEnd: 0, opts: [], ui: {} };
let HS = null;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[(Math.random() * a.length) | 0];
const mkCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random() * 32) | 0]).join('');
export const pname = id => (net.players.find(p => p.id === id) || { name: '?' }).name;
export const pindex = id => Math.max(0, net.players.findIndex(p => p.id === id));
const ui = (k, ...a) => net.ui[k] && net.ui[k](...a);

function peerTransport() {
  let peer = null, hc = null; const conns = {};
  return {
    hostOpen(code, cb) {
      peer = new Peer(NETPFX + code);
      peer.on('open', () => cb.ready());
      peer.on('error', e => cb.error(e.type || 'error'));
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      peer.on('connection', c => {
        c.on('open', () => { conns[c.peer] = c; });
        c.on('data', d => cb.msg(c.peer, d));
        c.on('close', () => { delete conns[c.peer]; cb.close(c.peer); });
      });
    },
    join(code, cb) {
      peer = new Peer();
      peer.on('open', () => {
        hc = peer.connect(NETPFX + code, { reliable: true });
        hc.on('open', () => cb.ready(peer.id));
        hc.on('data', d => cb.msg(d));
        hc.on('close', () => cb.close());
      });
      peer.on('error', e => cb.error(e.type || 'error'));
    },
    toClient(id, m) { const c = conns[id]; if (c && c.open) c.send(m); },
    toHost(m) { if (hc && hc.open) hc.send(m); },
    destroy() { try { if (peer) peer.destroy(); } catch (e) {} },
    peer: () => peer,
  };
}
function localTransport() {
  let ch = null, joined = false, isHost = false; const myId = 'c' + Math.random().toString(36).slice(2, 8);
  return {
    hostOpen(code, cb) {
      isHost = true; ch = new BroadcastChannel(NETPFX + code);
      ch.onmessage = e => { const m = e.data; if (m.to !== 'host') return; if (m.k === 'hello') ch.postMessage({ to: m.from, k: 'ack' }); else if (m.k === 'bye') cb.close(m.from); else cb.msg(m.from, m.d); };
      setTimeout(() => cb.ready(), 30);
    },
    join(code, cb) {
      ch = new BroadcastChannel(NETPFX + code);
      ch.onmessage = e => { const m = e.data; if (m.to !== myId && m.to !== '*') return; if (m.k === 'ack') { if (!joined) { joined = true; cb.ready(myId); } } else if (m.k === 'bye') cb.close(); else cb.msg(m.d); };
      ch.postMessage({ to: 'host', from: myId, k: 'hello' });
      setTimeout(() => { if (!joined) cb.error('peer-unavailable'); }, 1200);
    },
    toClient(id, m) { ch.postMessage({ to: id, d: m }); },
    toHost(m) { ch.postMessage({ to: 'host', from: myId, d: m }); },
    destroy() { try { if (ch) { ch.postMessage(isHost ? { to: '*', k: 'bye' } : { to: 'host', from: myId, k: 'bye' }); ch.close(); } } catch (e) {} },
  };
}
export const toHost = m => { if (!net.T) return; if (net.host) hostOnMsg('host', m); else net.T.toHost(m); };
const bc = m => { net.players.forEach(p => { if (p.id !== 'host') net.T.toClient(p.id, m); }); onNet(m); };

export function netAvailable() { return LOCALTEST || typeof Peer !== 'undefined'; }
export function netReset() {
  if (voice.on) voiceLeave(true);
  listening = false;
  if (HS && HS.timer) clearTimeout(HS.timer);
  if (net.T) net.T.destroy();
  HS = null; net.T = null; net.on = false; net.host = false; net.players = []; net.phase = '';
}
function enter() { net.on = true; net.phase = 'lobby'; net.prog = {}; net.picked = []; net.doneIds = []; ui('enter'); }
export function netCreate(name, rounds = 5) {
  net.name = name; net.code = mkCode(); net.host = true; net.id = 'host';
  net.T = LOCALTEST ? localTransport() : peerTransport();
  HS = { phase: 'lobby', rounds, round: 0, pool: [], pp: 0, total: {}, picks: {}, done: {}, timer: null, opts: [], order: 0, rejected: [] };
  net.T.hostOpen(net.code, {
    ready() { net.players = [{ id: 'host', name: net.name }]; net.rounds = HS.rounds; enter(); },
    error(e) { if (!net.on) { netReset(); ui('fail', 'create', e); } else ui('note', e); },
    msg: hostOnMsg, close: hostOnClose,
  });
}
export function netJoin(code, name) {
  net.name = name; net.code = code; net.host = false;
  net.T = LOCALTEST ? localTransport() : peerTransport();
  net.T.join(code, {
    ready(id) { net.id = id; enter(); toHost({ t: 'hello', name: net.name }); },
    error(e) { if (!net.on) { netReset(); ui('fail', 'join', e); } else ui('note', e); },
    msg: onNet,
    close() { if (net.on) { const c = net.code; netReset(); ui('lost', c); } },
  });
}
export function setRounds(n) { if (HS) { HS.rounds = n; hostRoster(); } }

// ----- Host -----
function hostRoster() { bc({ t: 'players', players: net.players, rounds: HS.rounds }); }
function hostOnMsg(id, m) {
  if (!HS || !m) return;
  if (m.t === 'hello') {
    if (HS.phase !== 'lobby' || net.players.length >= 3) return net.T.toClient(id, { t: 'deny', why: HS.phase !== 'lobby' ? 'running' : 'full' });
    if (!net.players.find(p => p.id === id)) net.players.push({ id, name: String(m.name || '?').slice(0, 16) });
    hostRoster(); bc({ t: 'chat', sys: 'joined', name: pname(id) });
  } else if (!net.players.find(p => p.id === id)) return;
  else if (m.t === 'pos') {
    // Positionen an alle anderen weiterreichen
    const out = { t: 'pos', id, p: Array.isArray(m.p) ? m.p.slice(0, 7).map(Number) : [] };
    net.players.forEach(p => { if (p.id !== id && p.id !== 'host') net.T.toClient(p.id, out); });
    if (id !== 'host') onNet(out);
  }
  else if (m.t === 'chat') bc({ t: 'chat', from: pname(id), text: String(m.text || '').slice(0, 200) });
  else if (m.t === 'voice') { const pl = net.players.find(p => p.id === id); pl.voice = !!m.on; pl.mute = !!m.mute; hostRoster(); }
  else if (m.t === 'act') {
    if (!HS.pw || HS.phase !== 'results' || HS.acted[id]) return;
    const own = partyOf(id), tg = POW.PARTIES[m.target] ? m.target : null;
    if (!POW.MP_ACTIONS.find(a => a.id === m.a)) return;
    HS.acted[id] = 1;
    const line = POW.multiAct(HS.pw, own, m.a, tg && tg !== own ? tg : null);
    if (line) HS.pw.log.push(line);
    bc({ t: 'pstate', pw: HS.pw, polls: POW.pollsMulti(HS.pw), line, acted: Object.keys(HS.acted) });
  }
  else if (m.t === 'pick') {
    if (HS.phase !== 'vote' || HS.picks[id] !== undefined || ![0, 1, 2].includes(m.i)) return;
    HS.picks[id] = m.i; bc({ t: 'picked', ids: Object.keys(HS.picks) }); hostCheck();
  } else if (m.t === 'prog') { if (HS.phase === 'play') bc({ t: 'prog', id, s: Math.max(0, Math.min(1, +m.s || 0)) }); }
  else if (m.t === 'done') {
    if (HS.phase !== 'play' || HS.done[id]) return;
    const sc = Math.max(0, Math.min(1, +m.score || 0));
    HS.done[id] = { score: sc, stars: THRESH.filter(x => sc >= x).length, img: String(m.img || '').slice(0, 80000), mask: String(m.mask || '').slice(0, 1000) };
    bc({ t: 'doneack', ids: Object.keys(HS.done) }); hostCheck();
  }
}
function hostCheck() {
  if (!HS) return;
  if (HS.phase === 'vote' && net.players.every(p => HS.picks[p.id] !== undefined)) hostResolveVote();
  else if (HS.phase === 'play' && net.players.every(p => HS.done[p.id])) hostResults();
}
function hostOnClose(id) {
  if (!HS) return; const n = pname(id);
  net.players = net.players.filter(p => p.id !== id);
  hostRoster(); bc({ t: 'chat', sys: 'left', name: n }); bc({ t: 'gone', id }); hostCheck();
}
export function hostStart() {
  if (!HS) return;
  HS.round = 0; HS.total = {}; net.players.forEach(p => { HS.total[p.id] = 0; });
  HS.pool = shuffle(ORDERS.map((_, i) => i)); HS.pp = 0;
  HS.pw = POW.freshMulti(net.players.map(p => partyOf(p.id))); HS.acted = {};
  hostVote();
}
function hostVote() {
  HS.phase = 'vote'; HS.picks = {};
  if (HS.pp + 3 > HS.pool.length) { HS.pool = shuffle(ORDERS.map((_, i) => i)); HS.pp = 0; }
  HS.opts = HS.pool.slice(HS.pp, HS.pp + 3); HS.pp += 3;
  bc({ t: 'vote', round: HS.round, rounds: HS.rounds, opts: HS.opts, secs: 20 });
  clearTimeout(HS.timer); HS.timer = setTimeout(hostResolveVote, 21000);
}
function hostResolveVote() {
  if (!HS || HS.phase !== 'vote') return; clearTimeout(HS.timer);
  const counts = [0, 0, 0]; Object.values(HS.picks).forEach(i => { counts[i]++; });
  const mx = Math.max(...counts), w = pick([0, 1, 2].filter(i => counts[i] === mx));
  HS.order = HS.opts[w]; HS.rejected = HS.opts.filter(o => o !== HS.order); HS.phase = 'play'; HS.done = {};
  bc({ t: 'start', w, counts, order: HS.order, seed: 1 + Math.floor(Math.random() * 1e9), round: HS.round, rounds: HS.rounds });
  HS.timer = setTimeout(hostResults, 120000);   // Sicherheitsnetz (Weg zur Plattform + 45 s Schneiden)
}
function hostResults() {
  if (!HS || HS.phase !== 'play') return; clearTimeout(HS.timer); HS.phase = 'results';
  const res = net.players.map(p => Object.assign({ id: p.id }, HS.done[p.id] || { score: 0, stars: 0, img: '', mask: '' })).sort((a, b) => b.score - a.score);
  let place = 0;
  res.forEach((r, i) => { if (i > 0 && Math.round(r.score * 100) < Math.round(res[i - 1].score * 100)) place = i; r.place = place; r.pts = MP_POINTS[place]; HS.total[r.id] = (HS.total[r.id] || 0) + r.pts; });
  HS.round++;
  if (HS.pw) { net.players.forEach(p => { const d = HS.done[p.id]; if (d) POW.multiCloud(HS.pw, partyOf(p.id), HS.order, d.stars); }); POW.multiRoundEnd(HS.pw); HS.acted = {}; }
  bc({ t: 'results', pw: HS.pw, polls: HS.pw ? POW.pollsMulti(HS.pw) : null, res, total: HS.total, order: HS.order, rej: pick(HS.rejected), round: HS.round, rounds: HS.rounds, last: HS.round >= HS.rounds });
}
export function hostNext() { if (!HS) return; if (HS.round >= HS.rounds) { HS.phase = 'final'; bc({ t: 'final', total: HS.total, pw: HS.pw, polls: HS.pw ? POW.pollsMulti(HS.pw) : null }); } else hostVote(); }

// ----- Alle -----
function onNet(m) {
  if (!m || !net.T) return;
  if (m.t === 'deny') { const c = net.code; netReset(); ui('fail', 'deny', m.why, c); }
  else if (m.t === 'players') { net.players = m.players; net.rounds = m.rounds; ui('players'); }
  else if (m.t === 'chat') ui('chat', m);
  else if (m.t === 'pos') ui('pos', m.id, m.p);
  else if (m.t === 'gone') ui('gone', m.id);
  else if (m.t === 'vote') {
    net.phase = 'vote'; net.round = m.round; net.rounds = m.rounds; net.opts = m.opts; net.myPick = null; net.picked = []; net.prog = {}; net.doneIds = [];
    net.voteEnd = performance.now() + m.secs * 1000; ui('vote', m);
  } else if (m.t === 'picked') { net.picked = m.ids; ui('side'); }
  else if (m.t === 'start') { net.phase = 'play'; net.prog = {}; net.doneIds = []; ui('start', m); }
  else if (m.t === 'prog') { net.prog[m.id] = m.s; ui('side'); }
  else if (m.t === 'doneack') { net.doneIds = m.ids; ui('side'); }
  else if (m.t === 'results') { net.phase = 'results'; net.pw = m.pw; net.polls = m.polls; net.acted = []; ui('results', m); }
  else if (m.t === 'pstate') { net.pw = m.pw; net.polls = m.polls; net.acted = m.acted || []; ui('pstate', m); }
  else if (m.t === 'final') { net.phase = 'final'; ui('final', m); }
}

// ---------------- Sprachkanal (WebRTC-Audio über PeerJS) ----------------
// Wer beitritt, ruft alle an, die schon drin sind. Wer drin ist, nimmt Anrufe an.
export const voice = { on: false, mute: false, stream: null, calls: {}, level: {}, ctx: null };
const realId = id => (id === 'host' ? NETPFX + net.code : id);
const idOf = peerId => (peerId === NETPFX + net.code ? 'host' : peerId);
export function voiceSupported() { return !LOCALTEST && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && net.T && net.T.peer; }
function meter(id, stream) {
  try {
    voice.ctx = voice.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const src = voice.ctx.createMediaStreamSource(stream), an = voice.ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    voice.level[id] = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return m / 128; };
  } catch (e) {}
}
function attach(call) {
  const id = idOf(call.peer); voice.calls[id] = call;
  call.on('stream', st => {
    let a = document.getElementById('va_' + id);
    if (!a) { a = document.createElement('audio'); a.id = 'va_' + id; a.autoplay = true; document.body.appendChild(a); }
    a.srcObject = st; a.play && a.play().catch(() => {});
    meter(id, st); ui('voice');
  });
  const end = () => { delete voice.calls[id]; delete voice.level[id]; const a = document.getElementById('va_' + id); if (a) a.remove(); ui('voice'); };
  call.on('close', end); call.on('error', end);
}
let listening = false;
function listen() {
  const peer = net.T && net.T.peer && net.T.peer(); if (!peer || listening) return; listening = true;
  peer.on('call', call => { if (voice.on && voice.stream) { call.answer(voice.stream); attach(call); } else call.close(); });
}
export async function voiceJoin() {
  if (voice.on || !voiceSupported()) return false;
  listen();
  voice.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  voice.on = true; voice.mute = false; meter(net.id, voice.stream);
  const peer = net.T.peer();
  net.players.forEach(p => { if (p.id !== net.id && p.voice) attach(peer.call(realId(p.id), voice.stream)); });
  toHost({ t: 'voice', on: true, mute: false }); ui('voice');
  return true;
}
export function voiceMute(m = !voice.mute) {
  voice.mute = m; if (voice.stream) voice.stream.getAudioTracks().forEach(tr => { tr.enabled = !m; });
  toHost({ t: 'voice', on: voice.on, mute: m }); ui('voice');
}
export function voiceLeave(silent) {
  Object.values(voice.calls).forEach(c => { try { c.close(); } catch (e) {} }); voice.calls = {};
  if (voice.stream) voice.stream.getTracks().forEach(tr => tr.stop());
  voice.stream = null; voice.on = false; voice.level = {};
  document.querySelectorAll('audio[id^="va_"]').forEach(a => a.remove());
  if (!silent && net.T) toHost({ t: 'voice', on: false }); ui('voice');
}
