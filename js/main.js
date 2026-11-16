// WOLKENAMT v0.4 – Ablaufsteuerung: 3D-Welt, Schreibtisch, Wolkenplattform, Dorfplatz, Mehrspieler
import * as THREE from 'three';
import { World, ROOM } from './world3d.js';
import { furnish } from './office.js';
import { PAL, PLAYER_COLS } from './palette.js';
import { t, L, lang, setLang, applyDom, num, locale, onLang } from './i18n.js';
import './texts.js';
import { ORDERS, NO, NOREP, SPECIALS, DAYS, FREE, AUTHORS, HANDLES, GENERIC, FREE_POSTS, RANKS, MP_TALK, MP_FINAL } from './data.js';
import * as cutM from './cut2d.js';
import * as A from './audio.js';
import * as POW from './power.js';
import { drawSignature, drawStamp, forgeryKind } from './forgery.js';
import { NAMES } from './data.js';
import { net, netCreate, netJoin, netReset, netAvailable, hostStart, hostNext, setRounds, toHost, pname, LOCALTEST, MP_POINTS } from './net.js';

const { cut, pad, nameOf } = cutM;
const $ = id => document.getElementById(id);
const pick = (a, r = Math.random) => a[(r() * a.length) | 0];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const today = () => new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- Speicher ----------------
let save = { stars: [], sight: 0, rep: 50, day: 0, power: null };
Object.assign(NAMES, { 'Hotel Bergblick': ['Hotel Bergblick', 'Hotel Bergblick'], 'Redaktorin Imboden': ['Redaktorin Imboden', 'Editor Imboden'] });
try { const s = JSON.parse(localStorage.getItem('wolkenamt')); if (s && Array.isArray(s.stars)) save = Object.assign(save, s); } catch (e) {}
const persist = () => { try { localStorage.setItem('wolkenamt', JSON.stringify(save)); } catch (e) {} };
const rankOf = s => L(RANKS.filter(r => s >= r[0]).pop()[1]);
const totalStars = () => save.stars.reduce((a, b) => a + (b || 0), 0);

// ---------------- Welt ----------------
const world = new World($('c3d'));
const office = world.office = furnish(world);
world.bake([office.handset, world.player.b.root, ...world.skyClouds, office.clock.h, office.clock.m, office.clock.s, office.lamp.shade, office.lamp.bulb, office.flag, office.crank]);
world.spawnVillagers(11);
world.sfx = A.sfx;
window.__world = world;
window.__dbg = { save: () => save };
const D = world.deskPos, PLAT = office.platform;
const SPOT = {
  door: [0, 0, 3.4, Math.PI],
  desk: [D.x, 0, D.z + 1.15, Math.PI],
  platform: [PLAT.x + 0.2, ROOM.roof + 0.12, PLAT.z + 1.1, Math.PI],
  square: [1.4, 0, 15.6, Math.PI + 0.3],
};

// ---------------- Zustand ----------------
let mode = 'menu';     // menu | world | desk | brief | cut | arrive | result | report | local | online
let flow = 'single';   // single | local | online
let run = null;        // Arbeitstag oder freie Wolke
let mp = null;         // lokal zu dritt
let taskKey = null, taskVars = null;
const OVER = ['weather', 'archive', 'party', 'morning', 'menu', 'brief', 'result', 'desk', 'report', 'mpSetup', 'handoff', 'mpRes', 'onEntry', 'onLobby', 'onVote', 'card'];
const only = (...ids) => OVER.forEach(x => $(x).classList.toggle('hidden', !ids.includes(x)));
const touchMode = matchMedia('(pointer: coarse)').matches || /[?&]touch/.test(location.search);
if (touchMode) document.body.classList.add('touch');

function setTask(key, vars) { taskKey = key; taskVars = vars; $('hTask').textContent = key ? t(key, vars) : ''; }
function setDay(text) { $('hDay').textContent = text || ''; }
function hud(on) { $('hud').classList.toggle('hidden', !on); $('touch').classList.toggle('hidden', !on || !touchMode); }

// In die begehbare Welt
function enterWorld(spot, task, vars) {
  cutM.stop(); world.setFov(42);
  world.clearSkyClouds(); world.watch(false); world.setTod(null);
  world.orbit(false); world.release(); world.enabled = true;
  if (spot) world.teleport(...SPOT[spot]);
  mode = 'world'; only(flow === 'online' && net.phase === 'lobby' ? 'onLobby' : null);
  hud(true); setTask(task, vars); updateAkte();
  world.setWeather(flow === 'single' && run && run.wx ? run.wx : null);
  world.resize();
}
// Kamera aufs Pult
function goDesk(cb) {
  world.teleport(...SPOT.desk);
  world.enabled = false; hud(false); mode = 'desk';
  world.flyTo(V(D.x + 0.1, 3.0, D.z + 1.25), V(D.x, 0.8, D.z - 0.2), 1.0, cb, true);
}
// Kamera von der Plattform in den Himmel
function goSky(cb) {
  world.enabled = false; hud(false);
  const p = world.player.pos;
  world.flyTo(V(p.x + 0.4, p.y + 1.5, p.z + 2.6), V(p.x, p.y + 7, p.z - 14), 1.1, cb, false);
}
// Dorfplatz: Wolke kommt an, Leute zücken die Handys
function arrival(canvases, after) {
  mode = 'arrive'; hud(false); only();
  world.enabled = false;
  world.teleport(...SPOT.square);
  world.setTod(cut.tod);
  world.clearSkyClouds();
  const n = canvases.length, xs = n === 1 ? [0] : n === 2 ? [-7, 7] : [-12, 0, 12];
  canvases.forEach((c, i) => world.skyCloud(c, V(xs[i] * 0.6, 16, -8), V(xs[i], 9.0, 4), 2.8 + i * 0.3, n > 1 ? 9.5 : 11.5));
  world.watch(true, V(0, 10, 4.5));
  world.setFov(52); world.flyTo(V(2.6, 3.6, 20.8), V(0, 4.6, 7), 1.4, null, false);
  A.sfx('whoosh');
  setTimeout(() => A.sfx('murmur'), 1500);
  setTimeout(() => A.shutter(), 2300);
  setTimeout(() => { if (mode === 'arrive') after(); }, 4600);
}

// ---------------- Menü ----------------
function showMenu() {
  if (net.on || net.T) leaveOnline();
  clearTimeout(ringT); if (office.phoneIt) stopRing();
  cutM.stop(); world.setFov(42);
  flow = 'single'; run = null; mp = null; mode = 'menu';
  world.clearSkyClouds(); world.watch(false); world.setTod(null);
  world.enabled = false; world.orbit(true); hud(false);
  world.teleport(...SPOT.door);
  only('menu');
  const total = totalStars();
  $('mRank').textContent = rankOf(total);
  $('mStars').innerHTML = `<b>${total}</b> ${t('of')} 36`;
  $('mSight').textContent = num(save.sight || 0);
  $('mRep').innerHTML = `<b>${save.rep}</b> ${t('of')} 100`;
  const list = $('orders'); list.innerHTML = '';
  DAYS.forEach((Dy, d) => {
    const un = d <= (save.day || 0);
    const orders = Dy.cards.filter(c => typeof c !== 'string');
    const s = orders.reduce((a, c) => a + (save.stars[c] || 0), 0), max = orders.length * 3;
    const row = document.createElement('div'); row.className = 'ord' + (un ? '' : ' locked');
    const no = document.createElement('span'); no.className = 'no'; no.textContent = t('menu.day', { n: d + 1 });
    const mid = document.createElement('span'); mid.textContent = L(Dy.name);
    if (un) { const sm = document.createElement('small'); sm.textContent = t('menu.dayinfo', { a: Dy.cards.length, w: Dy.slots }); mid.appendChild(sm); }
    const st = document.createElement('span'); st.className = 'st'; st.textContent = un ? `${s} ${t('of')} ${max} ★` : t('menu.locked');
    row.append(no, mid, st);
    if (un) { row.tabIndex = 0; row.onclick = () => startDay(d); row.onkeydown = e => { if (e.key === 'Enter') startDay(d); }; }
    list.appendChild(row);
  });
  $('lDe').classList.toggle('on', lang === 'de'); $('lEn').classList.toggle('on', lang === 'en');
  soundLabels();
  $('mReset').classList.toggle('hidden', !save.power);
  if (save.power) $('mReset').textContent = t('menu.newcampaign', { p: POW.PARTIES[save.power.party].short });
}
$('mReset').onclick = () => { save.power = null; save.day = 0; save.rep = 50; persist(); openParty(() => showMenu()); };

