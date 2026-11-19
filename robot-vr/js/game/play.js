// "Coccole e lanci": i tre robot sono liberi sul tavolo e si possono accarezzare, prendere e lanciare
// come oggetti veri.
//  - Visore: avvicina il controller (o la mano) alla testa e muovilo = carezza;
//    tasto laterale (grip) vicino al robot, oppure puntalo e premi il grilletto = lo prendi; lascia = lo lanci.
//  - PC: clic su un robot = carezza; trascinalo con il mouse e lascialo = lancio.
import * as THREE from 'three';
import { TABLE_TOP, BOARD_Z, BOARD_MAX } from './board.js';
import { DIRS } from '../levels.js';
import { makeButton } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { LAYOUT } from '../ui/layout.js';
import { sfx, music } from '../audio.js';
import { speak } from '../hints.js';
import { heartsAt } from '../effects.js';
import { animate, ease } from '../util/tween.js';
import { ITEMS, SLOTS, makeItem, wearOn, slotOf } from './wardrobe.js';

const SCALE = 1.4; // robot un po' più grandi, così si prendono meglio
const GRAVITY = 9.8;
const TABLE_HX = (BOARD_MAX + 0.22) / 2;
const TABLE_HZ = (BOARD_MAX + 0.18) / 2;
const ROOM_R = 5.5; // i robot non escono dalla stanza
const HOME = { emo: [-0.32, -0.6], loona: [0.32, -0.6], aibi: [0, -0.85] }; // posti sul tavolo (x, z)
const MID_Y = { emo: 0.065, loona: 0.07, aibi: 0.06 }; // punto in cui si "impugna" il robot
const HEAD_Y = { emo: 0.09, loona: 0.11, aibi: 0.085 }; // dove si accarezza
const GRAB_DIST = 0.22; // distanza massima per prenderlo con il grip
const PET_DIST = 0.12; // distanza dalla testa per accarezzarlo
const VOICE = { emo: { pitch: 1.6, rate: 1.05 }, loona: { pitch: 1.95, rate: 1.1 }, aibi: { pitch: 1.3, rate: 1 } };
const LINES = {
  pet: ['Che bello!', 'Ancora, ancora!', 'Mi fai il solletico!', 'Ti voglio bene!', 'Che coccole!'],
  grab: ['Eccomi!', 'Ciao!', 'Dove andiamo?'],
  fly: ['Wiii!', 'Si vola!', 'Evviva!'],
  land: ['Ops!', 'Gira tutto!', 'Ancora!', 'Che volo!'],
  dress: ['Mi sta benissimo!', 'Che bello!', 'Grazie!', 'Che eleganza!', 'Guarda come sono bello!'],
};
const TRAY_Z = -0.37; // vassoio dei vestiti, sul bordo del tavolo vicino al bambino
const WEAR_DIST = 0.14; // distanza dal punto di aggancio per "indossare" un accessorio (visore)
const WEAR_DIST_SCREEN = 0.12; // stessa cosa con il mouse, misurata sullo schermo
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ID_Q = new THREE.Quaternion();
const now = () => performance.now() / 1000;

export class Play {
  constructor(game) {
    this.game = game;
    this.movesAibi = true; // anche AIBI scende dal piedistallo
    this.keys = ['emo', 'loona', 'aibi'];
    this.st = {};
    this.ctrlPrev = new Map();
    this.mouse = null;
    this.lastSpeak = 0;
    this.dancing = false;
    this.raycaster = new THREE.Raycaster();
  }

