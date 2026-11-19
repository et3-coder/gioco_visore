// Coriandoli per festeggiare.
import * as THREE from 'three';

const COLORS = [0xff5d5d, 0xffd23f, 0x4d8dff, 0x2fbf71, 0xb08cff, 0xff8ad8];
const bursts = [];
const geo = new THREE.PlaneGeometry(0.014, 0.022);
const mats = COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));

export function confetti(parent, position, count = 70, spread = 1) {
  const group = new THREE.Group();
  group.position.copy(position);
  parent.add(group);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mats[i % mats.length]);
    const a = Math.random() * Math.PI * 2;
    const sp = (0.3 + Math.random() * 0.6) * spread;
    p.userData.v = new THREE.Vector3(Math.cos(a) * sp * 0.5, 0.9 + Math.random() * 0.9, Math.sin(a) * sp * 0.5);
    p.userData.spin = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    group.add(p);
    parts.push(p);
  }
  bursts.push({ group, parts, life: 2.6, parent });
}

export function updateEffects(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life -= dt;
    for (const p of b.parts) {
      const v = p.userData.v;
      v.y -= 2.2 * dt;
      v.multiplyScalar(0.985);
      p.position.addScaledVector(v, dt);
      p.rotation.x += p.userData.spin.x * dt;
      p.rotation.y += p.userData.spin.y * dt;
      p.rotation.z += p.userData.spin.z * dt;
    }
    if (b.life <= 0) {
      b.parent.remove(b.group);
      bursts.splice(i, 1);
    }
  }
}

// ---------------- Cuoricini (quando si accarezza un robot) ----------------
let heartTex = null;
function getHeartTex() {
  if (heartTex) return heartTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff4f8b';
  ctx.beginPath();
  ctx.moveTo(32, 56);
  ctx.bezierCurveTo(-8, 30, 12, 0, 32, 18);
  ctx.bezierCurveTo(52, 0, 72, 30, 32, 56);
  ctx.fill();
  heartTex = new THREE.CanvasTexture(c);
  heartTex.colorSpace = THREE.SRGBColorSpace;
  return heartTex;
}
const hearts = [];

export function heartsAt(parent, position, count = 5) {
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getHeartTex(), transparent: true, depthWrite: false }));
    s.scale.setScalar(0.03 + Math.random() * 0.02);
    s.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.03, (Math.random() - 0.5) * 0.08));
    s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.18 + Math.random() * 0.12, (Math.random() - 0.5) * 0.08);
    s.userData.life = 1.2 + Math.random() * 0.4;
    s.userData.max = s.userData.life;
    s.userData.parent = parent;
    parent.add(s);
    hearts.push(s);
  }
}

export function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i];
    s.userData.life -= dt;
    s.position.addScaledVector(s.userData.v, dt);
    s.material.opacity = Math.max(0, s.userData.life / s.userData.max);
    if (s.userData.life <= 0) {
      s.userData.parent.remove(s);
      s.material.dispose();
      hearts.splice(i, 1);
    }
  }
}