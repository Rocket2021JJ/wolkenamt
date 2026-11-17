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
// Formant-Synthese: eine Sägezahn-«Stimmbandschwingung» durch drei Bandpässe (Vokalklang),
// Konsonanten als kurze Rauschstösse. Jede Figur hat eine eigene Stimmlage und Sprechgeschwindigkeit.
const FORM = { a: [800, 1200, 2500], e: [420, 2000, 2600], i: [290, 2250, 2900], o: [460, 820, 2400], u: [330, 720, 2400], 'ä': [650, 1750, 2500], 'ö': [420, 1600, 2400], 'ü': [300, 1700, 2200] };
let speakUntil = 0;
export function speak(syl, voice = {}, opt = {}) {
  if (!ac || sound.muted || !syl || !syl.length) return 0;
  const pitch = voice.pitch || 150, speed = voice.speed || 1, fs = voice.formant || 1, vol = (opt.gain ?? 1) * 0.5;
  let t = Math.max(ac.currentTime + 0.02, opt.interrupt ? 0 : speakUntil), n = 0;
  const maxS = opt.max || 14, last = Math.min(syl.length, maxS);
  for (let i = 0; i < last; i++) {
    const s = syl[i];
    if (s.pause) { t += s.pause === ',' ? 0.12 / speed : 0.22 / speed; continue; }
    const dur = (s.long ? 0.17 : 0.11) / speed * (0.9 + ((i * 7) % 5) * 0.05);
    // Satzmelodie: leicht fallend, bei Fragen am Ende steigend, bei Ausrufen höher
    const end = i >= last - 2, q = opt.mood === '?' && end, ex = opt.mood === '!';
    const f0 = pitch * (1 + Math.sin(i * 1.7) * 0.06) * (ex ? 1.2 : 1) * (q ? 1.25 : 1) * (1 - i / last * 0.12);
    // Konsonant vorne
    if (s.c) {
      const hiss = /s|z|ch|f|tsch/.test(s.c), plos = /b|p|d|t|g|k/.test(s.c);
      if (hiss) noise(0.05 / speed, 'highpass', s.c.includes('sch') ? 2400 : 4200, vol * 0.25, 1, busVoice, t - ac.currentTime);
      else if (plos) noise(0.02, 'lowpass', 900, vol * 0.5, 1, busVoice, t - ac.currentTime);
      t += hiss ? 0.035 / speed : 0.012;
    }
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (q && i === last - 1 ? 1.25 : 0.94), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    const F = FORM[s.v] || FORM.a;
    [[F[0], 1, 7], [F[1], 0.55, 10], [F[2], 0.22, 12]].forEach(([f, a, Q]) => {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * fs; bp.Q.value = Q;
      const ga = ac.createGain(); ga.gain.value = a * 2.2; o.connect(bp).connect(ga).connect(g);
    });
    if (/m|n|ng/.test(s.end || '')) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp).connect(g); }
    g.connect(busVoice); o.start(t); o.stop(t + dur + 0.02);
    t += dur + 0.02 / speed; n++;
  }
  speakUntil = opt.overlap ? speakUntil : t;
  return t - ac.currentTime;
}
// feste Stimmen für Figuren (Name → Stimme); unbekannte Namen bekommen eine Stimme aus dem Namen
const VOICES = {
  'Gemeindepräsident Huber': { pitch: 105, speed: 0.85, formant: 0.92 },
  'Inspektor Wyss': { pitch: 95, speed: 0.75, formant: 0.9 },
  'Frau Imboden, Wolkenwiler Anzeiger': { pitch: 210, speed: 1.35, formant: 1.1 },
  'Grosi Elsbeth': { pitch: 240, speed: 0.8, formant: 1.15 },
  'Bauer Zbinden': { pitch: 92, speed: 0.95, formant: 0.88 },
};
export function voiceFor(name = '') {
  if (VOICES[name]) return VOICES[name];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { pitch: 100 + (h % 150), speed: 0.85 + ((h >> 4) % 40) / 100, formant: 0.9 + ((h >> 8) % 25) / 100 };
}
