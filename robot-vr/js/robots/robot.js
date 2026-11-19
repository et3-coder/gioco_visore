// Classe base dei robot: movimento, rotazione, urti, festeggiamenti.
import * as THREE from 'three';
import { animate, ease } from '../util/tween.js';
import { makeCanvas, texFromCanvas } from '../util/text.js';
import { normalizeModel } from './models.js';

// Direzioni sulla griglia: 0 = Nord (lontano dal giocatore), 1 = Est, 2 = Sud, 3 = Ovest
export function dirToAngle(d) {
  return Math.PI - d * (Math.PI / 2);
}

let shadowTex = null;
function getShadowTex() {
  if (shadowTex) return shadowTex;
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = texFromCanvas(c);
  shadowTex.userData.shared = true;
  return shadowTex;
}

// ---- Aiuti per animare le articolazioni ----
// Alza/abbassa una parte rispetto alla sua posizione di riposo
export function lift(obj, dy) {
  const r = obj.userData.rest;
  obj.position.y = (r ? r.y : obj.userData.restY ?? (obj.userData.restY = obj.position.y)) + dy;
}
// Porta dolcemente una rotazione verso un valore (k = velocità)
export function ease3(obj, x, y, z, dt, k = 8) {
  const t = Math.min(1, dt * k);
  obj.rotation.x += (x - obj.rotation.x) * t;
  obj.rotation.y += (y - obj.rotation.y) * t;
  obj.rotation.z += (z - obj.rotation.z) * t;
}
// Come ease3, ma rispetto alla posa di riposo della parte (salvata la prima volta)
export function easeRest(obj, dx, dy, dz, dt, k = 8) {
  const r = obj.userData.restRot || (obj.userData.restRot = obj.rotation.clone());
  ease3(obj, r.x + dx, r.y + dy, r.z + dz, dt, k);
}

// "Lastra" arrotondata: rettangolo con angoli tondi (raggio r) estruso con bordi smussati (bevel).
// È la forma giusta per teste e corpi squadrati come quelli di EMO e AIBI. Centrata nell'origine.
export function roundedSlab(w, h, d, r, bevel = 0.003) {
  const x = -w / 2 + bevel, y = -h / 2 + bevel, W = w - 2 * bevel, H = h - 2 * bevel;
  const rr = Math.max(0.0005, Math.min(r - bevel, W / 2, H / 2));
  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + W - rr, y);
  s.quadraticCurveTo(x + W, y, x + W, y + rr);
  s.lineTo(x + W, y + H - rr);
  s.quadraticCurveTo(x + W, y + H, x + W - rr, y + H);
  s.lineTo(x + rr, y + H);
  s.quadraticCurveTo(x, y + H, x, y + H - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const depth = Math.max(0.0005, d - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// Posa della testa per ogni espressione: [inclinazione avanti, rotazione, inclinazione laterale]
export const EXPR_POSE = {
  sad: [0.28, 0, 0],
  confused: [0, 0.15, 0.32],
  happy: [-0.12, 0, 0],
  love: [-0.08, 0, 0.12],
  surprised: [-0.18, 0, 0],
  focus: [0.08, 0, 0],
};

// Plastica lucida (con strato trasparente "clearcoat" come i robot veri)
export function plastic(color, roughness = 0.3, opts = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.15, ...opts });
}

