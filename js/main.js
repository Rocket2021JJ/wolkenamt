// WOLKENAMT v0.4 – Ablaufsteuerung: 3D-Welt, Schreibtisch, Wolkenplattform, Dorfplatz, Mehrspieler
import * as LG from './lingo.js';
import { pickMotif, drawPicture, drawWeather } from './paper.js';
import { buildHall, HALL_SPOT } from './hall.js';
import { detailVillage, stepHens } from './village.js';
import { stepLandscape } from './terrain.js';
import { decorateRoof, buildRoessli, buildParteienhaus, markEntrances, signpost, ROESSLI_SPOT, PARTEI_SPOT } from './interiors.js';
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
import { net, netCreate, netJoin, netReset, netAvailable, hostStart, hostNext, setRounds, toHost, pname, LOCALTEST, MP_POINTS, partyOf , voice, voiceJoin, voiceMute, voiceLeave, voiceSupported } from './net.js';

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
const chOf = d => (DAYS[d] && DAYS[d].ch) || 1;
const inSB = () => !!save.sbActive;
const dayNo = d => d - DAYS.findIndex(x => (x.ch || 1) === chOf(d)) + 1;
const rankOf = s => L(RANKS.filter(r => s >= r[0]).pop()[1]);
const totalStars = () => save.stars.reduce((a, b) => a + (b || 0), 0);

