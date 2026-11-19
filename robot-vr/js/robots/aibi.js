// AIBI Pocket (Living.AI) — modello 3D con proporzioni e colori misurati su una foto del prodotto:
// testa bianca larga "a televisore" con schermo nero e occhi verdi ovali, clip sul retro della testa,
// collo grigio, corpo a cubetto con le "braccia" in rilievo, fessura e scritta AIBI, base rotonda con anello luminoso.
// Parti articolate: corpo (perno sulla base) e testa (perno sul collo). La base resta ferma.
import * as THREE from 'three';
import { Robot, plastic, roundedSlab, ease3, EXPR_POSE } from './robot.js';
import { Face } from './face.js';
import { makeCanvas, texFromCanvas } from '../util/text.js';

const C = {
  white: 0xf3f4f6,
  soft: 0xdcdee2, // rilievi delle braccia
  neck: 0xa9abb2,
  clip: 0xc9cad3,
  screen: '#2c2b30',
  slot: 0x2b2a2f,
  ring: 0x7ef0d6,
};

const BASE_H = 0.014;
const BODY = { w: 0.0571, h: 0.0433, d: 0.05, r: 0.0093 };
const HEAD = { w: 0.0578, h: 0.041, d: 0.04, r: 0.0084 };
const NECK_H = 0.0076;

export class Aibi extends Robot {
  constructor() {
    super('AIBI', 0.11);
    const white = plastic(C.white, 0.3);
    const soft = plastic(C.soft, 0.45);
    const neckMat = plastic(C.neck, 0.35, { metalness: 0.2 });
    const clipMat = plastic(C.clip, 0.4);
    const black = plastic(0x111114, 0.08);
    this.ownDance = true; // balla muovendo corpo e testa, non la base
    this.ownTalk = true; // quando parla annuisce con la testa

    // ---- Base di ricarica (ferma) con anello luminoso ----
    const profile = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.039, 0), new THREE.Vector2(0.0415, 0.002),
      new THREE.Vector2(0.0418, 0.009), new THREE.Vector2(0.0405, 0.0128), new THREE.Vector2(0.037, BASE_H),
      new THREE.Vector2(0.031, BASE_H), new THREE.Vector2(0.0305, BASE_H - 0.002), new THREE.Vector2(0, BASE_H - 0.002),
    ];
    const base = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), plastic(C.white, 0.3, { side: THREE.DoubleSide }));
    this.body.add(base);
    this.ringMat = new THREE.MeshBasicMaterial({ color: C.ring });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0016, 8, 64, Math.PI * 1.5), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.rotation.z = Math.PI * 1.25; // aperto dietro, come nella foto
    this.ring.position.y = BASE_H + 0.0002;
    this.body.add(this.ring);

    // ---- Corpo (perno al centro della base) ----
    this.torso = new THREE.Group();
    this.torso.position.y = BASE_H - 0.002;
    const bodyMesh = new THREE.Mesh(roundedSlab(BODY.w, BODY.h, BODY.d, BODY.r, 0.005), white);
    bodyMesh.position.y = BODY.h / 2;
    this.torso.add(bodyMesh);
    const front = BODY.d / 2;
    // "braccia" in rilievo
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(roundedSlab(0.0079, 0.0256, 0.0016, 0.0039, 0.0006), soft);
      arm.position.set(s * 0.0168, BODY.h / 2 + 0.0011, front + 0.0004);
      arm.rotation.z = s * 0.04;
      this.torso.add(arm);
    }
    // fessura e scritta "AIBI"
    const slot = new THREE.Mesh(roundedSlab(0.0077, 0.004, 0.0012, 0.0018, 0.0004), black);
    slot.position.set(0, BODY.h / 2 - 0.0103, front + 0.0002);
    this.torso.add(slot);
    const c = makeCanvas(256, 80);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c4c7cc';
    ctx.font = 'bold 64px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AIBI', 128, 44);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.0125, 0.0039), new THREE.MeshBasicMaterial({ map: texFromCanvas(c), transparent: true }));
    logo.position.set(0, BODY.h / 2 + 0.0008, front + 0.0006);
    this.torso.add(logo);
    // collo
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, NECK_H + 0.004, 20), neckMat);
    neck.position.set(0, BODY.h + NECK_H / 2, -0.004);
    this.torso.add(neck);
    this.body.add(this.torso);

    // ---- Testa (perno in cima al collo) ----
    this.head = new THREE.Group();
    this.head.position.set(0, BODY.h + NECK_H, -0.004);
    const headMesh = new THREE.Mesh(roundedSlab(HEAD.w, HEAD.h, HEAD.d, HEAD.r, 0.0065), white);
    headMesh.position.set(0, HEAD.h / 2, 0.006);
    this.head.add(headMesh);
    const hf = 0.006 + HEAD.d / 2;
    this.face = new Face({
      w: 288, h: 200, bg: C.screen, eyeColor: '#89f971', shape: { type: 'rounded', r: 0.2 },
      eyeW: 0.124, eyeH: 0.43, gap: 0.386, round: 0.5, eyeY: 0.48,
    });
    const screen = this.face.makeMesh(0.0452, 0.0312);
    screen.material.transparent = true;
    screen.position.set(0, HEAD.h / 2, hf + 0.0004);
    this.head.add(screen);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 0.0305), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.1, roughness: 0.05, clearcoat: 1 }));
    glass.position.set(0, HEAD.h / 2, hf + 0.0006);
    this.head.add(glass);
    const cam = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 10, 8), black);
    cam.position.set(0, HEAD.h / 2 + 0.0138, hf + 0.0005);
    this.head.add(cam);
    // clip sul retro in alto (AIBI si aggancia ai vestiti)
    const clip = new THREE.Mesh(roundedSlab(0.033, 0.0075, 0.011, 0.003, 0.0015), clipMat);
    clip.position.set(0, HEAD.h + 0.0025, 0.006 - HEAD.d / 2 + 0.008);
    this.head.add(clip);
    this.torso.add(this.head);
    this.head.position.y = BODY.h + NECK_H; // relativo al corpo
  }

  idle(dt, time) {
    this.ringMat.color.setHSL(0.46 + Math.sin(time * 1.5) * 0.04, 0.8, 0.66);
    const h = this.head;
    if (this.dancing) {
      const b = Math.sin(time * 6);
      ease3(h, -Math.abs(Math.sin(time * 12)) * 0.15, Math.sin(time * 3) * 0.35, -b * 0.2, dt, 14);
      ease3(this.torso, 0, Math.sin(time * 3) * 0.2, b * 0.12, dt, 14);
    } else {
      const pose = EXPR_POSE[this.face.expr] || [0, 0, 0];
      // si guarda intorno (la testa ruota sul collo) e annuisce quando parla
      const look = Math.sin(time * 0.5) * 0.35 + Math.sin(time * 1.9) * 0.06;
      const talk = this.talkTime > 0 ? Math.sin(time * 10) * 0.12 : 0;
      ease3(h, pose[0] + talk + Math.sin(time * 0.8) * 0.04, pose[1] + look, pose[2] + Math.sin(time * 1.4) * 0.08, dt, 5);
      ease3(this.torso, 0, 0, this.talkTime > 0 ? Math.sin(time * 5) * 0.04 : 0, dt, 6);
    }
  }
}
