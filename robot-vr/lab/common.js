// Motore comune del laboratorio dei robot (scena 3D, fumetti, pulsanti, visore).
// Ogni pagina robot importa da qui e chiama startLab(ClasseRobot, opzioni).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { THREE };
import { setupCoding } from './coding.js';
import { setupLook, HATS, HAT_NAMES, CAPES, CAPE_NAMES, BODY_COLORS, ACCENT_COLORS } from './look.js';

/* ---------- utilità ---------- */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => { t = clamp(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
export const seg = (t, a, b) => ease((t - a) / (b - a)); // 0→1 tra a e b
export const toward = (x, target, step) => (x < target ? Math.min(target, x + step) : Math.max(target, x - step));
export const FONT = '"Baloo 2", system-ui, sans-serif';

export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .15, ...o });
export function mesh(geo, mat, parent, pos = [0, 0, 0], rot = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
export function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { c, g: c.getContext('2d'), tex };
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrap(g, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/* ---------- voce ---------- */
let voiceOn = true;
// La sintesi vocale del browser non sempre funziona (sul visore spesso mancano le voci italiane):
// per questo il robot "parla" anche con la sua voce da robot (bip e sillabe), che si sente sempre.
const hasTTS = () => 'speechSynthesis' in window && speechSynthesis.getVoices().length > 0;
if ('speechSynthesis' in window) speechSynthesis.getVoices(); // avvia il caricamento delle voci
export function speak(text, pitch = 1.2) {
  if (!voiceOn) return;
  const clean = text.replace(/\n/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}♪]/gu, '').trim();
  const tts = hasTTS();
  babble(clean, pitch, tts ? 0.05 : 0.12); // con la voce vera i bip sono più piano
  if (!tts) return;
  try {
    speechSynthesis.cancel();
    speechSynthesis.resume(); // Chrome a volte resta "in pausa"
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'it-IT'; u.pitch = pitch; u.rate = 1.02;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('it'));
    if (v) u.voice = v;
    setTimeout(() => speechSynthesis.speak(u), 60); // subito dopo cancel() a volte la frase si perde
  } catch { /* niente voce: restano i bip */ }
}
// "voce da robot": una sillaba sintetizzata ogni ~3 lettere, con note che salgono e scendono
function babble(text, pitch, vol) {
  try {
    const ac = audio(), out = ac.createGain(); out.gain.value = vol; out.connect(ac.destination);
    const n = Math.max(2, Math.min(14, Math.round(text.length / 3)));
    const base = 260 * pitch;
    let t = ac.currentTime + 0.02;
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      const f = base * (0.8 + Math.random() * 0.6) * (text.trim().endsWith('?') && i === n - 1 ? 1.4 : 1);
      const d = 0.06 + Math.random() * 0.05;
      o.type = i % 3 ? 'triangle' : 'square';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.3 : 0.75), t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.02);
      t += d + 0.03 + Math.random() * 0.03;
    }
    setTimeout(() => out.disconnect(), (t - ac.currentTime + 0.3) * 1000);
  } catch { /* audio non disponibile */ }
}

/* ---------- fumetto ---------- */
export class Bubble {
  constructor(parent, y, color) {
    const { c, g, tex } = canvasTex(1024, 420);
    Object.assign(this, { c, g, tex, color, until: 0 });
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    this.sprite.scale.set(1.25, 1.25 * 420 / 1024, 1);
    this.sprite.position.y = y; this.sprite.renderOrder = 10; this.sprite.visible = false;
    parent.add(this.sprite);
  }
  say(text, secs = 4) {
    const { g, c } = this;
    g.clearRect(0, 0, c.width, c.height);
    let size = 66; g.font = `600 ${size}px ${FONT}`;
    let lines = wrap(g, text, 900);
    while (lines.length > 4 && size > 40) { size -= 6; g.font = `600 ${size}px ${FONT}`; lines = wrap(g, text, 900); }
    const lh = size * 1.12, bh = lines.length * lh + 50, by = (340 - bh) / 2 + 6;
    g.fillStyle = '#fff'; g.strokeStyle = this.color; g.lineWidth = 10;
    roundRect(g, 14, by, 996, bh, 46); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(460, by + bh - 6); g.lineTo(512, 410); g.lineTo(560, by + bh - 6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(460, by + bh); g.lineTo(512, 410); g.lineTo(560, by + bh); g.stroke();
    g.fillStyle = '#1d2433'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, 512, by + 25 + lh * (i + .5)));
    this.tex.needsUpdate = true; this.sprite.visible = true; this.until = performance.now() / 1000 + secs;
  }
  update(now) { if (this.sprite.visible && now > this.until) this.sprite.visible = false; }
}

