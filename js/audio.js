// HOCHDRUCK – Ton. Alles wird im Code erzeugt: keine Aufnahmen, keine fremden Melodien.
// Instrumente: Hackbrett (gezupfte Saite, Karplus-Strong), Akkordeon (zwei leicht verstimmte Zungen),
// Bass, Glocken. Musik in mehreren Stimmungen, dazu Dorfgeräusche und Geräusche für die Oberfläche.
// Alle Melodien hier sind eigene Kompositionen für HOCHDRUCK (© Duchy Games).

let ac = null, noiseBuf = null, lastSnip = 0, lastPuff = 0, lastStep = 0;
let master, busMusic, busSfx, busAmb, busVoice, comp;
const KEY = 'wolkenamt-ton', VKEY = 'hochdruck-lautstaerke';
export const sound = { muted: false };
export const volume = { music: 0.55, sfx: 0.8, amb: 0.7, voice: 0.8 };
try { sound.muted = localStorage.getItem(KEY) === 'aus'; Object.assign(volume, JSON.parse(localStorage.getItem(VKEY) || '{}')); } catch (e) {}

export function setMuted(m) { sound.muted = m; try { localStorage.setItem(KEY, m ? 'aus' : 'an'); } catch (e) {} if (!m) ensureAudio(); applyVolumes(); }
export function setVolume(kind, v) { volume[kind] = v; try { localStorage.setItem(VKEY, JSON.stringify(volume)); } catch (e) {} applyVolumes(); }
function applyVolumes() {
  if (!ac) return;
  const t = ac.currentTime;
  master.gain.setTargetAtTime(sound.muted ? 0 : 1, t, 0.05);
  busMusic.gain.setTargetAtTime(volume.music * 1.3, t, 0.1);
  busSfx.gain.setTargetAtTime(volume.sfx, t, 0.05);
  busAmb.gain.setTargetAtTime(volume.amb * 0.6, t, 0.1);
  busVoice.gain.setTargetAtTime(volume.voice, t, 0.05);
}
export function ensureAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const len = Math.floor(ac.sampleRate * 2); noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(ac.destination);
    master = ac.createGain(); master.connect(comp);
    busMusic = ac.createGain(); busSfx = ac.createGain(); busAmb = ac.createGain(); busVoice = ac.createGain();
    for (const b of [busMusic, busSfx, busAmb, busVoice]) b.connect(master);
    // kleiner Hall für Musik und Glocken (eigene Impulsantwort aus Rauschen)
    const ir = ac.createBuffer(2, ac.sampleRate * 1.6, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2.6); }
    const rev = ac.createConvolver(); rev.buffer = ir; const rg = ac.createGain(); rg.gain.value = 0.22; rev.connect(rg).connect(master);
    reverb = rev;
    applyVolumes();
    startScheduler();
  }
  if (ac.state === 'suspended') ac.resume();
}
let reverb = null;
export const ctx = () => ac;
// nur für Tests: Gesamtausgang zusätzlich auf ein Ziel legen (z. B. zum Aufnehmen)
if (typeof window !== 'undefined') window.__tap = dest => comp && comp.connect(dest);
export const voiceBus = () => busVoice;

// ---------------- Grundbausteine ----------------
export function noise(dur, type, freq, vol, q = 1, bus, when = 0) {
  if (!ac || sound.muted) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); const t = ac.currentTime + when;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(bus || busSfx); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
}
function tone(freq, dur, vol, type = 'sine', slide = 0, bus, when = 0) {
  if (!ac || sound.muted) return;
  const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(bus || busSfx); o.start(t0); o.stop(t0 + dur + 0.02);
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// Hackbrett: Karplus-Strong, zwei leicht verstimmte Saiten pro Ton, Puffer werden zwischengespeichert
const ksCache = new Map();
function ksBuffer(freq, bright) {
  const key = Math.round(freq * 10) + ':' + bright;
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ac.sampleRate, len = Math.floor(sr * 2.2), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (i < N / 2 ? 1 : 0.6);
  let p = 0; const damp = 0.4985 + bright * 0.0013;
  for (let i = 0; i < len; i++) { const n = (p + 1) % N; const v = ring[p]; ring[p] = (ring[p] + ring[n]) * damp; d[i] = v; p = n; }
  ksCache.set(key, buf); return buf;
}
function hackbrett(midi, t, vel = 0.5, bus) {
  const f = mtof(midi);
  for (const det of [1, 1.0023]) {
    const s = ac.createBufferSource(); s.buffer = ksBuffer(f * det, 1); const g = ac.createGain();
    g.gain.value = vel * 0.32; s.connect(g).connect(bus || busMusic); if (reverb) g.connect(reverb);
    s.start(t); s.stop(t + 2.2);
  }
}
// Akkordeon: zwei Zungen (Musette), weicher Balg-Ansatz, leichtes Tremolo
function akkordeon(midi, t, dur, vel = 0.3, bus) {
  const f = mtof(midi), g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800 + vel * 1500; lp.Q.value = 0.7;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.11, t + 0.06); g.gain.setValueAtTime(vel * 0.11, t + Math.max(0.07, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
  for (const [det, type] of [[1, 'sawtooth'], [1.0035, 'square'], [0.9968, 'sawtooth']]) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f * det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
  lp.connect(g).connect(bus || busMusic); if (reverb) g.connect(reverb);
}
function bass(midi, t, dur, vel = 0.5) {
  const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
  o.type = 'triangle'; o.frequency.value = mtof(midi);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(lp).connect(g).connect(busMusic); o.start(t); o.stop(t + dur + 0.05);
}
// Glocke mit unharmonischen Teiltönen
function bell(freq, t, vol = 0.2, decay = 4, bus) {
  const parts = [[0.5, 0.6], [1, 1], [1.19, 0.5], [1.5, 0.45], [2.0, 0.35], [2.74, 0.25], [3.76, 0.15]];
  for (const [r, a] of parts) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = freq * r;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0008, t + decay * (1.2 - r * 0.15));
    o.connect(g).connect(bus || busAmb); if (reverb) g.connect(reverb); o.start(t); o.stop(t + decay * 1.3);
  }
}
function cowbell(t, vol = 0.05) {
  const f = 520 + Math.random() * 220;
  for (const r of [1, 1.48, 2.21]) {
    const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter(); o.type = 'square'; o.frequency.value = f * r; bp.type = 'bandpass'; bp.frequency.value = f * r; bp.Q.value = 6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol / r, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
    o.connect(bp).connect(g).connect(busAmb); o.start(t); o.stop(t + 0.5);
  }
}

