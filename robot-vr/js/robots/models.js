// Modelli 3D realistici (.glb) dei robot.
// Metti i file nella cartella robot-vr/models/ con questi nomi: emo.glb, loona.glb, aibi.glb.
// Se un file manca, il gioco usa il modello semplice disegnato nel codice.
//
// Valori regolabili per ogni robot (in metri, misure "reali" del robot):
//   height  altezza totale del robot: il modello viene ridimensionato a questa altezza
//   rotY    rotazione (radianti) per farlo guardare verso di noi: prova 0, Math.PI, Math.PI/2, -Math.PI/2
//   face    dove sovrapporre lo schermo con gli occhi animati
//           y/z = altezza e sporgenza del centro dello schermo, w/h = larghezza/altezza,
//           shape = forma dello schermo, curve = raggio di curvatura (0 = piatto), tilt = inclinazione
//           hide: true per NON sovrapporre gli occhi animati (si vedono quelli del modello)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const MODEL_CONFIG = {
  emo: {
    file: 'models/emo.glb',
    height: 0.13,
    rotY: 0,
    face: { y: 0.093, z: 0.036, w: 0.054, h: 0.05, shape: { type: 'rounded', r: 0.22 }, curve: 0, tilt: 0 },
  },
  loona: {
    file: 'models/loona.glb',
    height: 0.13,
    rotY: 0,
    face: { y: 0.098, z: 0.045, w: 0.062, h: 0.07, shape: { type: 'ellipse' }, curve: 0.06, tilt: -0.1 },
  },
  aibi: {
    file: 'models/aibi.glb',
    height: 0.105,
    rotY: 0,
    face: { y: 0.08, z: 0.027, w: 0.05, h: 0.032, shape: { type: 'rounded', r: 0.25 }, curve: 0, tilt: 0 },
  },
};

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
loader.setDRACOLoader(draco);
loader.setMeshoptDecoder(MeshoptDecoder);

// Controlla se il file esiste (senza riempire la console di errori se manca)
async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return r.ok;
  } catch (e) {
    return false;
  }
}

// Prova a caricare il modello realistico per ogni robot; restituisce l'elenco di quelli caricati.
export async function loadRobotModels(robots) {
  const loaded = [];
  await Promise.all(Object.entries(MODEL_CONFIG).map(async ([key, cfg]) => {
    if (!(await exists(cfg.file))) return;
    try {
      const gltf = await loader.loadAsync(cfg.file);
      robots[key].useModel(gltf.scene, cfg);
      loaded.push(key);
    } catch (e) {
      console.warn(`Modello ${cfg.file} non caricato:`, e);
    }
  }));
  return loaded;
}

// Ridimensiona il modello all'altezza voluta, lo centra e lo appoggia a terra (y = 0).
export function normalizeModel(scene, cfg) {
  const wrap = new THREE.Group();
  scene.rotation.y = cfg.rotY || 0;
  wrap.add(scene);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = box.getSize(new THREE.Vector3());
  const s = cfg.height / (size.y || 1);
  scene.scale.multiplyScalar(s);
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y;
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      // i modelli generati a volte hanno materiali troppo "opachi": un po' di lucido come la plastica vera
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.isMeshStandardMaterial && m.roughness > 0.6) m.roughness = 0.45;
      }
    }
  });
  return wrap;
}