/* ---------- braccia e mani ---------- */
// il braccio pende verso il basso; raise lo apre di lato (asse z), bend piega il gomito
export function makeArm(parent, side, pos, mat, jointMat, len1, len2, r, handFn) {
  const sh = new THREE.Group(); sh.position.set(...pos); parent.add(sh);
  mesh(new THREE.SphereGeometry(r * 1.6, 16, 12), jointMat, sh);
  mesh(new THREE.CylinderGeometry(r, r, len1, 12), mat, sh, [0, -len1 / 2, 0]);
  const el = new THREE.Group(); el.position.y = -len1; sh.add(el);
  mesh(new THREE.SphereGeometry(r * 1.4, 16, 12), jointMat, el);
  mesh(new THREE.CylinderGeometry(r * .9, r * .9, len2, 12), mat, el, [0, -len2 / 2, 0]);
  const wr = new THREE.Group(); wr.position.y = -len2; el.add(wr);
  const fingers = handFn(wr);
  return {
    sh, el, wr, fingers, side,
    pose(raise, bend, twist = 0) { sh.rotation.z = side * raise; el.rotation.z = side * bend; sh.rotation.x = twist; },
  };
}

/* ---------- braccia "intelligenti": la pinza va dove le diciamo (cinematica inversa) ---------- */
const _tip = new THREE.Vector3();
const LIM = { r: [-0.3, 3.1], b: [-2.6, 2.6], w: [-2.3, 1.0] };
// punta della pinza/mano in coordinate mondo
export function armTip(arm, out = new THREE.Vector3()) {
  arm.sh.updateMatrixWorld(true);
  return arm.wr.localToWorld(out.set(0, -0.06, 0));
}
// muove il braccio finché la punta arriva (il più vicino possibile) a target (mondo).
// st = {r, b, w} è la posa di partenza e viene aggiornata: così il movimento resta fluido.
// Prima di chiamarla: robot.root.updateMatrixWorld(true)
export function reach(arm, target, st) {
  const err = () => { arm.pose(st.r, st.b, st.w); return armTip(arm, _tip).distanceToSquared(target); };
  let best = err(), step = 0.3;
  for (let it = 0; it < 14 && best > 1e-6; it++) {
    for (const k of ['r', 'b', 'w']) {
      for (const d of [step, -step]) {
        const old = st[k];
        st[k] = clamp(old + d, LIM[k][0], LIM[k][1]);
        const e = err();
        if (e < best) { best = e; break; }
        st[k] = old;
      }
    }
    step *= 0.65;
  }
  arm.pose(st.r, st.b, st.w);
  return Math.sqrt(best);
}

/* ---------- musica e suoni (sintetizzati, nessun file audio) ---------- */
let actx = null, noiseBuf = null, music = null;
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function synth(ac, out) {
  const note = (m, t, d, type, vol) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = 440 * 2 ** ((m - 69) / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
  };
  const drum = (t, f0, f1, d, vol) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.8);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
  };
  const noise = (t, freq, d, vol) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + d + 0.05);
  };
  return { note, drum, noise };
}
// fusa (carezza), "wiii" (lancio), tonfo (atterraggio)
export function purr() {
  const ac = audio(), out = ac.createGain(); out.gain.value = 0.35; out.connect(ac.destination);
  const t = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.value = 90; lfo.frequency.value = 22; lg.gain.value = 0.25;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  lfo.connect(lg).connect(g.gain); o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1);
  const { note } = synth(ac, out); note(84, t + 0.05, 0.15, 'sine', 0.15); note(88, t + 0.17, 0.2, 'sine', 0.15);
}
export function whee() {
  const ac = audio(), o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(1300, t + 0.45);
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.55);
}
export function thud(k = 1) {
  const ac = audio(), out = ac.createGain(); out.gain.value = 0.2 + 0.4 * Math.min(1, k); out.connect(ac.destination);
  synth(ac, out).drum(ac.currentTime, 120, 40, 0.25, 0.9);
}

/* ---------- cuoricini (carezze) ---------- */
let heartTex = null;
const hearts = [];
export function heartsAt(scene, pos, n = 7) {
  if (!heartTex) {
    const { g, tex } = canvasTex(64, 64);
    g.fillStyle = '#ff4f8b'; g.beginPath(); g.moveTo(32, 56);
    g.bezierCurveTo(-8, 30, 12, 0, 32, 18); g.bezierCurveTo(52, 0, 72, 30, 32, 56); g.fill();
    heartTex = tex;
  }
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.08 + Math.random() * 0.06);
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.1, (Math.random() - 0.5) * 0.3));
    s.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.45 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2), life: 1.4 };
    scene.add(s); hearts.push(s);
  }
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i]; s.userData.life -= dt;
    s.position.addScaledVector(s.userData.v, dt); s.material.opacity = Math.max(0, s.userData.life / 1.4);
    if (s.userData.life <= 0) { s.parent.remove(s); s.material.dispose(); hearts.splice(i, 1); }
  }
}

