// Carte comando: la tavolozza (carte da scegliere) e la fila del programma.
import * as THREE from 'three';
import { cardTexture, makeCanvas, texFromCanvas, roundRect } from '../util/text.js';

let slotTex = null;
function getSlotTex() {
  if (slotTex) return slotTex;
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#c9c2e8';
  ctx.fillStyle = '#f3f0ff';
  roundRect(ctx, 6, 6, 116, 116, 22);
  ctx.fill();
  ctx.stroke();
  slotTex = texFromCanvas(c);
  slotTex.userData.shared = true;
  return slotTex;
}

function frameTex(color) {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.lineWidth = 12;
  ctx.strokeStyle = color;
  roundRect(ctx, 6, 6, 116, 116, 26);
  ctx.stroke();
  return texFromCanvas(c);
}

export function makeCardMesh(kind, size, onClick) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: cardTexture(kind), transparent: true, depthWrite: false })
  );
  mesh.userData.kind = kind;
  if (onClick) {
    mesh.userData.onClick = () => onClick(mesh);
    mesh.userData.hoverable = true;
  }
  return mesh;
}

// Tavolozza: una riga di carte da cui scegliere
export function buildPalette(screen, kinds, y, onPick, size = 0.16) {
  const step = size + 0.035;
  const x0 = -((kinds.length - 1) * step) / 2;
  const meshes = kinds.map((k, i) => {
    const m = makeCardMesh(k, size, () => onPick(k, m));
    screen.add(m, x0 + i * step, y);
    return m;
  });
  return meshes;
}

// Fila del programma con caselle vuote numerate
export class ProgramTrack {
  constructor(screen, { y, max, onSlotClick }) {
    this.screen = screen;
    this.max = max;
    this.onSlotClick = onSlotClick;
    this.size = Math.min(0.2, 2.02 / max - 0.018);
    this.step = this.size + 0.018;
    this.y = y;
    this.x0 = -((max - 1) * this.step) / 2;
    this.group = new THREE.Group();
    screen.add(this.group, 0, y);
    this.slots = [];
    for (let i = 0; i < max; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), new THREE.MeshBasicMaterial({ map: getSlotTex(), transparent: true, depthWrite: false }));
      s.position.set(this.x0 + i * this.step, 0, 0);
      s.renderOrder = 1;
      this.group.add(s);
      this.slots.push(s);
    }
    this.cardMeshes = [];
    this.runFrame = new THREE.Mesh(new THREE.PlaneGeometry(this.size * 1.18, this.size * 1.18), new THREE.MeshBasicMaterial({ map: frameTex('#ffb800'), transparent: true, depthWrite: false }));
    this.runFrame.position.z = 0.001;
    this.runFrame.renderOrder = 3;
    this.runFrame.visible = false;
    this.group.add(this.runFrame);
    this.selFrame = new THREE.Mesh(new THREE.PlaneGeometry(this.size * 1.18, this.size * 1.18), new THREE.MeshBasicMaterial({ map: frameTex('#ff3fa4'), transparent: true, depthWrite: false }));
    this.selFrame.position.z = 0.0012;
    this.selFrame.renderOrder = 3;
    this.selFrame.visible = false;
    this.group.add(this.selFrame);
    this.cards = [];
  }

  setCards(cards) {
    this.cards = cards;
    for (const m of this.cardMeshes) {
      this.group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.cardMeshes = cards.map((k, i) => {
      const m = makeCardMesh(k, this.size * 0.96, () => this.onSlotClick && this.onSlotClick(i));
      m.position.set(this.x0 + i * this.step, 0, 0.0005);
      m.renderOrder = 2;
      this.group.add(m);
      return m;
    });
  }

  highlight(i) {
    if (i == null) { this.runFrame.visible = false; return; }
    this.runFrame.visible = true;
    this.runFrame.position.x = this.x0 + i * this.step;
  }

  select(i) {
    if (i == null) { this.selFrame.visible = false; return; }
    this.selFrame.visible = true;
    this.selFrame.position.x = this.x0 + i * this.step;
  }
}
