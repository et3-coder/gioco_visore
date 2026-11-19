// Vestiti e colori per i robot del laboratorio (Binot, Galaxine).
// I cappelli, gli occhiali e il papillon sono gli stessi del gioco "I tre amici robot" (../js/game/wardrobe.js),
// ingranditi per queste teste più grandi. Il mantello è fatto qui.
// Le scelte restano salvate nel browser, una per ogni robot.
import * as THREE from 'three';
import { makeItem } from '../js/game/wardrobe.js';

export const HATS = ['', 'tophat', 'crown', 'party', 'bow'];
export const HAT_NAMES = { '': 'Nessuno', tophat: 'Cilindro', crown: 'Corona', party: 'Cappellino', bow: 'Fiocco' };
export const CAPES = ['', 'red', 'blue', 'purple', 'gold'];
export const CAPE_NAMES = { '': 'Nessuno', red: 'Rosso', blue: 'Blu', purple: 'Viola', gold: 'Oro' };
const CAPE_COLORS = { red: 0xe53950, blue: 0x3d6dff, purple: 0x8e44ff, gold: 0xffc928 };
// il primo colore (null) = colore originale del robot
export const BODY_COLORS = [null, '#ffffff', '#ffd6e7', '#c9f2ff', '#d8ffcc', '#fff3b0', '#e0d0ff', '#4a4f5c'];
export const ACCENT_COLORS = [null, '#ff5d5d', '#ffb020', '#2fbf71', '#4d8dff', '#9b5cff', '#ff5fa8', '#00c2c7'];
const DEFAULT = { hat: '', glasses: false, bowtie: false, cape: '', body: 0, accent: 0 };

function makeCape(id, s) {
  const geo = new THREE.PlaneGeometry(s.w, s.h, 8, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const t = (s.h / 2 - y) / s.h; // 0 in alto, 1 in fondo
    pos.setXYZ(i, x * (1 + t * 0.4), -t * s.h, -Math.pow(t, 1.4) * 0.05 - Math.cos((x / s.w) * Math.PI) * 0.025);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: CAPE_COLORS[id], side: THREE.DoubleSide, roughness: 0.55 });
  const cape = new THREE.Mesh(geo, mat);
  cape.castShadow = true;
  const g = new THREE.Group();
  g.add(cape);
  // bottoni dorati sulle spalle
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffc928, metalness: 0.6, roughness: 0.3 }));
    b.position.set(sx * s.w * 0.42, -0.01, 0.015);
    g.add(b);
  }
  g.userData.isCape = true;
  return g;
}

// cfg: { hat, glasses, neck, cape: {parent, pos, scale | w,h}, colors: { body: [hex], accent: [hex] } }
export function setupLook(robot, cfg, name) {
  const KEY = 'robotlab-look-' + name.toLowerCase();
  let state = { ...DEFAULT };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* niente */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* niente */ } };

  // materiali da ricolorare, riconosciuti dal loro colore originale
  const groups = { body: new Set(), accent: new Set() };
  robot.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.color || m.isMeshBasicMaterial) continue;
      if (m.userData.origHex === undefined) m.userData.origHex = m.color.getHex();
      if (cfg.colors.body.includes(m.userData.origHex)) groups.body.add(m);
      if (cfg.colors.accent.includes(m.userData.origHex)) groups.accent.add(m);
    }
  });
  const colorize = (set, c) => { for (const m of set) m.color.set(c ?? m.userData.origHex); };

  const worn = {};
  function setItem(slot, id) {
    if (worn[slot]) { worn[slot].parent?.remove(worn[slot]); worn[slot] = null; }
    if (!id) return;
    const s = cfg[slot];
    const parent = robot[s.parent];
    if (!parent) return;
    let obj;
    if (slot === 'cape') {
      obj = makeCape(id, s);
      obj.position.set(...s.pos);
    } else {
      obj = makeItem(id);
      const off = obj.userData.slotOffset || [0, 0, 0];
      const rot = obj.userData.slotRot || [0, 0, 0];
      obj.position.set(s.pos[0] + off[0] * s.scale, s.pos[1] + off[1] * s.scale, s.pos[2] + off[2] * s.scale);
      obj.rotation.set(rot[0], rot[1], rot[2] + (id === 'party' ? -0.18 : 0));
      obj.scale.setScalar(s.scale);
    }
    obj.traverse((m) => { if (m.isMesh && m.material.visible !== false) m.castShadow = true; });
    parent.add(obj);
    worn[slot] = obj;
  }

  function apply() {
    setItem('hat', state.hat);
    setItem('glasses', state.glasses ? 'glasses' : '');
    setItem('neck', state.bowtie ? 'bowtie' : '');
    setItem('cape', state.cape);
    colorize(groups.body, BODY_COLORS[state.body]);
    colorize(groups.accent, ACCENT_COLORS[state.accent]);
    save();
  }

  const next = (list, cur) => list[(list.indexOf(cur) + 1) % list.length];
  const api = {
    get state() { return state; },
    origColor: { body: '#' + new THREE.Color(cfg.colors.body[0]).getHexString(), accent: '#' + new THREE.Color(cfg.colors.accent[0]).getHexString() },
    set(k, v) { state[k] = v; apply(); },
    // per i pulsanti del visore: passa all'opzione successiva
    cycle(k) {
      if (k === 'hat') state.hat = next(HATS, state.hat);
      else if (k === 'cape') state.cape = next(CAPES, state.cape);
      else if (k === 'glasses' || k === 'bowtie') state[k] = !state[k];
      else if (k === 'body') state.body = (state.body + 1) % BODY_COLORS.length;
      else if (k === 'accent') state.accent = (state.accent + 1) % ACCENT_COLORS.length;
      apply();
    },
    reset() { state = { ...DEFAULT }; apply(); },
    // il mantello ondeggia (di più quando il robot vola o viene lanciato)
    update(now, swing = 0) {
      if (worn.cape) worn.cape.rotation.x = 0.12 + Math.sin(now * 1.8) * 0.05 + swing * 0.5;
    },
  };
  apply();
  return api;
}