  // ---------- Avvio ----------
  start() {
    const g = this.game;
    g.board.build({ size: [5, 3], walls: [], colors: [] }, null);
    g.showRobots(['emo', 'loona']);
    for (const k of this.keys) {
      const r = g.robots[k];
      g.world.add(r.group); // i robot ora sono oggetti liberi nella stanza
      r.group.visible = true;
      r.group.scale.setScalar(SCALE);
      r.group.quaternion.identity();
      r.body.position.set(0, 0, 0);
      r.body.rotation.set(0, 0, 0);
      r.stopDance();
      r.moving = false;
      r.acting = false;
      r.setDir(DIRS.S);
      r.group.position.copy(this.home(k));
      this.st[k] = {
        mode: 'idle', // idle | held | air | getup | home
        vel: new THREE.Vector3(), spin: new THREE.Vector3(),
        holder: null, hist: [], relQ: new THREE.Quaternion(), upFrom: new THREE.Quaternion(),
        up: 0, stroke: 0, cool: 0, flew: false,
      };
    }
    this.setupWardrobe();
    const p = g.pointers;
    p.onXR = (type, entry) => this.onXR(type, entry);
    p.onMouseDown = (rc, e) => this.onMouseDown(rc, e);
    p.onMouseMove = (rc, e) => this.onMouseMove(rc, e);
    p.onMouseUp = (rc, e) => this.onMouseUp(rc, e);
    this.buildUI();
    g.say(g.mode === 'desktop'
      ? 'Clicca su un robot per accarezzarlo, trascinalo e lascialo andare per lanciarlo. Trascina un vestito dal vassoio sulla testa di un robot per vestirlo!'
      : 'Avvicina il controller alla testa di un robot e muovilo per accarezzarlo. Tieni premuto il tasto laterale vicino a un robot, oppure puntalo e premi il grilletto, per prenderlo e lanciarlo. Prendi un vestito dal vassoio e appoggialo sulla testa di un robot!');
  }

  dispose() {
    const p = this.game.pointers;
    p.onXR = p.onMouseDown = p.onMouseMove = p.onMouseUp = null;
    // i vestiti indossati restano sui robot; quelli liberi tornano nel guardaroba
    for (const it of this.items) {
      if (it.wornBy) continue;
      it.mode = 'rest';
      it.holder = null;
      if (it.obj.parent) it.obj.parent.remove(it.obj);
    }
    if (this.tray && this.tray.parent) this.tray.parent.remove(this.tray);
  }

