// Elementi dell'interfaccia 3D: pannelli, pulsanti, etichette, e il sistema di puntamento
// (mouse sul PC, raggio laser dei controller nel visore).
import * as THREE from 'three';
import { makeCanvas, texFromCanvas, roundRect, drawTextBlock } from '../util/text.js';
import { sfx } from '../audio.js';

const PX_PER_M = 520;

function canvasFor(w, h) {
  const cw = Math.min(1024, Math.round(w * PX_PER_M));
  const ch = Math.min(1024, Math.round(h * PX_PER_M));
  return makeCanvas(Math.max(32, cw), Math.max(32, ch));
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map && !m.map.userData.shared) m.map.dispose();
        m.dispose();
      }
    }
  });
}

// Pannello piatto disegnato con una funzione canvas personalizzata.
export function makePanel(w, h, draw) {
  const canvas = canvasFor(w, h);
  const ctx = canvas.getContext('2d');
  const tex = texFromCanvas(canvas);
  // depthWrite: false evita che i pannelli trasparenti "buchino" quelli dietro
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.redraw = (...args) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(ctx, canvas.width, canvas.height, ...args);
    tex.needsUpdate = true;
  };
  mesh.userData.redraw();
  return mesh;
}

export function makeLabel(w, h, text, { size = 60, color = '#253046', bg = null, align = 'center', weight = 'bold', radius = 30 } = {}) {
  const mesh = makePanel(w, h, (ctx, cw, ch, t = text) => {
    if (bg) {
      ctx.fillStyle = bg;
      roundRect(ctx, 0, 0, cw, ch, radius);
      ctx.fill();
    }
    const pad = bg ? ch * 0.12 : 0;
    drawTextBlock(ctx, t, { x: pad + 6, y: pad, w: cw - pad * 2 - 12, h: ch - pad * 2, size, color, align, weight });
  });
  mesh.userData.setText = (t) => mesh.userData.redraw(t);
  return mesh;
}

// Pulsante: rettangolo colorato con testo. onClick viene chiamato al click/grilletto.
export function makeButton(w, h, text, onClick, { color = '#5a3fd6', textColor = '#ffffff', size = 64, icon = null } = {}) {
  let state = { text, color, enabled: true };
  const mesh = makePanel(w, h, (ctx, cw, ch) => {
    const r = Math.min(cw, ch) * 0.28;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, 4, 10, cw - 8, ch - 12, r);
    ctx.fill();
    ctx.fillStyle = state.enabled ? state.color : '#b9bfcc';
    roundRect(ctx, 4, 2, cw - 8, ch - 12, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, 14, 8, cw - 28, (ch - 12) * 0.42, r * 0.8);
    ctx.fill();
    let tx = 10;
    if (icon) {
      icon(ctx, ch * 0.5, (ch - 10) / 2, ch * 0.3);
      tx = ch * 0.85;
    }
    drawTextBlock(ctx, state.text, { x: tx, y: 4, w: cw - tx - 14, h: ch - 18, size, color: textColor });
  });
  mesh.userData.onClick = () => {
    if (!state.enabled) return;
    sfx.click();
    onClick(mesh);
  };
  mesh.userData.hoverable = true;
  mesh.userData.setText = (t) => { state.text = t; mesh.userData.redraw(); };
  mesh.userData.setColor = (c) => { state.color = c; mesh.userData.redraw(); };
  mesh.userData.setEnabled = (e) => { state.enabled = e; mesh.userData.redraw(); };
  mesh.userData.isEnabled = () => state.enabled;
  return mesh;
}

// ---------- Schermo principale (lavagna dietro al tavolo) ----------
export class Screen {
  constructor(parent, w = 2.3, h = 1.08) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.w = w;
    this.h = h;
    const bg = makePanel(w, h, (ctx, cw, ch) => {
      ctx.fillStyle = 'rgba(40, 30, 90, 0.25)';
      roundRect(ctx, 6, 14, cw - 12, ch - 16, 60);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      roundRect(ctx, 6, 4, cw - 12, ch - 16, 60);
      ctx.fill();
      ctx.strokeStyle = '#ffcf5c';
      ctx.lineWidth = 14;
      roundRect(ctx, 14, 12, cw - 28, ch - 32, 52);
      ctx.stroke();
    });
    bg.position.z = -0.01;
    this.group.add(bg);
    // Cornice 3D dietro il pannello
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.04, h + 0.02, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x7a5cff, roughness: 0.6 })
    );
    frame.position.z = -0.035;
    this.group.add(frame);
    this.content = new THREE.Group();
    this.group.add(this.content);
  }

  clear() {
    for (const c of [...this.content.children]) {
      this.content.remove(c);
      disposeTree(c);
    }
  }

  add(mesh, x, y, z = 0.002) {
    mesh.position.set(x, y, z);
    // Disegna sempre il contenuto DOPO lo sfondo dello schermo
    mesh.traverse((o) => { o.renderOrder = Math.max(o.renderOrder, 1); });
    this.content.add(mesh);
    return mesh;
  }
}