// ---------------- Arbeitstag (allein) ----------------
const isSpecial = c => typeof c === 'string';
function startDay(d) {
  A.ensureAudio();
  if (!save.power) return openParty(() => startDay(d));
  flow = 'single';
  const P = save.power;
  const ords = DAYS[d].cards.filter(c => !isSpecial(c));
  run = { kind: 'day', d, forged: d >= 1 ? ords[(d * 5) % ords.length] : -1, fkind: forgeryKind(d * 13 + 7), dec: {}, queue: [], qi: -1, res: {}, stamped: false, shred: false, before: { polls: POW.polls(P), suspicion: P.suspicion, cash: P.cash, influence: P.influence } };
  const go = () => { enterWorld('door', 'task.desk'); setDay(t('hud.day', { day: L(DAYS[d].name), n: d + 1 })); updateAkte(); };
  const ev = POW.due(P, d); persist();
  if (ev.length) showMorning(ev, d, go); else go();
}

// ---------------- Etappe 1: Parteiwahl, Morgenpost, Akte ----------------
function openParty(done) {
  mode = 'party'; only('party'); world.orbit(true);
  const wrap = $('pCards'); wrap.innerHTML = '';
  POW.PLAYABLE.forEach(id => {
    const pa = POW.PARTIES[id], el = document.createElement('button'); el.className = 'pcard'; el.style.borderTopColor = pa.color;
    const base = Object.entries(pa.aff).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => L(POW.GROUPS[g].name)).join(', ');
    const mk = (tag, txt) => { const e = document.createElement(tag); e.textContent = txt; el.appendChild(e); };
    mk('b', L(pa.name)); mk('em', '«' + L(pa.slogan) + '»'); mk('small', t('party.base', { g: base }));
    el.onclick = () => { save.power = POW.freshPower(id); persist(); A.stampSound(); done(); };
    wrap.appendChild(el);
  });
}
$('pBack').onclick = () => showMenu();
const fmtCash = n => 'CHF ' + num(Math.abs(n));
function fxChips(ch) {
  const box = document.createElement('div'); box.className = 'lfx';
  ch.forEach(c => {
    const e = document.createElement('span'); let txt, good = c.d > 0;
    if (c.k === 'trust') txt = `${L(POW.GROUPS[c.g].name)} ${c.d > 0 ? '+' : ''}${c.d}`;
    else if (c.k === 'mod') { txt = `${POW.PARTIES[c.p].short} ${c.d > 0 ? '▲' : '▼'}`; good = (c.p === save.power.party) === c.d > 0; }
    else if (c.k === 'influence') txt = `${t('akte.inf')} ${c.d > 0 ? '+' : ''}${c.d}`;
    else if (c.k === 'cash') txt = `${t('akte.cash')} ${c.d > 0 ? '+' : '−'}${fmtCash(c.d)}`;
    else if (c.k === 'suspicion') { txt = `${t('akte.susp')} ${c.d > 0 ? '+' : ''}${c.d}`; good = c.d < 0; }
    else if (c.k === 'lev') txt = `${c.d > 0 ? t('fx.lev') : t('fx.levUsed')}: ${c.p.charAt(0).toUpperCase() + c.p.slice(1)}`;
    e.className = 'fx ' + (good ? 'pos' : 'neg'); e.textContent = txt; box.appendChild(e);
  });
  return box;
}
function showMorning(list, d, done, call) {
  const wasWorld = mode === 'world';
  mode = 'morning'; if (!call) world.orbit(true); else world.enabled = false; hud(false);
  document.querySelector('#morning .lhead span').textContent = call ? t('call.title') : t('mail.title');
  const P = save.power; let i = 0;
  const next = () => {
    if (i >= list.length) { persist(); return done(); }
    const ev = POW.EVENTS[list[i]] || POW.CALLS[list[i]]; i++;
    only('morning');
    $('mlDay').textContent = call ? t('call.time') : t('mail.day', { day: L(DAYS[d].name) });
    $('mlFrom').textContent = nameOf(ev.from); $('mlText').textContent = L(ev.text);
    $('mlRes').classList.add('hidden'); $('mlFx').replaceWith(Object.assign(document.createElement('div'), { id: 'mlFx', className: 'lfx' }));
    const btns = $('mlBtns'); btns.innerHTML = '';
    const cont = () => { btns.innerHTML = ''; const b = document.createElement('button'); b.className = 'prim'; b.textContent = t('btn.next'); b.onclick = next; btns.appendChild(b); updateAkte(); };
    if (ev.choices) ev.choices.forEach(([label, fx, res, req]) => {
      const b = document.createElement('button'); b.textContent = L(label);
      if (req && !req(P)) { if (fx.cash < 0) { b.disabled = true; b.title = t('mail.nocash'); } else return; }
      b.onclick = () => {
        const ch = POW.apply(P, fx); P.history.push({ day: d, ev: list[i - 1], pick: L(label) });
        $('mlRes').textContent = L(res); $('mlRes').classList.remove('hidden'); $('mlFx').replaceWith(Object.assign(fxChips(ch), { id: 'mlFx' }));
        A.stampSound(); cont();
      };
      btns.appendChild(b);
    });
    else { P.history.push({ day: d, ev: list[i - 1] }); const ch = POW.apply(P, ev.fx); $('mlFx').replaceWith(Object.assign(fxChips(ch), { id: 'mlFx' })); cont(); }
  };
  next();
}
function updateAkte() {
  const P = save.power, box = $('akte');
  if (!P || flow !== 'single') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  $('aParty').textContent = POW.PARTIES[P.party].short;
  const pl = POW.polls(P), wrap = $('aPolls'); wrap.innerHTML = '';
  Object.keys(POW.PARTIES).sort((a, b) => pl[b] - pl[a]).forEach(p => {
    const r = document.createElement('div'); r.className = 'prow2' + (p === P.party ? ' me' : '');
    const n = document.createElement('span'); n.textContent = POW.PARTIES[p].short;
    const bar = document.createElement('span'); bar.className = 'bar'; const f = document.createElement('i'); f.style.width = Math.min(100, pl[p] * 2) + '%'; f.style.background = POW.PARTIES[p].color; bar.appendChild(f);
    const v = document.createElement('b'); v.textContent = pl[p].toFixed(1) + ' %';
    r.append(n, bar, v); wrap.appendChild(r);
  });
  $('aSusp').style.width = P.suspicion + '%'; $('aSuspN').textContent = P.suspicion;
  $('aInf').textContent = P.influence; $('aCash').textContent = fmtCash(P.cash);
}
function startFree() {
  A.ensureAudio();
  flow = 'single'; run = { kind: 'free' };
  enterWorld('door', 'task.free');
  setDay(t('free.title'));
}

world.onUse = (id) => {
  if (mode !== 'world') return;
  if (id === 'phone') return answerPhone();
  if (id === 'archive') return openArchive();
  if (id === 'shredder') return useShredder();
  if (id === 'weather') return openWeather();
  if (id === 'desk') {
    if (flow === 'single' && run && run.kind === 'day' && !run.stamped) { A.sfx('land'); goDesk(openDesk); }
    else toast(t('toast.nodesk'));
  } else if (id === 'platform') {
    A.sfx('crank'); office.crankT = 1.2;
    if (flow === 'single' && run && run.kind === 'free') goSky(() => openBrief(-1));
    else if (flow === 'single' && run && run.kind === 'day') {
      if (!run.stamped) return toast(t('toast.stampfirst'));
      if (run.qi + 1 >= run.queue.length) return toast(t('toast.nomore'));
      run.qi++; const i = run.queue[run.qi]; goSky(() => openBrief(i));
    } else if (flow === 'online' && net.pending) startOnlineCut();
    else toast(t('toast.noorder'));
  }
};

