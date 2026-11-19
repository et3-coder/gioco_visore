// L'avventura dei tre amici — gioco VR (WebXR) di coding con EMO, Loona e AIBI.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Placement } from './xr/placement.js';
import { Screen, Pointers, makeLabel, makePanel, makeButton } from './ui/ui.js';
import { icons } from './ui/icons.js';
import { LAYOUT } from './ui/layout.js';
import { roundRect, drawTextBlock, makeCanvas, texFromCanvas } from './util/text.js';
import { updateTweens, clearTweens } from './util/tween.js';
import { Board, buildTable, TABLE_TOP, BOARD_Z } from './game/board.js';
import { Emo } from './robots/emo.js';
import { Loona } from './robots/loona.js';
import { Aibi } from './robots/aibi.js';
import { loadRobotModels } from './robots/models.js';
import { DIR_VEC, DIRS, LEVELS } from './levels.js';
import { showMainMenu, showChapterMenu } from './ui/menu.js';
import { createChapter1 } from './chapters/ch1-emo.js';
import { createChapter2 } from './chapters/ch2-loona.js';
import { createChapter3 } from './chapters/ch3-aibi.js';
import { speak } from './hints.js';
import { confetti, updateEffects } from './effects.js';
import { sfx } from './audio.js';

const DESIGN_EYE = 1.25; // altezza degli occhi per cui è pensata la scena (bambino in piedi)

// ---------- Renderer, scena, camera ----------
// alpha: true serve alla realtà mista (sfondo trasparente = si vede la stanza vera)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color(0xbfe3ff);
scene.background = SKY;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 60);
function placeDesktopCamera() {
  camera.position.set(0, 1.52, 0.85);
  camera.lookAt(0, 1.1, -1.1);
}
placeDesktopCamera();

function onResize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.fov = aspect < 1.3 ? Math.min(95, 60 * (1.3 / aspect)) : 60;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

// Tutto il mondo di gioco sta in questo gruppo, così possiamo "ricentrarlo" davanti al giocatore nel visore.
const world = new THREE.Group();
scene.add(world);

// Riflessi realistici sulla plastica lucida dei robot (ambiente "stanza" generato al volo)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b8ff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(1.5, 4, 2);
scene.add(sun);

// ---------- Stanza ----------
// Oggetti visibili solo in VR (in realtà mista si vede la stanza vera)
const vrOnly = new THREE.Group();
world.add(vrOnly);
// Oggetti visibili solo in realtà mista
const arOnly = new THREE.Group();
arOnly.visible = false;
world.add(arOnly);

function buildRoom() {
  // Pavimento a quadretti
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    ctx.fillStyle = (i + j) % 2 ? '#ffe7f3' : '#e6f4ff';
    ctx.fillRect(i * 64, j * 64, 64, 64);
  }
  const ft = texFromCanvas(c);
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  ft.repeat.set(10, 10);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  vrOnly.add(floor);
  // Tappeto sotto il tavolo
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshStandardMaterial({ color: 0xb9a6ff, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.003, -0.6);
  vrOnly.add(rug);
  // Pareti con pallini
  const wc = makeCanvas(1024, 256);
  const wctx = wc.getContext('2d');
  const grad = wctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#cfe8ff');
  grad.addColorStop(1, '#fff1d6');
  wctx.fillStyle = grad;
  wctx.fillRect(0, 0, 1024, 256);
  const dots = ['#ffb3c7', '#b3e5ff', '#ffe08a', '#c8b3ff', '#b8f0c8'];
  for (let i = 0; i < 70; i++) {
    wctx.fillStyle = dots[i % dots.length];
    wctx.beginPath();
    wctx.arc((i * 149) % 1024, 30 + ((i * 53) % 190), 8 + (i % 4) * 4, 0, Math.PI * 2);
    wctx.fill();
  }
  const wt = texFromCanvas(wc);
  wt.wrapS = THREE.RepeatWrapping;
  wt.repeat.set(3, 1);
  const walls = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 5, 48, 1, true), new THREE.MeshBasicMaterial({ map: wt, side: THREE.BackSide }));
  walls.position.y = 2.5;
  vrOnly.add(walls);
  // Palloncini
  const balloons = new THREE.Group();
  const bcol = [0xff5d5d, 0xffd23f, 0x4d8dff, 0x2fbf71, 0xb08cff, 0xff8ad8];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.3;
    const r = 3 + (i % 3) * 0.7;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), new THREE.MeshStandardMaterial({ color: bcol[i % bcol.length], roughness: 0.3 }));
    b.scale.y = 1.2;
    b.position.set(Math.sin(a) * r, 1.8 + (i % 4) * 0.35, -Math.cos(a) * r);
    b.userData.baseY = b.position.y;
    b.userData.phase = i;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0x888888 }));
    string.position.y = -0.6;
    b.add(string);
    balloons.add(b);
  }
  vrOnly.add(balloons);
  return balloons;
}
const balloons = buildRoom();
buildTable(vrOnly);