// ---------- Puntatori (mouse + controller XR) ----------
const tmpMat = new THREE.Matrix4();

function isVisible(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function findClickable(o) {
  while (o) {
    if (o.userData && o.userData.onClick) return o;
    o = o.parent;
  }
  return null;
}

export class Pointers {
  constructor(renderer, camera, scene, roots) {
    this.renderer = renderer;
    this.camera = camera;
    this.roots = roots; // gruppi in cui cercare oggetti cliccabili
    this.mouse = { raycaster: new THREE.Raycaster(), ndc: new THREE.Vector2(), active: false, hovered: null };
    this.controllers = [];
    this.onMissSelect = null;

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', (e) => {
      this.mouse.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.mouse.active = true;
    });
    dom.addEventListener('pointerdown', (e) => {
      sfx.unlock();
      this.mouse.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.mouse.active = true;
      this.mouse.raycaster.setFromCamera(this.mouse.ndc, this.camera);
      const hit = this.pick(this.mouse.raycaster);
      if (hit) hit.userData.onClick();
    });

    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      line.scale.z = 3;
      c.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      dot.visible = false;
      scene.add(dot);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7a5cff }));
      c.add(tip);
      const entry = { controller: c, line, dot, raycaster: new THREE.Raycaster(), hovered: null, source: null };
      c.addEventListener('connected', (e) => { entry.source = e.data; });
      c.addEventListener('disconnected', () => { entry.source = null; });
      c.addEventListener('selectstart', () => {
        sfx.unlock();
        if (entry.hovered) {
          this.haptic(entry);
          entry.hovered.userData.onClick();
        } else if (this.onMissSelect) {
          // grilletto premuto senza puntare un pulsante (usato per posizionare il gioco in realtà mista)
          this.haptic(entry);
          this.onMissSelect(entry);
        }
      });
      scene.add(c);
      this.controllers.push(entry);
    }
  }

  haptic(entry) {
    try {
      const h = entry.source && entry.source.gamepad && entry.source.gamepad.hapticActuators;
      if (h && h[0]) h[0].pulse(0.4, 40);
    } catch (e) { /* niente vibrazione */ }
  }

  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.roots, true);
    for (const h of hits) {
      if (!isVisible(h.object)) continue;
      const c = findClickable(h.object);
      if (c) return c;
    }
    return null;
  }

  pickWithDistance(raycaster) {
    const hits = raycaster.intersectObjects(this.roots, true);
    for (const h of hits) {
      if (!isVisible(h.object)) continue;
      const c = findClickable(h.object);
      if (c) return { obj: c, point: h.point, distance: h.distance };
    }
    return null;
  }

  update() {
    const hoveredNow = new Set();
    const presenting = this.renderer.xr.isPresenting;
    if (presenting) {
      for (const e of this.controllers) {
        tmpMat.identity().extractRotation(e.controller.matrixWorld);
        e.raycaster.ray.origin.setFromMatrixPosition(e.controller.matrixWorld);
        e.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
        const res = e.source ? this.pickWithDistance(e.raycaster) : null;
        e.hovered = res ? res.obj : null;
        e.line.scale.z = res ? res.distance : 3;
        e.dot.visible = !!res;
        if (res) e.dot.position.copy(res.point);
        if (e.hovered) hoveredNow.add(e.hovered);
      }
    } else if (this.mouse.active) {
      this.mouse.raycaster.setFromCamera(this.mouse.ndc, this.camera);
      this.mouse.hovered = this.pick(this.mouse.raycaster);
      if (this.mouse.hovered) hoveredNow.add(this.mouse.hovered);
      this.renderer.domElement.style.cursor = this.mouse.hovered ? 'pointer' : 'default';
    }
    // Effetto "ingrandimento" sugli oggetti puntati
    for (const root of this.roots) {
      root.traverse((o) => {
        if (!o.userData.hoverable) return;
        const enabled = !o.userData.isEnabled || o.userData.isEnabled();
        const target = hoveredNow.has(o) && enabled ? 1.08 : 1;
        const base = o.userData.baseScale || 1;
        const s = o.scale.x / base + (target - o.scale.x / base) * 0.3;
        o.scale.setScalar(s * base);
      });
    }
  }
}