// ---------------- Welt ----------------
const world = new World($('c3d'));
const office = world.office = furnish(world);
buildHall(world, office);
decorateRoof(world, office); buildRoessli(world, office); buildParteienhaus(world, office, POW.PARTIES); markEntrances(world, office); signpost(world);
detailVillage(world);
{ const ou = office.update; office.update = (dt, tm) => { ou(dt, tm); stepHens(world, tm); stepLandscape(world, dt); soundTick(dt); }; }
// Musik und Umgebung je nach Ort und Lage
// Wolkwilisch sprechen (mit Sprechblase im Fenster-Titel nicht nötig)
function sayLingo(line, who, mood = '') { A.speak(LG.syllables(line), A.voiceFor(who), { interrupt: true, mood }); }
// Sprechblasen über Dorfbewohnern: ab und zu ruft jemand in der Nähe etwas auf Wolkwilisch
const bubbles = [];
let nextShout = 3;
function bubbleTick(dt) {
  nextShout -= dt;
  const cam = world.camera, cv = $('c3d'), W = cv.clientWidth, H = cv.clientHeight, p = world.player.pos;
  if (nextShout < 0 && world.villagers && mode === 'world' && !world.inside) {
    nextShout = 4 + Math.random() * 6;
    const near = world.villagers.map((v, i) => ({ v, i, d: v.b.root.position.distanceTo(p) })).filter(o => o.d < 16 && o.d > 1.2).sort((a, b) => a.d - b.d);
    if (near.length) {
      const o = near[Math.floor(Math.random() * Math.min(3, near.length))], P = save.power, k = Math.floor(Math.random() * 99);
      const kind = world.weather === 'rain' || world.weather === 'storm' ? 'rain' : P && P.suspicion >= 55 && Math.random() < 0.6 ? 'suspicion' : Math.random() < 0.25 ? 'huber' : Math.random() < 0.35 ? 'greet' : Math.random() < 0.5 ? 'sun' : 'misc';
      const line = LG.shout(kind, k), el = document.createElement('div'); el.className = 'bubble'; el.textContent = line; $('bubbles').appendChild(el);
      bubbles.push({ el, v: o.v, t: 3.2 });
      A.speak(LG.syllables(line), A.voiceFor('Dorf' + o.i), { overlap: true, gain: Math.max(0.15, 1 - o.d / 16), mood: line.includes('?') ? '?' : line.includes('!') ? '!' : '' });
    }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    const pos = b.v.b.root.position.clone(); pos.y += 1.9 * b.v.b.root.scale.y; pos.project(cam);
    const vis = pos.z < 1 && Math.abs(pos.x) < 1.1 && Math.abs(pos.y) < 1.1 && mode === 'world';
    b.el.style.transform = `translate(${(pos.x * 0.5 + 0.5) * W}px, ${(-pos.y * 0.5 + 0.5) * H}px) translate(-50%, -100%)`;
    b.el.style.opacity = vis ? Math.min(1, b.t * 2) : 0;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); }
  }
}
function soundTick(dt) {
  bubbleTick(dt);
  const vis = id => !$(id).classList.contains('hidden');
  const p = world.player.pos, menuOn = vis('menu');
  const where = menuOn ? 'menu' : world.inside ? 'office' : p.y > 3 ? 'roof' : p.z < -28 ? 'room' : 'village';
  const P = save.power;
  let mus = menuOn ? 'menu' : vis('report') ? 'report' : (P && flow === 'single' && P.suspicion >= 60) ? 'tension' : (world.inside || mode === 'cut' || where === 'room') ? 'office' : 'village';
  A.setMusic(mus);
  A.ambient(where, dt, { rain: world.weather === 'rain' || world.weather === 'storm', storm: world.weather === 'storm', nearHens: Math.hypot(p.x - 15.5, p.z - 11) < 9 });
}
// erster Klick schaltet Ton frei, jeder Knopf klackt leise
addEventListener('pointerdown', () => A.ensureAudio(), { capture: true });
addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) A.ui('click'); }, { capture: true });
world.setFadeHouses(world.houses.map((_, i) => i), [office.thSign.parent]);
world.bake([...world.hens, ...world.valleyClouds, world.skyDome, ...world.landscape, office.handset, world.player.b.root, ...world.skyClouds, office.clock.h, office.clock.m, office.clock.s, office.lamp.shade, office.lamp.bulb, office.flag, office.crank, office.hall, office.roessli, office.partei, office.windsock, ...office.laundry], world.fadeList.map(f => f.g));
world.spawnVillagers(11);
world.sfx = A.sfx;
window.__world = world;
window.__THREE = THREE; window.__A = A;
window.__dbg = { mode: () => mode, save: () => save, run: () => run, startDay: d => startDay(d), report: () => showReport() };
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
const OVER = ['settings', 'town', 'weather', 'archive', 'party', 'morning', 'menu', 'brief', 'result', 'desk', 'report', 'mpSetup', 'handoff', 'mpRes', 'onEntry', 'onLobby', 'onVote', 'card'];
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
  world.setWeather(flow === 'single' && run && run.wx && !(office.hall && office.hall.visible) ? run.wx : null);
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
  if (save.sbActive) { save.sb.P = save.power; save.power = save.stash || null; save.stash = null; save.sbActive = false; persist(); }
  $('mSandbox').textContent = save.sb && !save.sb.over ? t('menu.sbGo', { y: save.sb.year, p: POW.PARTIES[save.sb.P.party].short }) : t('menu.sb');
  DAYS.forEach((Dy, d) => {
    if (Dy.ch === 4) return;
    if (d === 0 || chOf(d) !== chOf(d - 1)) { const hd = document.createElement('div'); hd.className = 'chhead'; hd.textContent = t('menu.ch' + chOf(d)); list.appendChild(hd); }
    const un = d <= (save.day || 0);
    const orders = Dy.cards.filter(c => typeof c !== 'string');
    const s = orders.reduce((a, c) => a + (save.stars[c] || 0), 0), max = orders.length * 3;
    const row = document.createElement('div'); row.className = 'ord' + (un ? '' : ' locked');
    const no = document.createElement('span'); no.className = 'no'; no.textContent = t('menu.day', { n: dayNo(d) });
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
  const go = () => { enterWorld('door', 'task.desk'); setDay(inSB() ? t('sb.hud', { day: L(DAYS[d].name), y: save.sb.year }) : t('hud.day', { day: L(DAYS[d].name), n: dayNo(d) })); updateAkte(); };
  if (chOf(d) === 2 && P.inv != null && P.inv >= 100) return showRemoved(P);
  const ev = POW.due(P, d);
  const paper = morningPaper(P, d); if (paper) ev.unshift(paper);
  if (chOf(d) === 2) {
    if (POW.startInvestigation(P)) ev.unshift(POW.INV_INTRO);
    const q = POW.interrogation(d); if (q) ev.push(q);
  }
  if (chOf(d) === 4) { ev.push(...POW.sbMorning(P, save.sb.year, save.sb.day)); }
  if (chOf(d) === 3) { P.ch = 3; const c = POW.campaignEvent(d); if (c) ev.push(c); }
  persist();
  if (ev.length) showMorning(ev, d, go); else go();
}

// Schlagzeile des Anzeigers am Morgen: aus den echten Veränderungen seit gestern
function morningPaper(P, d) {
  if (d < 1 || !P.lastPolls) return null;
  const now = POW.polls(P), diff = {}; for (const p in now) diff[p] = now[p] - (P.lastPolls[p] || now[p]);
  const lead = Object.keys(now).sort((a, b) => now[b] - now[a])[0];
  const mover = Object.keys(diff).sort((a, b) => Math.abs(diff[b]) - Math.abs(diff[a]))[0];
  const nm = p => L(POW.PARTIES[p].name);
  let txt;
  if (P.suspicion >= 60) txt = t('paper.h.susp');
  else if (Math.abs(diff[mover]) >= 1.5) txt = t(diff[mover] > 0 ? 'paper.h.up' : 'paper.h.down', { p: nm(mover), d: Math.abs(diff[mover]).toFixed(1) });
  else txt = t(lead === 'huber' ? 'paper.h.huber' : 'paper.h.lead', { p: nm(lead), v: now[lead].toFixed(1) });
  return { from: 'Wolkenwiler Anzeiger', text: [txt, txt] };
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
  const box = document.createElement('div'); box.className = 'lfx'; let score = 0, coin = false;
  ch.forEach(c => {
    const e = document.createElement('span'); let txt, good = c.d > 0;
    if (c.k === 'trust') txt = `${L(POW.GROUPS[c.g].name)} ${c.d > 0 ? '+' : ''}${c.d}`;
    else if (c.k === 'mod') { txt = `${POW.PARTIES[c.p].short} ${c.d > 0 ? '▲' : '▼'}`; good = (c.p === save.power.party) === c.d > 0; }
    else if (c.k === 'influence') txt = `${t('akte.inf')} ${c.d > 0 ? '+' : ''}${c.d}`;
    else if (c.k === 'cash') txt = `${t('akte.cash')} ${c.d > 0 ? '+' : '−'}${fmtCash(c.d)}`;
    else if (c.k === 'suspicion') { txt = `${t('akte.susp')} ${c.d > 0 ? '+' : ''}${c.d}`; good = c.d < 0; }
    else if (c.k === 'inv') { txt = `${t('akte.inv')} ${c.d > 0 ? '+' : ''}${c.d}`; good = c.d < 0; }
    else if (c.k === 'lev') txt = `${c.d > 0 ? t('fx.lev') : t('fx.levUsed')}: ${c.p.charAt(0).toUpperCase() + c.p.slice(1)}`;
    e.className = 'fx ' + (good ? 'pos' : 'neg'); e.textContent = txt; box.appendChild(e);
    score += good ? 1 : -1; if (c.k === 'cash' && c.d > 0) coin = true;
  });
  if (ch.length) setTimeout(() => A.ui(coin ? 'coin' : score >= 0 ? 'good' : 'bad'), 120);
  return box;
}
function showMorning(list, d, done, call) {
  const wasWorld = mode === 'world';
  mode = 'morning'; if (!call) world.orbit(true); else world.enabled = false; hud(false);
  document.querySelector('#morning .lhead span').textContent = call ? t('call.title') : t('mail.title');
  const P = save.power; let i = 0;
  const next = () => {
    if (i >= list.length) { persist(); return done(); }
    const ev = typeof list[i] === 'object' ? list[i] : (POW.EVENTS[list[i]] || POW.CALLS[list[i]]); i++;
    only('morning');
    $('mlDay').textContent = call ? t('call.time') : t('mail.day', { day: L(DAYS[d].name) });
    $('mlFrom').textContent = nameOf(ev.from); $('mlText').textContent = L(ev.text);
    // Am Telefon redet die Person Wolkwilisch, der Text darunter ist die Übersetzung
    $('mlLingo').classList.toggle('hidden', !call);
    if (call) { const tx = L(ev.text), lg = LG.translate(tx, 10); $('mlLingo').textContent = '«' + lg + '»'; A.speak(LG.syllables(lg), A.voiceFor(ev.from), { interrupt: true, mood: /\?\s*»?$/.test(tx) ? '?' : '' }); }
    const asPaper = !call;
    $('mPaper').classList.toggle('hidden', !asPaper); document.querySelector('#morning .letter').classList.toggle('hidden', asPaper);
    const slot = asPaper ? $('npSlot') : document.querySelector('#morning .letter');
    for (const id of ['mlRes', 'mlFx', 'mlBtns']) slot.appendChild($(id));
    if (asPaper) { fillPaper(ev, d, i, list.length, !!ev.choices); A.ui('paper'); } else A.ui('type');
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
    else { if (typeof list[i - 1] === 'string') P.history.push({ day: d, ev: list[i - 1] }); const ch = POW.apply(P, ev.fx); $('mlFx').replaceWith(Object.assign(fxChips(ch), { id: 'mlFx' })); cont(); }
  };
  next();
}
// Zeitungsseite füllen: Schlagzeile, Bild, Text, Seitenspalte
function splitHead(txt) {
  const s = txt.trim();
  if (s.length <= 70) return [s, ''];
  // Zitat am Anfang: Schlagzeile bis zum schliessenden »
  if (s[0] === '«' || s[0] === '“') {
    const e = s.indexOf(s[0] === '«' ? '»' : '”');
    if (e > 10 && e < 130) { let k = e + 1; while (/[.,!?]/.test(s[k] || '')) k++; return [s.slice(0, k), s.slice(k).trim()]; }
  }
  const m = s.match(/^(.{15,120}?[.!?])\s+(.*)$/s);
  return m ? [m[1], m[2]] : [s, ''];
}
const npHash = str => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
function fillPaper(ev, d, page, pages, ask) {
  const txt = L(ev.text), from = nameOf(ev.from), h = npHash(txt);
  const [head, body] = splitHead(txt);
  const motif = ev.motif || pickMotif(txt, ev.from);
  $('npNo').textContent = t('np.no', { n: 1180 + d + (inSB() ? save.sb.year * 6 : 0) });
  $('npDate').textContent = inSB() ? t('sb.hud', { day: L(DAYS[d].name), y: save.sb.year }) : L(DAYS[d].name);
  $('npKick').textContent = ev.from === 'Wolkenwiler Anzeiger' ? t('np.kickHome') : from;
  $('npHead').textContent = head;
  const fills = t('np.fill').split('|');
  $('npBody').innerHTML = ''; const by = document.createElement('b'); by.textContent = '(im) '; $('npBody').append(by, document.createTextNode(body || fills[h % fills.length]));
  $('npBody').classList.toggle('short', !body);
  drawPicture($('npPic'), motif, h);
  const caps = t('np.cap.' + motif).split('|'); $('npCap').textContent = caps[h % caps.length];
  const wx = ['sun', 'cloud', 'rain', 'fog', 'storm'][(d * 3 + h) % 5];
  drawWeather($('npWx'), wx); $('npWxT').textContent = t('np.wx.' + wx);
  const P = save.power, pl = P ? POW.polls(P) : null, pw = $('npPoll'); pw.innerHTML = '';
  if (pl) Object.keys(pl).sort((a, b) => pl[b] - pl[a]).forEach(p => {
    const r = document.createElement('div'); r.className = 'npr' + (P && p === P.party ? ' me' : '');
    const n = document.createElement('span'); n.textContent = POW.PARTIES[p].short;
    const b = document.createElement('i'); b.style.width = Math.round(pl[p] * 1.6) + 'px';
    const v = document.createElement('em'); v.textContent = pl[p].toFixed(0) + '%';
    r.append(n, b, v); pw.appendChild(r);
  });
  const ads = t('np.ads').split('|'); const ad = ads[(d + page + h) % ads.length].split('~');
  $('npAd').innerHTML = ''; const ah = document.createElement('b'); ah.textContent = ad[0]; const ap = document.createElement('p'); ap.textContent = ad[1] || '';
  $('npAd').append(ah, ap);
  $('npPage').textContent = pages > 1 ? t('np.page', { a: page, b: pages }) : '';
  $('mPaper').classList.toggle('ask', ask); $('npSlot').dataset.label = t('np.react');
  $('mPaper').scrollTop = 0;
}
$('akte').addEventListener('click', () => $('akte').classList.toggle('open'));
// Strichliste: ein Strich pro 5 Punkte, jeder fünfte quer. Leicht schief, wie von Hand.
function tally(svg, v) {
  const n = Math.round(v / 5), NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = ''; let x = 2, seed = 7;
  const j = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
  for (let i = 0; i < n; i++) {
    const p = document.createElementNS(NS, 'path');
    if (i % 5 === 4) { const x0 = x - 4 * 4.2 - 1.5; p.setAttribute('d', `M${x0} ${11 + j()} L${x - 2.2} ${3.5 + j()}`); x += 4; }
    else { p.setAttribute('d', `M${x + j() * 1.2} ${2.5 + j()} L${x + 0.6 + j() * 1.2} ${12.5 + j()}`); x += 4.2; }
    svg.appendChild(p);
  }
  svg.setAttribute('viewBox', `0 0 ${Math.max(10, x + 2)} 15`); svg.style.width = Math.max(10, x + 2) + 'px';
}
// Bleistiftbalken: jedes Ende etwas anders, aber stabil pro Partei
const barEnd = { wvb: '96% 0, 100% 40%, 97% 100%', fww: '100% 10%, 95% 60%, 99% 100%', pkh: '97% 0, 100% 70%, 94% 100%', huber: '100% 0, 96% 45%, 100% 100%' };
function updateAkte() {
  const P = save.power, box = $('akte');
  if (!P || flow !== 'single') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  $('aParty').textContent = POW.PARTIES[P.party].short;
  const pl = POW.polls(P), wrap = $('aPolls'); wrap.innerHTML = '';
  Object.keys(POW.PARTIES).sort((a, b) => pl[b] - pl[a]).forEach(p => {
    const r = document.createElement('div'); r.className = 'prow2' + (p === P.party ? ' me' : '');
    const n = document.createElement('span'); n.className = 'pn'; n.textContent = POW.PARTIES[p].short;
    const bar = document.createElement('span'); bar.className = 'bar'; const f = document.createElement('i');
    f.style.width = Math.min(100, pl[p] * 2) + '%'; f.style.color = POW.PARTIES[p].color; f.style.clipPath = `polygon(0 8%, ${barEnd[p]}, 0 92%)`; bar.appendChild(f);
    const v = document.createElement('b'); v.textContent = pl[p].toFixed(1).replace('.', L([',', '.'])) + '%';
    r.append(n, bar, v); wrap.appendChild(r);
  });
  tally($('aSusp'), P.suspicion); $('aSuspN').textContent = P.suspicion;
  $('akte').classList.toggle('hot', P.suspicion >= 60);
  $('aInf').textContent = P.influence; $('aCash').textContent = fmtCash(P.cash);
  $('aInvRow').classList.toggle('hidden', P.inv == null);
  if (P.inv != null) { tally($('aInv'), P.inv); $('aInvN').textContent = P.inv; }
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
  if (id === 'townhall') return enterHall();
  if (id === 'hallexit') return leaveHall();
  if (id === 'roessliexit') return leaveRoom('roessli');
  if (id === 'parteiexit') return leaveRoom('partei');
  if (id === 'roesslidoor') return enterRoom(ROESSLI_SPOT, 'task.roessli');
  if (id === 'parteidoor') return enterRoom(PARTEI_SPOT, 'task.partei');
  if (id === 'stammtisch') return openStammtisch();
  if (id === 'wirt') return openWirt();
  if (id === 'imboden') return openImboden();
  if (id.startsWith('pdesk_')) return openPartyDesk(id.slice(6));
  if (id === 'podium') return openTownhall();
  if (id === 'urn') return openUrn();
  if (id === 'huberdesk') return searchHuber();
  if (id === 'bakery') return openBakery();
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
  $('dTitle').textContent = inSB() ? t('sb.hud', { day: L(Dy.name), y: save.sb.year }) : t('desk.title', { day: L(Dy.name), n: dayNo(run.d) });
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
      if (c === 'zeugin' && yes && P.cash < 1500) { all.push(...POW.apply(P, pol.no)); return; }
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
  const last = !!Dy.end || run.d >= DAYS.length - 1;
  const span = (cls, txt) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt; return s; };
  const d = run.d;
  if (save.rep <= 0) {
    sum.append(span('neg', t('rep.zero', { b: before })), document.createElement('br'), span('', t('rep.fog')));
    save.rep = 50;
    $('pNext').textContent = t('rep.again'); $('pNext').onclick = () => startDay(d);
  } else {
    if (!inSB()) save.day = Math.max(save.day || 0, d + 1);
    sum.append(span('', t('rep.rep', { b: before }) + ' '), span(delta >= 0 ? 'pos' : 'neg', `${save.rep}`), span('', ` (${delta >= 0 ? '+' : ''}${delta})`));
    if (bonus) sum.append(document.createElement('br'), span('', t('rep.bonus', { b: num(bonus) })));
    if (last) sum.append(document.createElement('br'), document.createElement('br'), span('', t(Dy.end === 4 ? 'sb.repYear' : Dy.end === 3 ? 'rep.week3' : Dy.end === 2 ? 'rep.week2' : 'rep.week', { r: rankOf(totalStars()) })));
    $('pNext').textContent = last ? t('btn.central') : t('rep.next', { day: L(DAYS[d + 1].name) });
    $('pNext').onclick = last ? () => showMenu() : () => startDay(d + 1);
  }
  powerReport(Dy, sum);
  if (inSB()) sbAfterReport();
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

// ---------------- Ratssaal (begehbar) ----------------
function enterHall() {
  if (flow !== 'single' || !run || run.kind !== 'day') return toast(t('toast.townClosed'));
  if (taskKey !== 'task.hall') run.hallPrev = [taskKey, taskVars];
  A.ui('door'); world.teleport(...HALL_SPOT); world.camYawT = 0.28; world.setWeather(null);
  setTask('task.hall');
}
// Weitere begehbare Häuser
function enterRoom(spot, task) {
  if (flow !== 'single' || !run || run.kind !== 'day') return toast(t('toast.townClosed'));
  if (!/^task\.(hall|roessli|partei)$/.test(taskKey)) run.hallPrev = [taskKey, taskVars];
  A.ui('door'); world.teleport(...spot); world.camYawT = 0.28; world.setWeather(null); setTask(task);
}
function leaveRoom(id) {
  const e = office.entrance[id]; A.ui('door');
  world.teleport(e.pos.x, 0, e.pos.z, e.yaw); world.setWeather(run && run.wx ? run.wx : null);
  const pv = run && run.hallPrev; setTask(pv ? pv[0] : 'task.desk', pv ? pv[1] : undefined);
}
// Kleine Helfer für Aktionslisten in Panels
function actRow(box, label, info, ok, onDo, btnText) {
  const el = document.createElement('div'); el.className = 'dos';
  const b = document.createElement('b'); b.textContent = label; el.appendChild(b);
  if (info) { const n = document.createElement('small'); n.textContent = info; el.appendChild(n); }
  const btn = document.createElement('button'); btn.textContent = btnText || t('urn.do'); btn.disabled = !ok; btn.onclick = onDo; el.appendChild(btn);
  box.appendChild(el); return el;
}
function panelResult(box, text, ch) {
  box.innerHTML = ''; box.classList.add('resv'); const p = document.createElement('p'); p.className = 'lres'; p.textContent = text; box.appendChild(p);
  if (ch) box.appendChild(fxChips(ch));
  A.stampSound(); persist(); updateAkte();
}
const rivals = P => POW.PLAYABLE.concat('huber').filter(p => p !== P.party);
const pname2 = p => L(POW.PARTIES[p].name);

// ---------------- Parteienhaus: eigenes Büro und fremde Pulte ----------------
function openPartyDesk(pid) {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  P.flags = P.flags || {};
  const dayKey = 'pb' + (inSB() ? save.sb.year * 10 + save.sb.day : run.d);
  if (pid === P.party) {
    const box = townPanel(t('partei.kicker'), t('partei.ownTitle', { p: pname2(pid) }), t('partei.ownInfo'));
    const done = P.flags[dayKey + 'own'];
    actRow(box, t('partei.print'), t('partei.printInfo'), !done && P.cash >= 1000 && !firstDay(), () => {
      P.flags[dayKey + 'own'] = 1; panelResult(box, t('partei.printRes'), POW.apply(P, { cash: -1000, mod: { _own: 0.06 } }));
    });
    actRow(box, t('partei.flyer'), t('partei.flyerInfo'), !done && P.influence >= 2, () => {
      P.flags[dayKey + 'own'] = 1;
      const top = Object.entries(POW.PARTIES[P.party].aff).sort((a, b) => b[1] - a[1])[0][0];
      panelResult(box, t('partei.flyerRes'), POW.apply(P, { influence: -2, trust: { [top]: 4 } }));
    });
    if (done) { const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t('town.doneToday'); box.appendChild(p); }
    return;
  }
  const box = townPanel(t('partei.kicker'), t('partei.rivalTitle', { p: pname2(pid) }), t(run.fog ? 'partei.rivalFog' : 'partei.rivalInfo'));
  if (P.flags[dayKey]) { const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t('partei.onceDay'); box.appendChild(p); return; }
  const extra = pid === 'huber' ? 0.15 : 0;
  const acts = [
    ['plan', { lev: pid, influence: 1 }, 0.25],
    ['glue', { mod: { [pid]: -0.1 } }, 0.2],
    ['donors', { mod: { [pid]: -0.18 }, suspicion: 6 }, 0.35],
    ['tap', { influence: 2, mod: { [pid]: -0.04 } }, 0.3],
  ];
  acts.forEach(([k, fx, risk]) => {
    const r = Math.min(0.9, (risk + extra) * (run.fog ? 0.5 : 1));
    actRow(box, t('sab.' + k), t('sab.' + k + 'Info') + ' ' + t('sab.risk', { r: Math.round(r * 100) }), !firstDay(), () => {
      P.flags[dayKey] = 1;
      const caught = Math.random() < r;
      P.history.push({ day: run.d, ev: 'sab_' + k + '_' + pid, caught });
      if (caught) { POW.schedule(P, run.d + 1, 'einbruch'); P.flags.lastBreakin = pid; return panelResult(box, t('sab.caught', { p: pname2(pid) }), POW.apply(P, { suspicion: 8 })); }
      panelResult(box, t('sab.' + k + 'Res', { p: pname2(pid) }), POW.apply(P, fx));
    });
  });
  if (P.lev && P.lev[pid]) actRow(box, t('sab.lev'), t('sab.levInfo'), true, () => {
    P.flags[dayKey] = 1; panelResult(box, t('sab.levRes', { p: pname2(pid) }), POW.apply(P, { mod: { [pid]: -0.2 }, unlev: pid, suspicion: 5 }));
  });
}

// ---------------- Gasthaus Rössli ----------------
function openStammtisch() {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  ['Hubärli hubärli.', 'Bümpfelimümpf!', 'Hmmpfli… Wäälimpf?'].forEach((l, k) => setTimeout(() => A.speak(LG.syllables(l), A.voiceFor('Stamm' + k), { overlap: true, gain: 0.7 }), k * 700));
  P.flags = P.flags || {}; const key = 'st' + (inSB() ? save.sb.year * 10 + save.sb.day : run.d);
  const box = townPanel(t('roessli.kicker'), t('roessli.stammTitle'), t('roessli.stammInfo'));
  if (P.flags[key]) { const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t('roessli.again'); box.appendChild(p); return; }
  actRow(box, t('roessli.round'), t('roessli.roundInfo'), P.cash >= 300, () => { P.flags[key] = 1; panelResult(box, t('roessli.roundRes'), POW.apply(P, { cash: -300, trust: { vereine: 3, senioren: 2 } })); });
  rivals(P).forEach(p => actRow(box, t('roessli.rumor', { p: POW.PARTIES[p].short }), t('roessli.rumorInfo'), !firstDay(), () => {
    P.flags[key] = 1; panelResult(box, t('roessli.rumorRes', { p: pname2(p) }), POW.apply(P, { mod: { [p]: -0.07 }, suspicion: 3 }));
  }));
}
function openWirt() {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  sayLingo(LG.shout('greet', run.d) + ' ' + LG.shout('misc', run.d + 2), 'Wirt Bruno');
  const soon = P.queue.filter(q => q.day <= run.d + 1).map(q => POW.EVENTS[q.id]).filter(Boolean);
  const box = townPanel(t('roessli.kicker'), t('roessli.wirtTitle'), soon.length ? t('roessli.wirtHint', { n: nameOf(soon[0].from) }) : t('roessli.wirtNone'));
  const lines = t('roessli.wirtTalk').split('|'); const p = document.createElement('p'); p.className = 'hsub'; p.textContent = lines[(run.d + soon.length) % lines.length]; box.appendChild(p);
}
function openImboden() {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  sayLingo('Grüüzimpf! Zytigli? Wüürzli?', 'Frau Imboden, Wolkenwiler Anzeiger', '?');
  P.flags = P.flags || {}; const key = 'im' + (inSB() ? save.sb.year * 10 + save.sb.day : run.d);
  const box = townPanel(t('roessli.kicker'), t('roessli.imTitle'), t('roessli.imInfo'));
  if (P.flags[key]) { const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t('roessli.imAgain'); box.appendChild(p); return; }
  actRow(box, t('roessli.interview'), t('roessli.interviewInfo'), true, () => { P.flags[key] = 1; panelResult(box, t('roessli.interviewRes'), POW.apply(P, { mod: { _own: 0.05 }, suspicion: P.suspicion > 40 ? 4 : -2 })); });
  rivals(P).forEach(p => actRow(box, t('roessli.leak', { p: POW.PARTIES[p].short }), t('roessli.leakInfo'), P.cash >= 500 && !firstDay(), () => {
    P.flags[key] = 1; panelResult(box, t('roessli.leakRes', { p: pname2(p) }), POW.apply(P, { cash: -500, mod: { [p]: -0.12 }, suspicion: 4 }));
  }));
}

function leaveHall() {
  A.sfx('whoosh'); world.teleport(-8.2, 0, 13, Math.PI / 2 + Math.PI); world.setWeather(run && run.wx ? run.wx : null);
  const pv = run && run.hallPrev; if (taskKey === 'task.hall') setTask(pv ? pv[0] : 'task.desk', pv ? pv[1] : undefined);
}
// Wahlurne: nachzählen lassen oder nachhelfen
function openUrn() {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  const V = POW.VOTES[vid()]; P.vote = P.vote || {}; const st = P.vote[vid()] = P.vote[vid()] || { shift: 0, done: {} };
  const render = () => {
    const fc = POW.voteForecast(P, vid()), par = V.stance[P.party];
    const box = townPanel(t('urn.kicker'), L(V.q), t('urn.info', { y: fc, s: t(par === 'yes' ? 'town.yes' : 'town.no') }));
    const key = 'urn' + run.d, used = st.done[key];
    const want = par === 'yes' ? 1 : -1;
    [['urn.count', { influence: -2 }, 3, P => P.influence >= 2, 0, 'urn.countRes'],
     ['urn.stuff', { suspicion: 9 }, 8, () => true, 0.45, 'urn.stuffRes'],
     ['urn.swap', { cash: -1500, suspicion: 5 }, 6, P => P.cash >= 1500, 0.2, 'urn.swapRes']].forEach(([lab, fx, sh, need, risk, res]) => {
      const el = document.createElement('div'); el.className = 'dos';
      const b = document.createElement('b'); b.textContent = t(lab); el.appendChild(b);
      const n = document.createElement('small'); n.textContent = t(lab + 'Info'); el.appendChild(n);
      const btn = document.createElement('button'); btn.textContent = used ? t('town.doneToday') : t('urn.do');
      btn.disabled = !!used || !need(P) || firstDay();
      btn.onclick = () => {
        POW.apply(P, fx); st.shift += want * sh; st.done[key] = true;
        if (risk && !run.fog && Math.random() < risk) POW.schedule(P, run.d + 1, 'urn_caught');
        P.history.push({ day: run.d, ev: lab }); A.stampSound(); persist(); updateAkte(); toast(t(res)); render();
      };
      el.appendChild(btn); box.appendChild(el);
    });
  };
  render();
}
// Hubers Schreibtisch durchsuchen (einmal pro Kapitel)
function searchHuber() {
  const P = save.power; if (!P || !run || run.kind !== 'day') return;
  const tag = 'huberdesk' + (inSB() ? save.sb.year : chOf(run.d));
  P.flags = P.flags || {};
  if (P.flags[tag]) return toast(t('hd.already'));
  const box = townPanel(t('hd.kicker'), t('hd.title'), t('hd.info'));
  const el = document.createElement('div'); el.className = 'dos';
  const go = document.createElement('button'); go.textContent = t('hd.go');
  go.onclick = () => {
    P.flags[tag] = true;
    const caught = !run.fog && Math.random() < 0.35;
    const fx = caught ? { suspicion: 12, mod: { _own: -0.08 } } : (P.lev && P.lev.huber ? { influence: 2, mod: { huber: -0.06 } } : { lev: 'huber' });
    const ch = POW.apply(P, fx);
    box.innerHTML = '';
    const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t(caught ? 'hd.caught' : P.lev && P.lev.huber && !ch.some(c => c.k === 'lev') ? 'hd.more' : 'hd.found'); box.appendChild(p);
    box.appendChild(fxChips(ch));
    P.history.push({ day: run.d, ev: 'huberdesk' }); A.stampSound(); persist(); updateAkte();
  };
  el.appendChild(go); box.appendChild(el);
}

// ---------------- Etappe 4: Gemeindehaus, Gerüchte ----------------
const vid = () => (run && inSB() ? POW.SB_VOTES[(save.sb.year - 1) % 3] : run ? ['seilbahn', 'aufsicht', 'wolkensteuer'][chOf(run.d) - 1] : 'seilbahn');
const firstDay = () => inSB() ? save.sb.day === 0 : (run.d === 0 || run.d === POW.CH2_START || run.d === POW.CH3_START);
function townPanel(kicker, title, info) { mode = 'town'; world.enabled = false; hud(false); only('town'); $('tnKicker').textContent = kicker; $('tnTitle').textContent = title; $('tnInfo').textContent = info; const b = $('tnList'); b.innerHTML = ''; b.classList.remove('resv'); return b; }
function openTownhall() {
  const P = save.power; if (!P || flow !== 'single' || !run || run.kind !== 'day') return toast(t('toast.townClosed'));
  const V = POW.VOTES[vid()];
  P.vote = P.vote || {}; const st = P.vote[vid()] = P.vote[vid()] || { shift: 0, done: {} };
  const render = () => {
    const fc = POW.voteForecast(P, vid()), par = V.stance[P.party];
    const box = townPanel(t('town.kicker'), L(V.q), firstDay() ? t('town.notyet') : t('town.info', { y: fc, n: 100 - fc, p: POW.PARTIES[P.party].short, s: t(par === 'yes' ? 'town.yes' : 'town.no') }));
    if (firstDay()) return;
    POW.VOTE_ACTIONS.forEach(a => {
      const el = document.createElement('div'); el.className = 'dos';
      const b = document.createElement('b'); b.textContent = L(a.label); el.appendChild(b);
      if (a.risk) { const r = document.createElement('span'); r.className = 'risk'; r.textContent = t('wx.risk'); el.appendChild(r); }
      const key = run.d + a.id, used = st.done[key];
      const bt = document.createElement('div'); bt.className = 'rbtns';
      ['yes', 'no'].forEach(dir => {
        const x = document.createElement('button'); x.textContent = t(dir === 'yes' ? 'town.forYes' : 'town.forNo'); x.disabled = !!used || !a.need(P);
        if (dir === par) x.className = 'prim';
        x.onclick = () => {
          POW.apply(P, a.cost); st.shift += dir === 'yes' ? a.shift : -a.shift; st.done[key] = 1;
          if (a.risk && Math.random() < a.risk) POW.schedule(P, run.d + 1, 'mail_found');
          P.history.push({ day: run.d, ev: 'vote_' + a.id + '_' + dir }); A.stampSound(); persist(); updateAkte(); render();
          toast(L(a.note));
        };
        bt.appendChild(x);
      });
      if (used) { const k = document.createElement('small'); k.textContent = t('town.doneToday'); el.appendChild(k); }
      el.appendChild(bt); $('tnList').appendChild(el);
    });
  };
  render();
}
function openBakery() {
  const P = save.power; if (!P || flow !== 'single' || !run || run.kind !== 'day') return toast(t('toast.bakery'));
  const box = townPanel(t('bak.kicker'), t('bak.title'), run.rumor ? t('bak.done') : t('bak.info'));
  POW.RUMORS.filter(r => r.target !== P.party).forEach(r => {
    const el = document.createElement('div'); el.className = 'dos';
    const tl = document.createElement('span'); tl.className = 'tool'; tl.textContent = L(POW.PARTIES[r.target].name); el.appendChild(tl);
    const p = document.createElement('p'); p.textContent = L(r.text); el.appendChild(p);
    const bt = document.createElement('div'); bt.className = 'rbtns'; const x = document.createElement('button'); x.className = 'prim'; x.textContent = t('bak.go'); x.disabled = !!run.rumor;
    x.onclick = () => {
      run.rumor = r.target; POW.apply(P, { mod: { [r.target]: -0.12 } });
      if (!run.fog && Math.random() < 0.3) POW.schedule(P, run.d + 1, 'rumor_traced');
      P.history.push({ day: run.d, ev: 'rumor_' + r.target }); A.sfx('murmur'); persist(); updateAkte();
      enterWorld(null, taskKey, taskVars); toast(t('bak.sent'));
    };
    bt.appendChild(x); el.appendChild(bt); box.appendChild(el);
  });
}
$('tnClose').onclick = () => enterWorld(null, taskKey, taskVars);
// Ende von Kapitel 1
function chapterEnd(P, box) {
  const now = POW.polls(P), lead = Object.keys(now).sort((a, b) => now[b] - now[a])[0];
  const key = P.suspicion >= 70 ? 'end.susp' : lead === P.party ? 'end.lead' : now[P.party] >= now.huber - 3 ? 'end.close' : 'end.behind';
  const h = document.createElement('h3'); h.textContent = t('end.title'); box.appendChild(h);
  const p = document.createElement('p'); p.className = 'lres'; p.textContent = t(key, { p: L(POW.PARTIES[P.party].name), v: now[P.party].toFixed(1) }); box.appendChild(p);
  const n = document.createElement('p'); n.className = 'hsub'; n.textContent = t('end.next'); box.appendChild(n);
}

// ---------------- Sandbox: Jahre im Amt ----------------
function openSandbox() {
  A.ensureAudio();
  const go = () => { $('pBack').onclick = () => showMenu(); save.sbActive = true; persist(); sbDayStart(); };
  if (save.sb && !save.sb.over) { save.stash = save.power; save.power = save.sb.P; return go(); }
  save.stash = save.power; save.power = null;
  openParty(() => { save.sb = { P: save.power, year: 1, day: 0, terms: 0, history: [] }; go(); });
  // Zurück aus der Parteiwahl: Kampagne wiederherstellen
  $('pBack').onclick = () => { save.power = save.stash; save.stash = null; persist(); $('pBack').onclick = () => showMenu(); showMenu(); };
}
function sbDayStart() {
  const sb = save.sb, P = save.power;
  DAYS[POW.SB_INDEX] = POW.sbDay(sb.year, sb.day);
  if (sb.day === 0) P.vote = {};
  // Morgenpost-Warteschlange um einen Tag vorrücken (run.d bleibt in der Sandbox gleich)
  P.queue.forEach(q => { q.day -= 1; });
  startDay(POW.SB_INDEX);
}
function sbAfterReport() {
  const sb = save.sb;
  if (sb.over) { $('pNext').textContent = t('btn.central'); $('pNext').onclick = () => { save.sb = null; persist(); showMenu(); }; return; }
  const endYear = sb.day === 5;
  const nd = endYear ? 0 : sb.day + 1, ny = endYear ? sb.year + 1 : sb.year;
  $('pNext').textContent = endYear ? t('sb.nextYear', { y: ny }) : t('rep.next', { day: L(POW.sbDay(ny, nd).name) });
  $('pNext').onclick = () => { sb.day = nd; sb.year = ny; persist(); sbDayStart(); };
  const m = $('pMenu'); if (m) m.onclick = () => showMenu();
}
function sbYearEnd(P, box) {
  const sb = save.sb;
  const h = document.createElement('h3'); h.textContent = t('sb.yearTitle', { y: sb.year }); box.appendChild(h);
  if (POW.isElectionYear(sb.year)) {
    const E = POW.election(P), won = E.order[0] === P.party;
    const p = document.createElement('p'); p.className = 'lres';
    p.textContent = t(won ? 'sb.won' : 'sb.lost', { p: L(POW.PARTIES[P.party].name), w: L(POW.PARTIES[E.order[0]].name), v: E.pl[E.order[0]].toFixed(1) });
    box.appendChild(p);
    if (won) sb.terms++;
    sb.history.push({ year: sb.year, winner: E.order[0] });
    // Wer regiert, verliert langsam an Glanz
    box.appendChild(fxChips(POW.apply(P, won ? { mod: { _own: -0.08 }, influence: 2 } : { mod: { _own: 0.06 }, suspicion: -10 })));
  } else {
    const p = document.createElement('p'); p.className = 'hsub'; p.textContent = t('sb.noElection', { y: sb.year + 1 }); box.appendChild(p);
  }
  const s = document.createElement('p'); s.className = 'hsub'; s.textContent = t('sb.terms', { n: sb.terms, y: sb.year }); box.appendChild(s);
}
function sbRemoved(P, box) {
  const sb = save.sb; sb.over = true;
  const h = document.createElement('h3'); h.textContent = t('sb.overTitle'); box.appendChild(h);
  const p = document.createElement('p'); p.className = 'lres'; p.textContent = t('sb.over', { y: sb.year, n: sb.terms }); box.appendChild(p);
}

// Kapitel 3: Gemeindewahl und Ende der Geschichte
function electionEnd(P, box) {
  const E = POW.election(P);
  const h = document.createElement('h3'); h.textContent = t('end3.title'); box.appendChild(h);
  E.order.forEach(p => {
    const r = document.createElement('div'); r.className = 'prow2' + (p === P.party ? ' me' : '');
    const n = document.createElement('span'); n.textContent = L(POW.PARTIES[p].name);
    const bar = document.createElement('span'); bar.className = 'bar'; const f = document.createElement('i'); f.style.width = Math.min(100, E.pl[p] * 2) + '%'; f.style.background = POW.PARTIES[p].color; bar.appendChild(f);
    const v = document.createElement('b'); v.textContent = E.pl[p].toFixed(1) + ' %';
    r.append(n, bar, v); box.appendChild(r);
  });
  const k = document.createElement('p'); k.className = 'kick'; k.textContent = t('end3.k.' + E.end); box.appendChild(k);
  const p = document.createElement('p'); p.className = 'lres'; p.textContent = t('end3.' + E.end, { p: L(POW.PARTIES[P.party].name), w: L(POW.PARTIES[E.order[0]].name) }); box.appendChild(p);
  if (P.flags.wyss_envelope) { const e = document.createElement('p'); e.className = 'hsub'; e.textContent = t('end3.envelope'); box.appendChild(e); }
  if (P.flags.rain_promise) { const e = document.createElement('p'); e.className = 'hsub'; e.textContent = t('end3.rain'); box.appendChild(e); }
  P.ending = E.end;
  const n = document.createElement('p'); n.className = 'hsub'; n.textContent = t('end3.thanks'); box.appendChild(n);
}

// Kapitel 2: Bericht von Inspektor Wyss
function verdictEnd(P, box) {
  const k = POW.verdict(P);
  const h = document.createElement('h3'); h.textContent = t('end2.title'); box.appendChild(h);
  const p = document.createElement('p'); p.className = 'lres'; p.textContent = t('end2.' + k, { p: L(POW.PARTIES[P.party].name) }); box.appendChild(p);
  if (P.flags.wyss_envelope) { const e = document.createElement('p'); e.className = 'hsub'; e.textContent = t('end2.envelope'); box.appendChild(e); }
  box.appendChild(fxChips(POW.apply(P, POW.VERDICT_FX[k])));
  P.verdict = k;
  const n = document.createElement('p'); n.className = 'hsub'; n.textContent = t('end2.next'); box.appendChild(n);
}
function removedEnd(P, box) {
  const h = document.createElement('h3'); h.textContent = t('end2.title'); box.appendChild(h);
  const p = document.createElement('p'); p.className = 'lres'; p.textContent = t('end2.removed'); box.appendChild(p);
  P.verdict = 'removed';
}
// Amt verloren: Kapitel 2 von vorne (Stand vom Kapitelanfang)
function showRemoved(P) {
  showMorning([{ from: 'Kanton Wolkenwil, Inspektorat', text: [t('end2.removedMail'), t('end2.removedMail')],
    choices: [[[t('end2.retry'), t('end2.retry')], {}, [t('end2.retryRes'), t('end2.retryRes')]]] }], POW.CH2_START, () => {
    if (P.snap2) { save.power = JSON.parse(P.snap2); save.power.snap2 = P.snap2; }
    save.day = POW.CH2_START; persist(); showMenu();
  });
}

// Auszählung am Samstag
function voteResult(P, box) {
  const V = POW.VOTES[vid()], fc = POW.voteForecast(P, vid()), yes = fc >= 50, res = yes ? V.yes : V.no;
  const all = POW.apply(P, res.fx);
  const match = (V.stance[P.party] === 'yes') === yes;
  all.push(...POW.apply(P, { mod: { _own: match ? 0.1 : -0.05 } }));
  const h = document.createElement('h3'); h.textContent = t('town.result', { r: t(yes ? 'town.yes' : 'town.no'), y: fc }); box.appendChild(h);
  const p = document.createElement('p'); p.className = 'hsub'; p.textContent = L(res.text) + ' ' + t(match ? 'town.won' : 'town.lost'); box.appendChild(p);
  box.appendChild(fxChips(all));
  // was noch offen war, kommt am Wahlabend heraus
  POW.due(P, 99).forEach(id => { const ev = POW.EVENTS[id]; if (!ev || !ev.fx) return; const q = document.createElement('p'); q.className = 'hsub'; q.textContent = nameOf(ev.from) + ': ' + L(ev.text); box.appendChild(q); box.appendChild(fxChips(POW.apply(P, ev.fx))); });
}

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
  if (chOf(run.d) === 2 && P.inv != null) {
    const g = POW.invDaily(P);
    const r = document.createElement('p'); r.className = 'hsub'; r.textContent = t('inv.daily', { v: P.inv, d: g }); box.appendChild(r);
    if (P.inv >= 100) { removedEnd(P, box); $('pNext').textContent = t('btn.central'); $('pNext').onclick = () => showMenu(); }
  }
  if (DAYS[run.d].end === 1) { voteResult(P, box); chapterEnd(P, box); }
  else if (DAYS[run.d].end === 2 && P.inv < 100) { voteResult(P, box); verdictEnd(P, box); }
  else if (DAYS[run.d].end === 3) { voteResult(P, box); electionEnd(P, box); }
  else if (DAYS[run.d].end === 4) { voteResult(P, box); sbYearEnd(P, box); }
  if (inSB() && P.suspicion >= 95 && !save.sb.over) sbRemoved(P, box);
  P.lastPolls = POW.polls(P);
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
  players() { renderSide(); renderVoice(); syncRemotes(); if (net.phase === 'lobby') renderLobby(); },
  chat(m) { addChat(m); },
  pos(id, p) {
    const r = world.remotes.get(id); if (!r || !p || p.length < 5) return;
    r.target.set(p[0], p[1], p[2]); r.yawT = p[3]; r.grounded = !!p[4]; if (p[5]) r.downReq = true;
  },
  gone(id) { world.removeRemote(id); remoteTags.get(id)?.remove(); remoteTags.delete(id); },
  side() { renderSide(); },
  voice() { renderSide(); renderVoice(); },
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
  pstate(m) { if (m.line) sysMsg(L(m.line)); renderMultiPow(false); },
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
    renderMultiPow(false);
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
  if (m.polls) { net.polls = m.polls; net.pw = m.pw; const win = Object.keys(m.polls).sort((a, b) => m.polls[b] - m.polls[a])[0]; const who = net.players.find(p => partyOf(p.id) === win);
    $('mRound').textContent = t('mp.election'); $('mHead').textContent = win === 'huber' ? t('mp.huberWins') : t('mp.partyWins', { p: L(POW.PARTIES[win].name), n: who ? who.name : '?' }); }
  renderMultiPow(true);
  hostButton(t('mp.revenge'), hostStart, t('mp.waitRevenge'));
  only('mpRes'); A.chime([523, 659, 784, 1047], 0.12);
}
function hostButton(label, fn, waitText) {
  $('mMenu').textContent = t('lobby.leave');
  $('mNext').classList.toggle('hidden', !net.host); $('mNext').textContent = label; $('mNext').onclick = fn;
  $('mWait').textContent = net.host ? '' : waitText;
}
function renderMultiPow(final) {
  const box = $('mPow'); if (!net.polls || !net.pw) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden'); box.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = final ? t('mp.powFinal') : t('mp.pow'); box.appendChild(h);
  const mine = partyOf(net.id), inGame = new Set([...Object.keys(net.pw.trust), 'huber']);
  Object.keys(net.polls).filter(p => inGame.has(p)).sort((a, b) => net.polls[b] - net.polls[a]).forEach(p => {
    const r = document.createElement('div'); r.className = 'prow2' + (p === mine ? ' me' : '');
    const who = net.players.find(x => partyOf(x.id) === p);
    const n = document.createElement('span'); n.textContent = POW.PARTIES[p].short + (who ? ' · ' + who.name : '');
    const bar = document.createElement('span'); bar.className = 'bar'; const f = document.createElement('i'); f.style.width = Math.min(100, net.polls[p] * 2) + '%'; f.style.background = POW.PARTIES[p].color; bar.appendChild(f);
    const v = document.createElement('b'); v.textContent = `${net.polls[p].toFixed(1)} %` + (net.pw.susp[p] != null ? ` · ${t('akte.suspShort')} ${net.pw.susp[p]}` : '');
    r.append(n, bar, v); box.appendChild(r);
  });
  if (final || net.phase !== 'results') return;
  const acts = document.createElement('div'); acts.className = 'acts';
  const done = (net.acted || []).includes(net.id);
  const lab = document.createElement('b'); lab.textContent = done ? t('mp.actDone') : t('mp.backroom'); acts.appendChild(lab);
  if (!done) {
    const sel = document.createElement('select');
    [...inGame].filter(p => p !== mine).forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = POW.PARTIES[p].short; sel.appendChild(o); });
    acts.appendChild(sel);
    POW.MP_ACTIONS.forEach(a => { const b = document.createElement('button'); b.textContent = L(a.label); b.title = L(a.tip); b.onclick = () => { toHost({ t: 'act', a: a.id, target: a.target ? sel.value : null }); A.stampSound(); acts.querySelectorAll('button,select').forEach(x => { x.disabled = true; }); }; acts.appendChild(b); });
  }
  box.appendChild(acts);
  const last = (net.pw.log || []).slice(-2);
  last.forEach(l => { const p = document.createElement('p'); p.className = 'log'; p.textContent = L(l); box.appendChild(p); });
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
    else ps.textContent = p.voice ? (p.mute ? t('voice.muted') : t('voice.in')) : t('side.mic');
    row.dataset.id = p.id; if (p.voice) row.classList.add('vin');
    row.append(av, pn, ps);
    if (pct !== null) { const bar = document.createElement('div'); bar.className = 'pbar'; const f = document.createElement('i'); f.style.width = Math.round(pct * 100) + '%'; bar.appendChild(f); row.appendChild(bar); }
    box.appendChild(row);
  });
}
// Sprachkanal: Knöpfe und «spricht»-Anzeige
function renderVoice() {
  $('vJoin').classList.toggle('hidden', voice.on); $('vMute').classList.toggle('hidden', !voice.on); $('vLeave').classList.toggle('hidden', !voice.on);
  $('vMute').textContent = voice.mute ? t('voice.unmute') : t('voice.mute'); $('vMute').classList.toggle('on', voice.mute);
}
$('vJoin').onclick = async () => {
  if (!voiceSupported()) return toast(t('voice.local'));
  try { await voiceJoin(); } catch (e) { toast(t('voice.denied')); }
  renderVoice();
};
$('vMute').onclick = () => { voiceMute(); renderVoice(); };
$('vLeave').onclick = () => { voiceLeave(); renderVoice(); };
addEventListener('keydown', e => { if ((e.key === 'm' || e.key === 'M') && voice.on && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { voiceMute(); renderVoice(); } });
setInterval(() => {
  if (!voice.on) return;
  document.querySelectorAll('#sPlayers .prow').forEach(r => {
    const f = voice.level[r.dataset.id], lv = f ? f() : 0;
    r.classList.toggle('talk', lv > 0.06 && !(r.dataset.id === net.id && voice.mute));
  });
}, 120);

function renderLobby() {
  $('lCode').textContent = net.code;
  const box = $('lPlayers'); box.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = net.players[i], d = document.createElement('div'), a = document.createElement('span'), b = document.createElement('b');
    if (p) { a.textContent = p.name + (p.id === net.id ? ' ' + t('you') : '') + ' · ' + POW.PARTIES[POW.PLAYABLE[i]].short; b.textContent = p.id === 'host' ? t('host') : t('lobby.ready'); a.style.borderLeft = `6px solid ${PLAYER_COLS[i]}`; a.style.paddingLeft = '6px'; }
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
$('mSandbox').onclick = openSandbox;
let leaveArm = 0;
function confirmLeave() { if (performance.now() < leaveArm) return true; leaveArm = performance.now() + 3000; toast(t('toast.leave')); return false; }
$('hMenu').onclick = () => { if (flow === 'online' && !confirmLeave()) return; showMenu(); };
$('tMenu').onclick = () => { if (flow === 'online' && !confirmLeave()) return; showMenu(); };
function soundLabels() { const l = A.sound.muted ? t('sound.on') : t('sound.off'); $('tSound').textContent = l; $('mSound').textContent = l; }
$('tSound').onclick = $('mSound').onclick = () => { A.setMuted(!A.sound.muted); soundLabels(); $('vMute').checked = A.sound.muted; };
// Einstellungen: Lautstärken
function openSettings() {
  A.ensureAudio();
  const back = [...OVER].filter(x => !$(x).classList.contains('hidden'));
  $('settings').classList.remove('hidden');
  for (const [id, k] of [['vMusic', 'music'], ['vSfx', 'sfx'], ['vAmb', 'amb'], ['vVoice', 'voice']]) { $(id).value = A.volume[k]; $(id).oninput = () => A.setVolume(k, +$(id).value); }
  $('vMute').checked = A.sound.muted; $('vMute').onchange = () => { A.setMuted($('vMute').checked); soundLabels(); };
  $('setClose').onclick = () => { $('settings').classList.add('hidden'); back.forEach(x => $(x).classList.remove('hidden')); };
}
$('mSettings').onclick = openSettings;
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
