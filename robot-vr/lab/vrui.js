// Interfaccia del laboratorio DENTRO il visore: è la copia 3D di quella del browser.
//  - in alto: "← Tutti i robot", "🏠 Torna al gioco", nome del robot, "🎨 Personalizza", "🧩 Programma", "🔊 Voce", "🎥 Vista"
//  - in basso: i pulsanti delle azioni del robot
//  - a destra (Personalizza): cappello, occhiali, papillon, mantello, colori, "↺ Com'era all'inizio"
//  - a sinistra (Programma): ▶ Avvia, ⏹ Stop, ↺ Esempio, ✕ e i blocchi (lo stesso programma salvato nel browser)
// Tutto sta in un gruppo "root" che segue il giocatore quando cambia vista.
import * as THREE from 'three';

const PX = 1400; // pixel di texture per metro (testi nitidi nel visore)
const CAT = { robot: null, move: '#4c97ff', talk: '#9966ff', ctrl: '#ffab19', start: '#ffbf00' };

export function setupVrUI(ctx) {
  const { scene, css, FONT, canvasTex, roundRect, robot, name, coding, look, LOOK } = ctx;
  CAT.robot = css;
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const buttons = [];

  // ---------- mattoncini dell'interfaccia ----------
  const fit = (g, text, maxW, size, weight) => {
    let s = size;
    g.font = `${weight} ${s}px ${FONT}`;
    while (g.measureText(text).width > maxW && s > 14) { s -= 2; g.font = `${weight} ${s}px ${FONT}`; }
  };
  function plane(w, h) {
    const { c, g, tex } = canvasTex(Math.round(w * PX), Math.round(h * PX));
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.renderOrder = 20;
    return { mesh, c, g, tex, mat };
  }
  // pulsante: { bg, fg, on, swatch } ; on = selezionato (colore del robot, come nel browser)
  function button(label, w, h, onPress, opts = {}) {
    const p = plane(w, h);
    const o = { label, bg: '#f1f4f9', fg: '#1d2433', on: false, swatch: null, weight: 600, ...opts };
    const draw = () => {
      const { c, g } = p, W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.swatch) {
        g.beginPath(); g.arc(W / 2, H / 2, H / 2 - 8, 0, Math.PI * 2);
        g.fillStyle = o.swatch; g.fill();
        g.lineWidth = o.on ? 12 : 6; g.strokeStyle = o.on ? '#1d2433' : '#d6dce6'; g.stroke();
        if (o.label) { g.fillStyle = '#fff'; g.font = `700 ${H * 0.45}px ${FONT}`; g.fillText(o.label, W / 2, H / 2 + 2); }
      } else {
        g.fillStyle = o.on ? css : o.bg;
        roundRect(g, 3, 3, W - 6, H - 6, (H - 6) / 2); g.fill();
        g.fillStyle = o.on ? '#fff' : o.fg;
        fit(g, o.label, W - 28, H * 0.5, o.weight);
        g.fillText(o.label, W / 2, H / 2 + 2);
      }
      p.tex.needsUpdate = true;
    };
    draw();
    p.mesh.userData = { onPress, mat: p.mat, set(v) { Object.assign(o, v); draw(); }, get label() { return o.label; } };
    buttons.push(p.mesh);
    return p.mesh;
  }
  function label(text, w, h, { color = '#1d2433', weight = 600, align = 'center', bg = null } = {}) {
    const p = plane(w, h);
    const draw = t => {
      const { c, g } = p, W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      if (bg) { g.fillStyle = bg; roundRect(g, 3, 3, W - 6, H - 6, (H - 6) / 2); g.fill(); }
      g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
      fit(g, t, W - 24, H * 0.6, weight);
      g.fillText(t, align === 'left' ? 12 : W / 2, H / 2 + 2);
      p.tex.needsUpdate = true;
    };
    draw(text);
    p.mesh.userData.setText = draw;
    return p.mesh;
  }
  // sfondo bianco arrotondato con il bordo colorato in alto (come i pannelli del browser)
  function panel(w, h, border = true) {
    const p = plane(w, h);
    const { c, g } = p, W = c.width, H = c.height, r = 0.035 * PX;
    g.fillStyle = 'rgba(0,0,0,0.12)'; roundRect(g, 6, 10, W - 12, H - 12, r); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.94)'; roundRect(g, 4, 4, W - 8, H - 12, r); g.fill();
    if (border) { g.save(); roundRect(g, 4, 4, W - 8, H - 12, r); g.clip(); g.fillStyle = css; g.fillRect(0, 0, W, 0.008 * PX); g.restore(); }
    p.tex.needsUpdate = true;
    p.mesh.renderOrder = 19;
    return p.mesh;
  }
  const at = (parent, mesh, x, y) => { mesh.position.set(x, y, 0.002); parent.add(mesh); return mesh; };
  function group(x, y, z, rotY = 0, tilt = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.set(tilt, rotY, 0, 'YXZ');
    root.add(g);
    return g;
  }

  // ---------- in alto: indietro, nome, strumenti, suggerimento ----------
  const top = group(0, 2.0, -1.35, 0, 0.28);
  at(top, panel(1.32, 0.36, false), 0, -0.02);
  at(top, button('← Tutti i robot', 0.3, 0.075, () => ctx.leave('index.html')), -0.47, 0.1);
  at(top, button('🏠 Torna al gioco', 0.32, 0.075, () => ctx.leave('../index.html')), -0.14, 0.1);
  at(top, label('🤖 ' + name, 0.42, 0.085, { color: css, weight: 800 }), 0.36, 0.1);
  const tLook = button('🎨 Personalizza', 0.3, 0.075, () => toggle('look'));
  const tCode = button('🧩 Programma', 0.28, 0.075, () => toggle('code'));
  const tVoice = button(ctx.isVoiceOn() ? '🔊 Voce' : '🔇 Voce', 0.2, 0.075, () => { ctx.toggleVoice(); refreshTop(); });
  const tView = button('🎥 ' + ctx.VIEWS[ctx.getViewIdx()].name, 0.3, 0.075, () => { ctx.nextView(); refreshTop(); });
  at(top, tLook, -0.47, 0.005); at(top, tCode, -0.17, 0.005); at(top, tVoice, 0.08, 0.005); at(top, tView, 0.35, 0.005);
  at(top, label(`👆 Tocca ${name} per fargli le coccole, trascinalo per lanciarlo!`, 1.2, 0.05, { weight: 500 }), 0, -0.09);
  function refreshTop() {
    tVoice.userData.set({ label: ctx.isVoiceOn() ? '🔊 Voce' : '🔇 Voce' });
    tView.userData.set({ label: '🎥 ' + ctx.VIEWS[ctx.getViewIdx()].name });
    tLook.userData.set({ on: lookG ? lookG.visible : false });
    tCode.userData.set({ on: codeG.visible });
  }

  // ---------- in basso: le azioni del robot (come il pannello in fondo alla pagina) ----------
  {
    const acts = robot.actions, per = 4, bw = 0.235, bh = 0.07, gx = 0.25, gy = 0.085;
    const rows = Math.ceil(acts.length / per);
    const bottom = group(0, 0.86, -0.95, 0, -0.6);
    at(bottom, panel(per * gx + 0.04, rows * gy + 0.06), 0, 0);
    acts.forEach(([id, txt], i) => {
      const row = Math.floor(i / per), inRow = Math.min(per, acts.length - row * per), col = i % per;
      at(bottom, button(txt, bw, bh, () => robot.do(id)), (col - (inRow - 1) / 2) * gx, ((rows - 1) / 2 - row) * gy);
    });
  }

  // ---------- a destra: Personalizza ----------
  let lookG = null;
  const lookBtns = { hat: [], glasses: [], bowtie: [], cape: [], body: [], accent: [] };
  if (look) {
    const W = 0.66;
    lookG = group(0.82, 1.3, -1.02, -0.6, -0.12);
    lookG.visible = false;
    at(lookG, panel(W, 0.98), 0, 0);
    let y = 0.43;
    at(lookG, label(`🎨 Personalizza ${name}`, 0.5, 0.06, { color: css, weight: 800, align: 'left' }), -0.06, y);
    at(lookG, button('✕', 0.06, 0.06, () => toggle('look')), W / 2 - 0.05, y);
    const chips = (k, title, opts) => {
      y -= 0.065; at(lookG, label(title, W - 0.06, 0.045, { align: 'left' }), 0, y);
      const per = 5, cw = 0.118;
      opts.forEach(([v, txt], i) => {
        if (i % per === 0) y -= 0.06;
        const b = button(txt, cw - 0.008, 0.05, () => { look.set(k, v); ctx.pop(1.2); refreshLook(); });
        b.userData.value = v;
        lookBtns[k].push(b);
        at(lookG, b, -W / 2 + 0.03 + cw / 2 + (i % per) * cw, y);
      });
    };
    const swatches = (k, title, list) => {
      y -= 0.065; at(lookG, label(title, W - 0.06, 0.045, { align: 'left' }), 0, y);
      y -= 0.065;
      list.forEach((col, i) => {
        const b = button(i === 0 ? '↺' : '', 0.06, 0.06, () => { look.set(k, i); ctx.pop(1.2); refreshLook(); }, { swatch: col || look.origColor[k] });
        b.userData.value = i;
        lookBtns[k].push(b);
        at(lookG, b, -W / 2 + 0.06 + i * 0.075, y);
      });
    };
    chips('hat', '🎩 Cappello', LOOK.HATS.map(v => [v, LOOK.HAT_NAMES[v]]));
    chips('glasses', '👓 Occhiali', [[false, 'No'], [true, 'Sì']]);
    chips('bowtie', '🎀 Papillon', [[false, 'No'], [true, 'Sì']]);
    chips('cape', '🦸 Mantello', LOOK.CAPES.map(v => [v, LOOK.CAPE_NAMES[v]]));
    swatches('body', '🎨 Colore del corpo', LOOK.BODY_COLORS);
    swatches('accent', '🎨 Colore dei dettagli', LOOK.ACCENT_COLORS);
    y -= 0.075;
    at(lookG, button('↺ Com’era all’inizio', W - 0.06, 0.055, () => { look.reset(); ctx.pop(1.2); refreshLook(); }, { bg: '#eef2f8' }), 0, y);
  }
  function refreshLook() {
    if (!look) return;
    for (const [k, list] of Object.entries(lookBtns)) for (const b of list) b.userData.set({ on: look.state[k] === b.userData.value });
  }

  // ---------- a sinistra: Programma (blocchi) ----------
  const actionLabel = Object.fromEntries(robot.actions);
  const cardText = c => ({
    act: () => actionLabel[c.id] || c.id,
    avanti: () => `⬆️ vai avanti di ${c.n} passi`,
    indietro: () => `⬇️ vai indietro di ${c.n} passi`,
    gira: () => `🔄 girati a ${c.dir === 'sx' ? 'sinistra ⬅️' : 'destra ➡️'}`,
    casa: () => '🏠 torna a casa',
    dici: () => `💬 dici "${c.txt}"`,
    aspetta: () => `⏱️ aspetta ${c.s} secondi`,
    ripeti: () => `🔁 ripeti ${c.n} volte`,
    fine: () => '🔚 fine ripeti',
  }[c.t]());
  const cardColor = c => (c.t === 'act' ? CAT.robot : ['avanti', 'indietro', 'gira', 'casa'].includes(c.t) ? CAT.move : c.t === 'dici' ? CAT.talk : CAT.ctrl);
  const PALETTE = [
    ...robot.actions.map(([id]) => ({ t: 'act', id })),
    { t: 'avanti', n: 1 }, { t: 'indietro', n: 1 }, { t: 'gira', dir: 'dx' }, { t: 'gira', dir: 'sx' }, { t: 'casa' },
    { t: 'dici', txt: 'Ciao!' }, { t: 'aspetta', s: 1 }, { t: 'ripeti', n: 2 }, { t: 'fine' },
  ];
  const MAXC = 13, CW = 0.74;
  const codeG = group(-0.84, 1.3, -1.02, 0.6, -0.12);
  codeG.visible = false;
  const prow = Math.ceil(PALETTE.length / 3);
  const CH = 0.13 + 0.05 * (MAXC + 1) + 0.06 + prow * 0.052;
  at(codeG, panel(CW, CH), 0, 0);
  let cy = CH / 2 - 0.05;
  const runBtn = button('▶ Avvia', 0.16, 0.06, () => { coding.run(); }, { bg: '#2bb673', fg: '#fff' });
  at(codeG, runBtn, -CW / 2 + 0.11, cy);
  at(codeG, button('⏹ Stop', 0.14, 0.06, () => coding.stop(), { bg: '#e6ebf3' }), -CW / 2 + 0.27, cy);
  at(codeG, button('↺ Esempio', 0.17, 0.06, () => { coding.resetExample(); refreshCode(true); }, { bg: '#e6ebf3' }), CW / 2 - 0.2, cy);
  at(codeG, button('✕', 0.06, 0.06, () => toggle('code'), { bg: '#e6ebf3' }), CW / 2 - 0.05, cy);
  cy -= 0.065;
  const listTop = cy;
  const progMeshes = [];
  let cards = [];
  // reload = rilegge il programma salvato (all'apertura del pannello o con "Esempio");
  // mentre si modifica si lavora sulla lista qui, così un "ripeti" appena messo resta aperto finché non arriva "fine"
  function refreshCode(reload = false) {
    for (const m of progMeshes) {
      m.parent.remove(m); m.material.map.dispose(); m.material.dispose(); m.geometry.dispose();
      const i = buttons.indexOf(m); if (i >= 0) buttons.splice(i, 1);
    }
    progMeshes.length = 0;
    if (reload) cards = coding.getCards();
    let y = listTop;
    const start = label('▶ quando premo Avvia', 0.36, 0.045, { color: '#fff', bg: CAT.start, weight: 700 });
    at(codeG, start, -CW / 2 + 0.03 + 0.18, y); progMeshes.push(start);
    let depth = 0;
    cards.slice(0, MAXC).forEach((c, i) => {
      if (c.t === 'fine') depth = Math.max(0, depth - 1);
      y -= 0.05;
      const b = button(cardText(c), 0.42, 0.044, () => { cards.splice(i, 1); coding.setCards(cards); ctx.pop(0.8); refreshCode(); },
        { bg: cardColor(c), fg: '#fff' });
      at(codeG, b, -CW / 2 + 0.05 + 0.21 + depth * 0.03, y);
      progMeshes.push(b);
      if (c.t === 'ripeti') depth++;
    });
    if (cards.length > MAXC) {
      const more = label(`… e altri ${cards.length - MAXC} blocchi (si vedono sul PC)`, 0.5, 0.04, { weight: 500 });
      at(codeG, more, -CW / 2 + 0.28, y - 0.05); progMeshes.push(more);
    }
  }
  // tavolozza dei blocchi (come le categorie di Blockly: robot, movimento, parla, controllo)
  {
    let y = listTop - 0.05 * (MAXC + 1) - 0.03;
    at(codeG, label('Tocca un blocco per aggiungerlo · tocca un blocco del programma per toglierlo', CW - 0.05, 0.04, { weight: 500 }), 0, y);
    PALETTE.forEach((c, i) => {
      if (i % 3 === 0) y -= 0.052;
      const b = button(cardText(c), 0.225, 0.045, () => {
        cards.push({ ...c });
        coding.setCards(cards); ctx.pop(1.3); refreshCode();
      }, { bg: cardColor(c), fg: '#fff' });
      at(codeG, b, (i % 3 - 1) * 0.235, y);
    });
  }

  // ---------- apri / chiudi (come i pulsanti del browser) ----------
  function toggle(which) {
    if (which === 'look' && lookG) { lookG.visible = !lookG.visible; if (lookG.visible) refreshLook(); }
    if (which === 'code') { codeG.visible = !codeG.visible; if (codeG.visible) refreshCode(true); }
    refreshTop();
  }
  // mentre il programma va, il pulsante dice "Sto eseguendo…" come nel browser
  let wasRunning = false;
  function update() {
    const r = coding.isRunning();
    if (r !== wasRunning) { wasRunning = r; runBtn.userData.set({ label: r ? '⏳ Sto eseguendo…' : '▶ Avvia' }); }
  }

  return {
    root,
    buttons,
    update,
    show(v) { root.visible = v; if (v) { refreshTop(); refreshLook(); if (codeG.visible) refreshCode(true); } },
    refreshTop,
    // segue il giocatore quando cambia vista
    placeAt(pos, yaw) { root.position.copy(pos); root.rotation.set(0, yaw, 0); },
  };
}