// Podio di AIBI, a sinistra del tavolo
const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 24), new THREE.MeshStandardMaterial({ color: 0xffb3c7, roughness: 0.6 }));
podium.position.set(-0.78, 0.45, -0.6);
vrOnly.add(podium);

// Tovaglietta semitrasparente sotto il tabellone (solo realtà mista)
const placemat = new THREE.Mesh(
  new RoundedBoxGeometry(1.02, 0.004, 1.0, 2, 0.002),
  new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1 })
);
placemat.position.set(0, TABLE_TOP + 0.002, BOARD_Z);
arOnly.add(placemat);

// ---------- Schermo, tabellone, robot ----------
const screen = new Screen(world);
const board = new Board(world);
const robots = { emo: new Emo(), loona: new Loona(), aibi: new Aibi() };

// Disposizione di schermo e AIBI: 'vr' (stanza virtuale) oppure 'ar' (sul tavolo vero)
function applyLayout(mode) {
  const ar = mode === 'ar';
  scene.background = ar ? null : SKY;
  vrOnly.visible = !ar;
  arOnly.visible = ar;
  const aibi = robots.aibi.group;
  if (ar) {
    // Schermo più piccolo e vicino, sospeso sopra il bordo lontano del tabellone
    screen.group.position.set(0, TABLE_TOP + 0.56, BOARD_Z - 0.55);
    screen.group.rotation.set(-0.18, 0, 0);
    screen.group.scale.setScalar(0.7);
    // AIBI seduto sull'angolo in alto a sinistra dello schermo
    screen.group.add(aibi);
    aibi.position.set(-0.98, 0.53, 0.02);
    aibi.scale.setScalar(2.2);
    robots.aibi.pivot.rotation.y = 0.35;
  } else {
    screen.group.position.set(0, 1.42, -1.75);
    screen.group.rotation.set(0, 0, 0);
    screen.group.scale.setScalar(1);
    world.add(aibi);
    aibi.position.set(-0.78, 0.9, -0.6);
    aibi.scale.setScalar(2);
    robots.aibi.pivot.rotation.y = Math.atan2(0.78, 0.6);
  }
}
applyLayout('vr');

const pointers = new Pointers(renderer, camera, scene, [screen.group]);