// ---------------- Musik ----------------
// Jede Stimmung: Tempo, Takt, Akkordfolge (Grundton + Art), Melodie als Liste [Tonstufe/MIDI, Dauer in Schlägen].
// Die Melodien sind von Hand für HOCHDRUCK geschrieben.
const G = 55, D = 50, C = 48, F = 53, A = 57, E = 52; // Basstöne (MIDI)
const MAJ = [0, 4, 7], MIN = [0, 3, 7], DOM = [0, 4, 7, 10];
const SONGS = {
  // «Wolkenwiler Ländler» – Dorf, fröhlich, 3/4
  village: { bpm: 132, beats: 3, style: 'laendler',
    chords: [[G, MAJ], [G, MAJ], [D, DOM], [D, DOM], [D, DOM], [D, DOM], [G, MAJ], [G, MAJ], [C, MAJ], [C, MAJ], [G, MAJ], [G, MAJ], [D, DOM], [D, DOM], [G, MAJ], [G, MAJ]],
    mel: [[74, 1], [79, 1], [83, 1], [81, 2], [79, 1], [78, 1], [81, 1], [84, 1], [83, 2], [81, 1], [78, 1], [76, 1], [74, 1], [78, 2], [81, 1], [79, 3], [0, 3],
      [76, 1], [79, 1], [84, 1], [83, 2], [81, 1], [79, 1], [76, 1], [79, 1], [83, 2], [79, 1], [78, 1], [81, 1], [84, 1], [83, 1], [81, 1], [78, 1], [79, 3], [0, 3]] },
  // «Amtsstube» – Büro, gemächlicher Walzer, F-Dur
  office: { bpm: 96, beats: 3, style: 'walzer',
    chords: [[F, MAJ], [F, MAJ], [C, DOM], [C, DOM], [F, MAJ], [53 + 5, MAJ], [C, DOM], [F, MAJ], [53 + 5, MAJ], [F, MAJ], [D, MIN], [C, DOM], [F, MAJ], [C, DOM], [C, DOM], [F, MAJ]],
    mel: [[72, 2], [77, 1], [76, 2], [74, 1], [72, 3], [70, 3], [69, 2], [72, 1], [77, 2], [81, 1], [79, 3], [0, 3],
      [81, 2], [79, 1], [77, 2], [76, 1], [74, 2], [72, 1], [70, 3], [69, 1], [72, 1], [76, 1], [77, 3], [0, 6]] },
  // «Abendbericht» – ruhig, d-Moll nach F-Dur, 4/4
  report: { bpm: 72, beats: 4, style: 'ruhig',
    chords: [[D, MIN], [53 + 5, MAJ], [C, MAJ], [F, MAJ], [D, MIN], [53 + 5, MAJ], [A, MAJ], [D, MIN], [53 + 5, MAJ], [D, MIN]],
    mel: [[69, 2], [72, 1], [74, 1], [77, 3], [76, 1], [74, 2], [72, 2], [69, 4], [0, 4], [69, 2], [67, 1], [65, 1], [64, 3], [65, 1], [69, 4], [62, 4], [0, 4]] },
  // «Hochdruck» – Spannung bei hohem Verdacht, e-Moll, pochend
  tension: { bpm: 104, beats: 4, style: 'spannung',
    chords: [[E, MIN], [E, MIN], [C, MAJ], [C, MAJ], [A, MIN], [A, MIN], [47, MAJ], [47, MAJ]],
    mel: [[71, 1.5], [72, 0.5], [71, 2], [0, 2], [67, 1], [69, 1], [71, 2], [76, 1.5], [75, 0.5], [76, 2], [0, 2], [72, 1], [71, 1], [69, 2], [0, 4], [0, 8]] },
  // «Titel» – Menü, Hackbrett allein mit Akkordeon-Teppich
  menu: { bpm: 84, beats: 3, style: 'titel',
    chords: [[G, MAJ], [C, MAJ], [G, MAJ], [D, DOM], [E, MIN], [C, MAJ], [D, DOM], [G, MAJ], [C, MAJ], [G, MAJ], [A, MIN], [D, DOM], [G, MAJ], [E, MIN], [D, DOM], [G, MAJ]],
    mel: [[79, 1], [83, 1], [86, 1], [84, 3], [79, 1], [83, 1], [84, 1], [81, 3], [76, 1], [79, 1], [83, 1], [81, 2], [79, 1], [78, 3], [0, 3],
      [79, 1], [83, 1], [86, 1], [88, 2], [86, 1], [84, 1], [83, 1], [81, 1], [79, 3], [0, 3], [74, 3], [79, 3], [0, 3]] },
};
let song = null, nextSong = 'menu', fade = 0, barT = 0, bar = 0, melI = 0, melT = 0, schedTimer = null;
export function setMusic(name) { if (name !== nextSong) nextSong = name; }
function startScheduler() {
  if (schedTimer) return;
  schedTimer = setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    if (!song) {
      if (!SONGS[nextSong]) return;
      song = { name: nextSong, ...SONGS[nextSong] }; bar = 0; barT = now + 0.15; melT = barT; melI = 0;
    }
    while (barT < now + 0.6) {
      // Stimmungswechsel nur am Anfang einer Zweitaktgruppe
      if (nextSong !== song.name && bar % 2 === 0) {
        if (!SONGS[nextSong]) { song = null; return; }
        song = { name: nextSong, ...SONGS[nextSong] }; bar = 0;
      }
      if (bar % song.chords.length === 0) { melI = 0; melT = barT; }
      const beat = 60 / song.bpm;
      playBar(song, bar, barT, beat); barT += beat * song.beats; bar++;
    }
    const beat = 60 / song.bpm, cycleEnd = barT;
    while (melT < now + 0.6 && melT < cycleEnd && melI < song.mel.length) {
      const [m, dur] = song.mel[melI];
      if (m) {
        const vel = 0.42 + ((melI * 7) % 5) * 0.03;
        if (song.style === 'ruhig' || song.style === 'walzer') akkordeon(m, melT, dur * beat * 0.95, vel * 0.8);
        hackbrett(m, melT, vel);
        if (song.style === 'laendler' && dur >= 2) hackbrett(m - 12, melT + 0.01, vel * 0.5);
      }
      melT += dur * beat; melI++;
    }
  }, 40);
}
function playBar(s, b, t, beat) {
  const [root, kind] = s.chords[b % s.chords.length], chord = kind.map(i => root + 12 + i);
  if (s.style === 'laendler' || s.style === 'walzer') {
    // Hm-ta-ta: Bass auf 1, Akkord auf 2 und 3
    bass(root - 12 + (b % 2 ? 7 : 0), t, beat * 0.9, 0.55);
    for (const k of [1, 2]) for (const n of chord) akkordeon(n, t + k * beat, beat * 0.45, s.style === 'walzer' ? 0.22 : 0.28);
  } else if (s.style === 'ruhig' || s.style === 'titel') {
    bass(root - 12, t, beat * s.beats * 0.9, 0.35);
    for (const n of chord) akkordeon(n, t, beat * s.beats * 0.98, 0.16);
    if (s.style === 'titel') for (let k = 0; k < s.beats; k++) hackbrett(chord[k % chord.length] + 12, t + k * beat, 0.18);
  } else if (s.style === 'spannung') {
    for (let k = 0; k < 8; k++) bass(root - 12 + (k % 4 === 3 ? 7 : 0), t + k * beat / 2, beat * 0.4, k % 2 ? 0.25 : 0.4);
    for (const n of chord) akkordeon(n - 12, t, beat * s.beats, 0.12);
    noise(0.05, 'highpass', 6000, 0.05, 1, busMusic, t - ac.currentTime + beat * 2);
  }
}

