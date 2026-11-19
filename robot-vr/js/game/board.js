// Il tabellone sul tavolo: caselle, blocchi, caselle colorate e oggetto da raggiungere.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { disposeTree } from '../ui/ui.js';
import { animate } from '../util/tween.js';

export const TABLE_TOP = 0.82;
export const BOARD_Z = -0.95; // centro del tabellone (davanti al giocatore, al centro del tavolo)
export const BOARD_MAX = 1.2; // lato massimo del tabellone in metri
const CELL_MAX = 0.22; // casella più grande possibile (griglie piccole)

export const TILE_COLORS = {
  red: 0xff5d5d,
  blue: 0x4d8dff,
  yellow: 0xffd23f,
};

function m(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...opts });
}

export function buildTable(parent) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new RoundedBoxGeometry(BOARD_MAX + 0.22, 0.05, BOARD_MAX + 0.18, 3, 0.02), m(0xffe2a8));
  top.position.set(0, TABLE_TOP - 0.025, BOARD_Z);
  g.add(top);
  const legMat = m(0x7a5cff);
  for (const x of [-0.64, 0.64]) {
    for (const z of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, TABLE_TOP - 0.05, 14), legMat);
      leg.position.set(x, (TABLE_TOP - 0.05) / 2, BOARD_Z + z);
      g.add(leg);
    }
  }
  parent.add(g);
  return g;
}

function makeNote() {
  const g = new THREE.Group();
  const mat = m(0xffc928, { emissive: 0x664400, emissiveIntensity: 0.4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.024, 18, 14), mat);
  head.scale.set(1.25, 0.9, 0.9);
  head.position.set(-0.012, 0.03, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.08, 8), mat);
  stem.position.set(0.012, 0.07, 0);
  const flag = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.014, 0.008, 2, 0.003), mat);
  flag.position.set(0.026, 0.103, 0);
  flag.rotation.z = -0.5;
  g.add(head, stem, flag);
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

function makeBone() {
  const g = new THREE.Group();
  const mat = m(0xd99a4e, { emissive: 0x3a2000, emissiveIntensity: 0.4 }); // marroncino: si vede bene sulle caselle bianche
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 10), mat);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  for (const x of [-0.035, 0.035]) {
    for (const y of [-0.009, 0.009]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), mat);
      k.position.set(x, y, 0);
      g.add(k);
    }
  }
  g.position.y = 0.04;
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

function makeStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.04 : 0.018;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
  geo.center();
  const star = new THREE.Mesh(geo, m(0xffd23f, { emissive: 0x775500, emissiveIntensity: 0.5 }));
  star.position.y = 0.055;
  const g = new THREE.Group();
  g.add(star);
  return g;
}

export class Board {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.position.set(0, TABLE_TOP, BOARD_Z);
    parent.add(this.group);
    this.content = new THREE.Group();
    this.group.add(this.content);
    this.goalObj = null;
    this.level = null;
    this.cell = 0.16;
  }

  clear() {
    for (const c of [...this.content.children]) {
      this.content.remove(c);
      disposeTree(c);
    }
    this.goalObj = null;
    this.goalRing = null;
  }

  // goalKind: 'note' | 'bone' | 'star' | null
  build(level, goalKind) {
    this.clear();
    this.level = level;
    const [W, H] = level.size;
    this.W = W;
    this.H = H;
    this.cell = Math.min(CELL_MAX, BOARD_MAX / Math.max(W, H));
    const cs = this.cell;
    this.walls = new Set((level.walls || []).map(([x, z]) => `${x},${z}`));
    this.colors = new Map((level.colors || []).map(([x, z, c]) => [`${x},${z}`, c]));

    // Base del tabellone
    const base = new THREE.Mesh(new RoundedBoxGeometry(W * cs + 0.04, 0.014, H * cs + 0.04, 2, 0.006), m(0x6a4fd8));
    base.position.y = 0.007;
    this.content.add(base);

    const tileGeo = new RoundedBoxGeometry(cs * 0.92, 0.01, cs * 0.92, 2, 0.004);
    const light = m(0xffffff);
    const alt = m(0xe9f3ff);
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < H; z++) {
        const key = `${x},${z}`;
        const color = this.colors.get(key);
        const tile = new THREE.Mesh(tileGeo, color ? m(TILE_COLORS[color]) : (x + z) % 2 ? alt : light);
        const p = this.cellPos(x, z);
        tile.position.set(p.x, 0.016, p.z);
        this.content.add(tile);
        if (this.walls.has(key)) {
          const block = new THREE.Mesh(
            new RoundedBoxGeometry(cs * 0.78, cs * 0.6, cs * 0.78, 3, cs * 0.12),
            m([0xff7eb6, 0x7ee0ff, 0xb08cff, 0xffb35c][(x * 3 + z) % 4])
          );
          block.position.set(p.x, 0.021 + cs * 0.3, p.z);
          this.content.add(block);
        }
      }
    }

    if (goalKind && level.goal) {
      const g = goalKind === 'note' ? makeNote() : goalKind === 'bone' ? makeBone() : makeStar();
      const p = this.cellPos(level.goal.x, level.goal.z);
      g.position.set(p.x, 0.021, p.z);
      g.scale.setScalar(cs / 0.16);
      this.content.add(g);
      this.goalObj = g;
      // Anello luminoso sotto l'obiettivo
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cs * 0.3, cs * 0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.023, p.z);
      this.content.add(ring);
      this.goalRing = ring;
    }
  }

  cellPos(x, z) {
    return new THREE.Vector3((x - (this.W - 1) / 2) * this.cell, 0.021, (z - (this.H - 1) / 2) * this.cell);
  }

  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.H; }
  isWall(x, z) { return this.walls.has(`${x},${z}`); }
  colorAt(x, z) { return this.colors.get(`${x},${z}`) || null; }
  isGoal(x, z) { return this.level.goal && this.level.goal.x === x && this.level.goal.z === z; }

  robotScale() { return this.cell / 0.16; }

  async collectGoal() {
    if (!this.goalObj) return;
    const g = this.goalObj;
    const s0 = g.scale.x;
    await animate(0.5, (t) => {
      g.scale.setScalar(s0 * (1 + t * 0.6));
      g.position.y = 0.021 + t * 0.12;
    });
    await animate(0.25, (t) => g.scale.setScalar(s0 * 1.6 * (1 - t) + 0.0001));
    g.visible = false;
  }

  resetGoal() {
    if (!this.goalObj) return;
    const p = this.cellPos(this.level.goal.x, this.level.goal.z);
    this.goalObj.visible = true;
    this.goalObj.position.set(p.x, 0.021, p.z);
    this.goalObj.scale.setScalar(this.cell / 0.16);
  }

  update(dt, time) {
    if (this.goalObj && this.goalObj.visible && this.goalObj.position.y < 0.03) {
      this.goalObj.children[0].rotation.y = time * 1.5;
      this.goalObj.children[0].position.y = (this.goalObj.children[0].userData.baseY ??= this.goalObj.children[0].position.y) + Math.sin(time * 3) * 0.008;
    }
    if (this.goalRing) {
      const s = 1 + Math.sin(time * 4) * 0.08;
      this.goalRing.scale.set(s, s, s);
    }
  }
}
