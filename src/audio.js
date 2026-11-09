// Real sounds from the sounds/ folder. Every sound has a place in the world, so it gets
// louder as you walk closer and softer as you walk away.
//  - loops: background sounds that keep playing (birds outside, playground, office, fire, hose)
//  - one-shots: barks, meows, honks, sirens, splashes, whistles
import { audioContext } from './sound.js';

const DIR = '/sounds/';
const FILES = {
  ambience: 'freesound_community-outside-ambience-with-birds-61606.mp3',
  birds: 'freesound_community-birds-19624.mp3',
  playground: 'freesound_community-playground-7156.mp3',
  office: 'freesound_community-office-ambience-6322.mp3',
  fire: 'dragon-studio-fire-sounds-405444.mp3',
  hose: 'freesound_community-garden-hose-spraying-71249.mp3',
  siren: '11325622-police-siren-sound-effect-240674.mp3',
  siren2: 'dragon-studio-police-siren-397963.mp3',
  dog: ['dragon-studio-dog-bark-382732.mp3', 'dragon-studio-free-dog-bark-419014.mp3', 'dragon-studio-dog-bark-sound-450454.mp3'],
  cat: ['dragon-studio-cute-cat-meow-472372.mp3', 'virtual_vibes-cat-meow-sound-383823.mp3'],
  whistle: 'horror_house_music-police-whistle-fx-3-566724.mp3',
  honk: 'universfield-double-car-honk-352443.mp3',
  splash: 'universfield-water-splash-02-352021.mp3',
  doorbell: 'u_rbsjsi42wd-doorbell-223669.mp3',
  chime: 'dragon-studio-doorbell-chime-sfx-free-482878.mp3',
  schoolbell: 'emg5991-school-bell-310293.mp3',
  garage: 'flutie8211-garage-door-opening-394326.mp3',
  quack: 'freesound_community-075176_duck-quack-40345.mp3',
  bounce: 'freesound_community-ball-bounce-94853.mp3',
  engine: 'freesound_community-car-idle-1-blyth-21-6-12-62010.mp3',
  classroom: 'freesound_community-classroom-background-54177.mp3',
  icecreamsong: 'freesound_community-ice-cream-truck-theme-77464.mp3',
  fountain: 'freesound_community-small-fountain-7073.mp3',
  register: 'modestas123123-cash-register-kaching-sound-effect-125042.mp3',
  piano: 'uhhknoxpro-piano-loop-432112.mp3',
  flush: 'vibehorn-toilet-flush-fx-3-424983.mp3',
  street: 'yuk1to-street-ambience-traffic-410714.mp3',
};
// how long a one-shot may play (some files are long), and how loud
const SHOT = {
  dog: { max: 1.6, vol: 0.9, dist: 25 }, cat: { max: 1.8, vol: 0.9, dist: 18 }, siren: { max: 3.5, vol: 0.55, dist: 45 }, siren2: { max: 3, vol: 0.55, dist: 45 },
  whistle: { max: 1.4, vol: 0.6 }, honk: { max: 1.5, vol: 0.7 }, splash: { max: 2, vol: 0.8 }, hose: { max: 3, vol: 0.6 },
  doorbell: { max: 2.5, vol: 0.6, dist: 20 }, chime: { max: 2, vol: 0.5, dist: 15 }, schoolbell: { max: 4, vol: 0.6, dist: 40 }, garage: { max: 4.5, vol: 0.6, dist: 25 },
  quack: { max: 1.2, vol: 0.8 }, bounce: { max: 0.6, vol: 0.8 }, register: { max: 1.6, vol: 0.6 }, piano: { max: 7, vol: 0.6 },
  flush: { max: 4, vol: 0.7 }, icecreamsong: { max: 6, vol: 0.6 },
};

export function setupAudio() {
  let ctx = null, master = null, started = false, muted = false;
  const buffers = new Map(); // name -> [AudioBuffer]
  const loops = [];

  function panner(x, z, ref = 3, max = 60) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'linear'; // full volume up close, fading to silent at max distance
    p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = 1;
    p.positionX.value = x; p.positionY.value = 1; p.positionZ.value = z;
    return p;
  }

  async function load(name) {
    const list = [FILES[name]].flat();
    const out = [];
    for (const f of list) {
      try {
        const res = await fetch(DIR + f);
        if (!res.ok) continue;
        out.push(await ctx.decodeAudioData(await res.arrayBuffer()));
      } catch { /* missing or unreadable: the made-up sound plays instead */ }
    }
    if (out.length) buffers.set(name, out);
  }

  // A looping background sound. Long files stream instead of loading all at once.
  function loop(name, { x = 0, z = 0, vol = 0.5, ref = 4, max = 70, flat = false } = {}) {
    const el = new Audio(DIR + FILES[name]);
    el.loop = true; el.preload = 'auto';
    const src = ctx.createMediaElementSource(el);
    const gain = ctx.createGain(); gain.gain.value = 0;
    const pan = flat ? null : panner(x, z, ref, max);
    src.connect(gain);
    (pan ? gain.connect(pan) : gain).connect(master);
    const L = {
      el, gain, pan, vol, want: 0, playing: false,
      at(x2, z2) { if (pan) { pan.positionX.value = x2; pan.positionZ.value = z2; } },
      level(v) { L.want = v; },
      rate(r) { el.preservesPitch = false; el.playbackRate = r; }, // higher = faster and higher pitched
    };
    loops.push(L);
    return L;
  }

  const api = {
    ready: () => started,
    // call from a click or key press (browsers only allow sound after that)
    start() {
      if (started) { ctx?.resume(); return; }
      started = true;
      ctx = audioContext();
      ctx.resume();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      for (const n of ['dog', 'cat', 'siren', 'siren2', 'whistle', 'honk', 'splash', 'hose', 'doorbell', 'chime', 'schoolbell', 'garage',
        'quack', 'bounce', 'register', 'piano', 'flush', 'icecreamsong']) load(n);
      api.onStart?.();
    },
    loop,
    // play a one-shot at a spot (or everywhere if no spot). Returns false if that sound isn't loaded.
    play(name, at, opts = {}) {
      if (!started || muted) return !!buffers.get(name);
      const list = buffers.get(name);
      if (!list) return false;
      const buf = list[Math.floor(Math.random() * list.length)];
      const s = SHOT[name] ?? { max: 4, vol: 0.8 };
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const g = ctx.createGain();
      const vol = (opts.vol ?? 1) * s.vol, dur = Math.min(buf.duration, opts.max ?? s.max), t = ctx.currentTime;
      g.gain.setValueAtTime(vol, t);
      g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.25));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(g);
      (at ? g.connect(panner(at.x, at.z, opts.ref ?? 3, opts.maxDist ?? s.dist ?? 30)) : g).connect(master);
      src.start(t); src.stop(t + dur + 0.05);
      return true;
    },
    has: (name) => buffers.has(name),
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.1); },
    muted: () => muted,
    // every frame: move the listener with the camera, fade loops up and down
    update(camera) {
      if (!started) return;
      const L = ctx.listener, p = camera.position;
      const fwd = camera.getWorldDirection(api._v ??= camera.position.clone());
      if (L.positionX) {
        L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
        L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
        L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
      } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
      for (const l of loops) {
        const v = l.want * l.vol;
        l.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
        if (v > 0.001 && !l.playing) { l.playing = true; l.el.play().catch(() => { l.playing = false; }); }
        else if (v <= 0.001 && l.playing && l.gain.gain.value < 0.002) { l.playing = false; l.el.pause(); }
      }
    },
  };
  return api;
}