// ---------------- Umgebung ----------------
// Ein durchgehendes Rauschen für Wind und Fluss; Glocken, Kuhglocken, Hühner, Vögel, Uhr nach Ort.
let windSrc = null, windGain = null, windLp = null, place = 'menu', ambT = 0, nextBell = 0, nextCow = 0, nextBird = 0, nextTick = 0, nextHen = 0;
export function ambient(where, dt, opt = {}) {
  if (!ac || ac.state !== 'running') return;
  place = where;
  if (!windSrc) {
    windSrc = ac.createBufferSource(); windSrc.buffer = noiseBuf; windSrc.loop = true;
    windLp = ac.createBiquadFilter(); windLp.type = 'lowpass'; windLp.frequency.value = 400;
    windGain = ac.createGain(); windGain.gain.value = 0;
    windSrc.connect(windLp).connect(windGain).connect(busAmb); windSrc.start();
  }
  const t = ac.currentTime; ambT += dt;
  const gust = 0.5 + 0.5 * Math.sin(ambT * 0.37) * Math.sin(ambT * 0.13 + 1);
  const wv = where === 'roof' ? 0.16 + gust * 0.16 : where === 'village' ? 0.05 + gust * 0.05 : where === 'office' ? 0.015 : 0.0;
  windGain.gain.setTargetAtTime(opt.storm ? wv * 2.2 : wv, t, 0.4);
  windLp.frequency.setTargetAtTime(where === 'roof' ? 500 + gust * 600 : 300 + gust * 200, t, 0.5);
  if (where === 'menu' || where === 'room') return;
  if (t > nextBell) { if (nextBell) { const n = 3 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) bell(k % 2 ? 392 : 330, t + k * 1.6, 0.06, 5); } nextBell = t + 70 + Math.random() * 60; }
  if (where !== 'office' && t > nextCow) { if (nextCow) { cowbell(t, 0.035); cowbell(t + 0.35 + Math.random() * 0.3, 0.025); } nextCow = t + 5 + Math.random() * 9; }
  if (where !== 'office' && t > nextBird && !opt.rain) { if (nextBird) { const f = 2400 + Math.random() * 1600; for (let k = 0; k < 3; k++) tone(f + k * 120, 0.08, 0.025, 'sine', 600, busAmb, k * 0.11); } nextBird = t + 3 + Math.random() * 7; }
  if (where === 'office' && t > nextTick) { noise(0.012, 'highpass', 4000, 0.08, 1, busAmb); nextTick = t + 1; }
  if (opt.nearHens && t > nextHen) { if (nextHen) hen(t); nextHen = t + 2 + Math.random() * 4; }
  if (opt.rain && Math.random() < dt * 30) noise(0.03, 'highpass', 3000 + Math.random() * 3000, 0.03, 1, busAmb);
}
function hen(t) {
  // «Bok-bok-baak»: kurze Formant-Stösse
  for (let k = 0; k < 3; k++) {
    const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter(); o.type = 'sawtooth';
    const f = k === 2 ? 620 : 480; o.frequency.setValueAtTime(f, t + k * 0.16); o.frequency.exponentialRampToValueAtTime(f * (k === 2 ? 1.4 : 0.8), t + k * 0.16 + 0.1);
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
    g.gain.setValueAtTime(0, t + k * 0.16); g.gain.linearRampToValueAtTime(0.05, t + k * 0.16 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + k * 0.16 + (k === 2 ? 0.22 : 0.09));
    o.connect(bp).connect(g).connect(busAmb); o.start(t + k * 0.16); o.stop(t + k * 0.16 + 0.3);
  }
}

