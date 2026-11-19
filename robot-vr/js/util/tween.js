// Piccolo sistema di animazioni: ogni animazione è una Promise che si risolve alla fine.
const active = [];

export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export function animate(duration, fn, easing = ease.inOut) {
  return new Promise((resolve) => {
    active.push({ t: 0, duration: Math.max(0.0001, duration), fn, easing, resolve });
  });
}

export function wait(seconds) {
  return animate(seconds, () => {}, ease.linear);
}

export function updateTweens(dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i];
    a.t += dt;
    const p = Math.min(1, a.t / a.duration);
    a.fn(a.easing(p), p);
    if (p >= 1) {
      active.splice(i, 1);
      a.resolve();
    }
  }
}

// Ferma tutte le animazioni in corso (le Promise in attesa restano sospese e vengono ignorate).
export function clearTweens() {
  active.length = 0;
}
