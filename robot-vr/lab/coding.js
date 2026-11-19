// Programmazione a blocchi (Blockly) per i robot del laboratorio.
// Il programma viene eseguito leggendo direttamente i blocchi salvati (JSON),
// così funziona anche nel visore, dove l'editor non è aperto.
const BL = 'https://unpkg.com/blockly@10.4.3/';

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- programma iniziale scritto in forma corta: 'ciao', ['avanti', 2], ['ripeti', 2, [...]] ----
function toBlock(it) {
  if (typeof it === 'string') return { type: 'act_' + it };
  const [k, a, b] = it;
  if (k === 'avanti' || k === 'indietro') return { type: 'mv_' + k, fields: { N: a } };
  if (k === 'gira') return { type: 'mv_gira', fields: { DIR: a } };
  if (k === 'casa') return { type: 'mv_casa' };
  if (k === 'dici') return { type: 'dici', fields: { TXT: a } };
  if (k === 'aspetta') return { type: 'aspetta', fields: { S: a } };
  if (k === 'ripeti') {
    const body = chain(b || []);
    return body ? { type: 'ripeti', fields: { N: a }, inputs: { DO: { block: body } } } : { type: 'ripeti', fields: { N: a } };
  }
}
function chain(list) {
  let first = null, prev = null;
  for (const it of list) { const b = toBlock(it); if (!first) first = b; else prev.next = { block: b }; prev = b; }
  return first;
}
const programState = list => {
  const first = chain(list);
  const start = { type: 'start', x: 30, y: 30 };
  if (first) start.next = { block: first };
  return { blocks: { languageVersion: 0, blocks: [start] } };
};

// ---- Il programma come "lista di blocchi" (per l'editor nel visore, dove Blockly non c'è) ----
// Ogni blocco è { t: 'act'|'avanti'|'indietro'|'gira'|'casa'|'dici'|'aspetta'|'ripeti'|'fine', ... }.
// "ripeti" apre un gruppo che si chiude con "fine": è lo stesso programma salvato da Blockly.
export function cardsFromState(st) {
  const starts = (st?.blocks?.blocks || []).filter(b => b.type === 'start').sort((a, b) => (a.y || 0) - (b.y || 0));
  const out = [];
  const walk = b => {
    while (b) {
      const f = b.fields || {};
      if (b.type.startsWith('act_')) out.push({ t: 'act', id: b.type.slice(4) });
      else if (b.type === 'mv_avanti') out.push({ t: 'avanti', n: +f.N || 1 });
      else if (b.type === 'mv_indietro') out.push({ t: 'indietro', n: +f.N || 1 });
      else if (b.type === 'mv_gira') out.push({ t: 'gira', dir: f.DIR === 'sx' ? 'sx' : 'dx' });
      else if (b.type === 'mv_casa') out.push({ t: 'casa' });
      else if (b.type === 'dici') out.push({ t: 'dici', txt: String(f.TXT ?? 'Ciao!') });
      else if (b.type === 'aspetta') out.push({ t: 'aspetta', s: +f.S || 1 });
      else if (b.type === 'ripeti') { out.push({ t: 'ripeti', n: +f.N || 2 }); walk(b.inputs?.DO?.block); out.push({ t: 'fine' }); }
      b = b.next?.block;
    }
  };
  if (starts.length) walk(starts[0].next?.block);
  return out;
}
export function stateFromCards(cards) {
  const root = [], stack = [root];
  for (const c of cards) {
    const top = stack[stack.length - 1];
    if (c.t === 'ripeti') { const body = []; top.push(['ripeti', c.n, body]); stack.push(body); }
    else if (c.t === 'fine') { if (stack.length > 1) stack.pop(); }
    else if (c.t === 'act') top.push(c.id);
    else if (c.t === 'avanti' || c.t === 'indietro') top.push([c.t, c.n]);
    else if (c.t === 'gira') top.push(['gira', c.dir]);
    else if (c.t === 'casa') top.push(['casa']);
    else if (c.t === 'dici') top.push(['dici', c.txt]);
    else if (c.t === 'aspetta') top.push(['aspetta', c.s]);
  }
  return programState(root);
}

