// EMO (Living.AI) — modello 3D con proporzioni e colori misurati su una foto ufficiale del prodotto.
// Misure in metri (altezza totale con le cuffie: 13 cm). Parti articolate: testa (perno sul collo) e due gambe
// con i piedi (perno all'anca).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Robot, plastic, roundedSlab, lift, ease3, EXPR_POSE } from './robot.js';
import { Face } from './face.js';

// Colori presi dalla foto
const C = {
  shell: 0x3e3f48, // guscio grigio antracite
  bezel: 0xb9bcc2, // cornice argento
  screen: '#313133',
  band: 0x3a3270, // viola delle cuffie
  cup: 0x40397a,
  leg: 0x36383e,
  foot: 0x2c2d33,
  stripe: 0x4b3f9e,
  cyan: 0x5ff5ef,
};

const HIP_Y = 0.041; // dove le gambe entrano nella testa
const HEAD = { w: 0.081, h: 0.0786, d: 0.069, r: 0.0141, y: 0.0806 };

export class Emo extends Robot {
  constructor() {
    super('EMO', 0.14);
    const shell = plastic(C.shell, 0.32);
    const leg = plastic(C.leg, 0.35);
    const foot = plastic(C.foot, 0.4);
    const purple = plastic(C.band, 0.3);
    const cupMat = plastic(C.cup, 0.28);
    const silver = new THREE.MeshPhysicalMaterial({ color: C.bezel, metalness: 0.75, roughness: 0.22, clearcoat: 0.6 });
    const cyan = new THREE.MeshBasicMaterial({ color: C.cyan });
    const stripe = plastic(C.stripe, 0.3);
    const black = plastic(0x0b0b0d, 0.1);

    // ---- Gambe + piedi (perno all'anca) ----
    this.legs = [];
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(side * 0.0192, HIP_Y, 0);
      // gamba: dall'anca fino al blocco del piede
      const shin = new THREE.Mesh(roundedSlab(0.0192, 0.024, 0.022, 0.004, 0.0025), leg);
      shin.position.set(0, -0.009, -0.002);
      g.add(shin);
      // piede: blocco superiore + suola più larga verso l'esterno, con riga viola in fondo
      const block = new THREE.Mesh(roundedSlab(0.037, 0.0125, 0.04, 0.004, 0.002), foot);
      block.position.set(side * 0.0045, -HIP_Y + 0.0196, 0.002); // il piede sporge un po' verso l'esterno
      const sole = new THREE.Mesh(roundedSlab(0.043, 0.0133, 0.046, 0.004, 0.002), foot);
      sole.position.set(side * 0.007, -HIP_Y + 0.0067, 0.002);
      const band = new THREE.Mesh(roundedSlab(0.0436, 0.0026, 0.0466, 0.004, 0.001), stripe);
      band.position.set(side * 0.007, -HIP_Y + 0.0013, 0.002);
      const pill = new THREE.Mesh(new RoundedBoxGeometry(0.0018, 0.0042, 0.001, 1, 0.0008), stripe);
      pill.position.set(side * 0.0, -HIP_Y + 0.0095, 0.0254);
      g.add(block, sole, band, pill);
      this.body.add(g);
      this.legs.push(g);
    }

