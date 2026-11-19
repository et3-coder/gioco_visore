// Piccole icone disegnate a mano per i pulsanti (niente emoji, così si vedono bene ovunque).
export const icons = {
  play(ctx, cx, cy, s) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.85, cy);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.8);
    ctx.closePath();
    ctx.fill();
  },
  stop(ctx, cx, cy, s) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - s * 0.65, cy - s * 0.65, s * 1.3, s * 1.3);
  },
  next(ctx, cx, cy, s) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = s * 0.35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, cy);
    ctx.lineTo(cx + s * 0.7, cy);
    ctx.moveTo(cx + s * 0.1, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.75, cy);
    ctx.lineTo(cx + s * 0.1, cy + s * 0.6);
    ctx.stroke();
  },
  back(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    icons.next(ctx, 0, 0, s);
    ctx.restore();
  },
  home(ctx, cx, cy, s) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.9, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.9, cy - s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.6, cy - s * 0.1, s * 1.2, s * 0.95);
  },
  trash(ctx, cx, cy, s) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - s * 0.75, cy - s * 0.75, s * 1.5, s * 0.22);
    ctx.fillRect(cx - s * 0.25, cy - s * 0.95, s * 0.5, s * 0.25);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.6, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.9);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.9);
    ctx.closePath();
    ctx.fill();
  },
  undo(ctx, cx, cy, s) {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = s * 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.1, s * 0.65, Math.PI * 1.15, Math.PI * 2.6);
    ctx.stroke();
    const a = Math.PI * 1.15;
    const x = cx + Math.cos(a) * s * 0.65, y = cy + s * 0.1 + Math.sin(a) * s * 0.65;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y - s * 0.05);
    ctx.lineTo(x + s * 0.2, y - s * 0.45);
    ctx.lineTo(x + s * 0.2, y + s * 0.35);
    ctx.closePath();
    ctx.fill();
  },
  speaker(ctx, cx, cy, s, on = true) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.9, cy - s * 0.35);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.05, cy + s * 0.8);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.35);
    ctx.lineTo(cx - s * 0.9, cy + s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    if (on) {
      for (const r of [0.45, 0.8]) {
        ctx.beginPath();
        ctx.arc(cx + s * 0.1, cy, s * r, -0.8, 0.8);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.35, cy - s * 0.4);
      ctx.lineTo(cx + s * 0.95, cy + s * 0.4);
      ctx.moveTo(cx + s * 0.95, cy - s * 0.4);
      ctx.lineTo(cx + s * 0.35, cy + s * 0.4);
      ctx.stroke();
    }
  },
  star(ctx, cx, cy, s) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s : s * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  },
};
