// Slide interattive per spiegare ai bambini l'IA, gli LLM, il vibe coding e il gioco "Crea il tuo gioco con AIBI".
// Pensate anche per chi NON sa leggere e ha poca attenzione: poche parole e tante immagini (le frasi le legge l'adulto),
// attività brevi, pause in cui si fa il robot, stelline premio.
// Riusa i moduli del gioco (sfide, comprensione delle frasi, codice, pulsanti a immagini, suoni). Le slide non parlano.
// Nessun dato salvato.
import { CHALLENGES, DISCUSS, SHORT } from '../js/challenges.js';
import { understand } from '../js/understand.js';
import { newSpec, clone, applyChange } from '../js/spec.js';
import { generate, diff, highlight } from '../js/codegen.js';
import { renderPanel, answersFor } from '../js/pictures.js';
import { unlockAudio, beep, sfx, tone } from '../js/chat.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };

// ---------------- stelline e coriandoli ----------------
// le slide non parlano: "say" anima solo la bocca di AIBI (cosa dire è nelle note per l'adulto, tasto N)
function say(text) {
  if (!text) return;
  const root = roots[cur];
  if (root) $$('.bot', root).forEach((b) => { b.classList.add('talk'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('talk'), Math.min(9000, 400 + text.length * 60)); });
}
let stars = 0;
const earned = new Set();
function earn(key) {
  if (key && earned.has(key)) return;
  if (key) earned.add(key);
  stars++;
  const el = $('#stars');
  el.textContent = '⭐ ' + stars;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  [988, 1319, 1568].forEach((f, i) => tone(f, 0.12, 0.06, 'triangle', i * 0.08));
}
function confetti(root) {
  const colors = ['#ff5d5d', '#ffd23f', '#4d8dff', '#2fbf71', '#b08cff', '#ff8ad8'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 1600 + 'px';
    c.style.background = pick(colors);
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    root.appendChild(c);
    setTimeout(() => c.remove(), 3800);
  }
  sfx.win();
}

// carte da girare: si legge il retro quando si apre; quando sono tutte aperte, una stellina
function flipCards(items, { cols = items.length, height = 300 } = {}) {
  return `<div class="grow" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;align-content:center">${items.map((it, i) => `
    <div class="flip" style="height:${height}px" data-back="${esc(it.say || plain(it.back))}"><div class="in">
      <div class="face front"><div class="ico">${it.ico || '💬'}</div><b>${it.front || 'Domanda ' + (i + 1)}</b><span style="font-size:40px">👆</span></div>
      <div class="face back ${it.cls || ''}">${it.back}</div>
    </div></div>`).join('')}</div>`;
}
function bindFlips(root, key) {
  const flips = $$('.flip', root);
  flips.forEach((f) => (f.onclick = (e) => {
    e.stopPropagation();
    f.classList.toggle('open');
    beep();
    if (f.classList.contains('open')) { say(f.dataset.back); f.dataset.seen = '1'; }
    if (flips.every((x) => x.dataset.seen)) earn(key || 'flip' + root.dataset.i);
  }));
}

// ---------------- "fai tu l'LLM": un mini modello di linguaggio ----------------
const NEXT = {
  un: [['drago', 38], ['robot', 30], ['gatto', 22], ['frigorifero', 10]],
  drago: [['che', 46], ['verde', 30], ['molto', 16], ['ballerino', 8]],
  robot: [['che', 50], ['gentile', 28], ['molto', 15], ['arrabbiato', 7]],
  gatto: [['che', 48], ['nero', 30], ['molto', 15], ['astronauta', 7]],
  frigorifero: [['che', 45], ['parlante', 30], ['molto', 15], ['magico', 10]],
  molto: [['curioso', 40], ['goloso', 35], ['timido', 25]],
  che: [['viveva', 44], ['sognava', 26], ['volava', 20], ['cantava', 10]],
  viveva: [['in', 55], ['sulla', 30], ['dentro', 15]],
  sognava: [['di', 75], ['sempre', 25]],
  sempre: [['di', 100]],
  volava: [['sopra', 50], ['tra', 30], ['in', 20]],
  cantava: [['sotto', 45], ['in', 35], ['per', 20]],
  in: [['una', 45], ['un', 35], ['mezzo', 20]],
  una: [['grotta', 40], ['casa', 35], ['nuvola', 25]],
  sulla: [['luna', 45], ['montagna', 35], ['spiaggia', 20]],
  dentro: [['un', 60], ['una', 40]],
  di: [['volare', 40], ['diventare', 35], ['mangiare', 25]],
  volare: [['sopra', 60], ['tra', 40]],
  diventare: [['un', 70], ['una', 30]],
  mangiare: [['la', 50], ['il', 50]],
  sopra: [['il', 60], ['la', 40]], tra: [['le', 55], ['gli', 45]], sotto: [['il', 50], ['la', 50]],
  per: [['tutti', 60], ['il', 40]], mezzo: [['al', 100]],
  il: [['mare', 40], ['bosco', 35], ['castello', 25]], la: [['città', 45], ['luna', 35], ['scuola', 20]],
  le: [['nuvole', 60], ['stelle', 40]], gli: [['alberi', 70], ['uccelli', 30]], al: [['bosco', 60], ['mare', 40]],
};
const ENDS = new Set(['grotta', 'casa', 'nuvola', 'luna', 'montagna', 'spiaggia', 'mare', 'bosco', 'castello', 'città', 'scuola', 'nuvole', 'stelle', 'alberi', 'uccelli', 'tutti']);
const EMO = {
  drago: '🐉', robot: '🤖', gatto: '🐱', frigorifero: '🧊', verde: '🟢', molto: '➕', ballerino: '💃', gentile: '😊', arrabbiato: '😠', nero: '⚫', astronauta: '🧑‍🚀', parlante: '🗣️', magico: '✨',
  curioso: '🧐', goloso: '🍰', timido: '🙈', che: '👉', viveva: '🏠', sognava: '💭', volava: '🕊️', cantava: '🎤', in: '📍', sulla: '⬇️', dentro: '📦', di: '➡️', sempre: '🔁',
  sopra: '⬆️', tra: '↔️', sotto: '⬇️', per: '🎁', mezzo: '🎯', una: '1️⃣', un: '1️⃣', grotta: '🕳️', casa: '🏡', nuvola: '☁️', luna: '🌙', montagna: '⛰️', spiaggia: '🏖️',
  volare: '🕊️', diventare: '✨', mangiare: '🍽️', il: '👉', la: '👉', le: '👉', gli: '👉', al: '👉', mare: '🌊', bosco: '🌲', castello: '🏰', città: '🏙️', scuola: '🏫',
  nuvole: '☁️', stelle: '⭐', alberi: '🌳', uccelli: '🐦', tutti: '👨‍👩‍👧‍👦',
};
const START = ['C’era', 'una', 'volta', 'un'];
const optionsFor = (w) => (ENDS.has(w) ? null : NEXT[w] || [['che', 100]]);
const optionsNow = (words) => {
  const o = optionsFor(words[words.length - 1]);
  if (!o || words.length < 12) return o;
  const ends = o.filter(([w]) => ENDS.has(w));
  return ends.length ? ends : o;
};
function sample(opts, mode) {
  if (mode === 'top') return opts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
  for (const [w, p] of opts) { r -= p; if (r <= 0) return w; }
  return opts[0][0];
}
function writeStory(mode) {
  const words = [...START];
  while (words.length < 30) { const o = optionsNow(words); if (!o) break; words.push(sample(o, mode)); }
  return words.join(' ') + '.';
}