function openDesk() {
  const Dy = DAYS[run.d];
  only('desk');
  $('dTitle').textContent = t('desk.title', { day: L(Dy.name), n: run.d + 1 });
  const wrap = $('dCards'); wrap.innerHTML = '';
  Dy.cards.forEach((c, idx) => {
    const S = isSpecial(c), o = S ? SPECIALS[c] : ORDERS[c];
    const el = document.createElement('div'); el.className = 'card' + (S ? ' special' : '');
    el.style.transform = `rotate(${(idx - (Dy.cards.length - 1) / 2) * 2.4 + (Math.random() - 0.5) * 1.6}deg)`;
    const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; e.textContent = txt; el.appendChild(e); return e; };
    const head = mk('ch', ''); const a = document.createElement('span'), b = document.createElement('span');
    a.textContent = S ? t('card.special') : t('card.order'); b.textContent = S ? '§ 7b' : t('card.no', { n: pad(c + 1) }); head.append(a, b);
    mk('cf', nameOf(o.from));
    mk('cn', S ? L(o.title) : t('card.shape', { s: L(o.nom) }));
    { const pol = S ? POW.SPECIAL_POL[c] : POW.ORDER_POL[c]; if (pol && pol.groups.length) mk('cg', t('card.affects', { g: pol.groups.map(g => L(POW.GROUPS[g].name)).join(', ') })); }
    if (S) mk('tagS', t('card.slot'));
    else { const cv = document.createElement('canvas'); cv.width = 200; cv.height = 150; cutM.drawOrder(cv, c); el.appendChild(cv); }
    mk('ct', L(o.text));
    if (!S) {
      // Prüfen: Unterschrift und Stempel mit der Kartei vergleichen
      const forged = c === run.forged, who = o.from, ins = document.createElement('div'); ins.className = 'insp';
      const row = document.createElement('div'); row.className = 'sigrow';
      const lab = txt => { const e = document.createElement('span'); e.className = 'lab'; e.textContent = txt; return e; };
      const cvs = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
      const s1 = cvs(120, 44), s2 = cvs(120, 44), t1 = cvs(70, 52), t2 = cvs(70, 52);
      drawSignature(s1, who, forged, run.fkind); drawSignature(s2, who, false); drawStamp(t1, forged, run.fkind); drawStamp(t2, false);
      const rl = x => { const e = lab(x); e.classList.add('rowlab'); return e; };
      row.append(lab(''), lab(t('chk.request')), lab(t('chk.file')), rl(t('chk.sign')), s1, s2, rl(t('chk.stamp')), t1, t2);
      ins.appendChild(row);
      const fb = document.createElement('button'); fb.className = 'fake'; fb.textContent = t('chk.fake');
      fb.onclick = () => decide(String(c), 'fake', el); ins.appendChild(fb);
      el.appendChild(ins);
    }
    const cb = document.createElement('div'); cb.className = 'cb';
    const y = document.createElement('button'); y.className = 'yes'; y.textContent = t('card.yes');
    const n = document.createElement('button'); n.className = 'no'; n.textContent = t('card.no2');
    y.onclick = () => decide(String(c), 'yes', el); n.onclick = () => decide(String(c), 'no', el);
    if (!S) { const k = document.createElement('button'); k.className = 'chk'; k.textContent = t('chk.btn'); k.title = t('chk.tip'); k.onclick = () => el.classList.toggle('open'); cb.appendChild(k); }
    const prev = run.dec[String(c)]; if (prev) setTimeout(() => decide(String(c), prev, el, true));
    cb.append(y, n); el.appendChild(cb); wrap.appendChild(el);
  });
  updateDesk('');
}
const usedSlots = () => Object.values(run.dec).filter(v => v === 'yes').length;
function decide(key, v, el, quiet) {
  A.ensureAudio();
  const Dy = DAYS[run.d];
  if (!quiet && v === 'yes' && run.dec[key] !== 'yes' && usedSlots() >= Dy.slots) { updateDesk(t('desk.full'), true); A.noise(0.15, 'lowpass', 120, 0.6); return; }
  run.dec[key] = v;
  el.querySelector('.yes').classList.toggle('sel', v === 'yes');
  el.querySelector('.no').classList.toggle('sel', v === 'no');
  el.querySelector('.fake')?.classList.toggle('sel', v === 'fake');
  el.querySelector('.imp')?.remove();
  const imp = document.createElement('div'); imp.className = 'imp ' + v; imp.textContent = v === 'yes' ? t('stamp.yes') : v === 'fake' ? t('stamp.fake') : t('stamp.no'); el.appendChild(imp);
  if (!quiet) A.stampSound();
  updateDesk('');
}
function updateDesk(msg, warn) {
  const Dy = DAYS[run.d], open = Dy.cards.filter(c => !run.dec[String(c)]).length, used = usedSlots();
  $('dSlots').textContent = `${Dy.slots - used} ${t('of')} ${Dy.slots}`;
  $('dRep').textContent = save.rep; $('dRepBar').style.width = save.rep + '%';
  const h = $('dHint'); h.classList.toggle('warn', !!warn);
  h.textContent = msg || (open ? t(open === 1 ? 'desk.open1' : 'desk.open', { n: open }) : used === 0 ? t('desk.allno') : t('desk.done'));
  $('dGo').disabled = open > 0;
}
$('dGo').onclick = () => {
  if (!run || $('dGo').disabled) return;
  const Dy = DAYS[run.d];
  run.queue = Dy.cards.filter(c => !isSpecial(c) && run.dec[String(c)] === 'yes'); run.qi = -1; run.stamped = true;
  scheduleCall();
  if (!run.queue.length) return showReport();
  enterWorld(null, 'task.platform', { n: run.queue.length });
};
$('dBack').onclick = () => enterWorld(null, 'task.desk');

// Antragsformular vor dem Schneiden (auf der Plattform)
function openBrief(i) {
  mode = 'brief'; const free = i < 0, o = free ? FREE : ORDERS[i];
  run.cur = i;
  $('bNo').textContent = free ? t('free.title') : t('order.no', { n: pad(i + 1) });
  $('bFrom').textContent = nameOf(o.from);
  $('bShape').textContent = free ? t('free.shape') : L(o.nom);
  $('bText').textContent = L(o.text);
  const bc = $('bImg').getContext('2d'); bc.clearRect(0, 0, 200, 150);
  if (free) { bc.fillStyle = 'rgba(34,48,58,0.4)'; bc.font = '64px Georgia'; bc.textAlign = 'center'; bc.fillText('?', 100, 98); }
  else cutM.drawOrder($('bImg'), i);
  const m = o.mods, list = [];
  if (m.outline) list.push(t('mod.outline')); if (m.holes) list.push(t('mod.holes')); if (m.regrow) list.push(t('mod.regrow')); if (m.gusts) list.push(t('mod.gusts')); if (m.free) list.push(t('mod.free'));
  $('bMods').textContent = list.length ? list.join(', ') : t('mod.calm');
  $('bStamp').textContent = free ? t('stamp.free') : (m.gusts && m.regrow ? t('stamp.urgent') : t('stamp.yes'));
  only('brief');
}
$('bGo').onclick = () => { if (mode === 'brief') beginCut(run.cur); };
$('bBack').onclick = () => { if (run && run.kind === 'day' && run.qi >= 0) run.qi--; enterWorld(null, taskKey, taskVars); };
function beginCut(i, seed, opts) {
  only(); mode = 'cut'; hud(false);
  cutM.setup(i); cutM.start(seed, opts);
}

cut.onDone = () => {
  if (flow === 'local') return mpTurnDone();
  if (flow === 'online') return netTurnDone();
  arrival([cutM.cloudCanvas()], showResult);
};
cut.onProg = s => { if (flow === 'online') toHost({ t: 'prog', s }); };