  // ---------- Guardaroba ----------
  setupWardrobe() {
    const g = this.game;
    // gli accessori sono gli stessi per tutta la partita (così un robot vestito resta vestito)
    if (!g.wardrobe) {
      g.wardrobe = ITEMS.map((d) => ({
        id: d.id, obj: makeItem(d.id), mode: 'rest', wornBy: null,
        vel: new THREE.Vector3(), holder: null, hist: [], relQ: new THREE.Quaternion(), farTime: 0,
      }));
    }
    this.items = g.wardrobe;
    // vassoio rosa
    this.tray = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.012, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xffc2dd, roughness: 0.6 })
    );
    this.tray.position.set(0, TABLE_TOP + 0.006, TRAY_Z);
    g.world.add(this.tray);
    this.items.forEach((it, i) => {
      if (it.wornBy) return;
      g.world.add(it.obj);
      it.mode = 'rest';
      it.obj.position.copy(this.itemHome(i));
      it.obj.quaternion.identity();
      it.obj.scale.setScalar(SCALE);
    });
  }

  itemHome(i) {
    return new THREE.Vector3(-0.5 + i * 0.2, TABLE_TOP + 0.012, TRAY_Z);
  }

  itemPos(it) {
    return this.game.world.worldToLocal(it.obj.getWorldPosition(new THREE.Vector3()));
  }

  slotPos(k, slotName) {
    const s = SLOTS[k][slotName];
    const v = this.robot(k).head.localToWorld(new THREE.Vector3(s.p[0], s.p[1], s.p[2]));
    return this.game.world.worldToLocal(v);
  }

  hitItem(raycaster) {
    const objs = this.items.map((it) => it.obj).filter((o) => o.parent);
    const hits = raycaster.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        const it = this.items.find((x) => x.obj === o);
        if (it) return { it, point: h.point };
        o = o.parent;
      }
    }
    return null;
  }

  // toglie l'accessorio dal robot e lo rimette "libero" nella stanza
  detach(it) {
    if (!it.wornBy) return;
    this.game.world.attach(it.obj); // mantiene posizione e rotazione nel mondo
    it.obj.scale.setScalar(SCALE);
    it.wornBy = null;
  }

  grabItem(it, holder) {
    if (it.mode === 'held') return;
    if (it.wornBy) {
      const k = it.wornBy;
      this.detach(it);
      this.robot(k).face.set('surprised', 0.8);
    }
    it.mode = 'held';
    it.holder = holder;
    it.hist = [];
    if (holder !== 'mouse') {
      const { q } = this.ctrlPose(holder);
      it.relQ.copy(q).invert().multiply(it.obj.quaternion);
      this.game.pointers.haptic(holder, 0.3, 30);
    }
    sfx.grab();
  }

  // Lasciato vicino alla testa di un robot = lo indossa; altrimenti viene lanciato
  releaseItem(it, viaMouse = false) {
    it.holder = null;
    const slot = slotOf(it.id);
    let best = null, bestD = Infinity;
    const ip = this.itemPos(it);
    for (const k of this.keys) {
      if (this.st[k].mode === 'held') continue;
      const sp = this.slotPos(k, slot);
      let d;
      if (viaMouse) {
        const a = this.game.world.localToWorld(ip.clone()).project(this.game.camera);
        const b = this.game.world.localToWorld(sp.clone()).project(this.game.camera);
        d = Math.hypot(a.x - b.x, a.y - b.y) / WEAR_DIST_SCREEN * WEAR_DIST;
      } else {
        d = ip.distanceTo(sp);
      }
      if (d < WEAR_DIST && d < bestD) { bestD = d; best = k; }
    }
    if (best) return this.wear(it, best);
    // lancio
    const t = now();
    const h = it.hist.filter((s) => s.t >= t - 0.1);
    const v = new THREE.Vector3();
    if (h.length >= 2) {
      const a = h[0], b = h[h.length - 1];
      if (b.t - a.t > 0.005) v.subVectors(b.p, a.p).divideScalar(b.t - a.t);
    }
    it.vel.copy(v.clampLength(0, 6));
    it.mode = 'air';
  }

  wear(it, k) {
    const slot = slotOf(it.id);
    // se il robot aveva già qualcosa in quel posto, quello vecchio cade sul tavolo
    for (const other of this.items) {
      if (other !== it && other.wornBy === k && slotOf(other.id) === slot) {
        this.detach(other);
        other.vel.set((Math.random() - 0.5) * 0.6, 1.4, 0.4);
        other.mode = 'air';
      }
    }
    wearOn(k, this.robot(k), it);
    it.wornBy = k;
    it.mode = 'worn';
    const r = this.robot(k);
    r.face.set('love', 2.5);
    r.talk(1.2);
    sfx.star();
    heartsAt(this.game.world, this.localPoint(k, HEAD_Y[k] + 0.04), 8);
    this.say(k, 'dress');
  }

  returnItemHome(it) {
    const i = this.items.indexOf(it);
    if (it.wornBy) this.detach(it);
    it.mode = 'home';
    it.farTime = 0;
    const from = it.obj.position.clone(), to = this.itemHome(i), fq = it.obj.quaternion.clone();
    const dist = from.distanceTo(to);
    animate(Math.min(1.4, 0.6 + dist * 0.2), (t) => {
      it.obj.position.lerpVectors(from, to, t);
      it.obj.position.y += Math.sin(t * Math.PI) * Math.min(0.8, 0.15 + dist * 0.2);
      it.obj.quaternion.slerpQuaternions(fq, ID_Q, t);
    }).then(() => {
      if (it.mode !== 'home') return;
      it.obj.position.copy(to);
      it.obj.quaternion.identity();
      it.mode = 'rest';
    });
  }

  undressAll() {
    let any = false;
    for (const it of this.items) {
      if (it.wornBy) { this.returnItemHome(it); any = true; }
    }
    if (any) sfx.whee();
  }

  updateItems(dt) {
    for (const it of this.items) {
      const pos = it.obj.position;
      if (it.mode === 'held') {
        if (it.holder === 'mouse' && (!this.mouse || this.mouse.it !== it)) { this.releaseItem(it, true); continue; }
        if (it.holder !== 'mouse' && it.holder && !it.holder.source) { this.releaseItem(it); continue; }
        if (it.holder !== 'mouse') {
          const { p, q } = this.ctrlPose(it.holder);
          it.obj.quaternion.slerp(q.multiply(it.relQ), Math.min(1, dt * 15));
          pos.lerp(p, Math.min(1, dt * 18));
          it.hist.push({ p: pos.clone(), t: now() });
          if (it.hist.length > 12) it.hist.shift();
        }
      } else if (it.mode === 'air') {
        it.vel.y -= GRAVITY * dt;
        const prevY = pos.y;
        pos.addScaledVector(it.vel, dt);
        const rr = Math.hypot(pos.x, pos.z);
        if (rr > ROOM_R) { pos.x *= ROOM_R / rr; pos.z *= ROOM_R / rr; it.vel.x *= -0.5; it.vel.z *= -0.5; }
        const ground = this.surfaceAt(pos, prevY);
        if (pos.y <= ground) {
          pos.y = ground;
          const impact = -it.vel.y;
          if (impact > 1.0) { it.vel.y = impact * 0.3; it.vel.x *= 0.5; it.vel.z *= 0.5; }
          else { it.vel.set(0, 0, 0); it.mode = 'rest'; }
        }
      } else if (it.mode === 'rest') {
        it.obj.quaternion.slerp(ID_Q, Math.min(1, dt * 6)); // si raddrizza
        // finito lontano: torna da solo sul vassoio
        if (this.isAway(pos)) {
          it.farTime += dt;
          if (it.farTime > 1.5) this.returnItemHome(it);
        } else {
          it.farTime = 0;
        }
      }
    }
  }

  home(k) {
    const [x, z] = HOME[k];
    return new THREE.Vector3(x, TABLE_TOP, BOARD_Z + 0.95 + z);
  }

  buildUI() {
    const { game } = this;
    const scr = game.screen;
    scr.clear();
    game.buildHeader('Coccole e lanci: gioca con i robot!');
    scr.add(makeButton(0.62, 0.18, 'Chiama i robot', () => this.callHome(), { color: '#4d8dff', icon: icons.undo, size: 54 }), -0.7, LAYOUT.track - 0.02);
    scr.add(makeButton(0.62, 0.18, 'Tutti a ballare', () => this.danceAll(), { color: '#ff4fa3', icon: icons.star, size: 54 }), 0, LAYOUT.track - 0.02);
    scr.add(makeButton(0.62, 0.18, 'Togli i vestiti', () => this.undressAll(), { color: '#ff8a3d', icon: icons.trash, size: 54 }), 0.7, LAYOUT.track - 0.02);
    scr.add(makeButton(0.36, 0.14, 'Menu', () => this.game.goMenu(), { color: '#8a7fb0', icon: icons.home, size: 52 }), 0, LAYOUT.buttons);
  }

  // ---------- Utilità ----------
  robot(k) { return this.game.robots[k]; }

  say(k, kind) {
    const t = now();
    if (t - this.lastSpeak < 1.2) return; // non parlano tutti insieme
    this.lastSpeak = t;
    speak(pick(LINES[kind]), VOICE[k]);
  }

  // posizione e rotazione del controller nelle coordinate della stanza di gioco
  ctrlPose(entry) {
    const c = entry.controller;
    const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    this.game.world.worldToLocal(p);
    const q = new THREE.Quaternion();
    c.getWorldQuaternion(q);
    const wq = new THREE.Quaternion();
    this.game.world.getWorldQuaternion(wq);
    q.premultiply(wq.invert());
    return { p, q };
  }

  localPoint(k, y) {
    const v = this.robot(k).group.localToWorld(new THREE.Vector3(0, y, 0));
    return this.game.world.worldToLocal(v);
  }

  hitRobot(raycaster) {
    const groups = this.keys.map((k) => this.robot(k).group);
    const hits = raycaster.intersectObjects(groups, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        const i = groups.indexOf(o);
        if (i >= 0) return { k: this.keys[i], point: h.point };
        o = o.parent;
      }
    }
    return null;
  }

  holding(entry) {
    return this.keys.some((k) => this.st[k].holder === entry) || this.items.some((it) => it.holder === entry);
  }

  surfaceAt(p, prevY) {
    const overTable = Math.abs(p.x) <= TABLE_HX && Math.abs(p.z - BOARD_Z) <= TABLE_HZ;
    return overTable && prevY >= TABLE_TOP - 0.03 ? TABLE_TOP : 0;
  }

  // ---------- Prendere, lanciare, accarezzare ----------
  grab(k, holder) {
    const st = this.st[k];
    const r = this.robot(k);
    if (st.mode === 'held') return;
    st.mode = 'held';
    st.holder = holder;
    st.hist = [];
    st.flew = false;
    r.stopDance();
    r.acting = false;
    if (holder !== 'mouse') {
      const { q } = this.ctrlPose(holder);
      st.relQ.copy(q).invert().multiply(r.group.quaternion);
      this.game.pointers.haptic(holder, 0.5, 50);
    }
    r.face.set('happy', 2);
    sfx.grab();
    if (Math.random() < 0.5) this.say(k, 'grab');
  }

  release(k) {
    const st = this.st[k];
    const r = this.robot(k);
    const t = now();
    const h = st.hist.filter((s) => s.t >= t - 0.1);
    const v = new THREE.Vector3();
    if (h.length >= 2) {
      const a = h[0], b = h[h.length - 1];
      if (b.t - a.t > 0.005) v.subVectors(b.p, a.p).divideScalar(b.t - a.t);
    }
    v.clampLength(0, 6);
    const speed = v.length();
    st.vel.copy(v);
    st.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.min(12, speed * 4));
    st.mode = 'air';
    st.holder = null;
    st.flew = speed > 1.2;
    if (st.flew) {
      sfx.whee();
      r.face.set('surprised', 1.5);
      this.say(k, 'fly');
    }
  }

  pet(k, entry) {
    const st = this.st[k];
    const r = this.robot(k);
    st.cool = 1.3;
    r.face.set('love', 2.5);
    r.talk(1.2);
    sfx.purr();
    heartsAt(this.game.world, this.localPoint(k, HEAD_Y[k] + 0.03), 6);
    if (entry) this.game.pointers.haptic(entry, 0.2, 90);
    if (Math.random() < 0.6) this.say(k, 'pet');
  }

  // ---------- Controller ----------
  onXR(type, entry) {
    if (type === 'squeezestart') {
      // prende la cosa più vicina alla mano: un vestito (anche indossato) o un robot
      const { p } = this.ctrlPose(entry);
      let best = null, bestD = GRAB_DIST;
      for (const it of this.items) {
        if (it.mode === 'held' || !it.obj.parent) continue;
        const d = p.distanceTo(this.itemPos(it)) * 0.8; // i vestiti sono piccoli: hanno un po' di precedenza
        if (d < bestD) { bestD = d; best = { it }; }
      }
      for (const k of this.keys) {
        if (this.st[k].mode === 'held') continue;
        const d = p.distanceTo(this.localPoint(k, MID_Y[k]));
        if (d < bestD) { bestD = d; best = { k }; }
      }
      if (best && best.it) this.grabItem(best.it, entry);
      else if (best) this.grab(best.k, entry);
    } else if (type === 'selectstart') {
      // grilletto puntando un vestito o un robot: vola in mano (comodo anche per riprenderlo da terra)
      const m = new THREE.Matrix4().extractRotation(entry.controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(entry.controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(m);
      const hi = this.hitItem(this.raycaster);
      if (hi && hi.it.mode !== 'held') { this.grabItem(hi.it, entry); return; }
      const hit = this.hitRobot(this.raycaster);
      if (hit && this.st[hit.k].mode !== 'held') this.grab(hit.k, entry);
    } else if (type === 'squeezeend' || type === 'selectend') {
      for (const k of this.keys) if (this.st[k].holder === entry) this.release(k);
      for (const it of this.items) if (it.holder === entry) this.releaseItem(it);
    }
  }

  // ---------- Mouse (PC) ----------
  onMouseDown(raycaster, e) {
    const cam = this.game.camera;
    const normal = new THREE.Vector3();
    cam.getWorldDirection(normal).negate();
    // prima i vestiti (anche quelli indossati), poi i robot
    const hi = this.hitItem(raycaster);
    if (hi) {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hi.point);
      const objWorld = hi.it.obj.getWorldPosition(new THREE.Vector3());
      this.mouse = { it: hi.it, x: e.clientX, y: e.clientY, moved: false, plane, offset: objWorld.sub(hi.point) };
      return;
    }
    const hit = this.hitRobot(raycaster);
    if (!hit) return;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point);
    const groupWorld = this.robot(hit.k).group.getWorldPosition(new THREE.Vector3());
    this.mouse = { k: hit.k, x: e.clientX, y: e.clientY, moved: false, plane, offset: groupWorld.sub(hit.point) };
  }

  onMouseMove(raycaster, e) {
    const m = this.mouse;
    if (!m) return;
    if (!m.moved && Math.hypot(e.clientX - m.x, e.clientY - m.y) > 5) {
      m.moved = true;
      if (m.it) this.grabItem(m.it, 'mouse');
      else this.grab(m.k, 'mouse');
    }
    if (!m.moved) return;
    const point = raycaster.ray.intersectPlane(m.plane, new THREE.Vector3());
    if (!point) return;
    const target = this.game.world.worldToLocal(point.add(m.offset));
    target.y = Math.max(target.y, 0);
    const st = m.it || this.st[m.k];
    (m.it ? m.it.obj : this.robot(m.k).group).position.copy(target);
    st.hist.push({ p: target.clone(), t: now() });
    if (st.hist.length > 12) st.hist.shift();
  }

  onMouseUp() {
    const m = this.mouse;
    if (!m) return;
    this.mouse = null;
    if (m.it) {
      if (m.moved) this.releaseItem(m.it, true);
      else if (m.it.wornBy) { sfx.remove(); this.returnItemHome(m.it); } // clic su un vestito indossato = toglierlo
      return;
    }
    if (m.moved) this.release(m.k);
    else if (this.st[m.k].cool <= 0) this.pet(m.k, null);
  }

  // ---------- Pulsanti ----------
  callHome() {
    sfx.whee();
    for (const k of this.keys) if (this.st[k].mode !== 'held') this.returnHome(k);
  }

  // Il robot torna al suo posto sul tavolo con un grande saltello (più lontano = salto più lungo)
  returnHome(k) {
    const st = this.st[k];
    const r = this.robot(k);
    st.mode = 'home';
    st.vel.set(0, 0, 0);
    st.farTime = 0;
    const from = r.group.position.clone(), to = this.home(k), fq = r.group.quaternion.clone();
    const dist = from.distanceTo(to);
    const dur = Math.min(1.6, 0.7 + dist * 0.25);
    const arc = Math.min(1.2, 0.25 + dist * 0.25);
    r.face.set('happy', dur + 0.5);
    animate(dur, (t) => {
      r.group.position.lerpVectors(from, to, t);
      r.group.position.y += Math.sin(t * Math.PI) * arc;
      r.group.quaternion.slerpQuaternions(fq, ID_Q, t);
    }).then(() => {
      if (st.mode !== 'home') return;
      r.group.position.copy(to);
      r.group.quaternion.identity();
      st.mode = 'idle';
    });
  }

  // È fuori dall'inquadratura? (per terra, lontano o sotto il tavolo)
  isAway(pos) {
    const onTable = pos.y >= TABLE_TOP - 0.05 && Math.abs(pos.x) <= TABLE_HX && Math.abs(pos.z - BOARD_Z) <= TABLE_HZ;
    return !onTable;
  }

  async danceAll() {
    if (this.dancing) return;
    this.dancing = true;
    music.start();
    const dancers = this.keys.filter((k) => this.st[k].mode === 'idle').map((k) => this.robot(k));
    await Promise.all(dancers.map((r) => r.danceFor(4)));
    music.stop(0.8);
    this.dancing = false;
  }

  // ---------- Ogni fotogramma ----------
  update(dt) {
    const g = this.game;
    const head = g.headLocal();
    // posizioni dei controller (per le carezze)
    const ctrls = [];
    if (g.renderer.xr.isPresenting) {
      for (const e of g.pointers.controllers) {
        if (!e.source) continue;
        const { p } = this.ctrlPose(e);
        const prev = this.ctrlPrev.get(e);
        this.ctrlPrev.set(e, p.clone());
        ctrls.push({ e, p, moved: prev ? p.distanceTo(prev) : 0 });
      }
    }
    this.updateItems(dt);

    for (const k of this.keys) {
      const st = this.st[k];
      const r = this.robot(k);
      const pos = r.group.position;
      st.cool -= dt;
      st.stroke *= 0.97;

      if (st.mode === 'held') {
        // sicurezza: se il "rilascio" si è perso, il robot non resta appeso
        if (st.holder === 'mouse' && (!this.mouse || this.mouse.k !== k)) { this.release(k); continue; }
        if (st.holder !== 'mouse' && st.holder && !st.holder.source) { this.release(k); continue; }
        if (st.holder !== 'mouse') {
          const { p, q } = this.ctrlPose(st.holder);
          const targetQ = q.multiply(st.relQ);
          r.group.quaternion.slerp(targetQ, Math.min(1, dt * 15));
          const off = new THREE.Vector3(0, MID_Y[k] * SCALE, 0).applyQuaternion(r.group.quaternion);
          pos.lerp(p.sub(off), Math.min(1, dt * 18));
          st.hist.push({ p: pos.clone(), t: now() });
          if (st.hist.length > 12) st.hist.shift();
        }
        continue;
      }

      if (st.mode === 'air') {
        st.vel.y -= GRAVITY * dt;
        const prevY = pos.y;
        pos.addScaledVector(st.vel, dt);
        const sp = st.spin.length();
        if (sp > 0.01) {
          const q = new THREE.Quaternion().setFromAxisAngle(st.spin.clone().divideScalar(sp), sp * dt);
          r.group.quaternion.premultiply(q);
        }
        // pareti della stanza
        const rr = Math.hypot(pos.x, pos.z);
        if (rr > ROOM_R) {
          pos.x *= ROOM_R / rr;
          pos.z *= ROOM_R / rr;
          st.vel.x *= -0.5;
          st.vel.z *= -0.5;
        }
        const ground = this.surfaceAt(pos, prevY);
        if (pos.y <= ground) {
          pos.y = ground;
          const impact = -st.vel.y;
          if (impact > 1.0) {
            // rimbalzo
            st.vel.y = impact * 0.35;
            st.vel.x *= 0.6;
            st.vel.z *= 0.6;
            st.spin.multiplyScalar(0.5);
            sfx.thud(impact / 5);
          } else {
            st.vel.set(0, 0, 0);
            st.mode = 'getup';
            st.up = 0;
            st.upFrom.copy(r.group.quaternion);
            r.face.set(st.flew ? 'confused' : 'normal', 1.6);
            if (impact > 0.3) sfx.thud(impact / 5);
            if (st.flew) this.say(k, 'land');
          }
        }
        continue;
      }

      if (st.mode === 'getup') {
        // si rialza da solo
        st.up += dt / 0.6;
        const t = Math.min(1, st.up);
        r.group.quaternion.slerpQuaternions(st.upFrom, ID_Q, ease.inOut(t));
        if (t >= 1) {
          r.group.quaternion.identity();
          st.mode = 'idle';
          if (st.flew) r.face.set('happy', 1.2);
        }
      }

      // Lanciato troppo lontano: dopo essersi rialzato torna da solo sul tavolo
      if (st.mode === 'idle' && this.isAway(pos)) {
        st.farTime = (st.farTime || 0) + dt;
        if (st.farTime > 1.2) {
          sfx.whee();
          speak('Torno da te!', VOICE[k]);
          this.returnHome(k);
          continue;
        }
      } else if (st.mode !== 'idle') {
        st.farTime = 0;
      }

      if (st.mode === 'idle' || st.mode === 'getup') {
        // da fermo si gira a guardare il bambino
        if (st.mode === 'idle' && !r.dancing) {
          const yaw = Math.atan2(head.x - pos.x, head.z - pos.z);
          let d = yaw - r.pivot.rotation.y;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          r.pivot.rotation.y += d * Math.min(1, dt * 2.5);
        }
        // carezze: controller vicino alla testa che si muove
        const hp = this.localPoint(k, HEAD_Y[k]);
        for (const c of ctrls) {
          if (this.holding(c.e)) continue;
          if (c.p.distanceTo(hp) < PET_DIST) {
            st.stroke += c.moved;
            if (st.stroke > 0.1 && st.cool <= 0) {
              this.pet(k, c.e);
              st.stroke = 0;
            }
          }
        }
      }
    }
  }
}