export function stopMusic() {
  if (!music) return;
  const g = music; music = null;
  g.gain.setTargetAtTime(0, actx.currentTime, 0.05);
  setTimeout(() => g.disconnect(), 500);
}
// musichetta da ballo in stile videogioco: 4 battute (Do - La- - Fa - Sol) + accordo finale.
// Restituisce l'orologio della musica, per ballare a tempo.
export function playDance(bars = 4, bpm = 128) {
  stopMusic();
  const ac = audio(), out = ac.createGain(); out.gain.value = 0.3; out.connect(ac.destination); music = out;
  const { note, drum, noise } = synth(ac, out);
  const t0 = ac.currentTime + 0.08, beat = 60 / bpm, e = beat / 2;
  const MEL = [[76, 79, 84, 79, 76, 79, 81, 79], [76, 81, 84, 81, 76, 72, 74, 76], [77, 81, 84, 81, 77, 81, 79, 77], [74, 79, 83, 79, 74, 79, 81, 83]];
  const BASS = [48, 45, 41, 43];
  for (let b = 0; b < bars; b++) {
    const bt = t0 + b * 4 * beat, k = b % 4;
    MEL[k].forEach((m, i) => note(m, bt + i * e, e * 0.9, 'square', 0.1));
    for (let q = 0; q < 4; q++) {
      drum(bt + q * beat, 150, 40, 0.2, 0.9);
      noise(bt + q * beat + e, 7000, 0.05, 0.2);
      note(BASS[k] + (q % 2 ? 12 : 0), bt + q * beat, beat * 0.8, 'triangle', 0.35);
    }
  }
  const end = t0 + bars * 4 * beat;
  [72, 76, 79, 84].forEach(m => note(m, end, 1.0, 'square', 0.07));
  drum(end, 150, 40, 0.3, 0.9); noise(end, 5000, 0.8, 0.25);
  // se il browser blocca l'audio, il ballo va avanti lo stesso con l'orologio normale
  const p0 = performance.now() / 1000 + 0.08;
  return { now: () => (ac.state === 'running' ? ac.currentTime - t0 : performance.now() / 1000 - p0) / beat, beats: bars * 4 };
}
// "ba-dum-tss" dopo una barzelletta
export function rimshot() {
  const ac = audio(), out = ac.createGain(); out.gain.value = 0.4; out.connect(ac.destination);
  const { drum, noise } = synth(ac, out), t = ac.currentTime + 0.05;
  drum(t, 240, 150, 0.18, 0.8); drum(t + 0.17, 170, 100, 0.2, 0.8); noise(t + 0.36, 5000, 0.7, 0.35);
}
// piccolo "pop" (es. mattoncino incastrato)
export function pop(pitch = 1) {
  const ac = audio(), out = ac.createGain(); out.gain.value = 0.25; out.connect(ac.destination);
  synth(ac, out).drum(ac.currentTime, 900 * pitch, 300 * pitch, 0.08, 0.6);
}
export function claw(mat) {
  return wr => {
    mesh(new THREE.BoxGeometry(0.09, 0.025, 0.04), mat, wr, [0, -0.01, 0]);
    const a = new THREE.Group(), b = new THREE.Group(); a.position.x = -0.04; b.position.x = 0.04; wr.add(a, b);
    mesh(new THREE.BoxGeometry(0.018, 0.07, 0.035), mat, a, [0, -0.045, 0]);
    mesh(new THREE.BoxGeometry(0.018, 0.07, 0.035), mat, b, [0, -0.045, 0]);
    return [a, b];
  };
}
export function hand(mat) {
  return wr => {
    mesh(new THREE.SphereGeometry(0.04, 16, 12), mat, wr, [0, -0.03, 0]);
    const f = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Group(); p.position.set((i - 1) * 0.022, -0.06, 0.01); wr.add(p);
      mesh(new THREE.CapsuleGeometry(0.009, 0.04, 4, 8), mat, p, [0, -0.025, 0]); f.push(p);
    }
    return f;
  };
}

/* ======================================================================
   startLab: costruisce la stanza, il robot, i pulsanti e il visore
   ====================================================================== */