// ---------------- Oberfläche ----------------
export function ui(kind) {
  if (!ac || sound.muted) return;
  if (kind === 'click') { noise(0.03, 'bandpass', 1800, 0.18, 3); tone(880, 0.05, 0.03, 'triangle'); }
  else if (kind === 'paper') { noise(0.25, 'highpass', 2500, 0.12, 0.5); noise(0.18, 'bandpass', 1200, 0.08, 0.7, busSfx, 0.08); }
  else if (kind === 'good') { tone(784, 0.18, 0.05, 'triangle'); tone(1047, 0.25, 0.05, 'triangle', 0, busSfx, 0.08); }
  else if (kind === 'bad') { tone(220, 0.3, 0.07, 'triangle', -60); noise(0.1, 'lowpass', 200, 0.3); }
  else if (kind === 'coin') { tone(1568, 0.08, 0.04, 'square'); tone(2093, 0.18, 0.04, 'square', 0, busSfx, 0.07); }
  else if (kind === 'type') { for (let k = 0; k < 6; k++) noise(0.02, 'bandpass', 2600 + Math.random() * 800, 0.12, 4, busSfx, k * 0.07 + Math.random() * 0.03); }
  else if (kind === 'ring') { for (let k = 0; k < 10; k++) tone(k % 2 ? 1250 : 1100, 0.05, 0.05, 'square', 0, busSfx, k * 0.05); }
  else if (kind === 'door') { noise(0.25, 'lowpass', 300, 0.4); tone(140, 0.2, 0.05, 'triangle', -40); }
}

// ---------------- bisherige Effekte ----------------
export function snip() { if (!ac) return; const t = ac.currentTime; if (t - lastSnip < 0.09) return; lastSnip = t; noise(0.07, 'bandpass', 2600 + Math.random() * 2000, 0.25, 1.5); }
export function puffSound() { if (!ac) return; const t = ac.currentTime; if (t - lastPuff < 0.14) return; lastPuff = t; noise(0.2, 'lowpass', 500, 0.35); }
export function windSound() { noise(0.9, 'bandpass', 380, 0.25, 0.7); }
export function shutter() { noise(0.05, 'highpass', 3000, 0.4); setTimeout(() => noise(0.06, 'highpass', 2500, 0.3), 90); }
export function stampSound() { noise(0.14, 'lowpass', 160, 1.2); setTimeout(() => noise(0.05, 'bandpass', 900, 0.3), 30); }
// Dorfgeräusche je nach Ort: Kuhglocken, Bienen, Kinder (vol 0..1 nach Entfernung)
export function villageSound(kind, vol = 1) {
  if (!ac || sound.muted || vol <= 0.02) return;
  const t = ac.currentTime;
  if (kind === 'cowbell') { const f = 520 + Math.random() * 380; bell(f, t, 0.035 * vol, 0.9, busAmb); if (Math.random() < 0.5) bell(f, t + 0.18, 0.025 * vol, 0.7, busAmb); }
  if (kind === 'bees') {
    const o = ac.createOscillator(), g = ac.createGain(), lf = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 210 + Math.random() * 40; lf.frequency.value = 7 + Math.random() * 5; lg.gain.value = 18; lf.connect(lg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02 * vol, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 1.6);
    o.connect(f).connect(g).connect(busAmb); o.start(t); lf.start(t); o.stop(t + 1.7); lf.stop(t + 1.7);
  }
  if (kind === 'kids') {
    const lines = ['Hii-hii!', 'Fangis! Fangis!', 'Ich bi dra!', 'Gugguseli!', 'Schaukli!', 'Hehe, hehe!'];
    const V = Object.assign({}, ARCH.piepsig, { pitch: 300 + Math.random() * 80, tract: 1.3, speed: 1.5 });
    speak(LGsyl(lines[Math.floor(Math.random() * lines.length)]), V, { interrupt: true, overlap: true, gain: 0.35 * vol, noGesture: Math.random() < 0.7, mood: '!' });
  }
}
let LGsyl = s => s.split(/[\s-]+/).filter(Boolean).flatMap(w => (w.match(/[^aeiouäöüy]*[aeiouäöüy]+[^aeiouäöüy]?/gi) || [w]).map((p, i) => { const m = p.match(/^([^aeiouäöüy]*)([aeiouäöüy]+)(.*)$/i) || ['', '', 'a', '']; return { c: m[1].toLowerCase(), v: m[2][0].toLowerCase(), long: m[2].length > 1, end: m[3], w: i === 0 }; }));
// Kirchenglocke: tiefe, lange Schläge
export function churchBells(n = 6) {
  if (!ac || sound.muted) return;
  const seq = [196, 247, 165, 196, 247, 165, 220, 196];
  for (let i = 0; i < n; i++) { bell(seq[i % seq.length], ac.currentTime + i * 0.75, 0.12, 3.2, busAmb); bell(seq[i % seq.length] * 2.01, ac.currentTime + i * 0.75, 0.035, 1.8, busAmb); }
}
export function chime(freqs, gap) {
  if (!ac || sound.muted) return;
  freqs.forEach((fq, i) => bell(fq, ac.currentTime + i * gap, 0.05, 1.2, busSfx));
}
export function sfx(kind, surface) {
  if (!ac || sound.muted) return;
  if (kind === 'step') {
    const t = ac.currentTime; if (t - lastStep < 0.2) return; lastStep = t;
    if (surface === 'wood') { noise(0.06, 'lowpass', 300, 0.22); if (Math.random() < 0.18) tone(170 + Math.random() * 90, 0.28, 0.035, 'triangle', -60); }
    else noise(0.05, 'bandpass', 1400, 0.08, 0.8);
  } else if (kind === 'jump') tone(320, 0.16, 0.06, 'triangle', 260);
  else if (kind === 'land') noise(0.08, 'lowpass', 220, 0.35);
  else if (kind === 'tumble') { noise(0.18, 'lowpass', 180, 0.7); tone(260, 0.35, 0.05, 'triangle', -150); }
  else if (kind === 'crank') { for (let i = 0; i < 5; i++) noise(0.04, 'bandpass', 1800 + i * 90, 0.2, 4, busSfx, i * 0.11); }
  else if (kind === 'thunder') { noise(1.8, 'lowpass', 110, 1.1, 1, busAmb, 0.4); noise(0.6, 'lowpass', 300, 0.5, 1, busAmb, 0.4); }
  else if (kind === 'whoosh') noise(0.6, 'bandpass', 700, 0.18, 0.6);
  else if (kind === 'murmur') { for (let i = 0; i < 6; i++) tone(180 + Math.random() * 140, 0.22, 0.02, 'triangle', (Math.random() - 0.5) * 80, busSfx, i * 0.09 + Math.random() * 0.06); }
}