function showResult() {
  mode = 'result';
  const free = cut.free, order = cut.order;
  $('rDate').textContent = t('paper.date', { d: today() });
  const feed = $('rFeed'); feed.innerHTML = '';
  let posts = [], tier;
  const cells = cutM.cellCount();
  if (free) {
    const a = cut.guess[0], b = cut.guess[1], an = L(ORDERS[a.i].nom), bn = L(ORDERS[b.i].nom);
    tier = a.s > 0.62 ? 2 : a.s > 0.45 ? 1 : 0;
    if (cells < 40) {
      $('rHead').textContent = t('free.goneH'); $('rSub').textContent = t('free.goneS');
      posts = FREE_POSTS.gone.map(x => [null, L(x)]);
    } else {
      $('rHead').textContent = tier === 2 ? t('free.headSure', { a: an }) : t('free.head', { a: an });
      $('rSub').textContent = tier === 0 ? t('free.subSplit', { a: an, b: bn }) : t('free.subPoll', { p: Math.round(40 + a.s * 55), a: an, b: bn });
      posts = [[null, t('free.p1', { a: an })], [null, t('free.p2', { A: cap(an), b: bn })], [null, L(pick(FREE_POSTS.joke)).replace('{a}', an).replace('{b}', bn)]];
    }
    posts.push([null, L(pick(GENERIC[tier]))]);
    $('rPct').textContent = cells < 40 ? t('free.readNone') : t('free.read', { p: Math.round(a.s * 100), a: an });
    $('rStars').textContent = '';
  } else {
    tier = cut.finalStars === 0 ? 0 : cut.finalStars === 1 ? 1 : 2;
    $('rHead').textContent = L(order.head[tier]);
    $('rSub').textContent = L(order.sub[tier]);
    $('rPct').textContent = t('res.match', { p: Math.round(cut.finalScore * 100) });
    $('rStars').textContent = stars(cut.finalStars);
    posts = order.c[tier].map(([w, x]) => [w, L(x)]);
    const g = shuffle([...GENERIC[tier]]);
    posts.splice(1, 0, [null, L(g[0])]); posts.push([null, L(g[1])]);
  }
  const base = 60 + (free ? 4 : cut.lvl) * 45;
  const mult = free ? 0.6 + Math.random() : 0.15 + Math.pow(cut.finalScore, 4) * 3.2;
  const used = new Set(); let total = 0;
  const ago = [t('ago.now'), t('ago.1'), t('ago.2'), t('ago.4')];
  posts.forEach(([who, text], i) => {
    let name = who ? nameOf(who) : '', handle = who ? (HANDLES[who] ?? '') : '';
    if (!who) { let a; do { a = pick(AUTHORS); } while (used.has(a[0]) && used.size < AUTHORS.length - 1); used.add(a[0]); name = nameOf(a[0]); handle = a[1]; }
    const likes = Math.max(1, Math.round(base * mult * (0.4 + Math.random())));
    total += likes;
    const el = document.createElement('div'); el.className = 'post'; el.style.animationDelay = (0.25 + i * 0.35) + 's';
    const w = document.createElement('div'); w.className = 'who'; w.textContent = name + ' ';
    const sp = document.createElement('span'); sp.textContent = handle; w.appendChild(sp);
    const tx = document.createElement('div'); tx.className = 'tx'; tx.textContent = text;
    const lk = document.createElement('div'); lk.className = 'lk'; lk.textContent = `♥ ${num(likes)} · ${pick(ago)}`;
    el.append(w, tx, lk); feed.appendChild(el);
  });
  const gain = Math.round(total * (3 + Math.random() * 4));
  save.sight = (save.sight || 0) + gain;
  if (!free) save.stars[cut.lvl] = Math.max(save.stars[cut.lvl] || 0, cut.finalStars);
  persist();
  $('rGain').textContent = t('res.gain', { g: num(gain), t: num(save.sight) });
  if (run && run.kind === 'day') {
    run.res[cut.lvl] = Math.max(run.res[cut.lvl] ?? 0, cut.finalStars);
    $('rNext').textContent = run.qi < run.queue.length - 1 ? t('res.next') : t('res.report');
    $('rNext').classList.remove('hidden');
  } else $('rNext').classList.add('hidden');
  only('result');
}
$('rRetry').onclick = () => {
  world.teleport(...SPOT.platform); world.clearSkyClouds(); world.watch(false); world.setTod(null);
  only(); world.release(); goSky(() => beginCut(cut.lvl));
};
$('rNext').onclick = () => {
  if (!run || run.kind !== 'day') return;
  if (run.qi < run.queue.length - 1) enterWorld('platform', 'task.platformNext');
  else showReport();
};
$('rCard').onclick = () => {
  const free = cut.free;
  const l1 = free ? t('pc.free', { a: cut.guess && cut.guess[0] ? L(ORDERS[cut.guess[0].i].nom) : t('pc.something') }) : t('pc.order', { a: L(cut.order.nom) });
  const l2 = free ? today() : t('pc.line2', { d: today(), n: pad(cut.lvl + 1), p: Math.round(cut.finalScore * 100) });
  $('cImg').src = cutM.postcard(l1, l2); $('cImg').alt = l1;
  $('card').classList.remove('hidden');
};
$('cClose').onclick = () => $('card').classList.add('hidden');
$('rMenu').onclick = () => showMenu(); $('pMenu').onclick = () => showMenu();

function showReport() {
  mode = 'report'; world.enabled = false; hud(false);
  const Dy = DAYS[run.d], list = $('pList'); list.innerHTML = '';
  document.querySelectorAll('#report .powrep').forEach(e => e.remove());
  let delta = 0, bonus = 0;
  const line = (ok, title, sub, rep) => {
    const r = document.createElement('div'); r.className = 'rl';
    r.innerHTML = `<span class="d ${ok ? 'pos' : 'neg'}">${ok ? '✓' : '✗'}</span><span><b></b><em></em></span><span class="rp ${rep >= 0 ? 'pos' : 'neg'}">${rep >= 0 ? '+' : ''}${rep}</span>`;
    r.querySelector('b').textContent = title; r.querySelector('em').textContent = sub; list.appendChild(r);
  };
  Dy.cards.forEach(c => {
    const v = run.dec[String(c)];
    if (isSpecial(c)) {
      const o = SPECIALS[c], res = v === 'yes' ? o.ok : o.no;
      delta += res.rep; bonus += res.sight || 0;
      line(v === 'yes', `${nameOf(o.from)} – ${L(o.title)}${v === 'yes' ? '' : ' ' + t('rep.rejected')}`, L(res.text) + (res.sight ? `  (+${num(res.sight)} ${t('akte.sight')})` : ''), res.rep);
    } else {
      const o = ORDERS[c], forged = c === run.forged;
      if (v === 'fake') {
        const rep = forged ? 3 : -5; delta += rep;
        line(forged, `${nameOf(o.from)} – ${forged ? t('rep.fakeOk') : t('rep.fakeBad')}`, forged ? t('rep.fakeOkSub') : t('rep.fakeBadSub'), rep);
      } else if (v === 'no' && forged) {
        line(true, `${nameOf(o.from)} – ${t('rep.rejected2')}`, t('rep.wasFake'), 0);
      } else if (v === 'yes') {
        const st = run.res[c] ?? 0, rep = [-8, 2, 5, 8][st];
        delta += rep; line(true, `${nameOf(o.from)} – ${L(o.nom)}`, `${stars(st)}  ${L(o.head[st === 0 ? 0 : st === 1 ? 1 : 2])}`, rep);
      } else {
        const rep = NOREP(c); delta += rep;
        line(false, `${nameOf(o.from)} – ${t('rep.rejected2')}`, `${nameOf(NO[c][0])}: «${L(NO[c][1])}»`, rep);
      }
    }
  });
  const before = save.rep;
  save.rep = Math.max(0, Math.min(100, before + delta));
  save.sight = (save.sight || 0) + bonus;
  $('pTitle').textContent = t('rep.title', { day: L(Dy.name) });
  const sum = $('pSum'); sum.innerHTML = '';
  const last = run.d >= DAYS.length - 1;
  const span = (cls, txt) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt; return s; };
  const d = run.d;
  if (save.rep <= 0) {
    sum.append(span('neg', t('rep.zero', { b: before })), document.createElement('br'), span('', t('rep.fog')));
    save.rep = 50;
    $('pNext').textContent = t('rep.again'); $('pNext').onclick = () => startDay(d);
  } else {
    save.day = Math.max(save.day || 0, d + 1);
    sum.append(span('', t('rep.rep', { b: before }) + ' '), span(delta >= 0 ? 'pos' : 'neg', `${save.rep}`), span('', ` (${delta >= 0 ? '+' : ''}${delta})`));
    if (bonus) sum.append(document.createElement('br'), span('', t('rep.bonus', { b: num(bonus) })));
    if (last) sum.append(document.createElement('br'), document.createElement('br'), span('', t('rep.week', { r: rankOf(totalStars()) })));
    $('pNext').textContent = last ? t('btn.central') : t('rep.next', { day: L(DAYS[d + 1].name) });
    $('pNext').onclick = last ? () => showMenu() : () => startDay(d + 1);
  }
  powerReport(Dy, sum);
  persist();
  only('report');
  A.chime(delta >= 0 ? [523, 659, 784] : [392, 330], 0.1);
}

