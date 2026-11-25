// Il motore del mini-gioco: disegna e fa giocare lo stato creato con AIBI su un <canvas>.
// Tasti: frecce (o WASD) per muoversi, barra spaziatrice (o freccia su) per saltare.
import { sfx, tone } from './chat.js';
import { COLORS } from './understand.js';

export const W = 800, H = 450;
const GROUND = H - 50, TOP = 46;
const FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const TEXT = '"Segoe UI", system-ui, Arial, sans-serif';
const KEYS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's'];
const MELODY = [523, 659, 784, 659, 698, 880, 784, 0, 784, 698, 659, 587, 523, 587, 659, 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const STARS = (() => { const r = rng(3); return Array.from({ length: 80 }, () => ({ x: r() * W, y: r() * H, s: r() * 1.8 + 0.5, p: r() * 6 })); })();

// emoji disegnate una volta sola (e colorate, se serve)
const cache = new Map();
const tint = (color, t) => (!color ? null : color === 'arcobaleno' ? `hsl(${(Math.floor(t * 4) % 12) * 30},90%,55%)` : COLORS[color]);
function sprite(emoji, px, hex) {
  px = Math.round(px);
  const key = emoji + px + hex;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  const s = Math.ceil(px * 1.35);
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.font = `${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, s / 2, s / 2 + px * 0.08);
  if (hex) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.55; g.fillStyle = hex; g.fillRect(0, 0, s, s); }
  cache.set(key, c);
  return c;
}

export class Engine {
  constructor(canvas, onEvent) {
    Object.assign(this, { c: canvas, g: canvas.getContext('2d'), onEvent, keys: new Set(), playing: false, over: null, t: 0, s: null, parts: [] });
    canvas.width = W;
    canvas.height = H;
    const key = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase());
    canvas.addEventListener('keydown', (e) => { const k = key(e); if (KEYS.includes(k)) { e.preventDefault(); this.keys.add(k); } });
    canvas.addEventListener('keyup', (e) => this.keys.delete(key(e)));
    canvas.addEventListener('blur', () => this.keys.clear());
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.t += dt;
      if (this.playing) this.step(dt);
      this.updateParts(dt);
      if (this.s) this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setSpec(s) {
    this.s = JSON.parse(JSON.stringify(s));
    this.over = null;
    this.setup(!this.playing);
  }

  play() {
    if (!this.s || !this.s.hero) return false;
    this.over = null;
    this.setup(false);
    this.playing = true;
    this.musicT = 0;
    this.note = 0;
    this.c.focus();
    return true;
  }

  stop() { this.playing = false; this.over = null; this.setup(true); }

  // prepara il mondo (in anteprima le posizioni sono sempre le stesse)
  setup(preview) {
    const s = this.s, r = preview ? rng(11) : Math.random;
    this.preview = preview;
    this.platform = s.controls === 'salto';
    const hr = s.hero ? 28 * s.hero.size : 0;
    this.hero = s.hero ? { x: this.platform ? 110 : W / 2, y: this.platform ? GROUND - hr : H / 2 + 10, vy: 0, r: hr, inv: 0, ground: true } : null;
    this.items = [];
    this.enemies = [];
    if (s.items) for (let i = 0; i < Math.min(30, s.items.n); i++) this.items.push(this.place({ r: 17 * s.items.size, bob: r() * 6 }, r));
    if (s.enemies) { const n = Math.min(15, s.enemies.n); for (let i = 0; i < n; i++) this.enemies.push(this.spawnEnemy(i, n, r)); }
    this.score = 0;
    this.got = 0;
    this.lives = s.lives || 1;
    this.time = s.timer || 0;
  }

  place(o, r = Math.random) {
    for (let k = 0; k < 40; k++) {
      o.x = 40 + r() * (W - 80);
      o.y = this.platform ? GROUND - 30 - r() * 170 : TOP + 30 + r() * (H - TOP - 60);
      if (!this.hero || Math.hypot(o.x - this.hero.x, o.y - this.hero.y) > 120) break;
    }
    return o;
  }

  spawnEnemy(i, n, r) {
    const e = this.s.enemies, sp = e.speed, rad = 21 * e.size;
    const o = { r: rad };
    if (e.move === 'fall') {
      o.x = 30 + r() * (W - 60);
      o.y = this.preview ? TOP + 20 + r() * H * 0.45 : -rad - r() * H;
      o.vy = (110 + r() * 70) * sp;
    } else if (e.move === 'chase') {
      const corners = [[40, TOP + 30], [W - 40, TOP + 30], [W - 40, H - 40], [40, H - 40]];
      [o.x, o.y] = corners[i % 4];
      if (this.platform) o.y = GROUND - rad;
      if (this.platform && i % 2 === 0) o.x = W - 40 - i * 30;
      o.sp = (55 + i * 8) * sp;
    } else if (this.platform) {
      o.x = W - 80 - (i * (W - 300)) / Math.max(1, n);
      o.y = GROUND - rad;
      o.vx = -(70 + r() * 50) * sp;
      o.vy = 0;
    } else {
      this.place(o, r);
      if (this.hero && dist(o, this.hero) < 180) o.x = o.x < W / 2 ? 40 : W - 40;
      const a = r() * Math.PI * 2;
      o.vx = Math.cos(a) * 130 * sp;
      o.vy = Math.sin(a) * 130 * sp;
    }
    return o;
  }

  step(dt) {
    const s = this.s, h = this.hero, k = this.keys;
    const L = k.has('arrowleft') || k.has('a'), R = k.has('arrowright') || k.has('d');
    const U = k.has('arrowup') || k.has('w'), D = k.has('arrowdown') || k.has('s'), J = k.has(' ') || U;
    if (h && s.controls) {
      const sp = s.hero.speed;
      if (this.platform) {
        h.x += ((R ? 1 : 0) - (L ? 1 : 0)) * 260 * sp * dt;
        if (J && h.ground) { h.vy = -660 * Math.sqrt(s.jump); h.ground = false; tone(520, 0.12, 0.05, 'sine'); }
        h.vy += 1700 * dt;
        h.y += h.vy * dt;
        if (h.y >= GROUND - h.r) { h.y = GROUND - h.r; h.vy = 0; h.ground = true; }
      } else {
        h.x += ((R ? 1 : 0) - (L ? 1 : 0)) * 240 * sp * dt;
        h.y += ((D ? 1 : 0) - (U ? 1 : 0)) * 240 * sp * dt;
      }
      h.x = clamp(h.x, h.r, W - h.r);
      h.y = clamp(h.y, TOP + h.r, H - h.r);
    }
    if (h) h.inv = Math.max(0, h.inv - dt);

    // raccogliere
    for (const it of this.items) {
      if (h && dist(it, h) < (it.r + h.r) * 0.85) {
        this.burst(it.x, it.y, ['#ffd23f', '#fff', '#ff9ec9']);
        this.got++;
        if (!s.bug) this.score += s.items.points;
        this.place(it);
        tone(988, 0.08, 0.06, 'square');
        tone(1319, 0.12, 0.06, 'square', 0.07);
        this.onEvent('collect');
      }
    }
    // nemici
    for (const e of this.enemies) {
      if (s.enemies.move === 'fall') {
        e.y += e.vy * dt;
        if (e.y - e.r > (this.platform ? GROUND : H)) { e.y = -e.r - Math.random() * 100; e.x = 30 + Math.random() * (W - 60); }
      } else if (s.enemies.move === 'chase' && h) {
        const dx = h.x - e.x, dy = this.platform ? 0 : h.y - e.y, d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.sp * dt;
        e.y += (dy / d) * e.sp * dt;
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < e.r || e.x > W - e.r) { e.vx *= -1; e.x = clamp(e.x, e.r, W - e.r); }
        if (!this.platform && (e.y < TOP + e.r || e.y > H - e.r)) { e.vy *= -1; e.y = clamp(e.y, TOP + e.r, H - e.r); }
      }
      if (h && h.inv <= 0 && dist(e, h) < (e.r + h.r) * 0.72) {
        this.lives--;
        h.inv = 1.6;
        sfx.bump();
        this.burst(h.x, h.y, ['#ff3b3b', '#ff9234']);
        this.onEvent('hit');
        if (this.lives <= 0) return this.end('lose', 'Game over!');
      }
    }
    // vittoria
    if (s.win && s.win.type === 'raccolti' && this.got >= s.win.n) return this.end('win', 'Hai vinto!');
    if (s.win && s.win.type === 'punti' && this.score >= s.win.n) return this.end('win', 'Hai vinto!');
    if (s.timer) {
      this.time -= dt;
      if (this.time <= 0) {
        this.time = 0;
        if (s.win && s.win.type === 'tempo') return this.end('win', 'Hai resistito: hai vinto!');
        if (s.win) return this.end('lose', 'Tempo scaduto!');
        return this.end('end', 'Tempo finito!');
      }
    }
    // musica
    if (s.music) {
      this.musicT -= dt;
      if (this.musicT <= 0) {
        this.musicT = 0.22;
        const f = MELODY[this.note++ % MELODY.length];
        if (f) tone(f, 0.18, 0.035, 'triangle');
      }
    }
  }

  end(type, msg) {
    this.playing = false;
    this.over = { type, msg };
    this.keys.clear();
    if (type === 'win') {
      sfx.win();
      for (let i = 0; i < 5; i++) this.burst(100 + Math.random() * (W - 200), 80 + Math.random() * 200, ['#ff5d5d', '#ffd23f', '#4d8dff', '#2fbf71', '#b08cff'], 24);
    } else {
      tone(330, 0.2, 0.08, 'triangle'); tone(247, 0.35, 0.08, 'triangle', 0.18);
    }
    this.onEvent(type === 'win' ? 'win' : 'end', { type });
  }

  burst(x, y, colors, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 1, c: colors[i % colors.length] });
    }
  }
  updateParts(dt) {
    for (const p of this.parts) { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.1; }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  // ---------------- disegno ----------------
  draw() {
    const g = this.g, s = this.s, t = this.t;
    this.drawBg(g, s, t);
    if (this.platform) {
      const GC = { prato: '#5bbf4a', deserto: '#e9c27a', neve: '#f4f8ff', mare: '#e8d49a', spazio: '#8a8fa8', lava: '#3a1d14', citta: '#555b66', bosco: '#6b4a2b', notte: '#2f3a2a', cielo: '#ffffff' };
      g.fillStyle = GC[s.bg] || '#c9d3e3';
      g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(0, GROUND, W, 5);
    }
    if (s.items) {
      for (const it of this.items) {
        const sp = sprite(s.items.emoji, 34 * s.items.size, tint(s.items.color, t));
        g.drawImage(sp, it.x - sp.width / 2, it.y - sp.height / 2 + Math.sin(t * 3 + it.bob) * 4);
      }
    }
    if (s.enemies) {
      const sp = sprite(s.enemies.emoji, 42 * s.enemies.size, tint(s.enemies.color, t));
      for (const e of this.enemies) g.drawImage(sp, e.x - sp.width / 2, e.y - sp.height / 2);
    }
    const h = this.hero;
    if (h && !(h.inv > 0 && Math.floor(t * 10) % 2)) {
      const sp = sprite(s.hero.emoji, 56 * s.hero.size, tint(s.hero.color, t));
      const squash = this.platform && !h.ground ? 1.06 : 1;
      g.drawImage(sp, h.x - sp.width / 2, h.y - (sp.height * squash) / 2, sp.width, sp.height * squash);
    }
    for (const p of this.parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 7, 7); }
    g.globalAlpha = 1;

    // punteggio, vite, tempo
    let x = 12;
    if (s.items) x = this.pill(`${s.items.emoji} ${this.score} punti`, x, 10) + 8;
    if (s.win && s.win.type === 'raccolti') x = this.pill(`🎯 ${this.got}/${s.win.n}`, x, 10) + 8;
    if (s.win && s.win.type === 'punti') x = this.pill(`🎯 ${s.win.n} punti per vincere`, x, 10) + 8;
    if (s.lives) x = this.pill('❤️'.repeat(Math.max(0, this.lives)) || '💔', x, 10) + 8;
    if (s.timer) this.pill(`⏱️ ${Math.ceil(this.time)}`, W - 12, 10, true);

    if (!this.playing && !this.over) {
      if (!s.hero) {
        this.center('✨ Il gioco è ancora vuoto', H / 2 - 18, 34, s);
        this.center('Chiedi ad AIBI cosa vuoi creare! 👉', H / 2 + 22, 22, s);
      } else {
        const msg = s.controls ? 'Anteprima · premi ▶ Gioca per provarlo' : 'Anteprima · il personaggio non si muove ancora: chiedilo ad AIBI!';
        this.pill(msg, W / 2, H - 42, 'center');
      }
    }
    if (this.over) {
      g.fillStyle = 'rgba(15,18,40,.55)';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.font = `bold 52px ${TEXT}`;
      g.fillText((this.over.type === 'win' ? '🎉 ' : this.over.type === 'lose' ? '😵 ' : '⏱️ ') + this.over.msg, W / 2, H / 2 - 10);
      g.font = `24px ${TEXT}`;
      g.fillText((s.items ? `Punti: ${this.score} · ` : '') + 'premi ▶ Gioca per riprovare', W / 2, H / 2 + 36);
    }
  }

  pill(text, x, y, align = false) {
    const g = this.g;
    g.font = `bold 20px ${TEXT}`;
    const w = g.measureText(text).width + 22;
    const left = align === 'center' ? x - w / 2 : align ? x - w : x;
    g.fillStyle = 'rgba(255,255,255,.88)';
    g.beginPath();
    g.roundRect(left, y, w, 32, 16);
    g.fill();
    g.fillStyle = '#1d2433';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(text, left + 11, y + 17);
    g.textBaseline = 'alphabetic';
    return left + w;
  }

  center(text, y, size, s) {
    const g = this.g;
    g.font = `bold ${size}px ${TEXT}`;
    g.textAlign = 'center';
    g.fillStyle = ['spazio', 'notte', 'lava', 'bosco'].includes(s.bg) ? '#fff' : '#3b2a99';
    g.fillText(text, W / 2, y);
  }

  drawBg(g, s, t) {
    const grad = (a, b) => { const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, a); q.addColorStop(1, b); g.fillStyle = q; g.fillRect(0, 0, W, H); };
    const circle = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const stars = (n, a = 1) => { for (const st of STARS.slice(0, n)) { g.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 2 + st.p)); circle(st.x, st.y, st.s, '#fff'); } g.globalAlpha = 1; };
    const cloud = (x, y, k) => { g.fillStyle = 'rgba(255,255,255,.9)'; for (const [dx, dy, r] of [[0, 0, 22], [24, -10, 28], [52, 0, 22], [26, 8, 22]]) { g.beginPath(); g.arc(x + dx * k, y + dy * k, r * k, 0, Math.PI * 2); g.fill(); } };
    switch (s.bg) {
      case 'spazio':
        grad('#0b0f2e', '#24105a'); stars(80);
        circle(680, 90, 38, '#ff9ec9'); circle(668, 80, 10, 'rgba(255,255,255,.35)');
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 4; g.beginPath(); g.ellipse(680, 90, 62, 14, -0.3, 0, Math.PI * 2); g.stroke();
        break;
      case 'notte':
        grad('#0a1030', '#2a2f6b'); stars(45, 0.8); circle(650, 85, 34, '#fff6c8'); circle(665, 75, 30, '#141a45');
        g.fillStyle = '#1b2244'; g.fillRect(0, H - 70, W, 70);
        break;
      case 'cielo':
        grad('#7cc8ff', '#e6f6ff');
        for (let i = 0; i < 5; i++) cloud(((i * 190 + t * 18) % (W + 160)) - 120, 70 + (i % 3) * 90, 0.8 + (i % 2) * 0.4);
        break;
      case 'mare':
        grad('#2fb4e8', '#0a4d8c');
        g.fillStyle = '#e8d49a'; g.fillRect(0, H - 26, W, 26);
        for (let i = 0; i < 24; i++) { const x = (i * 97) % W, y = H - (((t * 40 + i * 53) % (H + 40))); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(x + Math.sin(t + i) * 8, y, 3 + (i % 4), 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = '#2e9b5a'; for (let i = 0; i < 8; i++) { const x = 40 + i * 105; g.beginPath(); g.moveTo(x, H - 26); g.quadraticCurveTo(x + 18 + Math.sin(t * 2 + i) * 10, H - 70, x + 6, H - 110); g.lineTo(x + 12, H - 26); g.fill(); }
        break;
      case 'prato':
        grad('#8fd3ff', '#e9f7ff'); circle(90, 70, 36, '#ffd23f');
        cloud(((t * 15) % (W + 200)) - 100, 60, 0.9);
        g.fillStyle = '#7fd36a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, 300); g.quadraticCurveTo(200, 250, 400, 300); g.quadraticCurveTo(600, 350, W, 280); g.lineTo(W, H); g.fill();
        g.fillStyle = '#5bbf4a'; g.fillRect(0, 360, W, H - 360);
        for (let i = 0; i < 14; i++) { const x = 30 + i * 57; circle(x, 380 + (i % 3) * 18, 5, ['#ff7ac8', '#fff', '#ffd23f'][i % 3]); }
        break;
      case 'bosco':
        grad('#a8e0b0', '#2f6b3a');
        for (let i = 0; i < 11; i++) { const x = i * 80 + (i % 2) * 30, hgt = 160 + (i % 3) * 50; g.fillStyle = '#6b4a2b'; g.fillRect(x + 22, H - 60, 14, 60); g.fillStyle = i % 2 ? '#1f5c2c' : '#2a7a3a'; g.beginPath(); g.moveTo(x, H - 50); g.lineTo(x + 29, H - 50 - hgt); g.lineTo(x + 58, H - 50); g.fill(); }
        break;
      case 'deserto':
        grad('#ffe7a8', '#ffc77a'); circle(680, 80, 40, '#fff1b8');
        g.fillStyle = '#f0c27a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, 320); g.quadraticCurveTo(250, 260, 500, 330); g.quadraticCurveTo(650, 370, W, 310); g.lineTo(W, H); g.fill();
        g.font = `48px ${FONT}`; g.textAlign = 'center'; g.fillText('🌵', 120, 360); g.fillText('🌵', 620, 380);
        break;
      case 'neve':
        grad('#cfe8ff', '#ffffff');
        g.fillStyle = '#eef5ff'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, 330); g.quadraticCurveTo(300, 280, W, 340); g.lineTo(W, H); g.fill();
        for (let i = 0; i < 60; i++) { const x = (i * 131 + Math.sin(t + i) * 20) % W, y = (t * 40 + i * 47) % H; circle(x, y, 2 + (i % 3), 'rgba(255,255,255,.95)'); circle(x, y, 2 + (i % 3), 'rgba(150,190,230,.25)'); }
        break;
      case 'citta':
        grad('#ffb36b', '#7a5cff');
        for (let i = 0; i < 12; i++) {
          const x = i * 70, hgt = 120 + ((i * 53) % 160);
          g.fillStyle = i % 2 ? '#2d2a55' : '#3b3670'; g.fillRect(x, H - hgt, 62, hgt);
          g.fillStyle = '#ffe08a';
          for (let wy = H - hgt + 14; wy < H - 20; wy += 26) for (let wx = x + 10; wx < x + 54; wx += 18) if ((wx + wy + i) % 3) g.fillRect(wx, wy, 8, 12);
        }
        break;
      case 'lava':
        grad('#2b0a0a', '#7a1a00');
        g.fillStyle = '#ff6a00'; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) g.lineTo(x, H - 30 - Math.sin(x / 40 + t * 2) * 8);
        g.lineTo(W, H); g.fill();
        for (let i = 0; i < 20; i++) { const x = (i * 83) % W, y = H - ((t * 60 + i * 41) % H); circle(x, y, 2, 'rgba(255,180,60,.8)'); }
        break;
      case 'colore': {
        const c = s.bgColor === 'arcobaleno' ? null : COLORS[s.bgColor] || '#ffffff';
        if (c) grad(c, '#ffffff');
        else { const q = g.createLinearGradient(0, 0, W, 0); ['#ff5d5d', '#ffd23f', '#2fbf71', '#4d8dff', '#9b5cff'].forEach((col, i) => q.addColorStop(i / 4, col)); g.fillStyle = q; g.fillRect(0, 0, W, H); }
        break;
      }
      default:
        g.fillStyle = '#f7f9fc'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#e4e9f2'; g.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
  }
}