export function setupCoding({ robot, name, color, program, lab }) {
  const KEY = 'robotlab-prog-' + name.toLowerCase();
  const load = () => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
  const save = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* niente */ } };
  const defaultState = programState(program);
  let ws = null, running = false, stopped = false;

  // ---------- interfaccia ----------
  document.body.insertAdjacentHTML('beforeend', `
    <div id="code">
      <div id="codeBar">
        <button id="cRun" class="go">▶ Avvia</button>
        <button id="cStop">⏹ Stop</button>
        <span class="grow"></span>
        <button id="cReset" title="Rimetti il programma di esempio">↺ Esempio</button>
        <button id="cClose" title="Chiudi">✕</button>
      </div>
      <div id="blockly"><div class="loading">Carico i blocchi…</div></div>
    </div>`);
  const codeEl = document.getElementById('code');
  const btnRun = document.getElementById('cRun');
  const setRunning = r => { running = r; btnRun.textContent = r ? '⏳ Sto eseguendo…' : '▶ Avvia'; btnRun.disabled = r; };

  async function open() {
    document.body.classList.add('coding');
    lab.resize();
    if (!ws) await initBlockly();
    window.Blockly.svgResize(ws);
  }
  function close() { document.body.classList.remove('coding'); lab.resize(); }
  document.getElementById('cClose').onclick = close;
  document.getElementById('cRun').onclick = () => run();
  document.getElementById('cStop').onclick = () => stop();
  document.getElementById('cReset').onclick = () => {
    if (!ws) return;
    window.Blockly.serialization.workspaces.load(defaultState, ws); save(defaultState);
  };

  async function initBlockly() {
    try {
      await loadScript(BL + 'blockly_compressed.js');
      await loadScript(BL + 'blocks_compressed.js');
      await loadScript(BL + 'msg/it.js');
    } catch {
      document.querySelector('#blockly .loading').textContent = 'Non riesco a caricare i blocchi: serve internet.';
      throw new Error('Blockly non caricato');
    }
    const B = window.Blockly;
    const AZ = color, MV = '#4c97ff', TALK = '#9966ff', CTRL = '#ffab19', START = '#ffbf00';
    const defs = [
      { type: 'start', message0: '▶ quando premo Avvia', nextStatement: null, colour: START,
        tooltip: 'Il programma parte da qui' },
      ...robot.actions.map(([id, label]) => ({ type: 'act_' + id, message0: label, previousStatement: null, nextStatement: null, colour: AZ })),
      { type: 'mv_avanti', message0: '⬆️ vai avanti di %1 passi', args0: [{ type: 'field_number', name: 'N', value: 1, min: 1, max: 5, precision: 1 }],
        previousStatement: null, nextStatement: null, colour: MV },
      { type: 'mv_indietro', message0: '⬇️ vai indietro di %1 passi', args0: [{ type: 'field_number', name: 'N', value: 1, min: 1, max: 5, precision: 1 }],
        previousStatement: null, nextStatement: null, colour: MV },
      { type: 'mv_gira', message0: '🔄 girati a %1', args0: [{ type: 'field_dropdown', name: 'DIR', options: [['destra ➡️', 'dx'], ['sinistra ⬅️', 'sx']] }],
        previousStatement: null, nextStatement: null, colour: MV },
      { type: 'mv_casa', message0: '🏠 torna a casa', previousStatement: null, nextStatement: null, colour: MV },
      { type: 'dici', message0: '💬 dici %1', args0: [{ type: 'field_input', name: 'TXT', text: 'Ciao!' }],
        previousStatement: null, nextStatement: null, colour: TALK },
      { type: 'aspetta', message0: '⏱️ aspetta %1 secondi', args0: [{ type: 'field_number', name: 'S', value: 1, min: 0.5, max: 10, precision: 0.5 }],
        previousStatement: null, nextStatement: null, colour: CTRL },
      { type: 'ripeti', message0: '🔁 ripeti %1 volte', args0: [{ type: 'field_number', name: 'N', value: 2, min: 1, max: 10, precision: 1 }],
        message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: CTRL },
    ];
    B.defineBlocksWithJsonArray(defs);
    // il blocco "start" ha il cappello come in Scratch
    B.Blocks.start.init = function () { this.jsonInit(defs[0]); this.hat = 'cap'; };

    const blocks = types => types.map(type => ({ kind: 'block', type }));
    const toolbox = {
      kind: 'categoryToolbox',
      contents: [
        { kind: 'category', name: name, colour: AZ, contents: blocks(['start', ...robot.actions.map(([id]) => 'act_' + id)]) },
        { kind: 'category', name: 'Movimento', colour: MV, contents: blocks(['mv_avanti', 'mv_indietro', 'mv_gira', 'mv_casa']) },
        { kind: 'category', name: 'Parla', colour: TALK, contents: blocks(['dici']) },
        { kind: 'category', name: 'Controllo', colour: CTRL, contents: blocks(['aspetta', 'ripeti']) },
      ],
    };
    document.getElementById('blockly').innerHTML = '';
    ws = B.inject('blockly', {
      toolbox, renderer: 'zelos', trashcan: true, sounds: false,
      zoom: { controls: true, wheel: true, startScale: 0.8, maxScale: 1.6, minScale: 0.4 },
      move: { scrollbars: true, drag: true, wheel: false },
    });
    B.serialization.workspaces.load(load() || defaultState, ws);
    ws.addChangeListener(e => { if (!e.isUiEvent) save(B.serialization.workspaces.save(ws)); });
  }

  // ---------- esecuzione ----------
  const highlight = id => { try { ws?.highlightBlock(id || null); } catch { /* niente */ } };
  async function exec(b) {
    highlight(b.id);
    const f = b.fields || {};
    if (b.type.startsWith('act_')) return lab.runAction(b.type.slice(4));
    switch (b.type) {
      case 'mv_avanti': return lab.move(+f.N || 1);
      case 'mv_indietro': return lab.move(-(+f.N || 1));
      case 'mv_gira': return lab.turn(f.DIR === 'sx' ? 90 : -90);
      case 'mv_casa': return lab.home();
      case 'dici': { const t = String(f.TXT || ''); robot.say(t, Math.max(2, t.length * 0.08)); return sleep(Math.max(1500, t.length * 75)); }
      case 'aspetta': return sleep((+f.S || 1) * 1000);
      case 'ripeti': for (let i = 0; i < (+f.N || 1) && !stopped; i++) await runChain(b.inputs?.DO?.block); return;
    }
  }
  async function runChain(b) { while (b && !stopped) { await exec(b); b = b.next?.block; } }

  async function run() {
    if (running) return;
    const st = ws ? window.Blockly.serialization.workspaces.save(ws) : (load() || defaultState);
    const starts = (st.blocks?.blocks || []).filter(b => b.type === 'start').sort((a, b) => (a.y || 0) - (b.y || 0));
    if (!starts.length) { robot.say('Metti il blocco "▶ quando premo Avvia" in cima al programma!', 4); return; }
    stopped = false; setRunning(true);
    try { for (const s of starts) await runChain(s.next?.block); }
    finally {
      highlight(null); setRunning(false);
      if (!stopped) robot.say('Programma finito!', 2.5);
    }
  }
  function stop() { stopped = true; lab.stopAll(); highlight(null); }

  // ---- per l'editor nel visore: stesso programma, letto e scritto nello stesso salvataggio ----
  const currentState = () => (ws ? window.Blockly.serialization.workspaces.save(ws) : (load() || defaultState));
  function setState(st) {
    save(st);
    if (ws) window.Blockly.serialization.workspaces.load(st, ws); // se l'editor del PC è aperto, si aggiorna anche lui
  }

  return {
    open, close, run, stop, isOpen: () => document.body.classList.contains('coding'),
    isRunning: () => running,
    getCards: () => cardsFromState(currentState()),
    setCards: cards => setState(stateFromCards(cards)),
    resetExample: () => setState(defaultState),
  };
}
