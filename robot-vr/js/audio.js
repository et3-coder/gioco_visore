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
};
