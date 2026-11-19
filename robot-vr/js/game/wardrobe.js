// Il guardaroba dei robot: accessori 3D (cappelli, occhiali, papillon...) e dove si agganciano su ogni robot.
// Le misure sono in "unità robot" (metri del robot a grandezza 1): sul robot l'accessorio è figlio della testa,
// così segue tutti i movimenti (testa che si inclina, balli...).
import * as THREE from 'three';

export const ITEMS = [
  { id: 'tophat', slot: 'head', name: 'il cilindro' },
  { id: 'crown', slot: 'head', name: 'la corona' },
  { id: 'party', slot: 'head', name: 'il cappellino da festa' },
  { id: 'bow', slot: 'head', name: 'il fiocco' },
  { id: 'glasses', slot: 'face', name: 'gli occhiali' },
  { id: 'bowtie', slot: 'neck', name: 'il papillon' },
];

// Punti di aggancio nella testa di ogni robot: p = posizione, s = grandezza (le teste sono diverse)
export const SLOTS = {
  emo: {
    head: { p: [0, 0.089, 0], s: 1.15 },
    face: { p: [0.0014, 0.038, 0.0375], s: 1.2 },
    neck: { p: [0, 0.004, 0.037], s: 1.1 },
  },
  loona: {
    head: { p: [0, 0.065, -0.004], s: 0.9 },
    face: { p: [0, 0.035, 0.031], s: 1.0 },
    neck: { p: [0, -0.004, 0.024], s: 0.95 },
  },
  aibi: {
    head: { p: [0, 0.047, 0.004], s: 0.85 },
    face: { p: [0, 0.021, 0.0295], s: 0.95 },
    neck: { p: [0, -0.004, 0.024], s: 0.8 },
  },
};

function m(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...opts });
}

// Ogni accessorio ha l'origine nel punto di aggancio (base del cappello, centro degli occhiali, nodo del papillon)
export function makeItem(id) {
  const g = new THREE.Group();
  if (id === 'tophat') {
    const black = m(0x1b1b22, { roughness: 0.6 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 32), black);
    brim.position.y = 0.0015;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.021, 0.036, 32), black);
    crown.position.y = 0.02;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0213, 0.0213, 0.007, 32), m(0xe53950));
    band.position.y = 0.0075;
    g.add(brim, crown, band);
  } else if (id === 'crown') {
    const gold = m(0xffc928, { metalness: 0.7, roughness: 0.25, emissive: 0x553300, emissiveIntensity: 0.3 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 32, 1, true), gold);
    ring.material.side = THREE.DoubleSide;
    ring.position.y = 0.007;
    g.add(ring);
    const gems = [0xe53950, 0x4d8dff, 0x2fbf71, 0x9b5cff, 0xff8ad8];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.016, 8), gold);
      spike.position.set(Math.sin(a) * 0.022, 0.021, Math.cos(a) * 0.022);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), gold);
      ball.position.set(Math.sin(a) * 0.022, 0.03, Math.cos(a) * 0.022);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), m(gems[i], { roughness: 0.1, emissive: gems[i], emissiveIntensity: 0.3 }));
      gem.position.set(Math.sin(a) * 0.0245, 0.007, Math.cos(a) * 0.0245);
      g.add(spike, ball, gem);
    }
  } else if (id === 'party') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 24), m(0xff5fa8));
    cone.position.y = 0.025;
    g.add(cone);
    const ringColors = [0xffd23f, 0x4d8dff, 0x2fbf71];
    ringColors.forEach((c, i) => {
      const y = 0.01 + i * 0.012;
      const r = 0.02 * (1 - y / 0.05) + 0.0008;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0018, 6, 24), m(c));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    });
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 10), m(0xffd23f));
    pom.position.y = 0.051;
    g.add(pom);
    g.rotation.z = -0.18; // un po' storto, è più simpatico
  } else if (id === 'bow') {
    const pink = m(0xff6fb5);
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), pink);
      lobe.scale.set(1.3, 0.85, 0.5);
      lobe.position.set(s * 0.013, 0.008, 0);
      lobe.rotation.z = s * 0.25;
      g.add(lobe);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 10), m(0xff3f95));
    knot.position.y = 0.008;
    g.add(knot);
    g.position.x = 0; // il fiocco va un po' di lato: lo sposta l'aggancio
    g.userData.slotOffset = [0.016, -0.004, 0.006];
    g.userData.slotRot = [0, 0, -0.35];
  } else if (id === 'glasses') {
    const frame = m(0xff3f95, { roughness: 0.3 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x111122, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 });
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0115, 0.0022, 8, 28), frame);
      rim.position.x = s * 0.0155;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0112, 24), lensMat);
      lens.position.set(s * 0.0155, 0, 0.0004);
      g.add(rim, lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.009, 8), frame);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.y = 0.003;
    g.add(bridge);
  } else if (id === 'bowtie') {
    const red = m(0xe53950);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.017, 3), red);
      wing.rotation.z = s * Math.PI / 2;
      wing.position.x = s * 0.0095;
      wing.scale.z = 0.5;
      g.add(wing);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), m(0xb81f38));
    knot.scale.z = 0.7;
    g.add(knot);
    // pallini bianchi
    for (const [x, y] of [[-0.011, 0.002], [0.011, -0.002], [-0.007, -0.004], [0.007, 0.004]]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 6, 6), m(0xffffff));
      dot.position.set(x, y, 0.003);
      g.add(dot);
    }
  }
  // zona di presa invisibile un po' più grande (gli accessori sono piccoli e la corona è vuota al centro)
  const center = id === 'party' ? 0.022 : id === 'tophat' || id === 'crown' ? 0.016 : 0.004;
  const grip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  grip.position.y = center;
  g.add(grip);
  g.userData.itemId = id;
  return g;
}

// Aggancia l'accessorio alla testa del robot, nel posto giusto
export function wearOn(robotKey, robot, item) {
  const def = ITEMS.find((d) => d.id === item.id);
  const slot = SLOTS[robotKey][def.slot];
  const obj = item.obj;
  robot.head.add(obj);
  const off = obj.userData.slotOffset || [0, 0, 0];
  const rot = obj.userData.slotRot || [0, 0, 0];
  obj.position.set(slot.p[0] + off[0] * slot.s, slot.p[1] + off[1] * slot.s, slot.p[2] + off[2] * slot.s);
  obj.rotation.set(rot[0], rot[1], rot[2] + (item.id === 'party' ? -0.18 : 0));
  obj.scale.setScalar(slot.s);
}

export function slotOf(id) {
  return ITEMS.find((d) => d.id === id).slot;
}