// ---------------- Etappe 2: Telefon, Archiv, Aktenvernichter ----------------
let ringT = null, ringIv = null;
function scheduleCall() {
  clearTimeout(ringT); stopRing();
  if (!save.power || !run || run.kind !== 'day') return;
  const id = POW.pickCall(save.power, run.d); if (!id) return;
  run.call = id;
  ringT = setTimeout(() => {
    if (!run || run.call !== id || flow !== 'single') return;
    office.phoneIt.enabled = true;
    ringIv = setInterval(() => { A.chime([880, 988], 0.05); office.handset.position.y = 0.17; setTimeout(() => { office.handset.position.y = 0.14; }, 120); }, 1300);
    if (mode === 'world') toast(t('toast.ring'));
    setTimeout(() => { if (run && run.call === id) { stopRing(); run.call = null; } }, 40000);
  }, 9000);
}
function stopRing() { clearInterval(ringIv); ringIv = null; office.phoneIt.enabled = false; office.handset.position.y = 0.14; }
function answerPhone() {
  if (!run || !run.call) return;
  const id = run.call; run.call = null; stopRing(); A.sfx('land');
  showMorning([id], run.d, () => { only(); enterWorld(null, taskKey, taskVars); }, true);
}
function openArchive() {
  if (!save.power || flow !== 'single') return toast(t('toast.noarchive'));
  const P = save.power; mode = 'archive'; world.enabled = false; hud(false); only('archive');
  const render = () => {
    $('arInfo').textContent = t('arch.info', { n: P.influence });
    const box = $('arList'); box.innerHTML = '';
    POW.DOSSIERS.forEach(dz => {
      const el = document.createElement('div'); el.className = 'dos' + (P.read[dz.id] === 'done' ? ' used' : '');
      const b = document.createElement('b'); b.textContent = L(dz.who); el.appendChild(b);
      const p = document.createElement('p');
      const btns = document.createElement('div'); btns.className = 'rbtns';
      const mkb = (txt, fn, prim, dis) => { const x = document.createElement('button'); x.textContent = txt; if (prim) x.className = 'prim'; x.disabled = !!dis; x.onclick = fn; btns.appendChild(x); };
      if (!P.read[dz.id]) {
        p.textContent = t('arch.closed');
        mkb(t('arch.read', { n: dz.cost }), () => { POW.apply(P, { influence: -dz.cost }); P.read[dz.id] = 'open'; A.sfx('land'); persist(); render(); }, true, P.influence < dz.cost);
      } else if (P.read[dz.id] === 'open') {
        p.textContent = L(dz.secret);
        mkb(t('arch.leak'), () => { POW.apply(P, dz.leak); P.read[dz.id] = 'done'; P.history.push({ day: run ? run.d : 0, ev: 'leak_' + dz.id }); A.stampSound(); persist(); render(); updateAkte(); }, true);
        mkb(t('arch.keep'), () => { POW.apply(P, dz.keep); P.read[dz.id] = 'done'; A.stampSound(); persist(); render(); updateAkte(); });
      } else { p.textContent = L(dz.secret); const k = document.createElement('small'); k.textContent = P.lev && P.lev[dz.id] ? t('arch.isLev') : t('arch.used'); el.appendChild(p); el.appendChild(k); box.appendChild(el); return; }
      el.appendChild(p); el.appendChild(btns); box.appendChild(el);
    });
  };
  render();
}
$('arClose').onclick = () => enterWorld(null, taskKey, taskVars);
function useShredder() {
  const P = save.power; if (!P || flow !== 'single' || !run) return toast(t('toast.noshred'));
  if (run.shred) return toast(t('toast.shredDone'));
  if (P.suspicion <= 0) return toast(t('toast.noshred'));
  run.shred = true; A.noise(0.9, 'bandpass', 900, 0.4, 2);
  POW.apply(P, { suspicion: -6 });
  if (!run.fog && Math.random() < 0.35) POW.schedule(P, run.d + 1, 'shredder_witness');
  persist(); updateAkte(); toast(t('toast.shred'));
}

function openWeather() {
  const P = save.power; if (!P || flow !== 'single' || !run || run.kind !== 'day') return toast(t('toast.noweather'));
  if (run.wx) return toast(t('toast.weatherDone'));
  mode = 'weather'; world.enabled = false; hud(false); only('weather');
  const box = $('wxList'); box.innerHTML = '';
  POW.WEATHER.forEach(w => {
    const el = document.createElement('div'); el.className = 'dos';
    const tl = document.createElement('span'); tl.className = 'tool'; tl.textContent = t('wx.' + w.kind); el.appendChild(tl);
    const b = document.createElement('b'); b.textContent = L(w.where); el.appendChild(b);
    if (w.groups.length) { const g = document.createElement('small'); g.textContent = t('card.affects', { g: w.groups.map(x => L(POW.GROUPS[x].name)).join(', ') }); el.appendChild(g); }
    if (w.risk || (w.hang && (P.flags.hang || 0) >= 1)) { const r = document.createElement('span'); r.className = 'risk'; r.textContent = t('wx.risk'); el.appendChild(r); }
    const bt = document.createElement('div'); bt.className = 'rbtns'; const x = document.createElement('button'); x.className = 'prim'; x.textContent = t('wx.go');
    x.onclick = () => {
      run.wx = w.kind; if (w.id === 'fog_square') run.fog = true;
      const ch = POW.apply(P, w.fx);
      if (w.hang) { P.flags.hang = (P.flags.hang || 0) + 1; if (P.flags.hang >= 2 && !P.flags.murgang) { P.flags.murgang = true; POW.schedule(P, run.d + 1, 'murgang'); } }
      if (w.risk && Math.random() < w.risk[0]) POW.schedule(P, run.d + 1, w.risk[1]);
      P.history.push({ day: run.d, ev: 'wx_' + w.id });
      A.sfx('crank'); persist();
      enterWorld(null, taskKey, taskVars);
      toast(L(w.note));
    };
    bt.appendChild(x); el.appendChild(bt); box.appendChild(el);
  });
}
$('wxClose').onclick = () => enterWorld(null, taskKey, taskVars);

// Machtbericht am Tagesende: Wirkung aller Entscheide, verzögerte Folgen einplanen
function powerReport(Dy, sum) {
  const P = save.power; if (!P || !run || run.powDone) return; run.powDone = true;
  const all = [];
  Dy.cards.forEach(c => {
    const S = isSpecial(c), pol = S ? POW.SPECIAL_POL[c] : POW.ORDER_POL[c]; if (!pol) return;
    const v = run.dec[String(c)], yes = v === 'yes', st = S ? 3 : (run.res[c] ?? 0), forged = c === run.forged;
    if (v === 'fake') { all.push(...POW.apply(P, forged ? { influence: 1, suspicion: -2 } : Object.fromEntries([['trust', Object.fromEntries(pol.groups.map(g => [g, -4]))]]))); return; }
    if (forged) { if (yes) POW.schedule(P, run.d + 1, 'forgery_exposed'); return; }
    all.push(...POW.apply(P, yes ? pol.yes : pol.no, yes && !S ? POW.STAR_SCALE[st] : 1));
    (pol.later || []).forEach(([k, id, cond]) => { if (cond(st, yes)) POW.schedule(P, run.d + k, id); });
  });
  const box = document.createElement('div'); box.className = 'powrep';
  const h = document.createElement('h3'); h.textContent = t('pow.title', { p: L(POW.PARTIES[P.party].name) }); box.appendChild(h);
  const now = POW.polls(P), before = run.before.polls;
  Object.keys(POW.PARTIES).sort((a, b) => now[b] - now[a]).forEach(p => {
    const r = document.createElement('div'); r.className = 'prow2' + (p === P.party ? ' me' : '');
    const n = document.createElement('span'); n.textContent = L(POW.PARTIES[p].name);
    const bar = document.createElement('span'); bar.className = 'bar'; const f = document.createElement('i'); f.style.width = Math.min(100, now[p] * 2) + '%'; f.style.background = POW.PARTIES[p].color; bar.appendChild(f);
    const d = now[p] - before[p], v = document.createElement('b'); v.textContent = `${now[p].toFixed(1)} % (${d >= 0 ? '+' : ''}${d.toFixed(1)})`;
    r.append(n, bar, v); box.appendChild(r);
  });
  if (all.length) box.appendChild(fxChips(all));
  const lead = Object.keys(now).sort((a, b) => now[b] - now[a])[0];
  const q = P.queue.length;
  const note = document.createElement('p'); note.className = 'hsub';
  note.textContent = (lead === P.party ? t('pow.lead') : t('pow.behind', { p: L(POW.PARTIES[lead].name) })) + (q ? ' ' + t('pow.queue', { n: q }) : '') + (P.suspicion >= 70 ? ' ' + t('pow.danger') : '');
  box.appendChild(note);
  sum.after(box);
  $('report').addEventListener('transitionend', () => {}, { once: true });
}

