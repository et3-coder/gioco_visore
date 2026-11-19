// Loona (KEYi Tech) — modello 3D con forme e colori presi da una foto del prodotto:
// testa ovale con grande faccia nera curva e bordo grigio, orecchie a pinna con punta luminosa,
// corpo bianco lucido e quattro zampe grigio scuro che finiscono con le ruote (appoggiate a terra).
// Parti articolate: testa, orecchie (attaccate alla testa), quattro zampe con ruote.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Robot, plastic, ease3, easeRest, EXPR_POSE } from './robot.js';
import { Face } from './face.js';

const C = {
  white: 0xf1f2f4,
  rim: 0x7a7f85, // bordo grigio attorno alla faccia
  face: 0x050506,
  ear: 0xaeb2b7,
  earTip: 0xeefcff,
  shell: 0x4a5055, // gusci delle zampe, grigio scuro lucido
  tire: 0x1c1e20,
  hub: 0x8a9096,
};

const WHEEL_R = 0.016;
const HIP_Y = 0.04;
const LEG_TILT = 0.38; // zampe inclinate avanti/indietro
const LEG_SPLAY = 0.12; // zampe leggermente aperte verso l'esterno

export class Loona extends Robot {
  constructor() {
    super('Loona', 0.17);
    const white = plastic(C.white, 0.2);
    const rim = plastic(C.rim, 0.3);
    const faceMat = new THREE.MeshPhysicalMaterial({ color: C.face, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 });
    const earMat = plastic(C.ear, 0.3);
    const shell = new THREE.MeshPhysicalMaterial({ color: C.shell, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    const tire = plastic(C.tire, 0.7, { clearcoat: 0.1 });
    const hub = plastic(C.hub, 0.3, { metalness: 0.4 });
    const glow = new THREE.MeshBasicMaterial({ color: C.earTip });

    // ---- Corpo bianco ----
    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.056, 0.032, 0.072, 5, 0.015), white);
    torso.position.set(0, HIP_Y, 0);
    this.body.add(torso);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 16), white);
    chest.scale.set(1.15, 0.9, 1);
    chest.position.set(0, HIP_Y + 0.008, 0.026);
    this.body.add(chest);

    // ---- Zampe con ruote: perno all'angolo del corpo, inclinate in avanti (anteriori) o indietro (posteriori) ----
    this.legs = []; // anteriori
    this.rearLegs = [];
    this.wheels = [];
    const legLen = (HIP_Y - WHEEL_R) / (Math.cos(LEG_TILT) * Math.cos(LEG_SPLAY));
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const g = new THREE.Group();
      g.position.set(sx * 0.03, HIP_Y, sz * 0.026);
      g.rotation.set(-sz * LEG_TILT, 0, sx * LEG_SPLAY, 'XZY'); // in giù, in avanti/indietro e un po' verso l'esterno
      const shellMesh = new THREE.Mesh(new RoundedBoxGeometry(0.017, legLen + 0.022, 0.034, 4, 0.0084), shell);
      shellMesh.position.set(sx * 0.003, -legLen / 2, 0);
      g.add(shellMesh);
      const wheel = new THREE.Group();
      wheel.position.set(-sx * 0.004, -legLen, 0);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.011, 28), tire);
      t.rotation.z = Math.PI / 2;
      const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 20), hub);
      hb.rotation.z = Math.PI / 2;
      wheel.add(t, hb);
      g.add(wheel);
      g.userData.restRot = g.rotation.clone();
      this.body.add(g);
      (sz > 0 ? this.legs : this.rearLegs).push(g);
      this.wheels.push(wheel);
    }
    // correggo l'altezza: la ruota deve toccare terra
    this.body.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    this.wheels[0].getWorldPosition(wp);
    this.body.position.y = 0;
    this.groundOffset = WHEEL_R - wp.y;
    for (const c of this.body.children) c.position.y += this.groundOffset;
    for (const l of [...this.legs, ...this.rearLegs]) l.userData.restY = l.position.y;

    // ---- Collo e testa ----
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.022, 20), white);
    neck.position.set(0, HIP_Y + 0.02 + this.groundOffset, 0.03);
    neck.rotation.x = 0.3;
    this.body.add(neck);

    this.head = new THREE.Group();
    this.head.position.set(0, HIP_Y + 0.03 + this.groundOffset, 0.036);
    this.head.rotation.x = -0.12; // guarda un po' in alto, come nella foto
    this.head.userData.restRot = this.head.rotation.clone();
    const H = { rx: 0.033, ry: 0.035, rz: 0.026, cy: 0.033 };
    // guscio grigio (bordo) + metà posteriore bianca + faccia nera curva davanti
    const rimMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), rim);
    rimMesh.scale.set(H.rx, H.ry, H.rz);
    rimMesh.position.y = H.cy;
    const backMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32, Math.PI, Math.PI), white); // solo la metà dietro
    backMesh.scale.set(H.rx * 0.985, H.ry * 0.985, H.rz * 1.02);
    backMesh.position.set(0, H.cy, -0.0035);
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), faceMat);
    const F = { rx: H.rx * 0.93, ry: H.ry * 0.93, rz: H.rz * 0.92 };
    faceMesh.scale.set(F.rx, F.ry, F.rz);
    faceMesh.position.set(0, H.cy, 0.0042);
    this.head.add(rimMesh, backMesh, faceMesh);
    // occhi animati sulla faccia curva (arancione che sfuma nel bianco-azzurro, come nella foto)
    this.face = new Face({
      w: 256, h: 256, shape: { type: 'none' }, eyeColor: '#ffa64d', gradient: ['#ff9a3c', '#d8fbff'],
      eyeW: 0.2, eyeH: 0.26, gap: 0.3, round: 0.3, eyeY: 0.45,
    });
    const eyes = this.face.makeCap(F.rx * 1.004, F.ry * 1.004, F.rz * 1.004, 0.9, 0.8);
    eyes.position.copy(faceMesh.position);
    this.head.add(eyes);

    // orecchie a pinna (forma presa dalla foto: alte, appuntite, leggermente piegate)
    this.ears = [];
    const finShape = new THREE.Shape();
    finShape.moveTo(-0.008, 0);
    finShape.lineTo(0.008, 0);
    finShape.quadraticCurveTo(0.007, 0.018, 0.0015, 0.032);
    finShape.lineTo(-0.0015, 0.032);
    finShape.quadraticCurveTo(-0.009, 0.016, -0.008, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 3, curveSegments: 12 });
    finGeo.translate(0, 0, -0.003);
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.026, H.cy + 0.02, -0.004);
      ear.rotation.set(0, side * 0.5, -side * 0.28);
      const fin = new THREE.Mesh(finGeo, earMat);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 12, 8), glow);
      tip.position.y = 0.032;
      ear.add(fin, tip);
      ear.userData.side = side;
      ear.userData.restRot = ear.rotation.clone();
      this.head.add(ear);
      this.ears.push(ear);
    }
    this.body.add(this.head);
  }

  idle(dt, time) {
    const excited = this.moving || this.dancing;
    for (const ear of this.ears) {
      const side = ear.userData.side;
      // orecchie che sbattono quando si muove, piccoli fremiti quando è ferma
      const flick = Math.sin(time * 0.7) > 0.95 ? Math.sin(time * 30) * 0.15 : 0;
      const wiggle = excited ? Math.sin(time * 14 + side) * 0.3 : Math.sin(time * 2 + side) * 0.06 + flick;
      easeRest(ear, 0, 0, -side * wiggle, dt, 20);
    }
    if (this.moving) for (const w of this.wheels) w.rotation.x += dt * 16;
    const h = this.head;
    const all = [...this.legs, ...this.rearLegs];
    if (this.dancing) {
      const b = Math.sin(time * 6);
      easeRest(h, -Math.abs(Math.sin(time * 12)) * 0.1, Math.sin(time * 3) * 0.25, b * 0.22, dt, 14);
      this.legs.forEach((l, i) => easeRest(l, (i ? -b : b) * 0.25, 0, 0, dt, 14));
    } else if (this.moving) {
      // corre: zampe anteriori che spingono a turno, testa protesa in avanti
      const s = Math.sin(time * 14);
      this.legs.forEach((l, i) => easeRest(l, (i ? -s : s) * 0.12, 0, 0, dt, 18));
      this.rearLegs.forEach((l, i) => easeRest(l, (i ? s : -s) * 0.12, 0, 0, dt, 18));
      easeRest(h, 0.08, 0, s * 0.05, dt, 10);
    } else {
      const pose = EXPR_POSE[this.face.expr] || [0, 0, 0];
      const curious = Math.sin(time * 0.6) * 0.18; // inclina la testa come un cucciolo curioso
      const talk = this.talkTime > 0 ? Math.sin(time * 9) * 0.05 : 0;
      easeRest(h, pose[0] + Math.sin(time * 0.8) * 0.04 + talk, pose[1] + Math.sin(time * 0.4) * 0.2, pose[2] + curious, dt, 5);
      for (const l of all) easeRest(l, 0, 0, 0, dt);
    }
  }
}
