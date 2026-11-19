// Faccia-schermo animata dei robot (occhi luminosi disegnati su canvas).
import * as THREE from 'three';
import { makeCanvas, texFromCanvas, roundRect } from '../util/text.js';

export class Face {
  // gradient: [coloreSinistra, coloreDestra] per occhi sfumati (Loona); round: 0..1 quanto sono arrotondati gli occhi
  // eyeY: altezza degli occhi (0 = in alto, 1 = in basso). shape: forma dello schermo ({type:'rounded', r}, {type:'ellipse'},
  // {type:'none'} = solo occhi su sfondo trasparente, per schermi curvi)
  constructor({ w = 256, h = 160, eyeColor = '#4ff3ff', bg = '#070a14', eyeW = 0.2, eyeH = 0.46, gap = 0.36, gradient = null, round = 0.35, eyeY = 0.5, shape = null } = {}) {
    this.gradient = gradient;
    this.round = round;
    this.eyeY = eyeY;
    this.shape = shape;
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.texture = texFromCanvas(this.canvas);
    this.eyeColor = eyeColor;
    this.bg = bg;
    this.eyeW = eyeW;
    this.eyeH = eyeH;
    this.gap = gap;
    this.expr = 'normal';
    this.holdTimer = 0;
    this.blinkTimer = 2 + Math.random() * 3;
    this.blinking = 0;
    this.lookX = 0;
    this.lookTimer = 1.5;
    this.dirty = true;
    this.lastKey = '';
  }

  set(expr, holdSeconds = 0) {
    this.expr = expr;
    this.holdTimer = holdSeconds;
    this.dirty = true;
  }

  update(dt) {
    if (this.holdTimer > 0) {
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) this.expr = 'normal';
    }
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = 0.13;
      this.blinkTimer = 2 + Math.random() * 3.5;
    }
    if (this.blinking > 0) this.blinking -= dt;
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookX = [0, 0, -1, 1][Math.floor(Math.random() * 4)];
      this.lookTimer = 1.5 + Math.random() * 2.5;
    }
    const showExpr = this.blinking > 0 && (this.expr === 'normal' || this.expr === 'surprised') ? 'blink' : this.expr;
    const key = showExpr + (showExpr === 'normal' ? this.lookX : '');
    if (key !== this.lastKey || this.dirty) {
      this.draw(showExpr);
      this.lastKey = key;
      this.dirty = false;
    }
  }

  draw(expr) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = this.bg;
    if (this.shape) {
      // Sfondo con la forma dello schermo del modello 3D (angoli trasparenti)
      ctx.clearRect(0, 0, W, H);
      if (this.shape.type !== 'none') {
        ctx.beginPath();
        if (this.shape.type === 'ellipse') ctx.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
        else roundRect(ctx, 0, 0, W, H, Math.min(W, H) * (this.shape.r ?? 0.25));
        ctx.fill();
      }
    } else {
      ctx.fillRect(0, 0, W, H);
    }
    const ew = W * this.eyeW, eh = H * this.eyeH;
    const cy = H * this.eyeY;
    const off = expr === 'normal' ? this.lookX * W * 0.06 : 0;
    const xs = [W * (0.5 - this.gap / 2) + off, W * (0.5 + this.gap / 2) + off];
    ctx.fillStyle = this.eyeColor;
    ctx.strokeStyle = this.eyeColor;
    ctx.shadowColor = this.eyeColor;
    ctx.shadowBlur = W * 0.05;
    ctx.lineCap = 'round';
    ctx.lineWidth = ew * 0.32;

    const eyeRect = (x, w, h, y = cy) => {
      if (this.gradient) {
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, this.gradient[0]);
        g.addColorStop(0.55, this.gradient[0]);
        g.addColorStop(1, this.gradient[1]);
        ctx.fillStyle = g;
      }
      roundRect(ctx, x - w / 2, y - h / 2, w, h, Math.min(w, h) * this.round);
      ctx.fill();
    };

    switch (expr) {
      case 'blink':
        for (const x of xs) { ctx.beginPath(); ctx.moveTo(x - ew / 2, cy); ctx.lineTo(x + ew / 2, cy); ctx.stroke(); }
        break;
      case 'happy':
        for (const x of xs) { ctx.beginPath(); ctx.arc(x, cy + eh * 0.15, ew * 0.48, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
        break;
      case 'love':
        for (const x of xs) this.heart(x, cy, ew * 0.62);
        break;
      case 'sad':
        for (let i = 0; i < 2; i++) {
          eyeRect(xs[i], ew, eh * 0.75, cy + eh * 0.1);
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.fillStyle = this.bg;
          if (this.shape && this.shape.type === 'none') ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          const x = xs[i], m = i === 0 ? 1 : -1;
          ctx.moveTo(x - ew, cy - eh * 0.6);
          ctx.lineTo(x + ew, cy - eh * 0.6);
          ctx.lineTo(x + m * ew, cy - eh * 0.05);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        break;
      case 'confused':
        eyeRect(xs[0], ew * 0.85, eh * 0.85);
        ctx.beginPath(); ctx.moveTo(xs[1] - ew / 2, cy + eh * 0.05); ctx.lineTo(xs[1] + ew / 2, cy - eh * 0.12); ctx.stroke();
        ctx.font = `bold ${H * 0.32}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', W * 0.5, H * 0.24);
        break;
      case 'surprised':
        for (const x of xs) { ctx.beginPath(); ctx.arc(x, cy, ew * 0.55, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'focus':
        for (const x of xs) eyeRect(x, ew, eh * 0.45);
        break;
      default:
        for (const x of xs) eyeRect(x, ew, eh);
    }
    ctx.shadowBlur = 0;
    this.texture.needsUpdate = true;
    if (this.onDraw) this.onDraw(); // usato dalle mesh-foto per ricopiare gli occhi sulla texture
  }

  heart(x, y, s) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.6);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.1, x - s * 0.5, y - s * 0.9, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s * 1.1, y - s * 0.1, x, y + s * 0.6);
    ctx.fill();
  }

  makeMesh(w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.texture }));
    return m;
  }

  // Occhi su uno schermo curvo a forma di calotta d'ellissoide (Loona). rx, ry, rz = semiassi; a, b = ampiezza (radianti)
  makeCap(rx, ry, rz, a, b) {
    const geo = new THREE.SphereGeometry(1, 40, 24, Math.PI / 2 - a, 2 * a, Math.PI / 2 - b, 2 * b);
    geo.scale(rx, ry, rz);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }));
  }

  // Schermo per i modelli .glb: forma dello schermo + leggera curvatura (curve = raggio in metri, 0 = piatto)
  makeOverlay(w, h, shape, curve = 0) {
    this.shape = shape;
    this.dirty = true;
    let geo;
    if (curve > 0) {
      const angle = w / curve;
      geo = new THREE.CylinderGeometry(curve, curve, h, 32, 1, true, -angle / 2, angle);
      geo.translate(0, 0, -curve); // il centro dello schermo resta nell'origine
    } else {
      geo = new THREE.PlaneGeometry(w, h);
    }
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 }));
  }
}
