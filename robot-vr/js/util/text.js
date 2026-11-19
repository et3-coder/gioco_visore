// Utility per disegnare testi e icone su canvas e trasformarli in texture 3D.
import * as THREE from 'three';

export const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function texFromCanvas(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

// Disegna un testo che va a capo e si rimpicciolisce finché non entra nel riquadro.
export function drawTextBlock(ctx, text, { x, y, w, h, size = 48, minSize = 18, color = '#253046', weight = 'bold', align = 'center', lineGap = 1.2 }) {
  let s = size;
  let lines;
  for (;;) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    lines = wrapLines(ctx, text, w);
    if (lines.length * s * lineGap <= h || s <= minSize) break;
    s -= 2;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const total = lines.length * s * lineGap;
  let ly = y + (h - total) / 2 + (s * lineGap) / 2;
  const lx = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  for (const l of lines) {
    ctx.fillText(l, lx, ly);
    ly += s * lineGap;
  }
}

// ---------- Icone delle carte ----------
function arrowHead(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, -size * 0.85);
  ctx.lineTo(-size * 0.6, size * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawIcon(ctx, kind, cx, cy, s) {
  // s = dimensione di riferimento (circa metà larghezza dell'icona)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.28;
  if (kind === 'F') {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.lineTo(cx, cy - s * 0.2);
    ctx.stroke();
    arrowHead(ctx, cx, cy - s * 0.45, -Math.PI / 2, s * 0.55);
  } else if (kind === 'L' || kind === 'R') {
    const m = kind === 'L' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx - m * s * 0.35, cy + s * 0.9);
    ctx.lineTo(cx - m * s * 0.35, cy + s * 0.05);
    ctx.quadraticCurveTo(cx - m * s * 0.35, cy - s * 0.45, cx + m * s * 0.15, cy - s * 0.45);
    ctx.stroke();
    arrowHead(ctx, cx + m * s * 0.45, cy - s * 0.45, kind === 'L' ? Math.PI : 0, s * 0.5);
  } else if (kind === 'S') {
    // "dritto" nelle regole di Loona: freccia su più sottile
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.lineTo(cx, cy - s * 0.2);
    ctx.stroke();
    arrowHead(ctx, cx, cy - s * 0.45, -Math.PI / 2, s * 0.55);
  } else if (kind.startsWith('REP')) {
    const n = kind.slice(3);
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.72, -Math.PI * 0.35, Math.PI * 1.45);
    ctx.stroke();
    const a = -Math.PI * 0.35;
    arrowHead(ctx, cx + Math.cos(a) * s * 0.72, cy + Math.sin(a) * s * 0.72, a + Math.PI / 2, s * 0.36);
    ctx.font = `bold ${s * 0.85}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n, cx, cy + s * 0.05);
  } else if (kind === 'END') {
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy - s * 0.75);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.75);
    ctx.lineTo(cx + s * 0.25, cy + s * 0.75);
    ctx.lineTo(cx - s * 0.5, cy + s * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - s * 0.2, cy, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const CARD_INFO = {
  F: { color: '#2fbf71', label: 'avanti' },
  L: { color: '#4d8dff', label: 'sinistra' },
  R: { color: '#ff9234', label: 'destra' },
  S: { color: '#2fbf71', label: 'dritto' },
  REP2: { color: '#9b5cff', label: 'ripeti 2' },
  REP3: { color: '#9b5cff', label: 'ripeti 3' },
  REP4: { color: '#9b5cff', label: 'ripeti 4' },
  REP5: { color: '#9b5cff', label: 'ripeti 5' },
  END: { color: '#c08bff', label: 'fine ripeti' },
};

const cardTexCache = new Map();
export function cardTexture(kind) {
  if (cardTexCache.has(kind)) return cardTexCache.get(kind);
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const info = CARD_INFO[kind];
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, 10, 16, 236, 236, 40);
  ctx.fill();
  ctx.fillStyle = info.color;
  roundRect(ctx, 8, 6, 240, 236, 40);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 20, 16, 216, 90, 30);
  ctx.fill();
  drawIcon(ctx, kind, 128, 100, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.label, 128, 210);
  const t = texFromCanvas(c);
  t.userData.shared = true; // condivisa: non va eliminata quando si pulisce lo schermo
  cardTexCache.set(kind, t);
  return t;
}
