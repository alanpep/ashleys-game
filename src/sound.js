// Little made-up sounds (no sound files needed).
let actx;
const ctx = () => (actx ??= new AudioContext());
export const audioContext = ctx;

// A beep that slides from freq to freq * slide.
export function tone(freq = 600, dur = 0.09, type = 'sine', vol = 0.12, slide = 1.6, when = 0) {
  try {
    const a = ctx();
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur);
  } catch { /* no audio */ }
}

// A "shhh" sound: water, flushing, sizzling, swishing. freq = how bright it sounds.
let noiseBuf;
export function noise(dur = 0.3, vol = 0.08, freq = 1500, when = 0, freqEnd = freq) {
  try {
    const a = ctx();
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + when;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(50, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t); src.stop(t + dur + 0.05);
  } catch { /* no audio */ }
}

// Play a little tune. notes are names like 'C4', 'E4'; '-' is a rest.
const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
export function hz(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 0;
  return 440 * 2 ** ((SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
}
export function melody(notes, step = 0.28, type = 'triangle', vol = 0.1) {
  notes.forEach((n, i) => { const f = hz(n); if (f) tone(f, step * 0.95, type, vol, 1.001, i * step); });
}