// ---------------- Lokal zu dritt (ein Gerät) ----------------
function openMpSetup() {
  flow = 'local'; only('mpSetup');
  for (let i = 0; i < 3; i++) if (!$('mpN' + i).value) $('mpN' + i).value = t('local.player', { n: i + 1 });
}
function startMp() {
  A.ensureAudio();
  const names = [0, 1, 2].map(i => ($('mpN' + i).value || '').trim() || t('local.player', { n: i + 1 }));
  mp = { names, rounds: +$('mpRounds').value, round: 0, turn: 0, pool: shuffle(ORDERS.map((_, i) => i)), total: [0, 0, 0], res: [], seed: 0 };
  mpRound();
}
function mpRound() { mp.turn = 0; mp.res = []; mp.seed = 1 + Math.floor(Math.random() * 1e9); mpHandoff(); }
function mpHandoff() {
  const idx = mp.pool[mp.round % mp.pool.length];
  cutM.setup(idx); mode = 'local'; world.orbit(true); world.clearSkyClouds();
  $('hRound').textContent = t('local.round', { r: mp.round + 1, n: mp.rounds, k: mp.turn + 1 });
  $('hName').textContent = mp.names[mp.turn];
  $('hOrder').textContent = `${nameOf(cut.order.from)}: ${L(cut.order.nom)}`;
  cutM.drawOrder($('hImg'), idx);
  only('handoff');
}
function mpPlay() { beginCut(cut.lvl, mp.seed, { short: true }); }
function mpTurnDone() {
  mp.res.push({ p: mp.turn, score: cut.finalScore, stars: cut.finalStars, img: cutM.thumb() });
  mp.turn++;
  if (mp.turn < 3) mpHandoff(); else mpVote();
}
function resCard(r, name, i) {
  const el = document.createElement('div'); el.className = 'mpc' + (r.place === 0 ? ' win' : ''); el.style.animationDelay = (i * 0.25) + 's';
  const tier = r.stars === 0 ? 0 : r.stars === 1 ? 1 : 2;
  if (r.img && r.img.startsWith('data:image/')) { const im = document.createElement('img'); im.alt = ''; im.src = r.img; el.appendChild(im); }
  const mk = (cls, txt) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = txt; el.appendChild(d); };
  mk('nm', name); mk('pc', t('mp.place', { p: r.place + 1, s: Math.round(r.score * 100) })); mk('', `${stars(r.stars)} · +${r.pts} ${t('pts')}`);
  mk('cm', r.img ? '«' + L(pick(MP_TALK[tier])) + '»' : t('mp.nothing'));
  return el;
}
function standings(list) {
  const st = $('mStand'); st.innerHTML = ''; st.classList.remove('hidden');
  list.sort((a, b) => b.t - a.t).forEach(r => { const d = document.createElement('div'), a = document.createElement('span'), b = document.createElement('b'); a.textContent = r.name; b.textContent = `${r.t} ${t('pts')}`; d.append(a, b); st.appendChild(d); });
}
function mpVote() {
  mode = 'local';
  const sorted = [...mp.res].sort((a, b) => b.score - a.score);
  let place = 0;
  sorted.forEach((r, i) => { if (i > 0 && Math.round(r.score * 100) < Math.round(sorted[i - 1].score * 100)) place = i; r.place = place; r.pts = MP_POINTS[place]; mp.total[r.p] += r.pts; });
  const best = sorted[0], tier = best.stars === 0 ? 0 : best.stars === 1 ? 1 : 2;
  $('mRound').textContent = t('mp.voted', { r: mp.round + 1, n: mp.rounds });
  $('mHead').textContent = `«${L(cut.order.head[tier])}»`;
  $('mNote').textContent = ''; $('mWait').textContent = '';
  const grid = $('mGrid'); grid.innerHTML = '';
  mp.res.forEach((r, i) => grid.appendChild(resCard(r, mp.names[r.p], i)));
  standings([0, 1, 2].map(p => ({ name: mp.names[p], t: mp.total[p] })));
  mp.round++;
  const last = mp.round >= mp.rounds;
  $('mNext').classList.remove('hidden'); $('mNext').textContent = last ? t('mp.ceremony') : t('mp.nextRound');
  $('mNext').onclick = last ? mpFinal : mpRound; $('mMenu').textContent = t('btn.central');
  world.orbit(true);
  only('mpRes'); A.chime([523, 659, 784], 0.1);
}
function finalGrid(rk) {
  const grid = $('mGrid'); grid.innerHTML = '';
  rk.forEach((r, i) => {
    const el = document.createElement('div'); el.className = 'mpc' + (r.t === rk[0].t ? ' win' : ''); el.style.animationDelay = (i * 0.3) + 's';
    const mk = (cls, txt, big) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; if (big) d.style.fontSize = '44px'; el.appendChild(d); };
    mk('pc', `${i + 1}.`, true); mk('nm', r.name); mk('pc', `${r.t} ${t('pts')}`); mk('cm', L(MP_FINAL[i]));
    grid.appendChild(el);
  });
}
function mpFinal() {
  const rk = [0, 1, 2].map(p => ({ name: mp.names[p], t: mp.total[p] })).sort((a, b) => b.t - a.t);
  const win = rk.filter(r => r.t === rk[0].t).map(r => r.name);
  $('mRound').textContent = t('mp.ceremony');
  $('mHead').textContent = win.length > 1 ? t('mp.shared', { w: win.join(' & ') }) : t('mp.month', { w: win[0] });
  finalGrid(rk); standings(rk.map(r => ({ ...r })));
  $('mNext').textContent = t('mp.revenge'); $('mNext').onclick = startMp;
  A.chime([523, 659, 784, 1047], 0.12);
}
$('mMulti').onclick = openMpSetup; $('mpGo').onclick = startMp; $('mpBack').onclick = () => showMenu(); $('hGo').onclick = mpPlay;
$('mMenu').onclick = () => showMenu();

