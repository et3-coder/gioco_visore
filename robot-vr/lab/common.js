// Motore comune del laboratorio dei robot (scena 3D, fumetti, pulsanti, visore).
// Ogni pagina robot importa da qui e chiama startLab(ClasseRobot, opzioni).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { THREE };
import { setupCoding } from './coding.js';

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
export function speak(text, pitch = 1.2) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
  u.lang = 'it-IT'; u.pitch = pitch; u.rate = 1.02;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('it'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
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
export function startLab(RobotClass, { name, color, program = [] }) {
  const css = '#' + new THREE.Color(color).getHexString();
  document.documentElement.style.setProperty('--c', css);
  document.body.insertAdjacentHTML('beforeend', `
    <a id="back" href="index.html">← Tutti i robot</a>
    <div id="title">🤖 ${name}</div>
    <div id="tools"><button id="bCode">🧩 Programma</button><button id="bVoice">🔊 Voce</button><button id="bView">🎥 Vista</button></div>
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
  const robot = new RobotClass(nav, lab);
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
  // clic sul robot = saluta
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', e => (downAt = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const rc = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(robot.root, true).length) robot.do('ciao');
  });

  /* ---------- pulsantiera 3D per il visore ---------- */
  const vrButtons = [];
  const panel = new THREE.Group(); panel.visible = false; scene.add(panel);
  {
    const list = [...robot.actions, ['__prog', '🧩 Il mio programma']];
    const n = list.length, rows = Math.ceil(n / 2), PH = 0.13 + rows * 0.105;
    panel.position.set(-0.5, 1.0, -1.15); panel.rotation.set(-0.55, 0.45, 0, 'YXZ');
    panel.add(new THREE.Mesh(new THREE.PlaneGeometry(0.52, PH), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })));
    const { g, tex } = canvasTex(512, 96);
    g.fillStyle = css; g.font = `800 72px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 256, 52);
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
      btn.userData = { id, mat };
      panel.add(btn); vrButtons.push(btn);
    });
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
  const controllers = [0, 1].map(i => {
    const c = renderer.xr.getController(i); scene.add(c);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.scale.z = 3; c.add(line); c.userData.line = line;
    c.addEventListener('selectstart', () => {
      const h = pick(c);
      if (h) {
        const b = h.object, id = b.userData.id;
        if (id === '__prog') coding.run(); else robot.do(id);
        b.scale.setScalar(0.92); setTimeout(() => b.scale.setScalar(1), 150);
      }
      else if (rayFrom(c).intersectObject(robot.root, true).length) robot.do('ciao');
    });
    const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); scene.add(grip);
    return c;
  });
  renderer.xr.addEventListener('sessionstart', () => { document.body.classList.add('xr'); panel.visible = true; });
  renderer.xr.addEventListener('sessionend', () => { document.body.classList.remove('xr'); panel.visible = false; setView(viewIdx); });

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
    if (renderer.xr.isPresenting) {
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