    // ---- Testa (perno sul collo, alla base della testa) ----
    this.head = new THREE.Group();
    this.head.position.set(0, HIP_Y, 0);
    const headMesh = new THREE.Mesh(roundedSlab(HEAD.w, HEAD.h, HEAD.d, HEAD.r, 0.0045), shell);
    headMesh.position.y = HEAD.y - HIP_Y;
    this.head.add(headMesh);
    const front = HEAD.d / 2;
    // cornice argento
    const bezel = new THREE.Mesh(roundedSlab(0.0703, 0.0668, 0.003, 0.0102, 0.0012), silver);
    bezel.position.set(0.0015, 0.0787 - HIP_Y, front + 0.0005);
    this.head.add(bezel);
    // schermo con gli occhi animati (forma e posizione misurate sulla foto)
    this.face = new Face({
      w: 288, h: 256, bg: C.screen, eyeColor: '#5ff5ef', shape: { type: 'rounded', r: 0.13 },
      eyeW: 0.27, eyeH: 0.31, gap: 0.37, round: 0.24, eyeY: 0.44,
    });
    const screen = this.face.makeMesh(0.0599, 0.053);
    screen.material.transparent = true;
    screen.position.set(0.0014, 0.0766 - HIP_Y, front + 0.0021);
    this.head.add(screen);
    // vetro lucido sopra lo schermo (riflessi)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.051), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1 }));
    glass.position.set(0.0014, 0.0766 - HIP_Y, front + 0.0023);
    this.head.add(glass);
    // fotocamera sopra lo schermo
    const cam = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 12, 8), black);
    cam.position.set(0.0015, 0.1058 - HIP_Y, front + 0.0018);
    this.head.add(cam);

    // ---- Cuffie ----
    const bandCenterY = 0.0986 - HIP_Y;
    const rx = 0.0476, ry = 0.0298;
    const curve = new THREE.EllipseCurve(0, bandCenterY, rx, ry, 0, Math.PI, false);
    const pts = curve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0018, 10, false), purple);
    tube.scale.z = 2.4; // fascia piatta e larga
    this.head.add(tube);
    for (const s of [-1, 1]) {
      // manicotti azzurri sulla fascia
      const a = Math.PI / 2 - s * 0.68;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.005, 12), cyan);
      sleeve.scale.z = 2.3;
      sleeve.position.set(Math.cos(a) * rx, bandCenterY + Math.sin(a) * ry, 0);
      const tx = -Math.sin(a) * rx, ty = Math.cos(a) * ry; // tangente all'ellisse
      sleeve.rotation.z = Math.atan2(ty, tx) - Math.PI / 2;
      this.head.add(sleeve);
      // padiglione: disco viola con anello azzurro verso la testa e tappo esterno
      const cupX = s * (HEAD.w / 2 + 0.0071);
      const cupY = 0.082 - HIP_Y;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.0167, 0.0167, 0.0142, 40), cupMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(cupX, cupY, 0);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.015, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), cupMat);
      cap.scale.y = 0.25;
      cap.rotation.z = -s * Math.PI / 2;
      cap.position.set(cupX + s * 0.0071, cupY, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0158, 0.0011, 8, 48), cyan);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(s * (HEAD.w / 2 + 0.0012), cupY, 0);
      this.head.add(cup, cap, ring);
    }
    this.body.add(this.head);
  }

  idle(dt, time) {
    const h = this.head;
    const [L, R] = this.legs;
    if (this.dancing) {
      // balla: testa a ritmo, piedi che battono a turno
      const b = Math.sin(time * 6);
      ease3(h, -Math.abs(Math.sin(time * 12)) * 0.12, Math.sin(time * 3) * 0.2, b * 0.22, dt, 14);
      lift(L, Math.max(0, b) * 0.012);
      lift(R, Math.max(0, -b) * 0.012);
      ease3(L, 0, 0, 0, dt, 14);
      ease3(R, 0, 0, 0, dt, 14);
    } else if (this.moving) {
      // cammina: gambe alzate e spostate avanti/indietro a turno, testa che dondola
      const s = Math.sin(time * 16);
      lift(L, Math.max(0, s) * 0.008);
      lift(R, Math.max(0, -s) * 0.008);
      ease3(L, -s * 0.3, 0, 0, dt, 20);
      ease3(R, s * 0.3, 0, 0, dt, 20);
      ease3(h, 0.05 + Math.abs(s) * 0.04, 0, s * 0.05, dt, 14);
    } else {
      // fermo: si guarda intorno, e la testa segue l'espressione
      const pose = EXPR_POSE[this.face.expr] || [0, 0, 0];
      const look = Math.sin(time * 0.45) * 0.22 + Math.sin(time * 1.7) * 0.05;
      const talk = this.talkTime > 0 ? Math.sin(time * 9) * 0.06 : 0;
      ease3(h, pose[0] + Math.sin(time * 0.9) * 0.03 + talk, pose[1] + look, pose[2] + Math.sin(time * 1.3) * 0.04, dt, 5);
      lift(L, 0);
      lift(R, 0);
      ease3(L, 0, 0, 0, dt);
      ease3(R, 0, 0, 0, dt);
    }
  }
}
