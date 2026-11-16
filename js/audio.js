// Töne, alle im Code erzeugt (keine Dateien).
let ac = null, noiseBuf = null, lastSnip = 0, lastPuff = 0, lastStep = 0;
const KEY = 'wolkenamt-ton';
export const sound = { muted: true };
try { sound.muted = localStorage.getItem(KEY) !== 'an'; } catch (e) {}

export function setMuted(m) { sound.muted = m; try { localStorage.setItem(KEY, m ? 'aus' : 'an'); } catch (e) {} if (!m) ensureAudio(); }

export function ensureAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const len = Math.floor(ac.sampleRate * 0.3); noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
}
export function noise(dur, type, freq, vol, q = 1) {
  if (!ac || sound.muted) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); const t = ac.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + dur + 0.02);
}
function tone(freq, dur, vol, type = 'sine', slide = 0) {
  if (!ac || sound.muted) return;
  const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
export function snip() { if (!ac) return; const t = ac.currentTime; if (t - lastSnip < 0.09) return; lastSnip = t; noise(0.07, 'bandpass', 2600 + Math.random() * 2000, 0.25, 1.5); }
export function puffSound() { if (!ac) return; const t = ac.currentTime; if (t - lastPuff < 0.14) return; lastPuff = t; noise(0.2, 'lowpass', 500, 0.35); }
export function windSound() { noise(0.9, 'bandpass', 380, 0.25, 0.7); }
export function shutter() { noise(0.05, 'highpass', 3000, 0.4); setTimeout(() => noise(0.06, 'highpass', 2500, 0.3), 90); }
export function stampSound() { noise(0.14, 'lowpass', 160, 1.2); setTimeout(() => noise(0.05, 'bandpass', 900, 0.3), 30); }
export function chime(freqs, gap) {
  if (!ac || sound.muted) return;
  freqs.forEach((fq, i) => {
    const t0 = ac.currentTime + i * gap, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = fq;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.1, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.65);
  });
}
// 3D-Welt
export function sfx(kind, surface) {
  if (!ac || sound.muted) return;
  if (kind === 'step') {
    const t = ac.currentTime; if (t - lastStep < 0.2) return; lastStep = t;
    if (surface === 'wood') { noise(0.06, 'lowpass', 300, 0.22); if (Math.random() < 0.18) tone(170 + Math.random() * 90, 0.28, 0.035, 'triangle', -60); } // knarrende Diele
    else noise(0.05, 'bandpass', 1400, 0.08, 0.8);
  } else if (kind === 'jump') tone(320, 0.16, 0.06, 'triangle', 260);
  else if (kind === 'land') noise(0.08, 'lowpass', 220, 0.35);
  else if (kind === 'tumble') { noise(0.18, 'lowpass', 180, 0.7); tone(260, 0.35, 0.05, 'triangle', -150); }
  else if (kind === 'crank') { for (let i = 0; i < 5; i++) setTimeout(() => noise(0.04, 'bandpass', 1800 + i * 90, 0.2, 4), i * 110); }
  else if (kind === 'whoosh') noise(0.6, 'bandpass', 700, 0.18, 0.6);
  else if (kind === 'murmur') { for (let i = 0; i < 6; i++) setTimeout(() => tone(180 + Math.random() * 140, 0.22, 0.02, 'triangle', (Math.random() - 0.5) * 80), i * 90 + Math.random() * 60); }
}