// ---------------- Online zu dritt ----------------
const remoteTags = new Map();
let lastPos = 0, wasDown = false;
function onlineEntry(code, msg) {
  flow = 'online'; mode = 'online'; world.orbit(true);
  only('onEntry'); $('oName').value = save.name || ''; if (code) $('oCode').value = code;
  entryMsg(msg || '', !!msg);
}
function entryMsg(text, bad) { const e = $('oMsg'); e.textContent = text; e.classList.toggle('bad', !!bad); }
function netName() { const n = ($('oName').value || '').trim().slice(0, 16) || t('on.default'); save.name = n; persist(); return n; }
function netCheck() { if (netAvailable()) return true; entryMsg(t('on.nolib'), true); return false; }
$('mOnline').onclick = () => onlineEntry();
$('oCreate').onclick = () => { A.ensureAudio(); if (!netCheck()) return; entryMsg(t('on.opening')); netCreate(netName(), +$('lRounds').value); };
$('oJoin').onclick = () => {
  A.ensureAudio(); if (!netCheck()) return;
  const code = ($('oCode').value || '').trim().toUpperCase();
  if (code.length < 4) return entryMsg(t('on.needcode'), true);
  entryMsg(t('on.connecting')); netJoin(code, netName());
};
$('oCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('oJoin').click(); });
$('oBack').onclick = () => showMenu();
$('lLeave').onclick = () => showMenu();
$('lStart').onclick = () => { if (net.host) hostStart(); };
$('lRounds').onchange = () => setRounds(+$('lRounds').value);
$('lCopy').onclick = () => {
  const link = location.origin + location.pathname + '?raum=' + net.code + (LOCALTEST ? '&lokaltest' : '');
  const done = ok => { $('lCopy').textContent = ok ? t('lobby.copied') : link; setTimeout(() => { $('lCopy').textContent = t('lobby.copy'); }, ok ? 2000 : 12000); };
  try { navigator.clipboard.writeText(link).then(() => done(true), () => done(false)); } catch (e) { done(false); }
};
$('sForm').addEventListener('submit', e => { e.preventDefault(); const x = $('sIn').value.trim(); if (x && net.on) { toHost({ t: 'chat', text: x }); $('sIn').value = ''; } });
addEventListener('pagehide', () => { if (net.T) net.T.destroy(); });

function leaveOnline() {
  netReset();
  for (const id of [...world.remotes.keys()]) world.removeRemote(id);
  remoteTags.forEach(el => el.remove()); remoteTags.clear();
  document.body.classList.remove('online'); $('side').classList.add('hidden'); $('sLog').innerHTML = '';
  if (world.player.b.color !== PAL.rot) world.setPlayerColor(PAL.rot);
  clearTimeout(net.autoTimer); net.pending = null;
  world.resize();
}
function syncRemotes() {
  const ids = new Set(net.players.map(p => p.id));
  for (const id of [...world.remotes.keys()]) if (!ids.has(id)) { world.removeRemote(id); remoteTags.get(id)?.remove(); remoteTags.delete(id); }
  net.players.forEach((p, i) => {
    const col = PLAYER_COLS[i % 3];
    if (p.id === net.id) { if (world.player.b.color !== col) world.setPlayerColor(col); return; }
    let r = world.remotes.get(p.id);
    if (r && r.b.color !== col) { world.removeRemote(p.id); r = null; }
    if (!r) { r = world.addRemote(p.id, col); r.pos.set(SPOT.door[0] + (i - 1) * 0.9, 0, SPOT.door[2]); r.target.copy(r.pos); }
    if (!remoteTags.has(p.id)) { const el = document.createElement('div'); el.className = 'tag'; $('tags').appendChild(el); remoteTags.set(p.id, el); }
    remoteTags.get(p.id).textContent = p.name; remoteTags.get(p.id).style.borderColor = col;
  });
}
net.ui = {
  enter() {
    flow = 'online';
    document.body.classList.add('online'); $('side').classList.remove('hidden'); $('sRoom').textContent = net.code;
    enterWorld('door', 'task.lobby'); only('onLobby');
    renderLobby(); renderSide(); syncRemotes();
    sysMsg(net.host ? t('chat.opened') : t('chat.entered'));
  },
  fail(kind, e, code) {
    if (kind === 'deny') { onlineEntry(code, e === 'full' ? t('on.full') : t('on.running')); return; }
    entryMsg(kind === 'create' ? t('on.failCreate', { e }) : e === 'peer-unavailable' ? t('on.notfound') : t('on.failJoin', { e }), true);
  },
  lost(code) { leaveOnline(); onlineEntry(code, t('on.lost')); },
  note(e) { sysMsg(t('chat.note', { e })); },
  players() { renderSide(); syncRemotes(); if (net.phase === 'lobby') renderLobby(); },
  chat(m) { addChat(m); },
  pos(id, p) {
    const r = world.remotes.get(id); if (!r || !p || p.length < 5) return;
    r.target.set(p[0], p[1], p[2]); r.yawT = p[3]; r.grounded = !!p[4]; if (p[5]) r.downReq = true;
  },
  gone(id) { world.removeRemote(id); remoteTags.get(id)?.remove(); remoteTags.delete(id); },
  side() { renderSide(); },
  vote() { renderSide(); A.chime([440, 554], 0.08); cutM.stop(); world.clearSkyClouds(); world.watch(false); world.setTod(null); only(); goDesk(renderVote); setTask('task.vote'); },
  start(m) {
    [...$('vCards').children].forEach((el, i) => {
      el.querySelector('.imp')?.remove(); el.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const imp = document.createElement('div'); imp.className = 'imp ' + (i === m.w ? 'yes' : 'no'); imp.textContent = i === m.w ? t('stamp.yes') : t('stamp.no'); el.appendChild(imp);
    });
    $('vInfo').textContent = t(m.counts[m.w] === 1 ? 'vote.won1' : 'vote.won', { n: m.counts[m.w], o: nameOf(ORDERS[m.order].from) });
    A.stampSound(); renderSide();
    net.pending = { order: m.order, seed: m.seed };
    setTimeout(() => {
      if (!net.on || net.phase !== 'play' || !net.pending) return;
      enterWorld(null, 'task.platformOnline');
      clearTimeout(net.autoTimer);
      net.autoTimer = setTimeout(() => { if (net.pending && mode === 'world') { world.teleport(...SPOT.platform); startOnlineCut(); } }, 30000);
    }, 2600);
  },
  results(m) { renderSide(); showNetResults(m); },
  final(m) { renderSide(); showNetFinal(m); },
};
function startOnlineCut() {
  const p = net.pending; if (!p) return; net.pending = null; clearTimeout(net.autoTimer);
  goSky(() => beginCut(p.order, p.seed, { short: true }));
}
function netTurnDone() {
  toHost({ t: 'done', score: cut.finalScore, stars: cut.finalStars, img: cutM.thumb('image/jpeg', 0.72), mask: cutM.maskB64() });
  arrival([cutM.cloudCanvas()], () => {
    if (net.phase !== 'play') return;
    world.release(); world.enabled = true; mode = 'world'; hud(true);
    setTask('task.wait', { p: Math.round(cut.finalScore * 100) });
  });
}
function showNetResults(m) {
  cutM.setup(m.order);
  const masks = m.res.filter(r => r.mask).map(r => cutM.cloudFromB64(r.mask, cut.order.tod));
  const after = () => {
    mode = 'online'; hud(false);
    const o = ORDERS[m.order], best = m.res[0], tier = !best || best.stars === 0 ? 0 : best.stars === 1 ? 1 : 2;
    $('mRound').textContent = t('mp.voted', { r: m.round, n: m.rounds });
    $('mHead').textContent = `«${L(o.head[tier])}»`;
    $('mNote').textContent = t('mp.rejected', { w: nameOf(NO[m.rej][0]), x: L(NO[m.rej][1]) });
    const grid = $('mGrid'); grid.innerHTML = '';
    m.res.forEach((r, i) => grid.appendChild(resCard(r, pname(r.id) + (r.id === net.id ? ' ' + t('you') : ''), i)));
    standings(net.players.map(p => ({ name: p.name, t: m.total[p.id] || 0 })));
    hostButton(m.last ? t('mp.ceremony') : t('mp.nextSession'), hostNext, t('mp.waitHost'));
    only('mpRes');
    A.chime([523, 659, 784], 0.1);
  };
  if (masks.length) arrival(masks, after); else after();
}
function showNetFinal(m) {
  mode = 'online';
  const rk = net.players.map(p => ({ name: p.name, t: m.total[p.id] || 0 })).sort((a, b) => b.t - a.t);
  const win = rk.filter(r => r.t === rk[0].t).map(r => r.name);
  $('mRound').textContent = t('mp.ceremony'); $('mNote').textContent = '';
  $('mHead').textContent = win.length > 1 ? t('mp.shared', { w: win.join(' & ') }) : t('mp.month', { w: win[0] });
  finalGrid(rk); standings(rk.map(r => ({ ...r })));
  hostButton(t('mp.revenge'), hostStart, t('mp.waitRevenge'));
  only('mpRes'); A.chime([523, 659, 784, 1047], 0.12);
}
function hostButton(label, fn, waitText) {
  $('mMenu').textContent = t('lobby.leave');
  $('mNext').classList.toggle('hidden', !net.host); $('mNext').textContent = label; $('mNext').onclick = fn;
  $('mWait').textContent = net.host ? '' : waitText;
}
function sysMsg(text) { addChat({ sys: 1, text }); }
function addChat(m) {
  const log = $('sLog'), d = document.createElement('div');
  if (m.sys) { d.className = 'sys'; d.textContent = m.sys === 'joined' ? t('chat.joined', { n: m.name }) : m.sys === 'left' ? t('chat.left', { n: m.name }) : m.text; }
  else { const b = document.createElement('b'); b.textContent = m.from + ': '; d.appendChild(b); d.appendChild(document.createTextNode(m.text)); }
  log.appendChild(d); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
}
function renderSide() {
  const box = $('sPlayers'); box.innerHTML = '';
  net.players.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'prow';
    const av = document.createElement('div'); av.className = 'av'; av.style.background = PLAYER_COLS[i % 3]; av.textContent = (p.name[0] || '?').toUpperCase();
    const pn = document.createElement('div'); pn.className = 'pn'; pn.textContent = p.name + (p.id === net.id ? ' ' + t('you') : '');
    if (p.id === 'host') { const s = document.createElement('small'); s.textContent = t('host'); pn.appendChild(s); }
    const ps = document.createElement('div'); ps.className = 'ps';
    let pct = null;
    if (net.phase === 'vote') ps.textContent = net.picked.includes(p.id) ? t('side.voted') : '…';
    else if (net.phase === 'play') { pct = net.prog[p.id] || 0; ps.textContent = net.doneIds.includes(p.id) ? t('side.done') : Math.round(pct * 100) + ' %'; }
    else ps.textContent = t('side.mic');
    row.append(av, pn, ps);
    if (pct !== null) { const bar = document.createElement('div'); bar.className = 'pbar'; const f = document.createElement('i'); f.style.width = Math.round(pct * 100) + '%'; bar.appendChild(f); row.appendChild(bar); }
    box.appendChild(row);
  });
}
function renderLobby() {
  $('lCode').textContent = net.code;
  const box = $('lPlayers'); box.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = net.players[i], d = document.createElement('div'), a = document.createElement('span'), b = document.createElement('b');
    if (p) { a.textContent = p.name + (p.id === net.id ? ' ' + t('you') : ''); b.textContent = p.id === 'host' ? t('host') : t('lobby.ready'); a.style.borderLeft = `6px solid ${PLAYER_COLS[i]}`; a.style.paddingLeft = '6px'; }
    else { d.className = 'empty'; a.textContent = t('lobby.free'); b.textContent = '…'; }
    d.append(a, b); box.appendChild(d);
  }
  $('lHost').classList.toggle('hidden', !net.host);
  $('lInfo').textContent = net.host ? (net.players.length < 2 ? t('lobby.waitAlone') : t('lobby.canStart', { n: net.players.length })) : t('lobby.waitHost', { n: net.rounds });
}
function renderVote() {
  only('onVote');
  $('vTitle').textContent = t('vote.title', { r: net.round + 1, n: net.rounds });
  const wrap = $('vCards'); wrap.innerHTML = '';
  net.opts.forEach((c, idx) => {
    const o = ORDERS[c], el = document.createElement('div'); el.className = 'card';
    el.style.transform = `rotate(${(idx - 1) * 2.4}deg)`;
    const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; e.textContent = txt; el.appendChild(e); return e; };
    const head = mk('ch', ''); const a = document.createElement('span'), b = document.createElement('span'); a.textContent = t('card.order'); b.textContent = t('card.no', { n: pad(c + 1) }); head.append(a, b);
    mk('cf', nameOf(o.from)); mk('cn', t('card.shape', { s: L(o.nom) }));
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 150; cutM.drawOrder(cv, c); el.appendChild(cv);
    mk('ct', L(o.text));
    const cb = document.createElement('div'); cb.className = 'cb'; const y = document.createElement('button'); y.className = 'yes'; y.textContent = t('vote.for');
    y.onclick = () => {
      if (net.myPick !== null || net.phase !== 'vote') return;
      net.myPick = idx; y.classList.add('sel'); y.textContent = t('vote.done');
      [...wrap.querySelectorAll('button')].forEach(x => { x.disabled = true; });
      A.stampSound(); toHost({ t: 'pick', i: idx });
    };
    cb.appendChild(y); el.appendChild(cb); wrap.appendChild(el);
  });
  net.lastSec = -1;
}
function voteTick() {
  if (net.phase !== 'vote' || $('onVote').classList.contains('hidden')) return;
  const s = Math.max(0, Math.ceil((net.voteEnd - performance.now()) / 1000));
  if (s === net.lastSec) return; net.lastSec = s;
  $('vInfo').textContent = t('vote.info', { a: net.picked.length, b: net.players.length, s }) + (net.myPick === null ? '' : ' · ' + t('vote.counts'));
}