const TURTLE = { quadrato: { n: 4, step: 200, turn: 90, ico: '⬜' }, triangolo: { n: 3, step: 240, turn: 120, ico: '🔺' }, stella: { n: 5, step: 260, turn: 144, ico: '⭐' } };

// pause in cui il bambino fa il robot: l'adulto (o AIBI) dà i comandi, cioè il "codice"
const PAUSES = [
  [['🧍', 'In piedi!'], ['⬆️⬆️', 'Due passi avanti'], ['↪️', 'Gira a destra'], ['🦘', 'Salta!'], ['🤖👋', 'Saluta come un robot'], ['🪑', 'Seduto!']],
  [['🧍', 'In piedi!'], ['🔁', 'Ripeti 4 volte:'], ['⬆️', 'Un passo avanti'], ['↪️', 'Gira a destra'], ['⬆️', 'Un passo avanti'], ['↪️', 'Gira a destra'], ['⬆️', 'Un passo avanti'], ['↪️', 'Gira a destra'], ['⬆️', 'Un passo avanti'], ['↪️', 'Gira a destra'], ['⬜', 'Hai fatto un quadrato!'], ['🪑', 'Seduto!']],
  [['🙌', 'Braccia in alto!'], ['👏', 'Batti le mani tre volte'], ['🌀', 'Fai una giravolta'], ['🤖', 'Balla come un robot'], ['🧊', 'Statua! Fermo!'], ['🪑', 'Seduto!']],
];
function pauseSlide(k, title, intro, notes) {
  const steps = PAUSES[k];
  return {
    sec: k === 2 ? 'Dopo il gioco' : k === 1 ? 'Vibe coding' : 'IA e LLM', cls: 'sun',
    html: () => `<div class="head"><p class="eyebrow">Pausa robot 🤖</p><h2>${title}</h2></div>
      <div class="row grow" style="gap:40px">
        <div class="cmd grow" id="cmd"><div class="ico-xl">🤖</div><p>Pronti?</p></div>
        <div class="col" style="flex:none;width:360px;justify-content:center;align-items:center;gap:30px">
          <button class="btn huge green" id="pGo">▶ Via!</button>
          <button class="btn light" id="pStop">⏸ Ferma</button>
          <div class="steps" id="pSteps">${steps.map(() => '<i></i>').join('')}</div>
        </div>
      </div>`,
    init(root) {
      let run = 0;
      const show = (i) => {
        const [ico, txt] = steps[i];
        const box = $('#cmd', root);
        box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
        box.innerHTML = `<div class="ico-xl">${ico}</div><p>${esc(txt)}</p>`;
        $$('#pSteps i', root).forEach((d, j) => (d.className = j < i ? 'done' : j === i ? 'cur' : ''));
        say(txt);
        tone(660, 0.1, 0.06, 'square');
      };
      $('#pGo', root).onclick = async () => {
        const my = ++run;
        for (let i = 0; i < steps.length; i++) { if (my !== run || roots[cur] !== root) return; show(i); await wait(3300); }
        if (my !== run) return;
        $$('#pSteps i', root).forEach((d) => (d.className = 'done'));
        $('#cmd', root).innerHTML = '<div class="ico-xl">🎉</div><p>Bravissimo robot!</p>';
        say('Bravissimo robot! Hai eseguito tutto il programma!');
        confetti(root); earn('pause' + k);
      };
      $('#pStop', root).onclick = () => { run++; $('#cmd', root).innerHTML = '<div class="ico-xl">⏸</div><p>Pausa</p>'; };
    },
    say: intro,
    notes,
  };
}

// ---------------- quiz con immagini ----------------
const QUIZ = [
  { q: 'Come risponde un LLM?', o: [['🧠', 'Pensa come noi'], ['🔤➡️', 'Una parola dopo l’altra']], a: 1, why: 'Sceglie una parola dopo l’altra.' },
  { q: 'L’intelligenza artificiale sbaglia?', o: [['💯', 'Mai'], ['⚠️', 'Sì, a volte']], a: 1, why: 'Anche le IA sbagliano!' },
  { q: 'Che cos’è il vibe coding?', o: [['🎵', 'Ascoltare musica'], ['🗣️💻', 'Dire all’IA cosa fare']], a: 1, why: 'Tu dici cosa vuoi, l’IA scrive il codice.' },
  { q: 'Quale richiesta è più chiara?', o: [['✨❓', 'Fallo più bello'], ['🐱🟥', 'Fai il gatto rosso']], a: 1, why: 'Dice proprio cosa vuoi.' },
  { q: 'AIBI è…', o: [['🧑', 'Una persona'], ['🤖📏', 'Un robot con le regole']], a: 1, why: 'AIBI segue regole scritte da una persona.' },
  { q: 'Se l’IA è sicurissima, ha ragione?', o: [['👍', 'Sì, sempre'], ['🔍', 'Bisogna controllare']], a: 1, why: 'Bisogna sempre controllare.' },
  { q: 'Cosa NON dire mai a un chatbot?', o: [['🏠', 'Dove abito'], ['🐉', 'Inventa una storia']], a: 0, why: 'Dove abiti è un segreto!' },
  { q: 'L’IA ha scritto il codice. E adesso?', o: [['🎮', 'Provo se funziona'], ['😴', 'Ho finito']], a: 0, why: 'Si prova sempre!' },
  { q: 'Come ha imparato un LLM?', o: [['📚', 'Leggendo tantissimo'], ['📺', 'Guardando i cartoni']], a: 0, why: 'Ha letto tantissimi testi.' },
  { q: 'Chi decide come è il gioco?', o: [['🤖', 'L’IA'], ['🧒', 'Io!']], a: 1, why: 'Le idee sono tue!' },
];

const PREVIEW = [[0, '🐱🌌'], [1, '🏃🦘'], [2, '⭐🍎'], [3, '☄️❤️'], [4, '⚠️🤔'], [6, '🏆⏱️']];