export class Robot {
  constructor(name, shadowSize = 0.12) {
    this.name = name;
    this.group = new THREE.Group(); // posizione sul tavolo
    this.pivot = new THREE.Group(); // rotazione (direzione)
    this.body = new THREE.Group(); // saltelli e inclinazioni
    this.group.add(this.pivot);
    this.pivot.add(this.body);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.MeshBasicMaterial({ map: getShadowTex(), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    this.group.add(shadow);
    this.heading = 0;
    this.face = null;
    this.moving = false;
    this.dancing = false;
    this.talkTime = 0;
  }

  // Sostituisce il modello disegnato nel codice con un modello 3D realistico (.glb)
  useModel(scene, cfg) {
    for (const c of this.body.children) c.visible = false;
    const model = normalizeModel(scene, cfg);
    this.body.add(model);
    this.model = model;
    if (this.face && cfg.face && !cfg.face.hide) {
      const f = cfg.face;
      const screen = this.face.makeOverlay(f.w, f.h, f.shape, f.curve || 0);
      screen.position.set(0, f.y, f.z);
      screen.rotation.x = f.tilt || 0;
      this.body.add(screen);
    }
  }

  setDir(d) {
    this.heading = dirToAngle(d);
    this.pivot.rotation.y = this.heading;
  }

  async turnToAngle(target, dur = 0.32) {
    const start = this.pivot.rotation.y;
    let delta = target - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    await animate(dur, (t) => { this.pivot.rotation.y = start + delta * t; });
    this.heading = start + delta;
  }

  turnToDir(d, dur) {
    return this.turnToAngle(dirToAngle(d), dur);
  }

  async moveTo(pos, dur = 0.45, hop = 0.015) {
    this.moving = true;
    const from = this.group.position.clone();
    await animate(dur, (t, raw) => {
      this.group.position.lerpVectors(from, pos, t);
      this.body.position.y = Math.sin(raw * Math.PI) * hop * this.unit();
    });
    this.body.position.y = 0;
    this.moving = false;
  }

  unit() {
    return 1; // le dimensioni sono già in metri: lo scale del gruppo le adatta alla griglia
  }

  // Avanza un po' verso l'ostacolo e torna indietro, con faccia confusa
  async bump(dirVec, cell) {
    this.moving = true;
    this.face && this.face.set('surprised');
    const from = this.group.position.clone();
    const to = from.clone().addScaledVector(dirVec, cell * 0.3);
    await animate(0.18, (t) => this.group.position.lerpVectors(from, to, t), ease.out);
    await animate(0.25, (t) => {
      this.group.position.lerpVectors(to, from, t);
      this.body.rotation.z = Math.sin(t * Math.PI * 4) * 0.15 * (1 - t);
    });
    this.body.rotation.z = 0;
    this.face && this.face.set('confused', 2.5);
    this.moving = false;
  }

  async celebrate() {
    this.face && this.face.set('happy', 3);
    this.moving = true;
    const startRot = this.pivot.rotation.y;
    for (let i = 0; i < 2; i++) {
      await animate(0.38, (t, raw) => {
        this.body.position.y = Math.sin(raw * Math.PI) * 0.05;
        if (i === 1) this.pivot.rotation.y = startRot + raw * Math.PI * 2;
      }, ease.linear);
    }
    this.pivot.rotation.y = startRot;
    this.body.position.y = 0;
    this.moving = false;
  }

  async sad() {
    this.face && this.face.set('sad', 2.5);
    await animate(0.5, (t, raw) => { this.body.rotation.x = Math.sin(raw * Math.PI) * 0.2; });
    this.body.rotation.x = 0;
  }

  // Avvisa che sta "parlando" (rimbalzi leggeri)
  talk(seconds = 1.5) {
    this.talkTime = seconds;
  }

  startDance() { this.dancing = true; this.face && this.face.set('love'); }
  stopDance() { this.dancing = false; this.body.rotation.set(0, 0, 0); this.body.position.y = 0; this.face && this.face.set('normal'); }

  update(dt, time) {
    if (this.face) this.face.update(dt);
    if (this.dancing && !this.ownDance) {
      this.body.position.y = Math.abs(Math.sin(time * 6)) * 0.03;
      this.body.rotation.z = Math.sin(time * 6) * 0.18;
      this.body.rotation.y = Math.sin(time * 3) * 0.4;
    } else if (!this.moving) {
      if (this.talkTime > 0) {
        this.talkTime -= dt;
        if (!this.ownTalk) this.body.position.y = Math.abs(Math.sin(time * 9)) * 0.012;
      } else {
        this.body.position.y = 0;
      }
    }
    this.idle(dt, time);
  }

  idle() {}
}
