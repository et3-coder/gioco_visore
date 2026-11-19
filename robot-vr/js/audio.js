// Effetti sonori sintetizzati (nessun file audio esterno).
let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.18, when = 0, slideTo = null } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() { ac(); },
  click() { tone(700, 0.08, { type: 'triangle', vol: 0.15 }); },
  place() { tone(520, 0.07, { type: 'triangle' }); tone(780, 0.09, { type: 'triangle', when: 0.06 }); },
  remove() { tone(600, 0.12, { type: 'triangle', slideTo: 300 }); },
  step() { tone(330, 0.07, { type: 'square', vol: 0.05 }); },
  turn() { tone(440, 0.12, { type: 'sine', vol: 0.1, slideTo: 660 }); },
  bump() { tone(160, 0.25, { type: 'sawtooth', vol: 0.12, slideTo: 80 }); },
  fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.2, { type: 'triangle', when: i * 0.16 })); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.2, when: i * 0.12 })); },
  star() { [1047, 1319, 1568].forEach((f, i) => tone(f, 0.15, { type: 'sine', vol: 0.15, when: 0.55 + i * 0.08 })); },
  beat(i) { tone(i % 2 ? 196 : 262, 0.12, { type: 'square', vol: 0.06 }); },
  // piccola melodia (carta "musica"): ogni volta una diversa
  melody(n = 0) {
    const tunes = [
      [523, 587, 659, 784, 659, 784, 1047],
      [392, 523, 659, 523, 587, 494, 523],
      [659, 659, 698, 784, 784, 698, 659],
    ];
    tunes[n % tunes.length].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.16, when: i * 0.2 }));
  },
  // ritmo di sottofondo mentre i robot ballano
  danceBeat(seconds = 1.8) {
    for (let t = 0, i = 0; t < seconds; t += 0.3, i++) tone(i % 2 ? 220 : 147, 0.1, { type: 'square', vol: 0.05, when: t });
  },
  boing() { tone(220, 0.35, { type: 'sine', vol: 0.15, slideTo: 660 }); },
  whoosh() { tone(300, 0.6, { type: 'sawtooth', vol: 0.05, slideTo: 900 }); },
  applause() {
    const c = ac();
    if (!c) return;
    const len = c.sampleRate * 1.6;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const clap = Math.random() < 0.004 ? 1 : 0; // battiti di mani casuali
      d[i] = (Math.random() * 2 - 1) * (0.15 + clap) * Math.pow(1 - i / len, 1.5);
    }
    const src = c.createBufferSource();
    const g = c.createGain();
    g.gain.value = 0.25;
    src.buffer = buf;
    src.connect(g).connect(c.destination);
    src.start();
  },
};

// ---------------- Musica di sottofondo per i balletti ----------------
// Una base allegra generata al volo (nessun file audio): batteria, basso, accordi e melodia
// sulla sequenza Do - Sol - La minore - Fa, a 118 battiti al minuto.
const BPM = 118;
const STEP = 60 / BPM / 4; // durata di un sedicesimo
const CHORDS = [
  [48, [60, 64, 67]], // Do
  [43, [59, 62, 67]], // Sol
  [45, [60, 64, 69]], // La minore
  [41, [60, 65, 69]], // Fa
];
const LEAD = [ // melodia: [passo nella battuta, indice della nota dell'accordo, ottava]
  [0, 2, 1], [3, 1, 1], [6, 0, 1], [8, 2, 1], [10, 1, 1], [12, 0, 1], [14, 1, 1],
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function note(c, out, freq, t, dur, type, vol) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function kick(c, out, t) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

function hit(c, out, t, dur, vol, freq) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur + 0.02);
}

export const music = {
  playing: false,
  start() {
    const c = ac();
    if (!c || this.playing) return;
    this.playing = true;
    this.master = c.createGain();
    this.master.gain.setValueAtTime(0.0001, c.currentTime);
    this.master.gain.exponentialRampToValueAtTime(0.3, c.currentTime + 0.4);
    this.master.connect(c.destination);
    this.step = 0;
    this.next = c.currentTime + 0.05;
    // pianifica le note poco prima che debbano suonare (così il ritmo resta preciso)
    this.timer = setInterval(() => {
      while (this.next < c.currentTime + 0.15) {
        this.schedule(c, this.step, this.next);
        this.next += STEP;
        this.step++;
      }
    }, 30);
  },
  schedule(c, step, t) {
    const out = this.master;
    const s = step % 16; // passo nella battuta
    const [bass, chord] = CHORDS[Math.floor(step / 16) % CHORDS.length];
    if (s % 4 === 0) kick(c, out, t);
    if (s === 4 || s === 12) hit(c, out, t, 0.14, 0.35, 1500); // rullante
    if (s % 2 === 0) hit(c, out, t, 0.04, 0.12, 7000); // charleston
    if (s === 0 || s === 6 || s === 8 || s === 14) note(c, out, midi(bass + (s === 8 ? 12 : 0)), t, STEP * 1.8, 'triangle', 0.35);
    if (s === 4 || s === 12) for (const n of chord) note(c, out, midi(n), t, STEP * 1.5, 'square', 0.035);
    for (const [ls, idx, oct] of LEAD) if (ls === s) note(c, out, midi(chord[idx] + 12 * oct), t, STEP * 1.6, 'triangle', 0.09);
  },
  // abbassa la musica (per esempio mentre un robot parla)
  duck(on) {
    const c = ac();
    if (!c || !this.playing) return;
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setTargetAtTime(on ? 0.08 : 0.3, c.currentTime, 0.15);
  },
  stop(fade = 0.6) {
    const c = ac();
    if (!c || !this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const m = this.master;
    m.gain.cancelScheduledValues(c.currentTime);
    m.gain.setTargetAtTime(0.0001, c.currentTime, fade / 4);
    setTimeout(() => m.disconnect(), fade * 1000 + 200);
  },
};