// ---------------- le slide ----------------
const SLIDES = [
  // ===== Benvenuti =====
  {
    sec: 'Benvenuti', cls: 'dark',
    html: () => `<div class="row grow" style="align-items:center;gap:70px">
      <div class="col" style="gap:28px"><p class="eyebrow">Oggi</p>
        <h1>Parliamo con le IA e creiamo un gioco!</h1>
        <p class="big muted">👆 Tocca e scopri!</p></div>
      <div class="bot float" data-say="Ciao! Io sono AIBI!"><span></span><span></span></div></div>`,
    say: 'Ciao! Io sono AIBI. Oggi giochiamo con le intelligenze artificiali e creiamo un videogioco! Puoi toccare le cose per ascoltarle.',
    notes: 'Le slide non parlano: leggi tu le frasi al bambino (il testo “da dire” è qui sotto, in ogni slide). In basso ⭐ conta le stelline. Fai toccare AIBI al bambino.',
  },
  {
    sec: 'Benvenuti',
    html: () => `<div class="head"><p class="eyebrow">Cosa facciamo</p><h2>Oggi facciamo…</h2></div>
      <div class="row grow" style="align-items:center">
        ${[['🧠', 'Cos’è un’IA'], ['🤖', 'Fare il robot'], ['🪄', 'Il vibe coding'], ['🎮', 'Il gioco'], ['🏆', 'Il quiz']]
          .map(([i, t]) => `<div class="card frag" data-say="${t}" style="flex:1;align-items:center;text-align:center;padding:40px 16px"><div class="ico-l">${i}</div><h3>${t}</h3></div>`).join('')}
      </div>`,
    say: 'Oggi scopriamo cos’è un’intelligenza artificiale, facciamo il robot, impariamo il vibe coding, giochiamo e alla fine facciamo un quiz!',
    notes: 'Freccia → per far comparire le tappe una alla volta. Quando il bambino tocca una carta, leggigliela tu.',
  },
  {
    sec: 'Benvenuti',
    html: () => `<div class="head"><p class="eyebrow">Parliamone</p><h2>Prima di cominciare…</h2></div>
      ${flipCards(DISCUSS.start.questions.map((q, i) => ({ ico: ['🤔', '💬'][i], front: 'Tocca!', back: `<p class="big">${esc(q)}</p>` })), { height: 420 })}`,
    init: (root) => bindFlips(root),
    say: 'Prima di cominciare, parliamone! Tocca le carte.',
    notes: 'Leggi tu le domande quando le carte si girano. Lascia rispondere a voce, senza correggere: serve a capire cosa pensa il bambino dell’IA.',
  },

  // ===== IA e LLM =====
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco</p><h2>È intelligenza artificiale?</h2></div>
      ${flipCards([
        { ico: '📱', front: 'Telefono', back: '<p class="ico-l">✅</p><p>Sì! Indovina le parole.</p>', cls: 'ok' },
        { ico: '🧮', front: 'Calcolatrice', back: '<p class="ico-l">❌</p><p>No. Fa solo i conti.</p>', cls: 'no' },
        { ico: '✨', front: 'Gemini', back: '<p class="ico-l">✅</p><p>Sì! Scrive e risponde.</p>', cls: 'ok' },
        { ico: '🚦', front: 'Semaforo', back: '<p class="ico-l">❌</p><p>No. Ha un timer.</p>', cls: 'no' },
        { ico: '📺', front: 'Video consigliati', back: '<p class="ico-l">✅</p><p>Sì! Impara cosa ti piace.</p>', cls: 'ok' },
        { ico: '🔦', front: 'Torcia', back: '<p class="ico-l">❌</p><p>No. Si accende e basta.</p>', cls: 'no' },
        { ico: '🗺️', front: 'Navigatore', back: '<p class="ico-l">🤏</p><p>Un pochino!</p>', cls: 'mid' },
        { ico: '🤖', front: 'AIBI', back: '<p class="ico-l">🤏</p><p>Un’IA finta, con le regole.</p>', cls: 'mid' },
      ], { cols: 4, height: 260 })}`,
    init: (root) => bindFlips(root),
    say: 'È intelligenza artificiale? Prima indovina, poi tocca la carta!',
    notes: 'Prima fai indovinare (pollice su o giù), poi gira la carta e leggi la risposta. Messaggio: un’IA impara dagli esempi; una macchina normale segue regole fisse.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Che cos’è un LLM</p><h2>Come impara Gemini</h2></div>
      <div class="row grow" style="align-items:center;gap:20px">
        <div class="card frag" data-say="Legge tantissimi libri e testi." style="flex:1;align-items:center;text-align:center"><div class="ico-l">📚📚</div><h3>Legge tantissimo</h3></div>
        <p class="frag" style="font-size:70px">➜</p>
        <div class="card frag" data-say="Impara quali parole stanno bene insieme." style="flex:1;align-items:center;text-align:center"><div class="ico-l">🧩</div><h3>Impara le parole</h3></div>
        <p class="frag" style="font-size:70px">➜</p>
        <div class="card frag" data-say="Poi scrive, una parola dopo l’altra." style="flex:1;align-items:center;text-align:center"><div class="ico-l">💬</div><h3>Scrive una parola alla volta</h3></div>
      </div>`,
    say: 'Gemini è un LLM. Prima legge tantissimo, poi impara quali parole stanno bene insieme, e alla fine scrive una parola dopo l’altra.',
    notes: 'LLM = Large Language Model, “grande modello del linguaggio”. Paragone: “Se dico ‘C’era una volta…’, tu come continui? Un LLM fa lo stesso.” Freccia → per i passi.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco</p><h2>Fai tu l’LLM: scegli la parola dopo!</h2></div>
      <div class="row grow">
        <div class="col" style="flex:1.1">
          <div class="card grow" style="justify-content:center"><div class="story" id="story" data-say=""></div></div>
          <div class="row" style="gap:14px"><button class="btn" id="wTop">🎯 La più probabile</button><button class="btn pink" id="wRnd">🎲 A sorte</button><button class="btn light" id="wReset">↺</button></div>
        </div>
        <div class="col"><div class="opts" id="opts"></div></div>
      </div>`,
    init(root) {
      let words;
      const story = $('#story', root), opts = $('#opts', root);
      const render = (added) => {
        story.innerHTML = words.map((w, i) => (i === words.length - 1 && added ? `<span class="new">${esc(w)}</span>` : esc(w))).join(' ');
        story.dataset.say = words.join(' ');
        const o = optionsNow(words);
        if (!o || words.length >= 30) {
          story.innerHTML += '.';
          opts.innerHTML = '<div class="card" style="align-items:center;text-align:center"><div class="ico-l">🎉</div><h3>Fine della storia!</h3></div>';
          say(words.join(' ') + '. Fine! Hai scritto una storia come un LLM!');
          earn('story');
          return;
        }
        opts.innerHTML = o.map(([w, p]) => `<button class="opt" data-w="${esc(w)}"><span class="word-ico">${EMO[w] || '💬'}</span><span class="word">${esc(w)}</span><span class="barw"><span class="bar" style="width:0%"></span></span><span class="pct">${p}%</span></button>`).join('');
        requestAnimationFrame(() => $$('.opt', opts).forEach((b, i) => ($('.bar', b).style.width = o[i][1] + '%')));
        $$('.opt', opts).forEach((b) => (b.onclick = () => add(b.dataset.w)));
      };
      const add = (w) => { words.push(w); beep(); if (optionsNow(words)) say(w); render(true); };
      const reset = () => { words = [...START]; render(false); };
      $('#wTop', root).onclick = () => { const o = optionsNow(words); if (o) add(sample(o, 'top')); };
      $('#wRnd', root).onclick = () => { const o = optionsNow(words); if (o) add(sample(o, 'rnd')); };
      $('#wReset', root).onclick = reset;
      reset();
    },
    say: 'Facciamo finta di essere un LLM! Tocca la parola che viene dopo. La barra lunga vuol dire: molto probabile.',
    notes: 'Il bambino tocca le parole (con l’immagine accanto): leggi tu le parole. La barra più lunga = la parola più probabile. Alla fine leggi tutta la storia. Le probabilità sono inventate per il gioco.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco</p><h2>Stessa domanda, storie diverse</h2></div>
      <div class="row grow">
        <div class="col" style="flex:1.4">
          <div class="row" style="gap:14px"><button class="btn" id="gTop">🎯 Sempre uguale</button><button class="btn pink" id="gRnd">✨ Con fantasia</button></div>
          <div class="col" id="stories" style="gap:14px"></div>
        </div>
        <div class="card" style="flex:.7;align-items:center;justify-content:center;text-align:center" data-say="Se chiedi la stessa cosa due volte, la risposta può cambiare!"><div class="ico-l">🔁❓</div><h3>Chiedi due volte: la risposta cambia!</h3></div>
      </div>`,
    init(root) {
      const box = $('#stories', root);
      let n = 0;
      const add = (mode) => {
        const s = writeStory(mode);
        const div = document.createElement('div');
        div.className = 'bubble';
        div.style.fontSize = '27px';
        div.dataset.say = s;
        div.textContent = (mode === 'top' ? '🎯 ' : '✨ ') + s;
        box.prepend(div);
        while (box.children.length > 4) box.lastChild.remove();
        say(s);
        if (++n >= 3) earn('stories');
      };
      $('#gTop', root).onclick = () => add('top');
      $('#gRnd', root).onclick = () => add('rnd');
    },
    say: 'Tocca “sempre uguale” più volte: la storia non cambia. Poi tocca “con fantasia”: ogni volta è diversa!',
    notes: 'Per i più grandi: il “caso” si chiama temperatura. Per questo Gemini può rispondere in modo diverso alla stessa domanda.',
  },
  pauseSlide(0, 'Tu sei il robot!', 'Pausa robot! Adesso tu sei il robot. Io ti do i comandi: ascolta e fai quello che dico!',
    'Leggi tu ogni comando quando compare (3 secondi ciascuno): il bambino lo esegue. Collegamento: i comandi sono un programma, il bambino è il computer che lo esegue.'),
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Attenzione</p><h2>Un’IA non è una persona</h2></div>
      <div class="row grow">
        <div class="card frag" style="flex:1;background:#e3f8ec;align-items:center;text-align:center;justify-content:center" data-say="L’IA sa scrivere storie, rispondere e aiutarti."><div class="ico-l">✍️💬</div><h3>✅ Sa scrivere e rispondere</h3></div>
        <div class="card frag" style="flex:1;background:#ffe9ef;align-items:center;text-align:center;justify-content:center" data-say="Non pensa come noi e non prova emozioni."><div class="ico-l">🧠❤️</div><h3>❌ Non pensa e non sente</h3></div>
        <div class="card frag" style="flex:1;background:#fff5d6;align-items:center;text-align:center;justify-content:center" data-say="Non è viva. È uno strumento, come una matita magica."><div class="ico-l">🌱</div><h3>❌ Non è viva</h3></div>
      </div>`,
    say: 'Un’intelligenza artificiale sa scrivere e rispondere. Ma non pensa come noi, non prova emozioni e non è viva.',
    notes: 'Freccia → per le tre carte. Domanda: “Se un chatbot ti dice ‘ti voglio bene’, lo pensa davvero?”',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco</p><h2>Vero 👍 o falso 👎?</h2></div>
      <div class="col grow" id="hall" style="justify-content:center;gap:18px;min-height:0"></div>`,
    init(root) {
      const items = [
        ['Il gatto è un animale.', true, 'È vero!'],
        ['La Torre di Pisa è a Roma. Sono sicurissimo!', false, 'È falso! È a Pisa. AIBI era sicuro, ma ha sbagliato!'],
        ['Il ragno ha sei zampe.', false, 'È falso! Il ragno ha otto zampe.'],
        ['Gemini non sbaglia mai.', false, 'È falso! Tutte le IA possono sbagliare.'],
      ];
      const box = $('#hall', root);
      let right = 0;
      box.innerHTML = items.map(([t], i) => `<div class="row" style="align-items:center;gap:18px" data-row="${i}">
        <div class="bubble" style="flex:1;font-size:30px" data-say="${esc(t)}">${esc(t)}</div>
        <button class="btn green" data-v="1" style="font-size:40px">👍</button><button class="btn pink" data-v="0" style="font-size:40px">👎</button>
        <div class="res" style="width:90px;font-size:64px;text-align:center"></div></div>`).join('');
      $$('[data-row]', box).forEach((row) => {
        const [t, truth, why] = items[+row.dataset.row];
        $$('[data-v]', row).forEach((b) => (b.onclick = () => {
          if (row.dataset.done) return;
          const ok = (b.dataset.v === '1') === truth;
          $('.res', row).textContent = ok ? '✅' : '❌';
          say((ok ? 'Esatto! ' : 'No! ') + why);
          ok ? sfx.win() : sfx.bump();
          row.dataset.done = '1';
          if (ok && ++right >= 3) earn('hall');
        }));
      });
    },
    say: 'Vero o falso? Ascolta AIBI e tocca il pollice su se è vero, il pollice giù se è falso. Attento: AIBI a volte sbaglia, anche quando è sicurissimo!',
    notes: 'Leggi tu ogni frase. Messaggio: “sicuro” non vuol dire “giusto”. Si chiamano allucinazioni. Nel gioco AIBI sbaglierà apposta in due sfide.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Come si chiede</p><h2>Chiedi bene!</h2></div>
      <div class="row grow">
        <div class="card" style="flex:1;align-items:center;text-align:center"><div class="bubble user" data-say="Fammi un disegno.">🗣️ “Fammi un disegno”</div>
          <button class="btn light" id="pVague">Chiedi 👉</button><div id="rVague" style="min-height:220px;font-size:34px"></div></div>
        <div class="card" style="flex:1;align-items:center;text-align:center"><div class="bubble user" data-say="Disegna un gatto arancione che dorme su un cuscino blu.">🗣️ “Un gatto arancione che dorme su un cuscino blu”</div>
          <button class="btn" id="pClear">Chiedi 👉</button><div id="rClear" style="min-height:220px;font-size:34px"></div></div>
      </div>`,
    init(root) {
      let both = 0;
      $('#pVague', root).onclick = () => { const e = pick(['🏠', '🌳', '🐟', '🚗', '⛵']); $('#rVague', root).innerHTML = `<div style="font-size:120px">${e}</div>🤔 Era questo?`; say('Cosa disegno? Non lo so! Ecco… era questo?'); sfx.bump(); if (++both === 2) earn('prompt'); };
      $('#pClear', root).onclick = () => { $('#rClear', root).innerHTML = '<div style="font-size:120px">🐈💤</div>🟧 su 🟦 Eccolo!'; say('Eccolo! Proprio come l’hai chiesto!'); sfx.win(); if (++both === 2) earn('prompt'); };
    },
    say: 'Se chiedi una cosa vaga, l’IA deve indovinare. Se chiedi bene, ottieni quello che vuoi. Prova i due pulsanti!',
    notes: 'Il messaggio che si scrive a un’IA si chiama “prompt”. Premi più volte la richiesta vaga: esce sempre una cosa diversa.',
  },

  // ===== Vibe coding =====
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Il codice</p><h2>Il codice: comandi per il computer</h2></div>
      <div class="row grow">
        <div class="col"><div class="code" id="tCode" style="font-size:34px;padding:24px 0"></div>
          <div class="row" style="gap:12px">${Object.entries(TURTLE).map(([k, p]) => `<button class="btn light" data-p="${k}" style="font-size:40px">${p.ico}</button>`).join('')}<button class="btn green" id="tRun" style="font-size:36px">▶ Via!</button></div>
        </div>
        <div class="card" style="flex:none;align-items:center;justify-content:center"><canvas id="tCanvas" width="560" height="560"></canvas></div>
      </div>`,
    init(root) {
      let prog = 'quadrato', running = false;
      const codeBox = $('#tCode', root), cv = $('#tCanvas', root), g = cv.getContext('2d');
      const lines = () => { const p = TURTLE[prog]; return [`ripeti ${p.n} volte:`, `  avanti(${p.step})`, `  gira_a_destra(${p.turn})`]; };
      const showCode = (cur = -1) => { codeBox.innerHTML = lines().map((l, i) => `<div class="ln${i === cur ? ' cur' : ''}">${highlight(l)}</div>`).join(''); };
      const turtle = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.font = '48px "Segoe UI Emoji"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐢', 0, 0); g.restore(); };
      const verts = () => { const p = TURTLE[prog]; let x = 0, y = 0, a = 0; const v = [[0, 0]]; for (let i = 0; i < p.n; i++) { x += Math.cos(a) * p.step; y += Math.sin(a) * p.step; v.push([x, y]); a += p.turn * Math.PI / 180; } return v; };
      const reset = () => { g.clearRect(0, 0, 560, 560); showCode(); const v = verts(); const xs = v.map((p) => p[0]), ys = v.map((p) => p[1]); const ox = 280 - (Math.min(...xs) + Math.max(...xs)) / 2, oy = 280 - (Math.min(...ys) + Math.max(...ys)) / 2; turtle(ox, oy, 0); return [ox, oy]; };
      $$('[data-p]', root).forEach((b) => (b.onclick = () => { if (running) return; prog = b.dataset.p; reset(); say(prog); }));
      $('#tRun', root).onclick = async () => {
        if (running) return; running = true;
        const [ox, oy] = reset(); const p = TURTLE[prog];
        let x = 0, y = 0, a = 0; const done = [];
        for (let i = 0; i < p.n; i++) {
          showCode(1); say('avanti');
          const nx = x + Math.cos(a) * p.step, ny = y + Math.sin(a) * p.step;
          for (let t = 1; t <= 24; t++) {
            g.clearRect(0, 0, 560, 560);
            g.strokeStyle = '#6a4cff'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(ox, oy);
            for (const [dx, dy] of done) g.lineTo(ox + dx, oy + dy);
            g.lineTo(ox + x + (nx - x) * t / 24, oy + y + (ny - y) * t / 24); g.stroke();
            turtle(ox + x + (nx - x) * t / 24, oy + y + (ny - y) * t / 24, a);
            await wait(30);
          }
          x = nx; y = ny; done.push([x, y]);
          showCode(2); say('gira'); a += p.turn * Math.PI / 180; sfx.turn(); await wait(700);
        }
        showCode(); running = false; say('Fatto!'); earn('turtle');
      };
      reset();
    },
    say: 'Il codice è una lista di comandi. Scegli una forma e tocca Via: la tartaruga fa esattamente quello che c’è scritto!',
    notes: 'Il bambino sceglie la forma (⬜ 🔺 ⭐) e tocca ▶ Via!. La riga gialla è il comando che la tartaruga sta eseguendo.',
  },
  pauseSlide(1, 'Tu sei la tartaruga!', 'Adesso tu sei la tartaruga! Ascolta il programma e fai un quadrato con il tuo corpo.',
    'Serve spazio per 1 passo in ogni direzione. È lo stesso programma del quadrato della slide prima: ripeti 4 volte avanti e gira a destra.'),
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Il vibe coding</p><h2>Dici a parole, l’IA scrive il codice</h2></div>
      <div class="row grow" style="align-items:center;justify-content:center;gap:16px">
        ${[['🗣️', 'Dico cosa voglio'], ['🤖', 'L’IA scrive il codice'], ['🎮', 'Provo'], ['🔧', 'Correggo']]
          .map(([i, t], k) => `${k ? '<p style="font-size:60px">➜</p>' : ''}<div class="card frag" data-say="${t}" style="flex:1;align-items:center;text-align:center;padding:36px 14px"><div class="ico-l">${i}</div><h3>${k + 1}. ${t}</h3></div>`).join('')}
        <p class="frag" style="font-size:80px" data-say="E poi si ricomincia!">🔁</p>
      </div>`,
    say: 'Il vibe coding funziona così: dico cosa voglio, l’intelligenza artificiale scrive il codice, io provo e, se serve, correggo. E si ricomincia!',
    notes: 'Freccia → per i quattro passi. Sottolinea “Provo”: l’IA può sbagliare, si controlla sempre. Il termine “vibe coding” è nato nel 2025.',
  },
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Prova!</p><h2>Tocca le figure: AIBI scrive il codice</h2></div>
      <div class="row grow">
        <div class="col" style="flex:1.1"><div class="pics" id="dPics"></div>
          <div class="bubble" id="dReply" style="font-size:26px" data-say="Tocca un personaggio!">👆 Tocca un personaggio!</div></div>
        <div class="col"><div class="tokens" id="dTok" style="min-height:52px"></div><div class="code grow" id="dCode" style="font-size:19px"></div></div>
      </div>`,
    init(root) {
      let spec = newSpec(), code = generate(spec), pending = null, uses = 0;
      const codeBox = $('#dCode', root);
      const showCode = (isNew = code.map(() => false)) => {
        codeBox.innerHTML = code.map((l, i) => `<div class="ln${isNew[i] ? ' new' : ''}">${highlight(l) || ' '}</div>`).join('');
        const first = $('.ln.new', codeBox);
        if (first) codeBox.scrollTop = Math.max(0, first.offsetTop - 40);
      };
      const reply = (t) => { $('#dReply', root).textContent = t; $('#dReply', root).dataset.say = t; say(t); };
      const send = (text) => {
        const p = understand(text, spec);
        const types = new Map(p.matches.map((m) => [m.i, m.type]));
        $('#dTok', root).innerHTML = p.tokens.map((w, i) => `<span class="w${types.get(i) ? ' hit ' + types.get(i) : ''}">${esc(w)}</span>`).join('');
        if (p.kind === 'change' || (p.kind === 'number' && pending)) {
          const changes = p.kind === 'number' ? [{ t: pending.target, kind: pending.kindName, n: p.n }] : p.changes;
          const next = clone(spec);
          const notes = changes.map((c) => applyChange(next, c)).filter(Boolean);
          spec = next; pending = null;
          const lines = generate(spec); const isNew = diff(code, lines); code = lines; showCode(isNew);
          reply(notes.length ? 'Fatto! Ho ' + notes.map((n) => n.replace(/^ho /, '')).join(', ') + '.' : 'È già così!');
          if (++uses >= 3) earn('demo');
        } else if (p.kind === 'clarify') { pending = { ask: p.ask, target: p.target, kindName: p.kindName }; reply('Più bello come? Tocca una figura gialla!'); }
        else if (p.kind === 'undo') reply('Nel gioco vero questo torna indietro!');
        else if (p.kind === 'cannot') reply('I personaggi famosi non si copiano!');
        else reply('Nel gioco vero ti rispondo meglio!');
        panel();
      };
      const panel = () => renderPanel($('#dPics', root), { getSpec: () => spec, onPick: (text) => send(text), speak: null, answers: answersFor(pending, spec) });
      panel(); showCode();
    },
    say: 'Prova! Tocca le figure: io capisco cosa vuoi e scrivo il codice. Le righe verdi sono quelle nuove!',
    notes: 'Sono gli stessi pulsanti del gioco in modalità immagini. A destra: le parole colorate sono quelle che AIBI ha riconosciuto, sotto il codice che ha scritto. Prova ✨ (più bello): AIBI chiede cosa intendi.',
  },
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Due aiutanti</p><h2>AIBI e Gemini</h2></div>
      <div class="row grow">
        <div class="card" style="flex:1;align-items:center;text-align:center;justify-content:center" data-say="Io sono AIBI: un robot finto con le regole. Conosco poche parole e so fare solo il nostro gioco.">
          <div class="bot small"><span></span><span></span></div><h3 style="font-size:44px">AIBI</h3><p class="ico-l">📏🎮</p><p>Regole · solo il nostro gioco</p></div>
        <div class="card" style="flex:1;align-items:center;text-align:center;justify-content:center" data-say="Gemini è un’intelligenza artificiale vera: ha letto tantissimo e sa fare tante cose.">
          <p class="ico-l">✨</p><h3 style="font-size:44px">Gemini</h3><p class="ico-l">📚🌍</p><p>Ha letto tantissimo · sa fare tante cose</p></div>
      </div>
      <p class="big center frag" data-say="Tutti e due possono sbagliare. Controlla sempre!">⚠️ Tutti e due possono sbagliare!</p>`,
    say: 'Io sono AIBI, un robot finto fatto di regole. Gemini è un’intelligenza artificiale vera. Ma tutti e due possiamo sbagliare!',
    notes: 'Tocca le carte per farle leggere. AIBI è una palestra per allenarsi; dopo il gioco proveremo Gemini.',
  },

  // ===== Il gioco =====
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">Il gioco</p><h2>Com’è fatto lo schermo</h2></div>
      <div class="row grow">
        <div class="mock" style="flex:1.3">
          <div class="z" data-z="0"><span class="num">1</span>▶ Gioca · ↶</div>
          <div class="z" data-z="1"><span class="num">2</span>🏆 Sfida 🔊</div>
          <div class="z" data-z="2" style="background:#0b0f2e;color:#fff;font-size:60px"><span class="num">3</span>🐱 ⭐ ☄️</div>
          <div class="z" data-z="4" style="grid-row:2/4;grid-column:2;flex-direction:column;gap:10px;font-size:40px"><span class="num">5</span>🐱 🌌 🎨<br>🏃 ⭐ ☄️</div>
          <div class="z" data-z="3" style="background:#1e1f2e;color:#7fdcff;font-family:Consolas,monospace"><span class="num">4</span>const eroe = …</div>
        </div>
        <div class="card" style="flex:1;align-items:center;justify-content:center;text-align:center" id="zInfo"><div class="ico-l">👆</div><h3>Tocca i numeri!</h3></div>
      </div>`,
    init(root) {
      const Z = [
        ['▶', 'Gioca', 'Questo pulsante fa partire il gioco. La freccia torna indietro.'],
        ['🔊', 'La sfida', 'Qui c’è la sfida. Tocca l’altoparlante per ascoltarla.'],
        ['🎮', 'Il gioco', 'Qui c’è il tuo videogioco. Tocca il gioco prima di usare le frecce.'],
        ['📝', 'Il codice', 'Qui c’è il codice scritto da AIBI. Le righe verdi sono nuove.'],
        ['👆', 'Le figure', 'Qui tocchi le figure per dire ad AIBI cosa vuoi.'],
      ];
      const seen = new Set();
      $$('[data-z]', root).forEach((z) => (z.onclick = () => {
        const [i, t, d] = Z[+z.dataset.z];
        $('#zInfo', root).innerHTML = `<div class="ico-l">${i}</div><h3 style="font-size:44px">${t}</h3>`;
        $$('[data-z]', root).forEach((x) => x.classList.toggle('sel', x === z));
        say(d);
        seen.add(z.dataset.z); if (seen.size === 5) earn('mock');
      }));
    },
    say: 'Questo è lo schermo del gioco. Tocca i numeri per scoprire a cosa serve ogni parte!',
    notes: 'Il bambino tocca i numeri 1→5 e AIBI spiega. La parte 5 è il pannello con le figure (modalità immagini).',
  },
  {
    sec: 'Il gioco',
    keys: true,
    html: () => `<div class="head"><p class="eyebrow">Come si gioca</p><h2>Premi le frecce e lo spazio!</h2></div>
      <div class="row grow" style="align-items:center;justify-content:center;gap:80px">
        <div class="keys"><span></span><div class="key" data-k="ArrowUp">↑</div><span></span><div class="key" data-k="ArrowLeft">←</div><div class="key" data-k="ArrowDown">↓</div><div class="key" data-k="ArrowRight">→</div></div>
        <div class="key space" data-k=" ">🦘 spazio</div>
      </div>
      <p class="small center">Qui le frecce non cambiano pagina: usa ◀ ▶ in basso.</p>`,
    onKey(e, root) {
      const k = $(`[data-k="${e.key === 'Spacebar' ? ' ' : e.key}"]`, root);
      if (!k) return false;
      k.classList.add('down');
      setTimeout(() => k.classList.remove('down'), 160);
      e.key === ' ' ? sfx.turn() : sfx.step();
      root._presses = (root._presses || 0) + 1;
      if (root._presses >= 6) earn('keys');
      return true;
    },
    say: 'Nel gioco le frecce muovono il personaggio e la barra spaziatrice lo fa saltare. Prova a premerle!',
    notes: 'Il bambino prova i tasti: si illuminano. In questa slide si va avanti con ▶ nella barra in basso.',
  },
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">Le sfide</p><h2>Alcune sfide del gioco</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-content:center">
        ${PREVIEW.map(([i, ico]) => `<button class="card" data-pv="${i}" style="align-items:center;text-align:center;${CHALLENGES[i].bug ? 'background:#fff0d6' : ''}"><div class="ico-l">${ico}</div><h3>${esc(CHALLENGES[i].title)}</h3></button>`).join('')}
      </div>
      <p class="big center" data-say="E tante altre sfide!">…e tante altre! 🎉</p>`,
    init(root) {
      const seen = new Set();
      $$('[data-pv]', root).forEach((b) => (b.onclick = () => { say(SHORT[+b.dataset.pv].intro.replace(/^Ciao! Io sono AIBI\. /, '')); seen.add(b.dataset.pv); if (seen.size >= 4) earn('preview'); }));
    },
    say: 'Nel gioco ci sono tante sfide. Tocca una carta per ascoltarla!',
    notes: 'La carta arancione (⚠️) è la sfida in cui AIBI sbaglia apposta: non svelare l’errore. Le sfide in tutto sono 15.',
  },
  {
    sec: 'Il gioco', cls: 'sun',
    html: () => `<div class="head"><p class="eyebrow">Attenzione!</p><h2>A volte AIBI sbaglia apposta!</h2></div>
      <div class="row grow" style="align-items:center;gap:40px">
        <div class="col" style="flex:none;align-items:center"><div class="bot float"><span></span><span></span></div><div class="bubble" data-say="Sono sicurissimo!">😎 Sicurissimo!</div></div>
        <div class="row grow" style="gap:22px">
          <div class="card frag" data-say="Gioca e guarda bene." style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico-l">👀🎮</div><h3>Guarda bene</h3></div>
          <div class="card frag" data-say="Se qualcosa non va, tocca la faccina che pensa." style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico-l">🤔</div><h3>Tocca la faccina</h3></div>
          <div class="card frag" data-say="E dici ad AIBI cosa non va!" style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico-l">💬🤖</div><h3>Dillo ad AIBI</h3></div>
        </div>
      </div>`,
    say: 'Attenzione! A volte sbaglio apposta, anche se sembro sicurissimo. Guarda bene. Se qualcosa non va, tocca la faccina che pensa e dimmelo!',
    notes: 'Non svelare gli errori (sfide 5 e 12). Nel gioco a immagini: pulsante 🤔 → “i punti non salgono” / “non va veloce”.',
  },
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">In due</p><h2>Si gioca insieme</h2></div>
      <div class="row grow" style="align-items:stretch">
        <div class="card" data-say="Uno tocca le figure per AIBI." style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico-xl">👆</div><h3 style="font-size:40px">Uno tocca le figure</h3></div>
        <div class="card" data-say="L’altro gioca con le frecce." style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico-xl">🎮</div><h3 style="font-size:40px">L’altro gioca</h3></div>
        <div class="card" data-say="Poi vi scambiate!" style="flex:1;align-items:center;text-align:center;justify-content:center;background:#fff5d6"><div class="ico-xl">🔄</div><h3 style="font-size:40px">Poi si cambia</h3></div>
      </div>`,
    say: 'Si gioca insieme: uno tocca le figure, l’altro gioca. Poi vi scambiate!',
    notes: 'Con un solo bambino: l’adulto fa una delle due parti.',
  },
  {
    sec: 'Il gioco', cls: 'dark',
    html: () => `<div class="col grow" style="align-items:center;justify-content:center;gap:40px;text-align:center">
        <div class="bot float"><span></span><span></span></div>
        <h1>Giochiamo!</h1>
        <div class="row" style="gap:40px;justify-content:center">
          <a class="btn huge green" href="../?immagini" target="_blank" rel="noopener" style="text-decoration:none">🖼️ Con le figure</a>
          <a class="btn huge light" href="../" target="_blank" rel="noopener" style="text-decoration:none">⌨️ Scrivendo</a>
        </div></div>`,
    say: 'Pronti? Giochiamo!',
    notes: '“Con le figure” apre il gioco in modalità immagini (per chi non sa leggere); “Scrivendo” apre la versione con la chat scritta. Si aprono in una nuova scheda: poi si torna qui.',
  },

  // ===== Dopo il gioco =====
  ...['afterMistake', 'afterMistake2', 'end'].map((key) => ({
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Parliamone</p><h2>${key === 'end' ? 'Ultime domande' : 'AIBI ha sbagliato…'}</h2></div>
      ${flipCards(DISCUSS[key].questions.map((q, i) => ({ ico: ['🤔', '💬', '🧐', '❓'][i], front: 'Tocca!', back: `<p class="big">${esc(q)}</p>` })), { cols: DISCUSS[key].questions.length > 3 ? 2 : DISCUSS[key].questions.length, height: DISCUSS[key].questions.length > 3 ? 250 : 380 })}`,
    init: (root) => bindFlips(root, 'disc-' + key),
    say: key === 'end' ? 'Ultime domande! Tocca le carte.' : 'Parliamone! Tocca le carte.',
    notes: key === 'end'
      ? 'Confronta con le risposte date all’inizio: è cambiato qualcosa? Le risposte si dicono a voce, non vengono salvate.'
      : 'Si parla degli errori di AIBI: come se ne è accorto il bambino, chi deve controllare. Risposte a voce.',
  })),
  pauseSlide(2, 'Festa dei robot!', 'Pausa robot! Facciamo la festa: ascolta e muoviti!', 'Pausa di movimento prima delle ultime attività.'),
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Proviamo Gemini</p><h2>Cosa chiediamo a Gemini?</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
        ${[['🐉', 'Inventa una storia breve con un robot e un drago'], ['📖', 'Spiegami cos’è un LLM come se avessi 8 anni'], ['🎮', 'Scrivi il codice di un gioco in cui un gatto raccoglie le stelle'], ['❓', 'Fammi 3 domande di quiz sui robot'], ['🔁', 'Chiedi la stessa cosa due volte: la risposta cambia?'], ['🕵️', 'Sei sicuro? Controlla la tua risposta']]
          .map(([i, t]) => `<div class="card" data-say="${esc(t)}" style="align-items:center;text-align:center"><div class="ico-l">${i}</div><p style="font-size:24px;flex:1">“${esc(t)}”</p><button class="btn light" data-copy="${esc(t)}" style="font-size:20px;padding:8px 16px">📋 Copia</button></div>`).join('')}
      </div>`,
    init(root) {
      $$('[data-copy]', root).forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '✅ Copiato'; } catch { b.textContent = 'Copia a mano 🙂'; }
        setTimeout(() => (b.textContent = '📋 Copia'), 1600);
      }));
    },
    say: 'Adesso proviamo Gemini, un’intelligenza artificiale vera! Tocca una figura e scegli cosa chiedergli.',
    notes: 'Il bambino sceglie un’immagine (leggi tu la richiesta); l’adulto copia (📋) e incolla in Gemini, poi legge la risposta ad alta voce. Il terzo è vibe coding vero.',
  },
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Regole d’oro</p><h2>Usare l’IA in sicurezza</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-content:center">
        ${[['🤫🏠', 'Non dire chi sei e dove abiti'], ['🔍', 'Controlla sempre'], ['🙋', 'Chiedi a un adulto'], ['🧠', 'Decidi tu']]
          .map(([i, t]) => `<div class="card frag" data-say="${t}" style="align-items:center;text-align:center;justify-content:center;min-height:420px"><div class="ico-l">${i}</div><h3>${t}</h3></div>`).join('')}
      </div>`,
    say: 'Le regole d’oro: non dire chi sei e dove abiti, controlla sempre, chiedi a un adulto, e ricorda: decidi tu!',
    notes: 'Freccia → per le regole. Chiedi al bambino un esempio di cosa non si dice (nome e cognome, indirizzo, scuola, foto).',
  },
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="row" style="align-items:center;justify-content:space-between"><div class="head"><p class="eyebrow">Quiz</p><h2 id="qTitle">Domanda 1</h2></div><div class="dots" id="qDots"></div></div>
      <div class="row" style="align-items:center;gap:18px"><p class="big" id="qText" style="font-weight:800"></p></div>
      <div class="qpic grow" id="qOpts"></div>
      <div class="row" style="align-items:center;gap:20px;min-height:80px"><p class="big grow" id="qWhy"></p><button class="btn" id="qNext" hidden>Avanti ▶</button></div>`,
    init(root) {
      let i = 0, score = 0, order = [];
      const res = [];
      const dots = () => { $('#qDots', root).innerHTML = QUIZ.map((_, k) => `<i class="${res[k] === true ? 'ok' : res[k] === false ? 'ko' : ''}${k === i && res[k] === undefined ? ' cur' : ''}"></i>`).join(''); };
      const read = () => { const q = QUIZ[i]; if (q) say(q.q + ' ' + order.map((k) => q.o[k][1]).join(', oppure, ') + '?'); };
      const show = (readNow) => {
        const q = QUIZ[i];
        order = q.o.map((_, k) => k).sort(() => Math.random() - 0.5);
        $('#qTitle', root).textContent = `Domanda ${i + 1}`;
        $('#qText', root).textContent = q.q;
        $('#qWhy', root).textContent = '';
        $('#qNext', root).hidden = true;
        $('#qOpts', root).innerHTML = order.map((k) => `<button class="qopt" data-o="${k}"><span class="ico-l">${q.o[k][0]}</span>${esc(q.o[k][1])}</button>`).join('');
        $$('[data-o]', root).forEach((b) => (b.onclick = () => {
          const ok = +b.dataset.o === q.a;
          res[i] = ok; if (ok) { score++; earn(); }
          $$('[data-o]', root).forEach((x) => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          $('#qWhy', root).textContent = (ok ? '✅ ' : '❌ ') + q.why;
          say((ok ? 'Bravo! ' : 'Quasi! ') + q.why);
          ok ? sfx.win() : sfx.bump();
          $('#qNext', root).hidden = false;
          $('#qNext', root).textContent = i + 1 < QUIZ.length ? 'Avanti ▶' : 'Fine 🏆';
          dots();
        }));
        dots();
        if (readNow) read();
      };
      root._read = read;
      $('#qNext', root).onclick = () => {
        if (i + 1 < QUIZ.length) { i++; show(true); return; }
        $('#qTitle', root).textContent = 'Fine!';
        $('#qText', root).textContent = `${score} risposte giuste su ${QUIZ.length}!`;
        $('#qOpts', root).innerHTML = `<div class="card" style="grid-column:1/3;align-items:center;justify-content:center"><div class="ico-xl">${score >= 7 ? '🏆' : score >= 4 ? '👏' : '💪'}</div><button class="btn light" id="qAgain">↺ Ancora</button></div>`;
        $('#qWhy', root).textContent = '';
        $('#qNext', root).hidden = true;
        $('#qAgain', root).onclick = () => { i = 0; score = 0; res.length = 0; show(true); };
        say(`Hai risposto bene a ${score} domande su ${QUIZ.length}! Bravissimo!`);
        confetti(root);
      };
      show(false);
    },
    say: '',
    notes: 'Leggi tu domanda e risposte. Il bambino tocca l’immagine giusta. Ogni risposta giusta dà una stellina. Il punteggio non viene salvato.',
  },
  {
    sec: 'Dopo il gioco', cls: 'dark',
    html: () => `<div class="head"><p class="eyebrow">Bravissimo!</p><h2 id="endTitle">Cosa abbiamo imparato</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px;align-content:center">
        ${[['🔤➡️', 'L’IA scrive una parola alla volta'], ['🗣️💻', 'Vibe coding: dico e l’IA scrive'], ['🔍', 'L’IA sbaglia: controlla!'], ['🎯', 'Chiedi bene']]
          .map(([i, t]) => `<div class="card frag" data-say="${t}" style="align-items:center;text-align:center;justify-content:center;min-height:380px"><div class="ico-l">${i}</div><h3>${t}</h3></div>`).join('')}
      </div>`,
    onEnter(root) { $('#endTitle', root).textContent = `Hai raccolto ${stars} stelline! ⭐`; setTimeout(() => confetti(root), 400); },
    say: 'Bravissimo! Oggi hai imparato che l’intelligenza artificiale scrive una parola alla volta, cos’è il vibe coding, che l’IA può sbagliare e che bisogna chiedere bene.',
    notes: 'Riepilogo (freccia → per le carte). Il gioco resta online: si può rigiocare a casa con un adulto.',
  },
];