// ---------- Oggetto "game": tiene insieme tutto ----------
const game = {
  age: 'mid',
  mode: 'desktop', // 'desktop' | 'vr' | 'ar'
  view: 'main', // schermata attuale: 'main' | 'chapters' | 'chapter' | 'finale'
  screen,
  board,
  robots,
  world,
  current: null,
  lastMsg: '',
  msgPanel: null,
  finaleOn: false,

  buildHeader(title) {
    const header = makeLabel(2.0, 0.075, title, { size: 46, color: '#5a3fd6' });
    screen.add(header, 0, LAYOUT.header);
    this.msgPanel = makePanel(1.9, 0.26, (ctx, W, H, text = '') => {
      ctx.fillStyle = '#efe9ff';
      roundRect(ctx, 0, 0, W, H, 50);
      ctx.fill();
      // "fumetto" che punta verso AIBI
      ctx.beginPath();
      ctx.moveTo(0, H * 0.55);
      ctx.lineTo(30, H * 0.4);
      ctx.lineTo(30, H * 0.7);
      ctx.fill();
      ctx.fillStyle = '#9b5cff';
      ctx.font = `bold 34px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('AIBI:', 34, 16);
      drawTextBlock(ctx, text, { x: 34, y: 50, w: W - 68, h: H - 60, size: 52, minSize: 24, color: '#253046' });
    });
    screen.add(this.msgPanel, -0.08, LAYOUT.message);
    const replay = makeButton(0.17, 0.17, '', () => speak(this.lastMsg), { color: '#9b5cff', icon: (ctx, cx, cy, s) => icons.speaker(ctx, cx - s * 0.1, cy, s * 1.2) });
    screen.add(replay, 1.0, LAYOUT.message);
  },

  say(text) {
    this.lastMsg = text;
    if (this.msgPanel) this.msgPanel.userData.redraw(text);
    robots.aibi.talk(Math.min(6, 1 + text.length / 18));
    robots.aibi.face.set('happy', 1.2);
    speak(text);
  },

  showRobots(names) {
    for (const key of ['emo', 'loona']) {
      const r = robots[key];
      const on = names.includes(key);
      if (on && r.group.parent !== board.group) board.group.add(r.group);
      r.group.visible = on;
      r.stopDance();
    }
  },

  placeRobot(robot, x, z, dir) {
    if (robot.group.parent !== board.group) board.group.add(robot.group);
    robot.group.position.copy(board.cellPos(x, z));
    robot.group.scale.setScalar(board.robotScale());
    robot.body.position.set(0, 0, 0);
    robot.body.rotation.set(0, 0, 0);
    robot.moving = false;
    robot.setDir(dir);
  },

  dirVector(dir) {
    const [dx, dz] = DIR_VEC[dir];
    return new THREE.Vector3(dx, 0, dz);
  },

  confettiAt(obj) {
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    world.worldToLocal(p);
    p.y += 0.1;
    confetti(world, p);
  },

  leaveCurrent() {
    if (this.current) this.current.token++;
    this.current = null;
    clearTweens();
    if (this.finaleOn) {
      this.finaleOn = false;
      for (const r of Object.values(robots)) r.stopDance();
    }
  },

  goMenu() {
    this.leaveCurrent();
    this.view = 'main';
    showMainMenu(this);
  },

  goChapters() {
    this.leaveCurrent();
    this.view = 'chapters';
    showChapterMenu(this);
  },

  startChapter(id, levelIndex) {
    this.leaveCurrent();
    this.view = 'chapter';
    const create = { 1: createChapter1, 2: createChapter2, 3: createChapter3 }[id];
    this.current = create(this, levelIndex);
    this.current.start();
  },

  nextLevel(chapterId, levelIndex) {
    const count = LEVELS[chapterId][this.age].length;
    if (levelIndex + 1 < count) this.startChapter(chapterId, levelIndex + 1);
    else if (chapterId < 3) {
      this.startChapter(chapterId + 1, 0);
    } else this.finale();
  },

  finale() {
    this.leaveCurrent();
    this.view = 'finale';
    screen.clear();
    board.build({ size: [5, 3], walls: [], colors: [] }, null);
    this.showRobots(['emo', 'loona']);
    this.placeRobot(robots.emo, 1, 1, DIRS.S);
    this.placeRobot(robots.loona, 3, 1, DIRS.S);
    for (const r of Object.values(robots)) r.startDance();
    this.finaleOn = true;
    this.finaleTimer = 0;
    this.buildHeader('Festa finale!');
    const big = makeLabel(1.9, 0.2, 'Complimenti! Ora sai programmare i robot!', { size: 80, color: '#ff3fa4' });
    screen.add(big, 0, LAYOUT.track);
    screen.add(makeButton(0.5, 0.14, 'Gioca ancora', () => this.goChapters(), { color: '#2fbf71', icon: icons.play, size: 52 }), -0.3, LAYOUT.buttons);
    screen.add(makeButton(0.38, 0.14, 'Menu', () => this.goMenu(), { color: '#8a7fb0', icon: icons.home, size: 52 }), 0.2, LAYOUT.buttons);
    sfx.win();
    this.say('Evviva! Hai aiutato EMO a trovare le note, Loona a trovare l\'osso e me a correggere i miei errori. Facciamo festa tutti insieme!');
  },

  // Porta la scena davanti al giocatore (posizione e direzione dello sguardo attuali)
  recenter() {
    if (!renderer.xr.isPresenting) return;
    const xrCam = renderer.xr.getCamera();
    const head = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
    if (head.y < 0.4) return; // tracciamento non ancora pronto
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(xrCam.matrixWorld));
    const yaw = Math.atan2(-dir.x, -dir.z);
    world.rotation.set(0, yaw, 0);
    world.position.set(head.x, head.y - DESIGN_EYE, head.z);
  },

  // Realtà mista: punta un tavolo vero e premi il grilletto
  startPlacement() {
    if (this.mode !== 'ar') return;
    placement.start();
  },
};

// ---------- Realtà mista: posizionamento sul tavolo ----------
const placement = new Placement(renderer, scene, world, (msg) => {
  if (msg) game.say(msg);
  else if (game.lastMsg) game.say(game.lastMsg);
});
pointers.onMissSelect = () => placement.onSelect();

// ---------- Avvio delle sessioni VR / realtà mista ----------
const SESSION_INIT = {
  vr: { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] },
  ar: { requiredFeatures: ['local-floor'], optionalFeatures: ['hit-test', 'plane-detection', 'anchors', 'hand-tracking'] },
};

async function startSession(mode) {
  if (renderer.xr.isPresenting || !navigator.xr) return;
  sfx.unlock();
  try {
    const session = await navigator.xr.requestSession(mode === 'ar' ? 'immersive-ar' : 'immersive-vr', SESSION_INIT[mode]);
    session.addEventListener('end', onSessionEnded);
    await renderer.xr.setSession(session);
    onSessionStarted(mode);
  } catch (e) {
    console.error(e);
    alert('Non riesco ad avviare la modalità ' + (mode === 'ar' ? 'realtà mista' : 'VR') + ': ' + e.message);
  }
}

function onSessionStarted(mode) {
  game.mode = mode;
  document.getElementById('help').style.display = 'none';
  document.getElementById('helpBtn').style.display = 'none';
  document.getElementById('xrButtons').style.display = 'none';
  applyLayout(mode);
  if (game.view === 'main') showMainMenu(game); // aggiorna il pulsante "Centra / Sposta"
  if (mode === 'ar') {
    // aspetta un attimo che il tracciamento sia pronto, poi chiede di scegliere il tavolo
    setTimeout(() => placement.start(), 400);
  } else {
    setTimeout(() => game.recenter(), 500);
  }
}

function onSessionEnded() {
  placement.stop();
  game.mode = 'desktop';
  applyLayout('vr');
  world.position.set(0, 0, 0);
  world.rotation.set(0, 0, 0);
  placeDesktopCamera();
  if (game.view === 'main') showMainMenu(game);
  document.getElementById('helpBtn').style.display = '';
  document.getElementById('xrButtons').style.display = '';
}

async function setupXRButtons() {
  const buttons = { vr: document.getElementById('btnVR'), ar: document.getElementById('btnAR') };
  for (const [mode, btn] of Object.entries(buttons)) {
    let ok = false;
    try {
      ok = !!navigator.xr && (await navigator.xr.isSessionSupported(mode === 'ar' ? 'immersive-ar' : 'immersive-vr'));
    } catch (e) { ok = false; }
    btn.disabled = !ok;
    btn.style.display = ok ? '' : 'none'; // sul PC senza visore i pulsanti non servono e coprirebbero la scena
    btn.addEventListener('click', () => startSession(mode));
  }
}
setupXRButtons();

document.getElementById('hideHelp').addEventListener('click', () => {
  document.getElementById('help').style.display = 'none';
});
document.getElementById('helpBtn').addEventListener('click', () => {
  const h = document.getElementById('help');
  h.style.display = h.style.display === 'none' ? '' : 'none';
});

// ---------- Ciclo di animazione ----------
const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop((time, frame) => {
  const dt = Math.min(0.05, clock.getDelta());
  if (frame && placement.active) placement.update(frame);
  elapsed += dt;
  updateTweens(dt);
  for (const r of Object.values(robots)) r.update(dt, elapsed);
  board.update(dt, elapsed);
  updateEffects(dt);
  for (const b of balloons.children) b.position.y = b.userData.baseY + Math.sin(elapsed * 0.8 + b.userData.phase) * 0.08;
  if (game.finaleOn) {
    game.finaleTimer -= dt;
    if (game.finaleTimer <= 0) {
      game.finaleTimer = 1.3;
      const p = new THREE.Vector3((Math.random() - 0.5) * 0.8, TABLE_TOP + 0.1, BOARD_Z + (Math.random() - 0.5) * 0.4);
      confetti(world, p, 50);
    }
  }
  pointers.update();
  renderer.render(scene, camera);
});

document.getElementById('loading').remove();
game.goMenu();

// Modelli realistici (.glb) nella cartella models/: se ci sono, sostituiscono quelli semplici
loadRobotModels(robots).then((loaded) => {
  if (loaded.length) console.info('Modelli 3D realistici caricati:', loaded.join(', '));
});

// Utile per fare prove dalla console del browser
window.game = game;