// ---------------- Stimmen (Wolkwilisch-Gebrabbel) ----------------
// Eigene Formant-Synthese, keine Aufnahmen: Pro Satz läuft EINE Stimmbandschwingung durch, deren Klang
// (Formanten) von Silbe zu Silbe gleitet, wie beim echten Sprechen. Dazu Atem, Rauschen für s/sch/f,
// kurze Verschlüsse für p/t/k, Nasale, Betonung, Satzmelodie. Jede Figur ist ein «Typ» mit Charakter:
// Grummler, Plaudertasche, Grosi mit Zitterstimme, wichtigtuerischer Präsident, trockener Beamter …
// Dazu Laute ohne Worte: Hmpf, Hehe, Pfff, Ooh, Hm?
const FORM = { a: [780, 1220, 2550], e: [440, 1950, 2600], i: [300, 2250, 2950], o: [480, 860, 2450], u: [340, 760, 2350], 'ä': [660, 1720, 2500], 'ö': [430, 1580, 2400], 'ü': [310, 1680, 2250], 'é': [400, 2100, 2700], 'è': [600, 1800, 2550], 'à': [780, 1220, 2550] };
const ARCH = {
  normal:   { pitch: 135, speed: 1.05, tract: 1.0,  breath: 0.06, rough: 0.05, vib: 0,    vibR: 5,   swing: 0.16, nasal: 0.15, creak: 0.2, stretch: 1 },
  grummel:  { pitch: 92,  speed: 0.92, tract: 0.86, breath: 0.07, rough: 0.4,  vib: 0,    vibR: 5,   swing: 0.09, nasal: 0.12, creak: 0.7, stretch: 1, grunt: 0.5 },
  bauer:    { pitch: 86,  speed: 0.78, tract: 0.84, breath: 0.1,  rough: 0.28, vib: 0,    vibR: 5,   swing: 0.07, nasal: 0.2,  creak: 0.8, stretch: 1.15, grunt: 0.6 },
  piepsig:  { pitch: 235, speed: 1.35, tract: 1.2,  breath: 0.05, rough: 0,    vib: 0.01, vibR: 7,   swing: 0.28, nasal: 0.5,  creak: 0,   stretch: 0.9, giggle: 0.4 },
  plapper:  { pitch: 215, speed: 1.55, tract: 1.12, breath: 0.07, rough: 0.02, vib: 0,    vibR: 6,   swing: 0.24, nasal: 0.28, creak: 0.05, stretch: 0.85, giggle: 0.25 },
  grosi:    { pitch: 255, speed: 0.82, tract: 1.13, breath: 0.26, rough: 0.06, vib: 0.055, vibR: 6.2, swing: 0.22, nasal: 0.2,  creak: 0.15, stretch: 1.2, sigh: 0.4 },
  wichtig:  { pitch: 112, speed: 0.8,  tract: 0.9,  breath: 0.04, rough: 0.16, vib: 0.012, vibR: 4.5, swing: 0.32, nasal: 0.08, creak: 0.35, stretch: 1.45, laugh: 0.35 },
  amtlich:  { pitch: 100, speed: 0.86, tract: 0.93, breath: 0.03, rough: 0.05, vib: 0,    vibR: 5,   swing: 0.03, nasal: 0.3,  creak: 0.4, stretch: 1.05 },
  zappel:   { pitch: 165, speed: 1.4,  tract: 1.04, breath: 0.09, rough: 0.08, vib: 0,    vibR: 5,   swing: 0.3,  nasal: 0.18, creak: 0.1, stretch: 0.9, giggle: 0.3 },
};
let glottal = null;
function glottalWave() {
  if (glottal) return glottal;
  const n = 40, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) { const a = Math.pow(k, -1.25) * (1 + 0.25 * Math.sin(k * 1.3)); re[k] = a * 0.35; im[k] = -a; }
  return (glottal = ac.createPeriodicWave(re, im));
}
let speakUntil = 0, lastVoice = null;
// Ein «Sprechapparat» für einen Satz: Quelle → Formanten → Ausgang, alles automatisierbar
function rig(V, t0, vol) {
  const o = ac.createOscillator(); o.setPeriodicWave(glottalWave());
  // Zittern und Vibrato über die Tonhöhe (in Cent)
  const j1 = ac.createOscillator(), j2 = ac.createOscillator(), jg = ac.createGain();
  j1.frequency.value = 6.7 + Math.random(); j2.frequency.value = 13.1 + Math.random() * 2; jg.gain.value = 8 + V.rough * 35;
  j1.connect(jg); j2.connect(jg); jg.connect(o.detune);
  const vb = ac.createOscillator(), vg = ac.createGain(); vb.frequency.value = V.vibR; vg.gain.value = V.vib * 1200; vb.connect(vg).connect(o.detune);
  // Stimme an/aus (Hüllkurve), Knurren als schnelle Amplitudenmodulation
  const voiced = ac.createGain(); voiced.gain.value = 0;
  const growl = ac.createGain(); growl.gain.value = 1;
  const gl = ac.createOscillator(), glg = ac.createGain(); gl.type = 'triangle'; gl.frequency.value = 28 + Math.random() * 10; glg.gain.value = V.rough * 0.55; gl.connect(glg).connect(growl.gain);
  o.connect(growl).connect(voiced);
  // Atem: Rauschen mit gleicher Hüllkurve, läuft durch dieselben Formanten
  const br = ac.createBufferSource(); br.buffer = noiseBuf; br.loop = true;
  const bhp = ac.createBiquadFilter(); bhp.type = 'highpass'; bhp.frequency.value = 500;
  const breath = ac.createGain(); breath.gain.value = 0;
  br.connect(bhp).connect(breath);
  const src = ac.createGain(); voiced.connect(src); breath.connect(src);
  const out = ac.createGain(); out.gain.value = vol;
  const F = [0, 1, 2].map(k => { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [5, 9, 12][k]; const g = ac.createGain(); g.gain.value = [2.4, 1.5, 0.75][k]; src.connect(bp).connect(g).connect(out); return { bp, g }; });
  // Nase und Brustkorb
  const nb = ac.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 260; nb.Q.value = 3; const ng = ac.createGain(); ng.gain.value = V.nasal * 1.6; src.connect(nb).connect(ng).connect(out);
  const ch = ac.createBiquadFilter(); ch.type = 'lowpass'; ch.frequency.value = 350; const cg = ac.createGain(); cg.gain.value = 0.35; voiced.connect(ch).connect(cg).connect(out);
  // Mundraum: oben etwas weicher
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200 * V.tract; out.connect(lp).connect(busVoice);
  if (reverb) { const rs = ac.createGain(); rs.gain.value = 0.12; lp.connect(rs).connect(reverb); }
  const all = [o, j1, j2, vb, gl, br];
  return { o, voiced, breath, F, ng, out, start: () => all.forEach(x => x.start(t0)), stop: t => all.forEach(x => x.stop(t)) };
}
// Rauschstoss für Konsonanten (eigener Weg, damit s/sch nicht durch die Vokalformanten müssen)
function fric(t, dur, f, q, vol, type = 'bandpass') {
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 1.8); lp.Q.value = 0.5;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(vol, t, Math.max(0.004, dur * 0.12)); g.gain.setTargetAtTime(0, t + dur * 0.55, Math.max(0.006, dur * 0.2));
  s.connect(b).connect(lp).connect(g).connect(busVoice); s.start(t, Math.random() * 1.5); s.stop(t + dur * 2 + 0.06);
}
const CONS = c => {
  if (!c) return null;
  if (/tsch|sch/.test(c)) return { k: 'fric', f: 2700, q: 1.6, dur: 0.075, v: 0.32 };
  if (/ch/.test(c)) return { k: 'fric', f: 1700, q: 0.9, dur: 0.07, v: 0.22 };
  if (/[sz]/.test(c)) return { k: 'fric', f: 5800, q: 2.2, dur: 0.06, v: 0.24 };
  if (/[fv]/.test(c)) return { k: 'fric', f: 2400, q: 0.5, dur: 0.055, v: 0.12 };
  if (/h/.test(c)) return { k: 'asp', dur: 0.05 };
  if (/[pb]/.test(c)) return { k: 'stop', f: 700, dur: 0.045, v: /p/.test(c) ? 0.35 : 0.2, voiced: /b/.test(c) };
  if (/[td]/.test(c)) return { k: 'stop', f: 3600, dur: 0.04, v: /t/.test(c) ? 0.35 : 0.2, voiced: /d/.test(c) };
  if (/[kgq]/.test(c)) return { k: 'stop', f: 1800, dur: 0.05, v: /k|q/.test(c) ? 0.4 : 0.22, voiced: /g/.test(c) };
  if (/[mn]/.test(c)) return { k: 'nas', dur: 0.05 };
  if (/[lrjw]/.test(c)) return { k: 'liq', dur: 0.04, r: /r/.test(c) };
  return { k: 'liq', dur: 0.03 };
};
function formTo(R, v, t, fs, tc = 0.022) { const f = FORM[v] || FORM.a; R.F.forEach((x, k) => x.bp.frequency.setTargetAtTime(f[k] * fs, t, tc)); }
export function speak(syl, voice = {}, opt = {}) {
  if (!ac || sound.muted || !syl || !syl.length) return 0;
  const V = Object.assign({}, ARCH.normal, voice);
  const sp = V.speed, fs = V.tract, vol = (opt.gain ?? 1) * 0.42;
  let t = Math.max(ac.currentTime + 0.03, opt.interrupt ? 0 : speakUntil);
  const mood = opt.mood || '', rnd = Math.random;
  // manchmal zuerst ein Laut ohne Worte, je nach Typ
  if (!opt.noGesture) {
    const pre = mood === '!' && V.grunt && rnd() < V.grunt ? 'hmpf' : mood === '?' && rnd() < 0.25 ? 'hm' : V.sigh && rnd() < V.sigh * 0.5 ? 'sigh' : null;
    if (pre) t += gestureAt(pre, V, t, vol) + 0.06;
  }
  const maxS = opt.max || 14, list = syl.slice(0, maxS), last = list.filter(s => !s.pause).length;
  const R = rig(V, t - 0.01, vol); R.start();
  let n = 0, prevEnd = t, phraseStart = 0;
  const base = V.pitch * (mood === '!' ? 1.12 : 1);
  R.o.frequency.setValueAtTime(base, t);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.pause) {
      // Pause: Stimme aus, kurz Luft holen
      const pd = (s.pause === ',' ? 0.13 : 0.24) / sp;
      R.voiced.gain.setTargetAtTime(0, t, 0.015); R.breath.gain.setTargetAtTime(V.breath * 0.6, t, 0.02); R.breath.gain.setTargetAtTime(0, t + pd * 0.6, 0.02);
      t += pd; phraseStart = n; continue;
    }
    const prog = last > 1 ? n / (last - 1) : 0, fin = n === last - 1;
    const stress = s.w || n === 0;
    let dur = (s.long ? 0.16 : 0.105) / sp * (stress ? 1.25 : 1) * (fin ? 1.45 * V.stretch : 1) * (0.88 + rnd() * 0.24);
    // Konsonant vorne
    const C = CONS(s.c);
    if (C) {
      if (C.k === 'fric') { R.voiced.gain.setTargetAtTime(0.08, t, 0.01); fric(t, C.dur / sp, C.f, C.q, vol * C.v * 1.6); t += C.dur / sp * 0.85; }
      else if (C.k === 'stop') { R.voiced.gain.setTargetAtTime(C.voiced ? 0.15 : 0, t, 0.006); t += C.dur / sp * 0.7; fric(t, 0.03, C.f, 0.8, vol * C.v * 1.5); t += 0.014; if (!C.voiced) { R.breath.gain.setTargetAtTime(V.breath + 0.15, t, 0.005); R.breath.gain.setTargetAtTime(V.breath * 0.4, t + 0.02, 0.015); } }
      else if (C.k === 'asp') { R.voiced.gain.setTargetAtTime(0, t, 0.01); R.breath.gain.setTargetAtTime(0.5, t, 0.01); t += C.dur / sp; R.breath.gain.setTargetAtTime(V.breath * 0.4, t, 0.015); }
      else if (C.k === 'nas') { R.voiced.gain.setTargetAtTime(0.45, t, 0.01); R.ng.gain.setTargetAtTime(V.nasal * 1.6 + 1.6, t, 0.01); R.F.forEach(x => x.g.gain.setTargetAtTime(x.g.gain.value * 0.25, t, 0.01)); t += C.dur / sp; R.ng.gain.setTargetAtTime(V.nasal * 1.6, t, 0.02); R.F.forEach((x, k) => x.g.gain.setTargetAtTime([2.4, 1.5, 0.75][k], t, 0.02)); }
      else if (C.k === 'liq') { R.voiced.gain.setTargetAtTime(0.6, t, 0.01); if (C.r) { R.F[1].bp.frequency.setTargetAtTime(1300 * fs, t, 0.01); } t += C.dur / sp; }
    }
    // Vokal: Formanten gleiten hin, Stimme an
    formTo(R, s.v, t - 0.01, fs);
    const accent = stress ? V.swing : -V.swing * 0.25;
    let f0 = base * (1 - prog * 0.16) * (1 + accent) * (1 + (rnd() - 0.5) * 0.05);
    let f1 = f0 * (stress ? 0.93 : 0.98);
    if (fin && mood === '?') { f0 *= 1.05; f1 = f0 * 1.38; }
    else if (fin && mood === '!') { f0 *= 1.1; f1 = f0 * 0.8; }
    else if (fin) f1 = f0 * (0.8 - V.creak * 0.12);
    R.o.frequency.setTargetAtTime(f0, t - 0.01, 0.025); R.o.frequency.setTargetAtTime(f1, t + dur * 0.45, dur * 0.35);
    const loud = (stress ? 1 : 0.78) * (mood === '!' && n < 3 ? 1.15 : 1);
    R.voiced.gain.setTargetAtTime(loud, t - 0.005, 0.012);
    R.breath.gain.setTargetAtTime(V.breath * (fin ? 1.6 : 1), t, 0.02);
    // Ende der Silbe
    t += dur;
    if (s.end && /[mn]/.test(s.end)) { R.ng.gain.setTargetAtTime(V.nasal * 1.6 + 1.4, t, 0.01); R.voiced.gain.setTargetAtTime(0.45, t, 0.01); t += 0.05 / sp; R.ng.gain.setTargetAtTime(V.nasal * 1.6, t, 0.02); }
    else if (s.end && /[sz]/.test(s.end)) { R.voiced.gain.setTargetAtTime(0.05, t, 0.008); fric(t, 0.06 / sp, 5800, 2.2, vol * 0.35); t += 0.05 / sp; }
    else if (s.end && /[ptk]/.test(s.end)) { R.voiced.gain.setTargetAtTime(0, t, 0.005); t += 0.03 / sp; fric(t, 0.03, 2500, 0.8, vol * 0.35); t += 0.02; }
    // Knarzen am Satzende (Stimme fällt in den Keller)
    if (fin && V.creak > 0.3 && mood !== '?') { R.o.frequency.setTargetAtTime(f1 * 0.72, t - dur * 0.25, 0.04); }
    n++; prevEnd = t;
  }
  R.voiced.gain.setTargetAtTime(0, t, 0.025); R.breath.gain.setTargetAtTime(V.breath * 1.5, t, 0.02); R.breath.gain.setTargetAtTime(0, t + 0.08, 0.04);
  R.stop(t + 0.35);
  t += 0.06;
  // danach vielleicht ein Kichern, Lachen oder Seufzen
  if (!opt.noGesture) {
    const post = mood === '!' && V.laugh && rnd() < V.laugh ? 'laugh' : V.giggle && rnd() < V.giggle ? 'hehe' : V.sigh && mood !== '!' && rnd() < V.sigh * 0.4 ? 'pff' : null;
    if (post) t += gestureAt(post, V, t + 0.05, vol) + 0.05;
  }
  speakUntil = opt.overlap ? speakUntil : t;
  return t - ac.currentTime;
}
// Laute ohne Worte. Gibt die Dauer zurück.
function gestureAt(kind, V, t, vol) {
  const fs = V.tract, p = V.pitch;
  const one = (v, d, fA, fB, opts = {}) => {
    const R = rig(V, t - 0.01, vol * (opts.vol || 1)); R.start(); formTo(R, v, t - 0.02, fs, 0.005);
    if (opts.hum) { R.F.forEach(x => x.g.gain.value *= 0.2); R.ng.gain.value = 3.2; }
    R.o.frequency.setValueAtTime(fA, t); R.o.frequency.linearRampToValueAtTime(fB, t + d);
    R.voiced.gain.setTargetAtTime(opts.voice ?? 1, t, 0.01); R.breath.gain.setTargetAtTime(opts.breath ?? V.breath, t, 0.01);
    R.voiced.gain.setTargetAtTime(0, t + d * 0.8, 0.02); R.breath.gain.setTargetAtTime(0, t + d * 0.85, 0.02); R.stop(t + d + 0.25);
  };
  if (kind === 'hmpf') { one('u', 0.18, p * 1.05, p * 0.82, { hum: true }); fric(t + 0.17, 0.08, 1200, 0.5, vol * 0.35); return 0.27; }
  if (kind === 'hm') { one('u', 0.28, p * 0.92, p * 1.22, { hum: true }); return 0.3; }
  if (kind === 'sigh') { one('a', 0.42, p * 1.15, p * 0.72, { voice: 0.25, breath: 0.6 }); return 0.45; }
  if (kind === 'pff') { fric(t, 0.05, 900, 0.6, vol * 0.5); fric(t + 0.04, 0.3, 1600, 0.4, vol * 0.25); return 0.34; }
  if (kind === 'oh') { one('o', 0.4, p * 0.95, p * 1.3, {}); return 0.42; }
  if (kind === 'hehe' || kind === 'laugh') {
    const n = kind === 'laugh' ? 4 : 3, d = kind === 'laugh' ? 0.13 : 0.09, v = kind === 'laugh' ? 'a' : 'e';
    for (let k = 0; k < n; k++) { const tt = t + k * (d + 0.045), f = p * (kind === 'laugh' ? 1.3 - k * 0.08 : 1.35 + k * 0.06);
      fric(tt, 0.035, 1500, 0.5, vol * 0.3);
      const R = rig(V, tt, vol * 0.9); R.start(); formTo(R, v, tt - 0.01, fs, 0.005); R.o.frequency.setValueAtTime(f, tt); R.o.frequency.linearRampToValueAtTime(f * 0.9, tt + d);
      R.voiced.gain.setTargetAtTime(1, tt + 0.02, 0.008); R.breath.gain.setTargetAtTime(0.25, tt, 0.01); R.voiced.gain.setTargetAtTime(0, tt + d, 0.012); R.breath.gain.setTargetAtTime(0, tt + d, 0.012); R.stop(tt + d + 0.15); }
    return n * (d + 0.045);
  }
  return 0;
}
export function gesture(kind, voice = {}, opt = {}) { if (!ac || sound.muted) return 0; const V = Object.assign({}, ARCH.normal, voice); return gestureAt(kind, V, ac.currentTime + 0.03, (opt.gain ?? 1) * 0.42); }
// feste Stimmen für Figuren; unbekannte Namen bekommen einen Typ und eine leicht eigene Lage aus dem Namen
const CAST = {
  'Gemeindepräsident Huber': ['wichtig', 1], huber: ['wichtig', 1],
  'Inspektor Wyss': ['amtlich', 1], 'Kantonsinspektor Wyss': ['amtlich', 1], 'Kanton Wolkenwil, Inspektorat': ['amtlich', 1.08], 'Gemeindeschreiber': ['amtlich', 1.25],
  'Frau Imboden, Wolkenwiler Anzeiger': ['plapper', 1], 'Redaktorin Imboden': ['plapper', 1], 'Wolkenwiler Anzeiger': ['plapper', 1],
  'Grosi Elsbeth': ['grosi', 1], elsbeth: ['grosi', 1],
  'Bauer Zbinden': ['bauer', 1], moser: ['bauer', 0.96], 'Bauer Moser': ['bauer', 0.96],
  gerber: ['grummel', 1.05], 'Herr Gerber': ['grummel', 1.05], 'Bäckerei Moser': ['grummel', 1.1], 'Wirt Bruno': ['grummel', 0.95],
  zbinden: ['zappel', 1.25], 'Schulleitung': ['zappel', 1.2], 'FC Wolkenwil': ['zappel', 0.85],
  'Pfarrei St. Niklaus': ['amtlich', 0.9], 'Anonymer Anrufer': ['grummel', 0.8], 'Unbekannt': ['grummel', 0.85],
};
export function voiceFor(name = '') {
  name = Array.isArray(name) ? name[0] : String(name);
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pick = CAST[name] || [['normal', 'grummel', 'piepsig', 'plapper', 'zappel', 'bauer', 'normal'][h % 7], 0.92 + ((h >> 5) % 18) / 100];
  const A = ARCH[pick[0]];
  return Object.assign({}, A, { pitch: A.pitch * pick[1], tract: A.tract * (0.97 + ((h >> 9) % 7) / 100), speed: A.speed * (0.95 + ((h >> 3) % 10) / 100) });
}