// ---------------- motore delle slide ----------------
const stage = $('#stage');
const roots = SLIDES.map((s, i) => {
  const d = document.createElement('section');
  d.className = 'slide' + (s.cls ? ' ' + s.cls : '');
  d.innerHTML = s.html();
  d.dataset.i = i;
  stage.appendChild(d);
  return d;
});
const inited = new Set();
let cur = -1;

function fit() {
  const s = Math.min(innerWidth / 1640, (innerHeight - 56) / 930);
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();

function go(i, { back = false } = {}) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i));
  if (i === cur) return;
  if (cur >= 0) roots[cur].classList.remove('on');
  cur = i;
  const root = roots[i], s = SLIDES[i];
  root.classList.add('on');
  $$('.frag', root).forEach((f) => f.classList.toggle('shown', back));
  if (!inited.has(i) && s.init) { inited.add(i); s.init(root); }
  if (s.onEnter) s.onEnter(root);
  $('#count').textContent = `${i + 1} / ${SLIDES.length}`;
  $('#progress i').style.width = ((i + 1) / SLIDES.length) * 100 + '%';
  $('#section').textContent = s.sec;
  $('#notes').innerHTML = `<b>Slide ${i + 1} · note per chi spiega:</b> ${esc(s.notes || '')}${s.say ? '<br><b>Da dire:</b> «' + esc(s.say) + '»' : ''}`;
  history.replaceState(null, '', '#' + (i + 1));
}
function next() {
  const hidden = $$('.frag:not(.shown)', roots[cur]);
  if (hidden.length) { hidden[0].classList.add('shown'); return; }
  go(cur + 1);
}
function prev() {
  const shown = $$('.frag.shown', roots[cur]);
  if (shown.length) { shown[shown.length - 1].classList.remove('shown'); return; }
  go(cur - 1, { back: true });
}