export function startLab(RobotClass, { name, color, program = [], look: lookCfg = null }) {
  const css = '#' + new THREE.Color(color).getHexString();
  document.documentElement.style.setProperty('--c', css);
  document.body.insertAdjacentHTML('beforeend', `
    <a id="back" href="index.html">← Tutti i robot</a>
    <a id="backGame" href="../index.html">🏠 Torna al gioco</a>
    <div id="title">🤖 ${name}</div>
    <div id="tools"><button id="bLook">🎨 Personalizza</button><button id="bCode">🧩 Programma</button><button id="bVoice">🔊 Voce</button><button id="bView">🎥 Vista</button></div>
    <div id="hint">👆 Tocca ${name} per fargli le coccole, trascinalo per lanciarlo!</div>
    <div class="panel"><div class="btns"></div></div>`);

  const SHOT = new URLSearchParams(location.search).has('shot'); // solo per test automatici
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: SHOT });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfeefc);
  scene.fog = new THREE.Fog(0xdfeefc, 14, 32);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 0.6; controls.maxDistance = 8;
  const VIEWS = [
    { name: 'Robot', pos: [0, 1.5, 0.9], tgt: [0, 0.9, -2.2] },
    { name: 'Da vicino', pos: [-0.4, 1.35, -0.7], tgt: [0, 0.95, -2.2] },
    { name: 'Dal basso', pos: [0.9, 0.35, -1.1], tgt: [0, 0.7, -2.2] },
    { name: 'Di lato', pos: [1.9, 1.3, -1.6], tgt: [0, 0.9, -2.2] },
    { name: 'Dall’alto', pos: [0, 3.0, 1.6], tgt: [0, 0.5, -1.7] },
  ];
  let viewIdx = 0;
  const setView = i => { const v = VIEWS[i]; camera.position.set(...v.pos); controls.target.set(...v.tgt); controls.update(); };
  setView(0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa8bb, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2.5, 6, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 20 });
  sun.shadow.bias = -0.0005;
  sun.target.position.set(0, 0, -2.2); scene.add(sun, sun.target);

  const floor = mesh(new THREE.CircleGeometry(14, 64), M(0xf4f7fb, { metalness: 0, roughness: .9 }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  floor.castShadow = false;
  const grid = new THREE.GridHelper(28, 56, 0xc6d4e6, 0xdbe4ef); grid.position.y = 0.002; scene.add(grid);

  // pedana con targhetta
  const base = new THREE.Group(); base.position.set(0, 0, -2.2); scene.add(base);
  const ped = mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.03, 48), M(color, { metalness: 0, roughness: .7 }), base, [0, 0.015, 0]);
  ped.castShadow = false;
  {
    const { g, tex } = canvasTex(512, 128);
    g.fillStyle = '#fff'; roundRect(g, 4, 4, 504, 120, 40); g.fill();
    g.fillStyle = css; g.font = `800 82px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name.toUpperCase(), 256, 70);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    plate.position.set(0, 0.09, 0.8); plate.rotation.x = -0.5; base.add(plate);
    const stand = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), M(0xffffff), base, [0, 0.05, 0.76]); stand.rotation.x = -0.5;
  }

  // "nav" sposta il robot sul pavimento (blocchi avanti / gira / casa)
  const nav = new THREE.Group(); base.add(nav);
  const STEP = 0.35, RADIUS = 1.6;
  let tween = null;
  const wait = cond => new Promise(res => {
    const t0 = performance.now();
    const tick = () => (cond() || performance.now() - t0 > 25000 ? res() : setTimeout(tick, 50));
    tick();
  });
  const animate = (kind, to, dur) => new Promise(res => {
    if (tween) tween.res();
    tween = { kind, from: { p: nav.position.clone(), r: nav.rotation.y }, to, t: 0, dur, res };
  });
  const busy = () => (robot.isBusy ? robot.isBusy() : robot.action != null);

  // cosa passa al robot (e ai blocchi)
  const lab = {
    scene, renderer, camera, color: css, nav,
    viewerPosition(out) { (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(out); return out; },
    // esegue un'azione e aspetta che sia finita
    async runAction(id) { robot.do(id); await new Promise(r => setTimeout(r, 60)); await wait(() => !busy()); },
    async move(steps) {
      if (robot.beforeMove) await robot.beforeMove();
      const dir = new THREE.Vector3(0, 0, Math.sign(steps)).applyAxisAngle(new THREE.Vector3(0, 1, 0), nav.rotation.y);
      const to = nav.position.clone().addScaledVector(dir, Math.abs(steps) * STEP);
      const blocked = to.length() > RADIUS;
      if (blocked) to.setLength(RADIUS);
      const d = to.distanceTo(nav.position);
      if (d > 0.01) await animate('move', { p: to, r: nav.rotation.y }, Math.max(0.5, d / 0.4));
      if (blocked) robot.say('Oltre non vado: finisce il laboratorio!', 2.5);
    },
    async turn(deg) {
      if (robot.beforeMove) await robot.beforeMove();
      await animate('turn', { p: nav.position.clone(), r: nav.rotation.y + deg * Math.PI / 180 }, 0.7);
    },
    async home() {
      if (robot.beforeMove) await robot.beforeMove();
      const r = Math.round(nav.rotation.y / (Math.PI * 2)) * Math.PI * 2;
      const d = nav.position.length();
      await animate('move', { p: new THREE.Vector3(), r }, Math.max(0.7, d / 0.4));
    },
    stopAll() {
      if (tween) { tween.res(); tween = null; }
      robot.walking = false; robot.action = null; stopMusic();
      if ('screenMode' in robot) robot.screenMode = 'logo';
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    },
    resize() {
      const cw = document.body.classList.contains('coding') ? document.getElementById('code').offsetWidth : 0;
      document.documentElement.style.setProperty('--cw', cw + 'px');
      renderer.setSize(innerWidth - cw, innerHeight);
      renderer.domElement.style.marginLeft = cw + 'px';
      camera.aspect = (innerWidth - cw) / innerHeight; camera.updateProjectionMatrix();
    },
  };
  // "thrower" avvolge il robot: serve per prenderlo e lanciarlo senza disturbare le sue animazioni.
  // Quando è a casa ha posizione e rotazione zero.
  const thrower = new THREE.Group(); nav.add(thrower);
  const robot = new RobotClass(thrower, lab);
  const look = lookCfg ? setupLook(robot, lookCfg, name) : null;
  const coding = setupCoding({ robot, name, color: css, program, lab });
  // aprendo i blocchi la telecamera si allontana per vedere dove cammina il robot
  document.getElementById('bCode').onclick = () => {
    if (coding.isOpen()) coding.close();
    else { coding.open(); viewIdx = VIEWS.length - 1; setView(viewIdx); document.getElementById('bView').textContent = '🎥 ' + VIEWS[viewIdx].name; }
  };

  // pulsanti HTML
  const box = document.querySelector('.btns');
  robot.actions.forEach(([id, label]) => {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => robot.do(id); box.appendChild(b);
  });
  document.getElementById('bVoice').onclick = e => {
    voiceOn = !voiceOn; e.target.textContent = voiceOn ? '🔊 Voce' : '🔇 Voce';
    if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
  };
  document.getElementById('bView').onclick = e => {
    viewIdx = (viewIdx + 1) % VIEWS.length; setView(viewIdx); e.target.textContent = '🎥 ' + VIEWS[viewIdx].name;
  };
  /* ======================================================================
     Toccare, prendere e lanciare il robot (torna sempre da solo alla pedana)
     ====================================================================== */
  const PET_LINES = ['Che bello!', 'Ancora, ancora!', 'Mi fai il solletico!', 'Ti voglio bene!', 'Che coccole!'];
  const GRAB_LINES = ['Ehi! Mi hai preso!', 'Wow, che forza!', 'Dove andiamo?'];
  const LAND_LINES = ['Ops!', 'Che volo!', 'Gira tutto!'];
  const pickLine = a => a[Math.floor(Math.random() * a.length)];
  const GRAV = 9.8, ROOM = 11;
  const T = {
    mode: 'home', // home | held | air | getup | wait | return
    pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), spin: new THREE.Vector3(),
    holder: null, rel: new THREE.Matrix4(), hist: [], t: 0, upFrom: new THREE.Quaternion(), upTo: new THREE.Quaternion(),
    petCool: 0, stroke: 0, retFrom: null, retQ: null, retDur: 1,
  };
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  const readThrower = () => { thrower.updateMatrixWorld(true); thrower.matrixWorld.decompose(T.pos, T.quat, _s); };
  const writeThrower = () => {
    nav.updateMatrixWorld(true);
    _m.compose(T.pos, T.quat, ONE).premultiply(new THREE.Matrix4().copy(nav.matrixWorld).invert());
    _m.decompose(thrower.position, thrower.quaternion, _s);
  };
  const headPoint = (out = new THREE.Vector3()) => {
    const box = new THREE.Box3().setFromObject(robot.head);
    return box.getCenter(out);
  };
  function pet(c = null) {
    if (T.petCool > 0) return;
    T.petCool = 1.3;
    robot.say(pickLine(PET_LINES), 2.5);
    purr();
    heartsAt(scene, headPoint().add(new THREE.Vector3(0, 0.15, 0)));
    if (c) haptic(c, 0.25, 90);
  }
  function grab(holder) {
    if (T.mode === 'held') return;
    readThrower();
    T.mode = 'held'; T.holder = holder; T.hist = [];
    if (holder !== 'mouse') { holder.updateMatrixWorld(true); T.rel.copy(holder.matrixWorld).invert().multiply(thrower.matrixWorld); haptic(holder, 0.5, 60); }
    pop(1.4);
    if (Math.random() < 0.6) robot.say(pickLine(GRAB_LINES), 2.2);
  }
  function release() {
    if (T.mode !== 'held') return;
    const now = performance.now() / 1000;
    const h = T.hist.filter(s => s.t >= now - 0.12);
    T.vel.set(0, 0, 0);
    if (h.length >= 2 && h[h.length - 1].t - h[0].t > 0.005) T.vel.subVectors(h[h.length - 1].p, h[0].p).divideScalar(h[h.length - 1].t - h[0].t);
    T.vel.clampLength(0, 7);
    const sp = T.vel.length();
    T.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.min(8, sp * 2));
    T.mode = 'air'; T.holder = null; T.flew = sp > 1;
    if (T.flew) whee();
  }
  function startReturn() {
    T.mode = 'return'; T.t = 0;
    T.retFrom = thrower.position.clone(); T.retQ = thrower.quaternion.clone();
    T.retDur = Math.min(1.8, 0.8 + T.retFrom.length() * 0.25);
    robot.say('Torno a casa!', 2);
    whee();
  }
  function updateThrow(dt, now) {
    T.petCool -= dt;
    T.stroke *= 0.96;
    if (T.mode === 'held') {
      if (T.holder !== 'mouse') {
        _m.multiplyMatrices(T.holder.matrixWorld, T.rel);
        const p = new THREE.Vector3(), q = new THREE.Quaternion();
        _m.decompose(p, q, _s);
        T.pos.lerp(p, Math.min(1, dt * 16)); T.quat.slerp(q, Math.min(1, dt * 14));
        writeThrower();
        T.hist.push({ p: T.pos.clone(), t: now }); if (T.hist.length > 14) T.hist.shift();
      }
    } else if (T.mode === 'air') {
      T.vel.y -= GRAV * dt;
      T.pos.addScaledVector(T.vel, dt);
      const s = T.spin.length();
      if (s > 0.01) T.quat.premultiply(new THREE.Quaternion().setFromAxisAngle(T.spin.clone().divideScalar(s), s * dt));
      const r = Math.hypot(T.pos.x, T.pos.z);
      if (r > ROOM) { T.pos.x *= ROOM / r; T.pos.z *= ROOM / r; T.vel.x *= -0.5; T.vel.z *= -0.5; }
      if (T.pos.y <= 0) {
        T.pos.y = 0;
        const impact = -T.vel.y;
        if (impact > 1.5) { T.vel.y = impact * 0.3; T.vel.x *= 0.6; T.vel.z *= 0.6; T.spin.multiplyScalar(0.5); thud(impact / 6); }
        else {
          T.mode = 'getup'; T.t = 0; T.upFrom.copy(T.quat);
          nav.updateMatrixWorld(true); nav.getWorldQuaternion(T.upTo);
          thud(impact / 6);
          if (T.flew) robot.say(pickLine(LAND_LINES), 1.8);
        }
      }
      writeThrower();
    } else if (T.mode === 'getup') {
      // si rialza...
      T.t += dt / 0.7;
      T.quat.slerpQuaternions(T.upFrom, T.upTo, ease(T.t));
      writeThrower();
      if (T.t >= 1) { T.mode = 'wait'; T.t = 0; }
    } else if (T.mode === 'wait') {
      // ...e dopo un attimo torna da solo alla sua pedana
      T.t += dt;
      if (T.t > 0.5) startReturn();
    } else if (T.mode === 'return') {
      T.t += dt / T.retDur;
      const k = ease(T.t);
      thrower.position.lerpVectors(T.retFrom, new THREE.Vector3(), k);
      thrower.position.y += Math.sin(Math.min(1, T.t) * Math.PI) * Math.min(1.5, 0.4 + T.retFrom.length() * 0.3);
      thrower.quaternion.slerpQuaternions(T.retQ, new THREE.Quaternion(), k);
      if (T.t >= 1) { thrower.position.set(0, 0, 0); thrower.quaternion.identity(); T.mode = 'home'; }
    }
    if (look) look.update(now, T.mode === 'air' || T.mode === 'held' || T.mode === 'return' ? 1 : 0);
  }

  // ---------- mouse: clic = carezza, trascina = prendi e lancia ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let mouse = null;
  const setRay = e => {
    const rc = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  // in fase di "cattura": così, se tocco il robot, la telecamera non gira
  // al primo tocco (sul PC) il robot si presenta: i browser fanno partire l'audio solo dopo un tocco
  let greeted = false;
  addEventListener('pointerdown', () => {
    if (greeted) return;
    greeted = true;
    audio();
    setTimeout(() => { if (!robot.action && T.mode === 'home' && T.petCool <= 0) robot.do('ciao'); }, 150);
  }, { capture: true });
  renderer.domElement.addEventListener('pointerdown', e => {
    setRay(e);
    const h = ray.intersectObject(robot.root, true)[0];
    if (!h || T.mode === 'return') return;
    controls.enabled = false;
    readThrower();
    const n = camera.getWorldDirection(new THREE.Vector3()).negate();
    mouse = { x: e.clientX, y: e.clientY, moved: false, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, h.point), offset: T.pos.clone().sub(h.point) };
  }, { capture: true });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!mouse) return;
    if (!mouse.moved && Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y) > 6) { mouse.moved = true; grab('mouse'); }
    if (!mouse.moved) return;
    setRay(e);
    const p = ray.ray.intersectPlane(mouse.plane, new THREE.Vector3());
    if (!p) return;
    T.pos.copy(p.add(mouse.offset)); T.pos.y = Math.max(0, T.pos.y);
    writeThrower();
    T.hist.push({ p: T.pos.clone(), t: performance.now() / 1000 }); if (T.hist.length > 14) T.hist.shift();
  });
  const mouseUp = () => {
    if (!mouse) return;
    controls.enabled = true;
    if (mouse.moved) release(); else pet();
    mouse = null;
  };
  renderer.domElement.addEventListener('pointerup', mouseUp);
  renderer.domElement.addEventListener('pointercancel', mouseUp);

  /* ---------- pannelli 3D per il visore ---------- */
  const vrButtons = [];
  const panels = [];
  // list = [[id, testo], ...]; onPress(id) quando si preme
  function makeVrPanel(list, titleText, x, rotY, onPress, y = 1.0, z = -1.15, tilt = -0.55) {
    const panel = new THREE.Group(); panel.visible = false; scene.add(panel); panels.push(panel);
    const n = list.length, rows = Math.ceil(n / 2), PH = 0.13 + rows * 0.105;
    panel.position.set(x, y, z); panel.rotation.set(tilt, rotY, 0, 'YXZ');
    panel.add(new THREE.Mesh(new THREE.PlaneGeometry(0.52, PH), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })));
    const { g, tex } = canvasTex(512, 96);
    g.fillStyle = css; g.font = `800 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(titleText, 256, 52);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.075), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    title.position.set(0, PH / 2 - 0.055, 0.002); panel.add(title);
    list.forEach(([id, label], i) => {
      const { g: bg, tex: bt } = canvasTex(512, 128);
      bg.fillStyle = '#1d2433'; bg.font = `600 50px ${FONT}`; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.fillText(label, 256, 68);
      const mat = new THREE.MeshBasicMaterial({ color: 0xeef2f8 });
      const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.09), mat);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.0575), new THREE.MeshBasicMaterial({ map: bt, transparent: true }));
      l.position.z = 0.002; btn.add(l);
      const last = i === n - 1 && n % 2;
      btn.position.set(last ? 0 : (i % 2 ? 0.122 : -0.122), PH / 2 - 0.15 - Math.floor(i / 2) * 0.105, 0.004);
      btn.userData = { id, mat, onPress };
      panel.add(btn); vrButtons.push(btn);
    });
  }
  // a sinistra: le azioni del robot
  makeVrPanel([...robot.actions, ['__prog', '🧩 Il mio programma']], name, -0.5, 0.45,
    id => (id === '__prog' ? coding.run() : robot.do(id)));
  // in alto al centro, sopra il robot: per tornare indietro (nel visore i pulsanti della pagina non si vedono)
  const leave = async url => {
    const s = renderer.xr.getSession();
    if (s) { try { await s.end(); } catch { /* già chiusa */ } }
    location.href = url;
  };
  makeVrPanel([['__game', '⬅ Torna al gioco'], ['__list', '🤖 Tutti i robot']], 'Indietro', 0, 0,
    id => leave(id === '__game' ? '../index.html' : 'index.html'), 2.0, -1.45, 0.3);
  // a destra: vestiti e colori
  if (look) {
    makeVrPanel([
      ['hat', '🎩 Cappello'], ['glasses', '👓 Occhiali'], ['bowtie', '🎀 Papillon'], ['cape', '🦸 Mantello'],
      ['body', '🎨 Colore corpo'], ['accent', '🎨 Colore dettagli'], ['reset', '↺ Com’era prima'],
    ], 'Personalizza', 0.5, -0.45, id => { if (id === 'reset') look.reset(); else look.cycle(id); pop(1.2); });
  }

  const hot = new THREE.Color(color);
  const factory = new XRControllerModelFactory();
  const tmpM = new THREE.Matrix4(), xrRay = new THREE.Raycaster();
  const rayFrom = c => {
    tmpM.identity().extractRotation(c.matrixWorld);
    xrRay.ray.origin.setFromMatrixPosition(c.matrixWorld);
    xrRay.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
    return xrRay;
  };
  const pick = c => { const h = rayFrom(c).intersectObjects(vrButtons, false); return h.length ? h[0] : null; };
  function haptic(c, strength, ms) {
    try { const a = c.userData.source && c.userData.source.gamepad && c.userData.source.gamepad.hapticActuators; if (a && a[0]) a[0].pulse(strength, ms); } catch { /* niente */ }
  }
  const controllers = [0, 1].map(i => {
    const c = renderer.xr.getController(i); scene.add(c);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.scale.z = 3; c.add(line); c.userData.line = line;
    c.addEventListener('connected', e => (c.userData.source = e.data));
    c.addEventListener('disconnected', () => (c.userData.source = null));
    c.addEventListener('selectstart', () => {
      const h = pick(c);
      if (h) {
        const b = h.object;
        b.userData.onPress(b.userData.id);
        b.scale.setScalar(0.92); setTimeout(() => b.scale.setScalar(1), 150);
      } else if (rayFrom(c).intersectObject(robot.root, true).length && T.mode !== 'return') grab(c); // punta e prendi
    });
    c.addEventListener('selectend', () => { if (T.holder === c) release(); });
    // tasto laterale (grip) con la mano vicino al robot = prendi
    c.addEventListener('squeezestart', () => {
      if (T.mode === 'return') return;
      const box = new THREE.Box3().setFromObject(robot.root).expandByScalar(0.12);
      if (box.containsPoint(new THREE.Vector3().setFromMatrixPosition(c.matrixWorld))) grab(c);
    });
    c.addEventListener('squeezeend', () => { if (T.holder === c) release(); });
    const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); scene.add(grip);
    return c;
  });
  // carezze nel visore: controller vicino alla testa che si muove
  const prevCtrl = new Map();
  let headBox = new THREE.Box3(), headBoxT = 0;
  function updateVrPet(dt) {
    headBoxT -= dt;
    if (headBoxT <= 0) { headBox = new THREE.Box3().setFromObject(robot.head).expandByScalar(0.1); headBoxT = 0.2; }
    for (const c of controllers) {
      const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const prev = prevCtrl.get(c); prevCtrl.set(c, p);
      if (!prev || T.holder === c || T.mode !== 'home') continue;
      if (headBox.containsPoint(p)) { T.stroke += p.distanceTo(prev); if (T.stroke > 0.15) { T.stroke = 0; pet(c); } }
    }
  }
  renderer.xr.addEventListener('sessionstart', () => {
    document.body.classList.add('xr'); panels.forEach(p => (p.visible = true));
    // appena si entra nel visore il robot si presenta (il pulsante VR "sblocca" anche l'audio)
    setTimeout(() => { if (!robot.action) robot.do('ciao'); greeted = true; }, 900);
  });
  renderer.xr.addEventListener('sessionend', () => { document.body.classList.remove('xr'); panels.forEach(p => (p.visible = false)); setView(viewIdx); });

  /* ---------- pannello "Personalizza" (PC) ---------- */
  if (look) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="look">
        <div class="lookHead">🎨 Personalizza ${name}<button id="lookClose" title="Chiudi">✕</button></div>
        <div class="sec">🎩 Cappello</div><div class="chips" data-k="hat"></div>
        <div class="sec">👓 Occhiali</div><div class="chips" data-k="glasses"></div>
        <div class="sec">🎀 Papillon</div><div class="chips" data-k="bowtie"></div>
        <div class="sec">🦸 Mantello</div><div class="chips" data-k="cape"></div>
        <div class="sec">🎨 Colore del corpo</div><div class="swatches" data-k="body"></div>
        <div class="sec">🎨 Colore dei dettagli</div><div class="swatches" data-k="accent"></div>
        <button id="lookReset">↺ Com'era all'inizio</button>
      </div>`);
    const lookEl = document.getElementById('look');
    const OPTIONS = {
      hat: HATS.map(v => [v, HAT_NAMES[v]]),
      glasses: [[false, 'No'], [true, 'Sì']],
      bowtie: [[false, 'No'], [true, 'Sì']],
      cape: CAPES.map(v => [v, CAPE_NAMES[v]]),
    };
    const render = () => {
      lookEl.querySelectorAll('.chips').forEach(box => {
        const k = box.dataset.k;
        box.innerHTML = '';
        OPTIONS[k].forEach(([v, label]) => {
          const b = document.createElement('button'); b.textContent = label;
          if (look.state[k] === v) b.classList.add('on');
          b.onclick = () => { look.set(k, v); pop(1.2); render(); };
          box.appendChild(b);
        });
      });
      lookEl.querySelectorAll('.swatches').forEach(box => {
        const k = box.dataset.k, list = k === 'body' ? BODY_COLORS : ACCENT_COLORS;
        box.innerHTML = '';
        list.forEach((c, i) => {
          const b = document.createElement('button');
          b.style.background = c || look.origColor[k];
          b.title = i === 0 ? 'Colore originale' : c;
          if (i === 0) b.textContent = '↺';
          if (look.state[k] === i) b.classList.add('on');
          b.onclick = () => { look.set(k, i); pop(1.2); render(); };
          box.appendChild(b);
        });
      });
    };
    document.getElementById('bLook').onclick = () => { lookEl.classList.toggle('open'); render(); };
    document.getElementById('lookClose').onclick = () => lookEl.classList.remove('open');
    document.getElementById('lookReset').onclick = () => { look.reset(); render(); };
  } else {
    document.getElementById('bLook').style.display = 'none';
  }

  /* ---------- ciclo ---------- */
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now() / 1000;
    if (tween) {
      tween.t += dt;
      const k = ease(tween.t / tween.dur);
      nav.position.lerpVectors(tween.from.p, tween.to.p, k);
      nav.rotation.y = lerp(tween.from.r, tween.to.r, k);
      robot.walking = tween.kind === 'move';
      robot.turning = tween.kind === 'turn';
      if (tween.t >= tween.dur) { robot.walking = robot.turning = false; const r = tween.res; tween = null; r(); }
    }
    robot.update(dt, now);
    updateThrow(dt, now);
    updateHearts(dt);
    if (renderer.xr.isPresenting) {
      updateVrPet(dt);
      vrButtons.forEach(b => b.userData.mat.color.setHex(0xeef2f8));
      controllers.forEach(c => {
        const h = pick(c);
        if (h) { h.object.userData.mat.color.copy(hot); c.userData.line.scale.z = h.distance; } else c.userData.line.scale.z = 3;
      });
    } else controls.update();
    renderer.render(scene, camera);
  });
  addEventListener('resize', () => { lab.resize(); if (coding.isOpen() && window.Blockly) window.Blockly.svgResize(Blockly.getMainWorkspace()); });
  // test rapido: ?demo=vola  oppure  ?demo=atterra,ciao
  const demo = new URLSearchParams(location.search).get('demo');
  if (demo) demo.split(',').forEach((a, i) => setTimeout(() => robot.do(a), 300 + i * 50));
  if (new URLSearchParams(location.search).has('code')) coding.open();
  return { robot, lab, coding };
}
