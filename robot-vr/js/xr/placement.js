// Realtà mista: il bambino punta il controller su un tavolo vero e preme il grilletto
// per appoggiarci sopra tabellone e robot (WebXR hit-test).
import * as THREE from 'three';
import { TABLE_TOP, BOARD_Z, BOARD_MAX } from '../game/board.js';
import { makeLabel } from '../ui/ui.js';
import { speak } from '../hints.js';
import { sfx } from '../audio.js';

const UP = new THREE.Vector3(0, 1, 0);
const FALLBACK_SECONDS = 8;

export class Placement {
  constructor(renderer, scene, world, onPlaced) {
    this.renderer = renderer;
    this.scene = scene;
    this.world = world;
    this.onPlaced = onPlaced;
    this.active = false;
    this.sources = new Map(); // inputSource -> XRHitTestSource
    this.hit = null; // ultimo punto valido (Vector3)
    this.everHit = false;

    // Mirino: anello + sagoma del tabellone
    this.reticle = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.08, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    const ghost = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_MAX, BOARD_MAX),
      new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    ghost.rotation.x = -Math.PI / 2;
    ghost.position.y = 0.002;
    this.reticle.add(ring, ghost);
    this.reticle.visible = false;
    scene.add(this.reticle);

    // Cartello con le istruzioni che segue lo sguardo
    this.sign = makeLabel(0.9, 0.22, '', { size: 56, color: '#ffffff', bg: 'rgba(90,63,214,0.92)', radius: 50 });
    this.sign.visible = false;
    this.sign.renderOrder = 5;
    scene.add(this.sign);
  }

  setSign(text) {
    this.sign.userData.setText(text);
    speak(text);
  }

  start() {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    this.active = true;
    this.hit = null;
    this.everHit = false;
    this.startTime = performance.now();
    this.world.visible = false;
    this.sign.visible = true;
    this.signPlaced = false;
    this.setSign('Punta il controller su un tavolo e premi il grilletto per mettere lì i robot!');
    if (!session.requestHitTestSource) return;
    for (const src of session.inputSources) this.addSource(session, src);
    if (!this.listening) {
      this.listening = true;
      session.addEventListener('inputsourceschange', (e) => {
        if (!this.active) return;
        for (const src of e.added) this.addSource(session, src);
      });
    }
  }

  async addSource(session, inputSource) {
    if (this.sources.has(inputSource) || !inputSource.targetRaySpace) return;
    try {
      const hs = await session.requestHitTestSource({ space: inputSource.targetRaySpace });
      if (this.active) this.sources.set(inputSource, hs);
      else hs.cancel();
    } catch (e) {
      /* hit-test non disponibile: si userà il ripiego */
    }
  }

  stop() {
    this.active = false;
    for (const hs of this.sources.values()) {
      try { hs.cancel(); } catch (e) { /* già chiusa */ }
    }
    this.sources.clear();
    this.reticle.visible = false;
    this.sign.visible = false;
    this.world.visible = true;
  }

  headPose() {
    const cam = this.renderer.xr.getCamera();
    const pos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(cam.matrixWorld));
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    return { pos, fwd };
  }

  update(frame) {
    if (!this.active || !frame) return;
    const ref = this.renderer.xr.getReferenceSpace();
    const { pos: head, fwd } = this.headPose();

    // Il cartello resta davanti al bambino, un po' in basso
    const target = head.clone().addScaledVector(fwd, 1.0);
    target.y = head.y - 0.15;
    if (!this.signPlaced) { this.sign.position.copy(target); this.signPlaced = true; }
    this.sign.position.lerp(target, 0.08);
    this.sign.lookAt(head);

    // Cerca un punto su una superficie orizzontale
    this.hit = null;
    for (const hs of this.sources.values()) {
      const results = frame.getHitTestResults(hs);
      if (!results.length) continue;
      const pose = results[0].getPose(ref);
      if (!pose) continue;
      const o = pose.transform.orientation;
      const normal = UP.clone().applyQuaternion(new THREE.Quaternion(o.x, o.y, o.z, o.w));
      if (normal.y < 0.8) continue; // non è un piano orizzontale (es. un muro)
      const p = pose.transform.position;
      this.hit = new THREE.Vector3(p.x, p.y, p.z);
      break;
    }
    if (this.hit) {
      this.everHit = true;
      this.reticle.visible = true;
      this.reticle.position.copy(this.hit);
      this.reticle.rotation.y = Math.atan2(head.x - this.hit.x, head.z - this.hit.z);
    } else {
      this.reticle.visible = false;
    }

    // Nessuna superficie trovata: tabellone fluttuante davanti al bambino
    if (!this.everHit && (performance.now() - this.startTime) / 1000 > FALLBACK_SECONDS) {
      this.fallback();
    }
  }

  // Grilletto premuto senza puntare l'interfaccia
  onSelect() {
    if (!this.active) return;
    if (this.hit) {
      const { pos: head } = this.headPose();
      this.placeWorld(this.hit, head);
    } else if (this.sources.size === 0) {
      this.fallback();
    }
  }

  fallback() {
    const { pos: head, fwd } = this.headPose();
    const p = head.clone().addScaledVector(fwd, 0.75);
    p.y = head.y - 0.45;
    this.placeWorld(p, head, 'Non trovo un tavolo, allora metto i robot qui davanti! Per usare un tavolo vero, fai la configurazione della stanza nelle impostazioni del visore.');
  }

  placeWorld(point, head, msg = null) {
    const yaw = Math.atan2(head.x - point.x, head.z - point.z);
    this.world.rotation.set(0, yaw, 0);
    const offset = new THREE.Vector3(0, TABLE_TOP, BOARD_Z).applyAxisAngle(UP, yaw);
    this.world.position.copy(point).sub(offset);
    sfx.place();
    this.stop();
    this.onPlaced(msg);
  }
}