// tocco su una carta: lampeggia, così l'adulto vede cosa ha toccato il bambino e glielo legge
stage.addEventListener('click', (e) => {
  unlockAudio();
  const el = e.target.closest('[data-say]');
  if (!el || e.target.closest('button:not([data-say]), .flip, a')) return;
  el.classList.remove('say-on'); void el.offsetWidth; el.classList.add('say-on');
});

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const s = SLIDES[cur];
  if (s.keys && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); s.onKey(e, roots[cur]); return; }
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(SLIDES.length - 1);
  else if (e.key === 'n' || e.key === 'N') $('#notes').classList.toggle('on');
  else if (e.key === 'f' || e.key === 'F') toggleFull();
});
function toggleFull() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }

$('#bNext').onclick = () => { unlockAudio(); next(); };
$('#bPrev').onclick = () => { unlockAudio(); prev(); };
$('#bNotes').onclick = () => $('#notes').classList.toggle('on');
$('#bFull').onclick = toggleFull;
$('#bMenu').onclick = () => {
  let html = '', last = '';
  SLIDES.forEach((s, i) => {
    if (s.sec !== last) { html += `<h4>${esc(s.sec)}</h4>`; last = s.sec; }
    const title = ($('h2, h1', roots[i])?.textContent || '').trim();
    html += `<button data-go="${i}">${i + 1}. ${esc(title)}</button>`;
  });
  $('#menuList').innerHTML = html;
  $$('[data-go]', $('#menuList')).forEach((b) => (b.onclick = () => { $('#menu').hidden = true; go(+b.dataset.go, { back: true }); }));
  $('#menu').hidden = false;
};
$('#menuClose').onclick = () => ($('#menu').hidden = true);
// i suoni del browser partono solo dopo il primo tocco
document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

const start = parseInt(location.hash.slice(1), 10);
go(Number.isFinite(start) ? start - 1 : 0);

// per prove dalla console
window.slides = { go, next, prev, SLIDES, roots, earn };