// ---------------- Hinweise ----------------
let toastT = 0;
function toast(text) { $('hTask').textContent = text; $('hud').classList.add('flash'); toastT = 2.4; }

// ---------------- Steuerung am Handy ----------------
(function touch() {
  const joy = $('joy'), knob = joy.querySelector('i'); let id = null, cx = 0, cy = 0;
  const move = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 44; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; world.joy.x = dx / m; world.joy.y = dy / m; };
  joy.addEventListener('pointerdown', e => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; try { joy.setPointerCapture(id); } catch (_) {} move(e); A.ensureAudio(); });
  joy.addEventListener('pointermove', move);
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; world.joy.x = world.joy.y = 0; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  $('tJump').addEventListener('pointerdown', e => { e.preventDefault(); world.jumpReq = true; });
  $('tUse').addEventListener('pointerdown', e => { e.preventDefault(); world.use(); });
})();

// ---------------- Knöpfe ----------------
$('mFree').onclick = startFree;
let leaveArm = 0;
function confirmLeave() { if (performance.now() < leaveArm) return true; leaveArm = performance.now() + 3000; toast(t('toast.leave')); return false; }
$('hMenu').onclick = () => { if (flow === 'online' && !confirmLeave()) return; showMenu(); };
$('tMenu').onclick = () => { if (flow === 'online' && !confirmLeave()) return; showMenu(); };
function soundLabels() { const l = A.sound.muted ? t('sound.on') : t('sound.off'); $('tSound').textContent = l; $('mSound').textContent = l; }
$('tSound').onclick = $('mSound').onclick = () => { A.setMuted(!A.sound.muted); soundLabels(); };
$('lDe').onclick = () => setLang('de'); $('lEn').onclick = () => setLang('en');
addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'Escape' && flow !== 'online' && mode !== 'menu') showMenu();
  if (e.key === 'Enter') { if (mode === 'brief') $('bGo').click(); else if (mode === 'desk' && !$('desk').classList.contains('hidden')) $('dGo').click(); else if (mode === 'local' && !$('handoff').classList.contains('hidden')) mpPlay(); }
});

// Sprache wechseln: alles neu beschriften
onLang(() => {
  applyDom(); office.relabel(); soundLabels();
  if (mode === 'menu') showMenu();
  if (taskKey) setTask(taskKey, taskVars);
  document.title = t('doc.title');
});

// ---------------- Hauptschleife ----------------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!cut.active) {
    world.update(dt); world.render();
    const pr = $('prompt');
    if (world.nearest && mode === 'world') {
      const s = world.project(world.nearest.pos.clone().setY(world.nearest.y + 1.9));
      pr.style.left = (s.x * 100) + '%'; pr.style.top = (s.y * 100) + '%';
      pr.querySelector('span').textContent = world.nearest.label; pr.classList.remove('hidden');
      pr.querySelector('kbd').textContent = touchMode ? t('touch.use') : 'E';
    } else pr.classList.add('hidden');
    for (const [id, el] of remoteTags) {
      const r = world.remotes.get(id); if (!r) continue;
      const s = world.project(r.pos.clone().setY(r.pos.y + 1.75));
      el.style.left = (s.x * 100) + '%'; el.style.top = (s.y * 100) + '%'; el.style.display = s.vis ? '' : 'none';
    }
    if (office.crankT > 0) { office.crankT -= dt; office.crank.rotation.x -= dt * 9; }
  }
  // Position senden (12 Hz)
  if (net.on && now - lastPos > 83) {
    lastPos = now;
    const p = world.player, down = p.b.down;
    toHost({ t: 'pos', p: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.b.yaw.toFixed(2), p.grounded ? 1 : 0, down && !wasDown ? 1 : 0] });
    wasDown = down;
  }
  voteTick();
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) { $('hud').classList.remove('flash'); setTask(taskKey, taskVars); } }
  requestAnimationFrame(loop);
}

// ---------------- Ladebildschirm (Duchy Games) ----------------
(function intro() {
  const el = $('intro'), bar = $('iBar'), txt = $('iTxt');
  const LINES = [t('intro.l1'), t('intro.l2'), t('intro.l3'), t('intro.l4'), t('intro.l5')];
  txt.textContent = LINES[0];
  const MIN = 3900, t0 = performance.now();
  const steps = { fonts: false, net: false, min: false };
  let gone = false, li = 0;
  const show = () => { const done = Object.values(steps).filter(Boolean).length; const tp = Math.min(1, (performance.now() - t0) / MIN); bar.style.width = Math.round(Math.min(done / 3, 0.15 + tp * 0.85) * 100) + '%'; };
  const lineTimer = setInterval(() => { if (li < LINES.length - 2) { li++; txt.textContent = LINES[li]; } show(); }, 900);
  const end = () => {
    if (gone) return; gone = true; clearInterval(lineTimer);
    bar.style.width = '100%'; txt.textContent = LINES[LINES.length - 1];
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 950); }, 350);
  };
  const check = () => { show(); if (steps.fonts && steps.net && steps.min) end(); };
  try { Promise.all([document.fonts.load('600 40px "Space Grotesk"'), document.fonts.load('italic 30px "Instrument Serif"')]).catch(() => {}).then(() => { steps.fonts = true; check(); }); } catch (e) { steps.fonts = true; }
  setTimeout(() => { steps.fonts = true; check(); }, MIN);
  if (typeof Peer !== 'undefined' || window.__peerDone) steps.net = true;
  else { const iv = setInterval(() => { if (window.__peerDone || typeof Peer !== 'undefined') { clearInterval(iv); steps.net = true; check(); } }, 200); }
  setTimeout(() => { steps.net = true; check(); }, MIN + 1500);
  setTimeout(() => { steps.min = true; check(); }, MIN);
  setTimeout(() => A.chime([392, 523, 659], 0.18), 1000);
  el.addEventListener('click', () => { A.ensureAudio(); end(); });
  addEventListener('keydown', function k() { if (gone) return removeEventListener('keydown', k); end(); });
  check();
})();

applyDom(); document.title = t('doc.title');
showMenu();
{ const rm = (location.search.match(/[?&]raum=([A-Za-z0-9]+)/) || [])[1]; if (rm) onlineEntry(rm.toUpperCase()); }
requestAnimationFrame(loop);
