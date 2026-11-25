// Slide interattive per spiegare ai bambini l'IA, gli LLM, il vibe coding e il gioco "Crea il tuo gioco con AIBI".
// Riusa i moduli del gioco (sfide, comprensione delle frasi, codice, voce), così slide e gioco restano uguali.
// Nessun dato viene salvato.
import { CHALLENGES, DISCUSS } from '../js/challenges.js';
import { understand } from '../js/understand.js';
import { newSpec, clone, applyChange } from '../js/spec.js';
import { generate, diff, highlight } from '../js/codegen.js';
import { speak, unlockAudio, beep, sfx } from '../js/chat.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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

// carte da girare: domande "Parliamone" e simili
function flipCards(items, { cols = items.length, height = 300 } = {}) {
  return `<div class="grow" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;align-content:center">${items.map((it, i) => `
    <div class="flip" style="height:${height}px"><div class="in">
      <div class="face front"><div class="ico">${it.ico || '💬'}</div><b>${it.front || 'Domanda ' + (i + 1)}</b><span class="small" style="color:#e6e0ff">tocca per girare</span></div>
      <div class="face back ${it.cls || ''}">${it.back}</div>
    </div></div>`).join('')}</div>`;
}
function bindFlips(root) { $$('.flip', root).forEach((f) => (f.onclick = () => { f.classList.toggle('open'); beep(); })); }

// ---------------- "indovina la parola dopo": un mini modello di linguaggio ----------------
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
const START = ['C’era', 'una', 'volta', 'un'];
const optionsFor = (w) => (ENDS.has(w) ? null : NEXT[w] || [['che', 100]]);
function sample(opts, mode) {
  if (mode === 'top') return opts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
  for (const [w, p] of opts) { r -= p; if (r <= 0) return w; }
  return opts[0][0];
}
// dopo un po' di parole si preferiscono quelle che chiudono la storia, così finisce sempre bene
const optionsNow = (words) => {
  const o = optionsFor(words[words.length - 1]);
  if (!o || words.length < 12) return o;
  const ends = o.filter(([w]) => ENDS.has(w));
  return ends.length ? ends : o;
};
function writeStory(mode) {
  const words = [...START];
  while (words.length < 30) {
    const o = optionsNow(words);
    if (!o) break;
    words.push(sample(o, mode));
  }
  return words.join(' ') + '.';
}

// ---------------- programmi della tartaruga (slide sul codice) ----------------
const TURTLE = {
  quadrato: { n: 4, step: 200, turn: 90 },
  triangolo: { n: 3, step: 240, turn: 120 },
  stella: { n: 5, step: 260, turn: 144 },
};

// ---------------- quiz ----------------
const QUIZ = [
  { q: 'Cosa fa un LLM quando ti risponde?', o: ['Pensa come una persona', 'Sceglie una parola dopo l’altra, la più probabile', 'Cerca la risposta in un libro segreto'], a: 1, why: 'Un LLM continua il testo prevedendo la parola successiva, una alla volta.' },
  { q: 'Vero o falso: un’intelligenza artificiale non sbaglia mai.', o: ['Vero', 'Falso'], a: 1, why: 'Tutte le IA possono sbagliare, anche quando sembrano sicurissime.' },
  { q: 'Che cos’è il vibe coding?', o: ['Programmare ascoltando musica', 'Descrivere a parole cosa vuoi e far scrivere il codice all’IA', 'Un videogioco famoso'], a: 1, why: 'Tu descrivi, l’IA scrive il codice, tu provi e correggi.' },
  { q: 'Quale richiesta (prompt) è più chiara?', o: ['“fallo più bello”', '“fai il gatto rosso e più grande”'], a: 1, why: 'Dice cosa cambiare e come: l’IA non deve indovinare.' },
  { q: 'AIBI, il robot del nostro gioco, è…', o: ['una persona nascosta nel computer', 'un’IA “finta”, fatta di regole', 'Gemini con un altro nome'], a: 1, why: 'AIBI riconosce alcune parole e segue regole scritte da una persona.' },
  { q: 'Se un’IA dice una cosa con tanta sicurezza, allora è vera?', o: ['Sì, sempre', 'No, bisogna controllare'], a: 1, why: 'Le IA possono inventare cose con sicurezza: si chiamano allucinazioni.' },
  { q: 'Cosa NON devi mai scrivere a un chatbot?', o: ['Il tuo indirizzo di casa', '“Inventa una storia sui draghi”', '“Spiegami le frazioni”'], a: 0, why: 'I dati personali (indirizzo, telefono, nome completo, foto) restano privati.' },
  { q: 'Nel vibe coding, dopo che l’IA ha scritto il codice…', o: ['Hai finito!', 'Provi e controlli se funziona', 'Spegni il computer'], a: 1, why: 'Si prova sempre: se qualcosa non va, si chiede una correzione.' },
  { q: 'Come ha imparato un LLM a scrivere?', o: ['Leggendo tantissimi testi', 'Andando a scuola come noi', 'Guardando i cartoni animati'], a: 0, why: 'Ha letto miliardi di frasi e ha imparato quali parole stanno bene insieme.' },
  { q: 'Chi decide come deve essere il vostro gioco?', o: ['L’IA', 'Voi!', 'Il computer da solo'], a: 1, why: 'L’IA è uno strumento: le idee e le decisioni sono vostre.' },
];

// ---------------- le slide ----------------
const SLIDES = [
  // ===== Benvenuti =====
  {
    sec: 'Benvenuti', cls: 'dark',
    html: () => `<div class="row grow" style="align-items:center;gap:70px">
      <div class="col" style="gap:28px"><p class="eyebrow">Lezione · Intelligenza artificiale</p>
        <h1>Parliamo con le IA<br>e creiamo un gioco!</h1>
        <p class="big muted">Con AIBI, il robot che scrive codice per voi</p></div>
      <div class="bot float" id="bot1"><span></span><span></span></div></div>`,
    say: 'Ciao! Io sono AIBI. Oggi scopriamo insieme cosa sono le intelligenze artificiali e poi creiamo un videogioco parlando con me!',
    notes: 'Presentati e presenta AIBI. Premi 🔊 (in basso) per farlo parlare. Chiedi: “Avete mai parlato con un computer?”',
  },
  {
    sec: 'Benvenuti',
    html: () => `<div class="head"><p class="eyebrow">Il programma di oggi</p><h2>Cosa faremo oggi</h2></div>
      <div class="row grow" style="align-items:center">
        ${[['🧠', 'Cos’è un’IA', 'e come funziona un LLM'], ['🪄', 'Il vibe coding', 'programmare a parole'], ['🎮', 'Il gioco', 'creiamo un videogioco con AIBI'], ['✨', 'Gemini', 'proviamo un’IA vera'], ['🏆', 'Quiz', 'chi ha capito tutto?']]
          .map(([i, t, d]) => `<div class="card frag" style="flex:1;align-items:center;text-align:center;padding:34px 20px"><div class="ico">${i}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}
      </div>`,
    say: 'Oggi scopriamo cos’è un’intelligenza artificiale, impariamo il vibe coding, creiamo un videogioco, proviamo Gemini e alla fine facciamo un quiz!',
    notes: 'Premi la freccia → per far comparire le tappe una alla volta.',
  },
  {
    sec: 'Benvenuti',
    html: () => `<div class="head"><p class="eyebrow">Parliamone</p><h2>${esc(DISCUSS.start.title)}</h2></div>
      ${flipCards(DISCUSS.start.questions.map((q) => ({ back: `<p class="big">${esc(q)}</p>` })), { height: 380 })}
      <p class="small center">Non ci sono risposte giuste o sbagliate, e non registriamo niente: parliamone insieme.</p>`,
    init: bindFlips,
    say: 'Prima di cominciare, parliamone! Secondo voi un’intelligenza artificiale pensa come noi?',
    notes: 'Gira le carte una alla volta (clic). Lascia parlare i bambini: è utile capire cosa pensano dell’IA prima della lezione. Non correggere ancora.',
  },

  // ===== IA e LLM =====
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco: IA o no?</p><h2>Quali di queste cose usano l’intelligenza artificiale?</h2></div>
      ${flipCards([
        { ico: '📱', front: 'Il correttore del telefono', back: '<b>Sì, è un’IA!</b><br>Prevede la parola che stai per scrivere.', cls: 'ok' },
        { ico: '🧮', front: 'La calcolatrice', back: '<b>No.</b><br>Segue regole fisse: 2+2 fa sempre 4.', cls: 'no' },
        { ico: '✨', front: 'Gemini', back: '<b>Sì!</b><br>È un LLM: scrive testi, risponde, inventa.', cls: 'ok' },
        { ico: '🚦', front: 'Il semaforo', back: '<b>No.</b><br>Cambia colore con un timer.', cls: 'no' },
        { ico: '🎵', front: 'I video consigliati', back: '<b>Sì!</b><br>Impara cosa ti piace guardare.', cls: 'ok' },
        { ico: '🗺️', front: 'Il navigatore', back: '<b>In parte.</b><br>Usa l’IA per prevedere il traffico.', cls: 'mid' },
        { ico: '🔦', front: 'La torcia', back: '<b>No.</b><br>Si accende e si spegne, basta.', cls: 'no' },
        { ico: '🤖', front: 'AIBI del nostro gioco', back: '<b>Un’IA “finta”!</b><br>Segue regole scritte da una persona.', cls: 'mid' },
      ], { cols: 4, height: 250 })}`,
    init: bindFlips,
    say: 'Gioco: IA o no? Toccate le carte e scoprite quali di queste cose usano l’intelligenza artificiale.',
    notes: 'Prima fai votare i bambini (alzata di mano), poi gira la carta. Messaggio: un’IA impara dagli esempi e fa previsioni; una macchina normale segue regole fisse. AIBI è un caso speciale: lo vedremo dopo.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Che cos’è un LLM</p><h2>Gemini e ChatGPT sono degli LLM</h2></div>
      <div class="row grow" style="align-items:center;gap:20px">
        <div class="card frag" style="flex:1;align-items:center;text-align:center"><div class="ico">📚📚📚</div><h3>1. Legge tantissimo</h3><p class="muted">Miliardi di frasi: libri, siti, articoli…</p></div>
        <p class="frag" style="font-size:60px">➜</p>
        <div class="card frag" style="flex:1;align-items:center;text-align:center"><div class="ico">🧩</div><h3>2. Impara gli schemi</h3><p class="muted">Quali parole stanno bene insieme e in che ordine</p></div>
        <p class="frag" style="font-size:60px">➜</p>
        <div class="card frag" style="flex:1;align-items:center;text-align:center"><div class="ico">💬</div><h3>3. Continua il testo</h3><p class="muted">Una parola alla volta, la più probabile</p></div>
      </div>
      <p class="big center frag"><b>LLM</b> = <i>Large Language Model</i>, cioè “grande modello del linguaggio”.</p>`,
    say: 'LLM vuol dire grande modello del linguaggio. Ha letto tantissimi testi, ha imparato quali parole stanno bene insieme, e quando gli scrivi continua il testo una parola alla volta.',
    notes: 'Fai comparire i passi con la freccia →. Paragone: “Se dico ‘C’era una volta…’, voi come continuate? Ecco, un LLM fa la stessa cosa, ma ha letto molto più di noi.”',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Gioco: indovina la parola dopo</p><h2>Fai tu l’LLM: scegli la parola successiva</h2></div>
      <div class="row grow">
        <div class="col" style="flex:1.2">
          <div class="card grow" style="justify-content:center"><div class="story" id="story"></div></div>
          <div class="row" style="gap:14px">
            <button class="btn" id="wTop">🎯 La più probabile</button>
            <button class="btn pink" id="wRnd">🎲 A sorte</button>
            <button class="btn light" id="wReset">↺ Ricomincia</button>
          </div>
        </div>
        <div class="col"><p class="muted" id="wHint">Le parole possibili, con la loro probabilità:</p><div class="opts" id="opts"></div></div>
      </div>`,
    init(root) {
      let words;
      const story = $('#story', root), opts = $('#opts', root), hint = $('#wHint', root);
      const render = (added) => {
        story.innerHTML = words.map((w, i) => (i === words.length - 1 && added ? `<span class="new">${esc(w)}</span>` : esc(w))).join(' ');
        const o = optionsNow(words);
        if (!o || words.length >= 30) {
          story.innerHTML += '.';
          opts.innerHTML = '<div class="card"><h3>Fine della storia! 🎉</h3><p>L’avete scritta una parola alla volta, proprio come fa un LLM.</p></div>';
          hint.textContent = '';
          return;
        }
        hint.textContent = 'Le parole possibili, con la loro probabilità:';
        opts.innerHTML = o.map(([w, p]) => `<button class="opt" data-w="${esc(w)}"><span class="word">${esc(w)}</span><span class="barw"><span class="bar" style="width:0%"></span></span><span class="pct">${p}%</span></button>`).join('');
        requestAnimationFrame(() => $$('.opt', opts).forEach((b, i) => ($('.bar', b).style.width = o[i][1] + '%')));
        $$('.opt', opts).forEach((b) => (b.onclick = () => add(b.dataset.w)));
      };
      const add = (w) => { words.push(w); beep(); render(true); };
      const reset = () => { words = [...START]; render(false); };
      $('#wTop', root).onclick = () => { const o = optionsNow(words); if (o) add(sample(o, 'top')); };
      $('#wRnd', root).onclick = () => { const o = optionsNow(words); if (o) add(sample(o, 'rnd')); };
      $('#wReset', root).onclick = reset;
      reset();
    },
    say: 'Facciamo finta di essere un LLM! Toccate la parola che secondo voi viene dopo. Le barre dicono quanto è probabile ogni parola.',
    notes: 'Fai scegliere ai bambini a turno. Fai notare: la parola più probabile non è sempre la più divertente. “A sorte” sceglie tenendo conto delle probabilità, come fanno gli LLM. Le probabilità sono inventate per il gioco.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Più prudenza o più fantasia?</p><h2>Stessa domanda, risposte diverse</h2></div>
      <div class="row grow">
        <div class="col" style="flex:1.3">
          <div class="row" style="gap:14px"><button class="btn" id="gTop">🎯 Sempre la più probabile</button><button class="btn pink" id="gRnd">✨ Con fantasia</button></div>
          <div class="col" id="stories" style="gap:14px"></div>
        </div>
        <div class="card" style="flex:.8;justify-content:center">
          <h3>Perché succede?</h3>
          <p>Se l’IA sceglie sempre la parola più probabile, scrive sempre la <b>stessa</b> storia.</p>
          <p>Se lascia un po’ di spazio al caso, ogni volta la storia <b>cambia</b>.</p>
          <p class="muted">Per questo se chiedete due volte la stessa cosa a Gemini, la risposta può essere diversa!</p>
        </div>
      </div>`,
    init(root) {
      const box = $('#stories', root);
      const add = (mode) => {
        const div = document.createElement('div');
        div.className = 'bubble';
        div.style.fontSize = '27px';
        div.textContent = (mode === 'top' ? '🎯 ' : '✨ ') + writeStory(mode);
        box.prepend(div);
        while (box.children.length > 4) box.lastChild.remove();
        beep();
      };
      $('#gTop', root).onclick = () => add('top');
      $('#gRnd', root).onclick = () => add('rnd');
    },
    say: 'Se l’IA sceglie sempre la parola più probabile, scrive sempre la stessa storia. Con un po’ di fantasia, ogni volta la storia cambia.',
    notes: 'Premi più volte “Sempre la più probabile”: la storia è sempre uguale. Poi “Con un po’ di fantasia”: cambia ogni volta. Per i più grandi: questo “caso” si chiama temperatura.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Attenzione</p><h2>Un LLM non pensa come noi</h2></div>
      <div class="row grow">
        <div class="card frag" style="flex:1;background:#e3f8ec"><h3>✅ Cosa sa fare</h3>
          <p>Prevede la parola successiva</p><p>Scrive testi, storie, riassunti e codice</p><p>Ti aiuta a imparare e a trovare idee</p></div>
        <div class="card frag" style="flex:1;background:#ffe9ef"><h3>❌ Cosa NON è</h3>
          <p>Non pensa e non prova emozioni</p><p>Non è vivo e non è una persona</p><p>Non sa sempre se una cosa è vera</p></div>
        <div class="col frag" style="flex:.8">${flipCards([{ ico: '🤔', front: 'Allora è mio amico?', back: '<p>È uno <b>strumento</b>, utile e simpatico, ma non una persona.</p><p class="muted">Gli amici veri sono le persone!</p>', cls: 'mid' }], { height: 420 })}</div>
      </div>`,
    init: bindFlips,
    say: 'Un LLM non pensa come noi. Sa prevedere le parole e scrivere testi, ma non prova emozioni, non è vivo e non sa sempre se una cosa è vera.',
    notes: 'Collega alle risposte date all’inizio (“pensa come noi?”). Domanda per i bambini: “Se un chatbot vi dice ‘ti voglio bene’, lo pensa davvero?”',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Le allucinazioni</p><h2>Vero o falso? AIBI è sicurissimo…</h2></div>
      <div class="col grow" id="hall" style="justify-content:center;gap:18px;min-height:0"></div>
      <p class="big center frag">Un’IA può <b>inventare</b> cose con tanta sicurezza: si chiamano <b>allucinazioni</b>. Controllate sempre!</p>`,
    init(root) {
      const items = [
        ['Il gatto è un mammifero.', true, 'È vero: questa volta AIBI aveva ragione.'],
        ['La Torre di Pisa si trova a Roma. Ne sono sicurissimo! 😎', false, 'È falso: è a Pisa. Sembrava sicuro, ma ha sbagliato!'],
        ['Un ragno ha 6 zampe.', false, 'È falso: i ragni hanno 8 zampe.'],
        ['Gemini non sbaglia mai.', false, 'È falso: tutte le IA possono sbagliare.'],
      ];
      const box = $('#hall', root);
      box.innerHTML = items.map(([t], i) => `<div class="row" style="align-items:center;gap:18px" data-i="${i}">
        <div class="bot small"><span></span><span></span></div>
        <div class="bubble" style="flex:1;font-size:28px">${esc(t)}</div>
        <button class="btn green" data-v="1">Vero</button><button class="btn pink" data-v="0">Falso</button>
        <div class="res" style="width:380px;font-size:23px;font-weight:600;line-height:1.3"></div></div>`).join('');
      $$('[data-i]', box).forEach((row) => {
        const [, truth, why] = items[+row.dataset.i];
        $$('button', row).forEach((b) => (b.onclick = () => {
          const ok = (b.dataset.v === '1') === truth;
          $('.res', row).textContent = (ok ? '✅ Esatto! ' : '❌ No! ') + why;
          $('.res', row).style.color = ok ? '#188a61' : '#b51f6a';
          ok ? sfx.win() : sfx.bump();
        }));
      });
    },
    say: 'Vero o falso? Attenzione: anche quando sembro sicurissimo, posso sbagliare!',
    notes: 'Fai votare la classe prima di premere. Messaggio chiave: “sicuro” non vuol dire “giusto”. Nel gioco, AIBI sbaglierà apposta in due sfide.',
  },
  {
    sec: 'IA e LLM',
    html: () => `<div class="head"><p class="eyebrow">Il prompt</p><h2>Come si chiede una cosa a un’IA</h2></div>
      <div class="row grow">
        <div class="card" style="flex:1"><span class="tag">Richiesta vaga</span><div class="bubble user">“Fammi un disegno”</div>
          <button class="btn light" id="pVague">Chiedi all’IA</button><div id="rVague" class="big" style="min-height:150px"></div></div>
        <div class="card" style="flex:1"><span class="tag">Richiesta chiara</span><div class="bubble user">“Disegna un gatto arancione che dorme su un cuscino blu”</div>
          <button class="btn" id="pClear">Chiedi all’IA</button><div id="rClear" class="big" style="min-height:150px"></div></div>
      </div>
      <div class="row frag" style="justify-content:center;gap:18px">${['🎯 Cosa o chi', '🎨 Come (colore, grandezza)', '📍 Dove', '🔢 Quanti'].map((t) => `<span class="chip" style="font-size:28px">${t}</span>`).join('')}</div>`,
    init(root) {
      $('#pVague', root).onclick = () => { const e = pick(['🏠', '🌳', '🐟', '🚗', '⛵']); $('#rVague', root).innerHTML = `🤔 Cosa disegno? Di che colore? Quanto grande?<br><span style="font-size:80px">${e}</span> Ecco… era questo che volevi?`; sfx.bump(); };
      $('#pClear', root).onclick = () => { $('#rClear', root).innerHTML = '<span style="font-size:80px">🐈</span><span style="font-size:60px">🟧💤🟦</span><br>Eccolo! Proprio come l’hai chiesto.'; sfx.win(); };
    },
    say: 'Il messaggio che scriviamo a un’IA si chiama prompt. Più è chiaro, migliore è il risultato.',
    notes: 'Premi più volte “Chiedi all’IA” nella richiesta vaga: esce ogni volta una cosa diversa. Poi quella chiara. Chiedi: “Come rendereste più chiara questa richiesta: ‘fai un gioco’?”',
  },

  // ===== Vibe coding =====
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Che cos’è il codice</p><h2>Il codice: istruzioni precise per il computer</h2></div>
      <div class="row grow">
        <div class="col"><div class="code" id="tCode" style="font-size:30px;padding:24px 0"></div>
          <div class="row" style="gap:12px;flex-wrap:wrap">${Object.keys(TURTLE).map((k) => `<button class="btn light" data-p="${k}">${k}</button>`).join('')}<button class="btn green" id="tRun">▶ Esegui</button></div>
          <p class="muted">Il computer fa <b>esattamente</b> quello che c’è scritto: né più, né meno.</p></div>
        <div class="card" style="flex:none;align-items:center;justify-content:center"><canvas id="tCanvas" width="560" height="560"></canvas></div>
      </div>`,
    init(root) {
      let prog = 'quadrato', running = false;
      const codeBox = $('#tCode', root), cv = $('#tCanvas', root), g = cv.getContext('2d');
      const lines = () => { const p = TURTLE[prog]; return [`ripeti ${p.n} volte:`, `  avanti(${p.step})`, `  gira_a_destra(${p.turn})`]; };
      const showCode = (cur = -1) => { codeBox.innerHTML = lines().map((l, i) => `<div class="ln${i === cur ? ' cur' : ''}">${highlight(l)}</div>`).join(''); };
      const turtle = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.font = '40px "Segoe UI Emoji"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐢', 0, 0); g.restore(); };
      const verts = () => { const p = TURTLE[prog]; let x = 0, y = 0, a = 0; const v = [[0, 0]]; for (let i = 0; i < p.n; i++) { x += Math.cos(a) * p.step; y += Math.sin(a) * p.step; v.push([x, y]); a += p.turn * Math.PI / 180; } return v; };
      const reset = () => { g.clearRect(0, 0, 560, 560); showCode(); const v = verts(); const xs = v.map((p) => p[0]), ys = v.map((p) => p[1]); const ox = 280 - (Math.min(...xs) + Math.max(...xs)) / 2, oy = 280 - (Math.min(...ys) + Math.max(...ys)) / 2; turtle(ox, oy, 0); return [ox, oy]; };
      $$('[data-p]', root).forEach((b) => (b.onclick = () => { if (running) return; prog = b.dataset.p; reset(); }));
      $('#tRun', root).onclick = async () => {
        if (running) return; running = true;
        const [ox, oy] = reset(); const p = TURTLE[prog];
        let x = 0, y = 0, a = 0;
        const done = [];
        for (let i = 0; i < p.n; i++) {
          showCode(1);
          const nx = x + Math.cos(a) * p.step, ny = y + Math.sin(a) * p.step;
          for (let t = 1; t <= 20; t++) {
            g.clearRect(0, 0, 560, 560);
            g.strokeStyle = '#6a4cff'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(ox, oy);
            for (const [dx, dy] of done) g.lineTo(ox + dx, oy + dy);
            g.lineTo(ox + x + (nx - x) * t / 20, oy + y + (ny - y) * t / 20); g.stroke();
            turtle(ox + x + (nx - x) * t / 20, oy + y + (ny - y) * t / 20, a);
            await wait(25);
          }
          x = nx; y = ny; done.push([x, y]); sfx.step();
          showCode(2); a += p.turn * Math.PI / 180; sfx.turn(); await wait(350);
        }
        showCode(); running = false;
      };
      reset();
    },
    say: 'Il codice è una lista di istruzioni precise. Il computer fa esattamente quello che c’è scritto.',
    notes: 'Premi ▶ Esegui con il quadrato, poi prova triangolo e stella. Chiedi: “Cosa succede se cambio 90 in 120?”. Collegamento: nel gioco AIBI scrive codice come questo.',
  },
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Il vibe coding</p><h2>Programmare descrivendo a parole</h2></div>
      <div class="row grow" style="align-items:center">
        <div style="position:relative;width:640px;height:600px;flex:none">
          <div style="position:absolute;left:170px;top:170px;width:300px;height:260px;border:10px dashed #c9bdff;border-radius:50%"></div>
          <div class="center" style="position:absolute;left:195px;top:255px;width:250px;font-size:34px;font-weight:800;color:#6a4cff">Vibe<br>coding</div>
          ${[['🗣️', 'Descrivo', 220, 0], ['🤖', 'L’IA scrive', 440, 220], ['🎮', 'Provo', 220, 440], ['🔧', 'Correggo', 0, 220]]
            .map(([i, t, x, y], k) => `<button class="card" data-c="${k}" style="position:absolute;left:${x}px;top:${y}px;width:200px;height:160px;align-items:center;justify-content:center;gap:4px;cursor:pointer"><span style="font-size:54px">${i}</span><b style="font-size:26px">${k + 1}. ${t}</b></button>`).join('')}
        </div>
        <div class="card grow" style="justify-content:center;min-height:420px" id="cyc"><h3>Tocca i passi del ciclo!</h3><p class="muted">Il vibe coding è un modo nuovo di programmare: si spiega all’IA cosa si vuole, e lei scrive il codice.</p></div>
      </div>`,
    init(root) {
      const T = [
        ['🗣️ 1. Descrivo', 'Scrivo in italiano cosa voglio: “fai un gatto che salta e raccoglie le stelle”.'],
        ['🤖 2. L’IA scrive il codice', 'L’IA trasforma le mie parole in istruzioni per il computer, in pochi secondi.'],
        ['🎮 3. Provo', 'Gioco e controllo: funziona? È come lo volevo? C’è un errore?'],
        ['🔧 4. Correggo', 'Chiedo una modifica precisa: “i punti non salgono”, “fallo più veloce”. E si ricomincia il giro!'],
      ];
      $$('[data-c]', root).forEach((b) => (b.onclick = () => {
        const [t, d] = T[+b.dataset.c];
        $('#cyc', root).innerHTML = `<h3 style="font-size:40px">${t}</h3><p class="big">${d}</p>`;
        $$('[data-c]', root).forEach((x) => (x.style.outline = x === b ? '6px solid #ffd23f' : ''));
        beep();
      }));
    },
    say: 'Il vibe coding è programmare descrivendo a parole quello che vogliamo. Io scrivo il codice, voi provate e correggete.',
    notes: 'Tocca i 4 passi in ordine. Sottolinea che il passo 3 (provare) è fondamentale: l’IA può sbagliare. Per i grandi: il termine “vibe coding” è nato nel 2025.',
  },
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Prova dal vivo</p><h2>Scrivete ad AIBI e guardate il codice</h2></div>
      <div class="row" style="gap:14px;align-items:center">
        <input id="dIn" placeholder="Scrivi cosa vuoi nel gioco…" style="flex:1;font:inherit;font-size:30px;padding:16px 20px;border-radius:18px;border:3px solid #c9bdff;outline:none">
        <button class="btn" id="dGo">Invia ➤</button><button class="btn light" id="dReset">↺</button>
      </div>
      <div class="chips">${['fai un gatto rosso nello spazio', 'salta quando premo spazio', 'aggiungi 5 stelle da raccogliere', 'metti 3 meteoriti che cadono', 'fallo più bello'].map((t) => `<button class="chip" data-ex="${esc(t)}">💡 ${esc(t)}</button>`).join('')}</div>
      <div class="row grow">
        <div class="col"><div class="card grow"><h3>🔍 Come ti ha capito AIBI</h3><div class="tokens" id="dTok"><span class="muted" style="font-size:26px">Le parole che AIBI conosce si coloreranno.</span></div>
          <div class="bubble" id="dReply" style="font-size:25px">Ciao! Dimmi cosa vuoi nel gioco.</div></div></div>
        <div class="col" style="flex:1.15"><div class="code grow" id="dCode" style="font-size:19px"></div></div>
      </div>`,
    init(root) {
      let spec = newSpec(), code = generate(spec);
      const codeBox = $('#dCode', root), input = $('#dIn', root);
      const showCode = (isNew = code.map(() => false)) => {
        codeBox.innerHTML = code.map((l, i) => `<div class="ln${isNew[i] ? ' new' : ''}">${highlight(l) || ' '}</div>`).join('');
        const first = $('.ln.new', codeBox);
        if (first) codeBox.scrollTop = Math.max(0, first.offsetTop - 40);
      };
      const send = () => {
        const text = input.value.trim(); if (!text) return;
        unlockAudio();
        const p = understand(text, spec);
        const types = new Map(p.matches.map((m) => [m.i, m.type]));
        $('#dTok', root).innerHTML = p.tokens.map((w, i) => `<span class="w${types.get(i) ? ' hit ' + types.get(i) : ''}">${esc(w)}</span>`).join('');
        let reply;
        if (p.kind === 'change') {
          const next = clone(spec);
          const notes = p.changes.map((c) => applyChange(next, c)).filter(Boolean);
          spec = next;
          const lines = generate(spec); const isNew = diff(code, lines); code = lines; showCode(isNew);
          reply = notes.length ? 'Fatto: ' + notes.join(', ') + '. Le righe verdi sono quelle nuove!' : 'Il gioco è già così!';
        } else if (p.kind === 'clarify') reply = 'Più bello… come? “Bello” per me non vuol dire niente di preciso: dimmi un colore, uno sfondo, una grandezza!';
        else if (p.kind === 'chat') reply = 'Questa è una domanda su di me: nel gioco vero vi rispondo!';
        else reply = 'Non ho capito… conosco solo alcune parole. Prova con un esempio!';
        $('#dReply', root).textContent = reply;
        beep();
      };
      $('#dGo', root).onclick = send;
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
      $$('[data-ex]', root).forEach((b) => (b.onclick = () => { input.value = b.dataset.ex; send(); }));
      $('#dReset', root).onclick = () => { spec = newSpec(); code = generate(spec); showCode(); $('#dTok', root).innerHTML = ''; $('#dReply', root).textContent = 'Ricominciamo! Dimmi cosa vuoi nel gioco.'; };
      showCode();
    },
    say: 'Proviamo! Scrivete una frase: io coloro le parole che conosco e scrivo il codice. Le righe verdi sono quelle nuove.',
    notes: 'Fai scrivere ai bambini o usa i 💡 esempi, in ordine. Fai notare: le parole colorate sono quelle che AIBI conosce, le grigie le ignora. Con “fallo più bello” AIBI chiede chiarimenti. Mentre scrivi nel riquadro le frecce non cambiano slide: usa ◀ ▶ in basso.',
  },
  {
    sec: 'Vibe coding',
    html: () => `<div class="head"><p class="eyebrow">Due assistenti diversi</p><h2>AIBI e Gemini</h2></div>
      <div class="row grow">
        <div class="card" style="flex:1"><div class="row" style="align-items:center"><div class="bot small"><span></span><span></span></div><h3 style="font-size:42px">AIBI</h3></div>
          <p>🧩 Un’IA “finta”: segue <b>regole</b> scritte da una persona</p><p>📖 Conosce poche centinaia di parole</p><p>🎮 Sa fare solo una cosa: il nostro gioco</p><p>🔌 Funziona anche senza internet</p></div>
        <div class="card" style="flex:1"><div class="row" style="align-items:center"><span style="font-size:90px;line-height:1">✨</span><h3 style="font-size:42px">Gemini</h3></div>
          <p>🧠 Un LLM vero: ha letto <b>miliardi</b> di testi</p><p>💬 Capisce frasi che non ha mai visto</p><p>🌍 Sa fare tante cose: storie, spiegazioni, codice…</p><p>☁️ Funziona su internet, su computer potentissimi</p></div>
      </div>
      <p class="big center frag">Tutti e due <b>non pensano come noi</b> e <b>possono sbagliare</b>: il controllo spetta a voi!</p>`,
    say: 'Io sono un’intelligenza artificiale finta, fatta di regole. Gemini è un LLM vero. Ma tutti e due possiamo sbagliare!',
    notes: 'AIBI è una palestra sicura per allenarsi; dopo il gioco proveremo Gemini. Chiedi: “Secondo voi chi capisce meglio le frasi strane?”',
  },

  // ===== Il gioco =====
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">Il gioco “Crea il tuo gioco con AIBI”</p><h2>Com’è fatto lo schermo</h2></div>
      <div class="row grow">
        <div class="mock" style="flex:1.3">
          <div class="z" data-z="0"><span class="num">1</span>▶ Gioca · ↶ Annulla · 🔍 · 🗑️</div>
          <div class="z" data-z="1"><span class="num">2</span>🏆 Sfida</div>
          <div class="z" data-z="2" style="background:#0b0f2e;color:#fff;font-size:60px"><span class="num">3</span>🐱 ⭐ ☄️</div>
          <div class="z" data-z="4" style="grid-row:2/4;grid-column:2;flex-direction:column;gap:10px"><span class="num">5</span><span class="bubble" style="font-size:20px">Ciao! Cosa creiamo?</span><span class="bubble user" style="font-size:20px">fai un gatto</span>💬 Chat con AIBI</div>
          <div class="z" data-z="3" style="background:#1e1f2e;color:#7fdcff;font-family:Consolas,monospace"><span class="num">4</span>const eroe = …</div>
        </div>
        <div class="card" style="flex:1;justify-content:center" id="zInfo"><h3>Tocca i numeri!</h3><p class="muted">Scoprite a cosa serve ogni parte dello schermo.</p></div>
      </div>`,
    init(root) {
      const Z = [
        ['1 · I pulsanti', '▶ Gioca prova il gioco · ↶ Annulla torna alla versione di prima · 🔍 mostra come AIBI vi ha capito · 🗑️ ricomincia da zero.'],
        ['2 · La sfida', 'Qui c’è la sfida da completare. Quando è finita diventa verde e compare “Prossima sfida ▶”.'],
        ['3 · Il gioco', 'Qui vedete il vostro videogioco e ci giocate con la tastiera. Cliccateci sopra prima di usare le frecce!'],
        ['4 · Il codice', 'Qui c’è il codice scritto da AIBI. Le righe verdi sono quelle nuove: leggetele per controllare!'],
        ['5 · La chat', 'Qui scrivete ad AIBI cosa volete. Ci sono anche frasi di esempio da toccare.'],
      ];
      $$('[data-z]', root).forEach((z) => (z.onclick = () => {
        const [t, d] = Z[+z.dataset.z];
        $('#zInfo', root).innerHTML = `<h3 style="font-size:40px">${t}</h3><p class="big">${d}</p>`;
        $$('[data-z]', root).forEach((x) => x.classList.toggle('sel', x === z));
        beep();
      }));
    },
    say: 'Questo è lo schermo del gioco. Toccate i numeri per scoprire a cosa serve ogni parte.',
    notes: 'Tocca i numeri in ordine 1→5. Insisti sul 4 (il codice): leggerlo serve a trovare gli errori di AIBI.',
  },
  {
    sec: 'Il gioco',
    keys: true,
    html: () => `<div class="head"><p class="eyebrow">Come si gioca</p><h2>Provate: premete le frecce e la barra spaziatrice!</h2></div>
      <div class="row grow" style="align-items:center;gap:60px">
        <div class="col" style="align-items:center;flex:none;gap:24px">
          <div class="keys"><span></span><div class="key" data-k="ArrowUp">↑</div><span></span><div class="key" data-k="ArrowLeft">←</div><div class="key" data-k="ArrowDown">↓</div><div class="key" data-k="ArrowRight">→</div></div>
          <div class="key space" data-k=" ">barra spaziatrice = salto</div>
        </div>
        <div class="col">
          <div class="card"><h3>🖱️ Prima cliccate sul gioco</h3><p>Il gioco ha il <b style="color:#22b07d">bordo verde</b> quando è pronto per la tastiera.</p></div>
          <div class="card"><h3>⬅️➡️ Frecce</h3><p>Muovono il personaggio (se avete chiesto ad AIBI di farlo muovere!).</p></div>
          <div class="card"><h3>␣ Barra spaziatrice</h3><p>Fa saltare il personaggio, se gli avete chiesto di saltare.</p></div>
        </div>
      </div>
      <p class="small center">In questa slide le frecce non cambiano pagina: usate ◀ ▶ in basso.</p>`,
    onKey(e, root) {
      const k = $(`[data-k="${e.key === 'Spacebar' ? ' ' : e.key}"]`, root);
      if (!k) return false;
      k.classList.add('down');
      setTimeout(() => k.classList.remove('down'), 160);
      e.key === ' ' ? sfx.turn() : sfx.step();
      return true;
    },
    say: 'Nel gioco si usano le frecce per muoversi e la barra spaziatrice per saltare. Ma prima bisogna cliccare sul gioco!',
    notes: 'Fai premere le frecce a un bambino: si illuminano. In questa slide per andare avanti usa ▶ nella barra in basso.',
  },
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">Anteprima</p><h2>Le ${CHALLENGES.length} sfide del gioco</h2></div>
      <div class="chgrid">${CHALLENGES.map((c, i) => `<button class="ch${c.bug ? ' warn' : ''}" data-ch="${i}"><b>Sfida ${i + 1}${c.bug ? ' ⚠️' : ''}</b><span>${esc(c.title)}</span></button>`).join('')}</div>
      <div class="chdetail grow" id="chD"><h3>Toccate una sfida per scoprirla!</h3><p class="muted">Le sfide con ⚠️ hanno una sorpresa…</p></div>`,
    init(root) {
      $$('[data-ch]', root).forEach((b) => (b.onclick = () => {
        const c = CHALLENGES[+b.dataset.ch];
        $('#chD', root).innerHTML = `<div class="row" style="align-items:center;justify-content:space-between"><h3 style="font-size:36px">Sfida ${+b.dataset.ch + 1}: ${esc(c.title)}</h3><button class="btn light" id="chSay">🔊</button></div>
          <p style="font-size:28px">${esc(c.text)}</p><div class="chips">${c.examples.map((x) => `<span class="chip">💡 ${esc(x)}</span>`).join('')}</div>`;
        $('#chSay', root).onclick = () => speak(c.title + '. ' + c.text);
        $$('[data-ch]', root).forEach((x) => x.classList.toggle('sel', x === b));
        beep();
      }));
    },
    say: 'Nel gioco ci sono quindici sfide. Toccatene una per scoprire cosa bisogna fare!',
    notes: 'Mostra 2-3 sfide (es. 1, 3, 7). Le sfide 5 e 12 (⚠️) sono quelle in cui AIBI sbaglia apposta: non svelare l’errore, dite solo “attenti!”.',
  },
  {
    sec: 'Il gioco', cls: 'sun',
    html: () => `<div class="head"><p class="eyebrow">Attenzione!</p><h2>In alcune sfide AIBI sbaglia… apposta!</h2></div>
      <div class="row grow" style="align-items:center;gap:40px">
        <div class="col" style="flex:none;align-items:center"><div class="bot float"><span></span><span></span></div><div class="bubble" style="max-width:420px">“Facilissimo! Sono sicuro al cento per cento! 😎”</div></div>
        <div class="col">
          <div class="card frag"><h3>🎮 Giocate e osservate</h3><p>Funziona davvero come avete chiesto?</p></div>
          <div class="card frag"><h3>📝 Leggete il codice</h3><p>Le righe verdi sono quelle nuove: i numeri sono giusti?</p></div>
          <div class="card frag"><h3>💬 Spiegate ad AIBI cosa non va</h3><p>Con parole precise: cosa succede e cosa vi aspettavate.</p></div>
        </div>
      </div>`,
    say: 'Attenzione! In alcune sfide sbaglio apposta, anche se sembro sicurissimo. Siete voi i controllori!',
    notes: 'Non svelare quali errori. Ricorda: è lo stesso discorso delle allucinazioni. Chi trova l’errore lo spiega ad AIBI con parole precise.',
  },
  {
    sec: 'Il gioco',
    html: () => `<div class="head"><p class="eyebrow">Si gioca in coppia</p><h2>Due ruoli, poi vi scambiate</h2></div>
      <div class="row grow" style="align-items:stretch">
        <div class="card" style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico" style="font-size:110px">✍️</div><h3 style="font-size:40px">Chi scrive</h3><p>Scrive ad AIBI cosa mettere nel gioco</p></div>
        <div class="card" style="flex:1;align-items:center;text-align:center;justify-content:center"><div class="ico" style="font-size:110px">🎮</div><h3 style="font-size:40px">Chi gioca</h3><p>Prova il gioco e dice cosa cambiare</p></div>
        <div class="card" style="flex:1;align-items:center;text-align:center;justify-content:center;background:#fff5d6"><div class="ico" style="font-size:110px">🔄</div><h3 style="font-size:40px">Ogni sfida</h3><p>Vi scambiate i ruoli. Decidete insieme!</p></div>
      </div>`,
    say: 'Si gioca in coppia: uno scrive ad AIBI, l’altro gioca e dice cosa cambiare. A ogni sfida vi scambiate!',
    notes: 'Forma le coppie. Suggerisci di parlare prima di scrivere: “Cosa vogliamo?”.',
  },
  {
    sec: 'Il gioco', cls: 'dark',
    html: () => `<div class="col grow" style="align-items:center;justify-content:center;gap:40px;text-align:center">
        <div class="bot float"><span></span><span></span></div>
        <h1>Pronti? Giochiamo!</h1>
        <a class="btn huge green" href="../" target="_blank" rel="noopener" style="text-decoration:none">🎮 Apri il gioco</a>
        <p class="small">Il gioco si apre in una nuova scheda. Poi tornate qui per il resto della lezione.</p></div>`,
    say: 'Pronti? Giochiamo! Vi aspetto nel gioco.',
    notes: 'Il pulsante apre il gioco in una nuova scheda (resta aperta questa con le slide). Dopo il gioco torna qui e vai avanti con “Parliamone”.',
  },

  // ===== Dopo il gioco =====
  ...['afterMistake', 'afterMistake2', 'end'].map((key) => ({
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Parliamone</p><h2>${esc(DISCUSS[key].title)}</h2></div>
      ${flipCards(DISCUSS[key].questions.map((q) => ({ back: `<p class="big">${esc(q)}</p>` })), { cols: DISCUSS[key].questions.length > 3 ? 2 : DISCUSS[key].questions.length, height: DISCUSS[key].questions.length > 3 ? 250 : 360 })}
      <p class="small center">Non ci sono risposte giuste o sbagliate, e non registriamo niente.</p>`,
    init: bindFlips,
    say: DISCUSS[key].title,
    notes: key === 'end'
      ? 'Ultime domande: confronta con le risposte date all’inizio. È cambiato qualcosa nel modo in cui vedono l’IA?'
      : 'Gira le carte una alla volta e lascia discutere. Qui si parla degli errori di AIBI: come se ne sono accorti, chi deve controllare.',
  })),
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Sessione pratica</p><h2>Ora proviamo Gemini: cosa chiedergli?</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
        ${[['📖', 'Spiegami cos’è un LLM come se avessi 10 anni'], ['🐉', 'Inventa una storia breve con un robot e un drago'], ['🎮', 'Scrivi il codice di un gioco semplice in cui un gatto raccoglie le stelle'], ['❓', 'Fammi 3 domande di quiz sui robot'], ['🔁', 'Chiedi la stessa cosa due volte: la risposta è uguale?'], ['🕵️', 'Sei sicuro? Controlla la tua risposta']]
          .map(([i, t]) => `<div class="card"><div class="ico" style="font-size:50px">${i}</div><p style="font-size:27px;flex:1">“${esc(t)}”</p><button class="btn light" data-copy="${esc(t)}" style="font-size:22px;padding:10px 18px;align-self:flex-start">📋 Copia</button></div>`).join('')}
      </div>`,
    init(root) {
      $$('[data-copy]', root).forEach((b) => (b.onclick = async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '✅ Copiato'; } catch { b.textContent = 'Copia a mano 🙂'; }
        setTimeout(() => (b.textContent = '📋 Copia'), 1600);
      }));
    },
    say: 'Adesso proviamo Gemini, un’intelligenza artificiale vera. Ecco qualche idea di cosa chiedergli.',
    notes: 'Apri Gemini (con l’account della scuola/dell’adulto). Con “📋 Copia” copi il prompt e lo incolli in Gemini. Confronta con AIBI: Gemini capisce frasi che AIBI non capiva? Il terzo prompt è vibe coding vero.',
  },
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="head"><p class="eyebrow">Regole d’oro</p><h2>Usare un’IA in sicurezza</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px;align-content:center">
        ${[['🔒', 'Niente dati personali', 'Nome completo, indirizzo, scuola, telefono, foto: restano privati.'], ['✅', 'Controlla', 'L’IA può sbagliare: verifica le cose importanti.'], ['🙋', 'Chiedi a un adulto', 'Se qualcosa ti sembra strano o ti mette a disagio.'], ['🧠', 'Decidi tu', 'L’IA è uno strumento: le idee sono le tue.'], ['✍️', 'Niente copia-incolla', 'Usala per capire, non per fare i compiti al posto tuo.']]
          .map(([i, t, d]) => `<div class="card frag" style="align-items:center;text-align:center;min-height:380px"><div class="ico" style="font-size:72px">${i}</div><h3>${t}</h3><p style="font-size:24px">${d}</p></div>`).join('')}
      </div>`,
    say: 'Le regole d’oro: niente dati personali, controllate sempre, chiedete a un adulto, decidete voi e non fate copiare i compiti all’IA.',
    notes: 'Fai comparire le regole con la freccia →. Chiedi un esempio di “dato personale” ai bambini.',
  },
  {
    sec: 'Dopo il gioco',
    html: () => `<div class="row" style="align-items:center;justify-content:space-between"><div class="head"><p class="eyebrow">Quiz finale</p><h2 id="qTitle">Domanda 1</h2></div><div class="dots" id="qDots"></div></div>
      <p class="big" id="qText" style="font-weight:700"></p>
      <div class="qopts" id="qOpts"></div>
      <div class="row" style="align-items:center;gap:20px;min-height:90px"><p class="big grow" id="qWhy"></p><button class="btn" id="qNext" hidden>Avanti ▶</button></div>`,
    init(root) {
      let i = 0, score = 0;
      const res = [];
      const dots = () => { $('#qDots', root).innerHTML = QUIZ.map((_, k) => `<i class="${res[k] === true ? 'ok' : res[k] === false ? 'ko' : ''}${k === i && res[k] === undefined ? ' cur' : ''}"></i>`).join(''); };
      const show = () => {
        const q = QUIZ[i];
        $('#qTitle', root).textContent = `Domanda ${i + 1} di ${QUIZ.length}`;
        $('#qText', root).textContent = q.q;
        $('#qWhy', root).textContent = '';
        $('#qNext', root).hidden = true;
        // le risposte in ordine casuale (vero/falso resta in ordine)
        const order = q.o.map((_, k) => k);
        if (q.o.length > 2 || q.o[0] !== 'Vero') order.sort(() => Math.random() - 0.5);
        $('#qOpts', root).innerHTML = order.map((k, pos) => `<button class="qopt" data-o="${k}">${String.fromCharCode(65 + pos)}. ${esc(q.o[k])}</button>`).join('');
        $$('[data-o]', root).forEach((b) => (b.onclick = () => {
          const ok = +b.dataset.o === q.a;
          res[i] = ok; if (ok) score++;
          $$('[data-o]', root).forEach((x) => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          $('#qWhy', root).textContent = (ok ? '✅ Giusto! ' : '❌ Non proprio. ') + q.why;
          ok ? sfx.win() : sfx.bump();
          $('#qNext', root).hidden = false;
          $('#qNext', root).textContent = i + 1 < QUIZ.length ? 'Avanti ▶' : 'Risultato 🏆';
          dots();
        }));
        dots();
      };
      $('#qNext', root).onclick = () => {
        if (i + 1 < QUIZ.length) { i++; show(); return; }
        $('#qTitle', root).textContent = 'Risultato';
        $('#qText', root).textContent = `Avete risposto bene a ${score} domande su ${QUIZ.length}! ${score >= 8 ? 'Siete esperti di IA! 🏆' : score >= 5 ? 'Bravissimi! 👏' : 'Ottimo inizio: ora ne sapete di più! 💪'}`;
        $('#qOpts', root).innerHTML = '<button class="btn light" id="qAgain">↺ Rifai il quiz</button>';
        $('#qWhy', root).textContent = 'Il punteggio non viene salvato da nessuna parte.';
        $('#qNext', root).hidden = true;
        $('#qAgain', root).onclick = () => { i = 0; score = 0; res.length = 0; show(); };
        confetti(root);
      };
      show();
    },
    say: 'Quiz finale! Leggete la domanda e scegliete la risposta giusta.',
    notes: 'Leggi la domanda, fai votare tutti (mani alzate per A, B, C), poi un bambino tocca la risposta. Il punteggio è della classe e non viene salvato.',
  },
  {
    sec: 'Dopo il gioco', cls: 'dark',
    html: () => `<div class="head"><p class="eyebrow">Cosa abbiamo imparato</p><h2>Bravissimi! 🎉</h2></div>
      <div class="grow" style="display:grid;grid-template-columns:repeat(2,1fr);gap:22px;align-content:center">
        ${[['🧠', 'Un LLM sceglie una parola dopo l’altra: non pensa come noi.'], ['🪄', 'Vibe coding: descrivo, l’IA scrive, io provo e correggo.'], ['🔍', 'Le IA possono sbagliare con sicurezza: controllare tocca a noi.'], ['🎯', 'Un prompt chiaro dà risultati migliori.']]
          .map(([i, t]) => `<div class="card frag" style="flex-direction:row;align-items:center;gap:22px"><span style="font-size:70px">${i}</span><p class="big">${t}</p></div>`).join('')}
      </div>`,
    init(root) { setTimeout(() => confetti(root), 400); },
    say: 'Bravissimi! Oggi avete imparato che un LLM sceglie una parola dopo l’altra, cos’è il vibe coding, che le IA possono sbagliare e che un prompt chiaro funziona meglio.',
    notes: 'Riepilogo finale (freccia → per i punti). Ringrazia i bambini. Il gioco resta online: possono rigiocarci a casa con un adulto.',
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
  $('#count').textContent = `${i + 1} / ${SLIDES.length}`;
  $('#progress i').style.width = ((i + 1) / SLIDES.length) * 100 + '%';
  $('#section').textContent = s.sec;
  $('#notes').innerHTML = `<b>Slide ${i + 1} · note per chi spiega:</b> ${esc(s.notes || '')}`;
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

function sayCurrent() {
  unlockAudio();
  const s = SLIDES[cur];
  speak(s.say || '');
  $$('.bot', roots[cur]).forEach((b) => { b.classList.add('talk'); setTimeout(() => b.classList.remove('talk'), Math.min(9000, 300 + (s.say || '').length * 55)); });
}

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const s = SLIDES[cur];
  if (s.keys && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) {
    e.preventDefault();
    s.onKey(e, roots[cur]);
    return;
  }
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
$('#bSay').onclick = sayCurrent;
$('#bNotes').onclick = () => $('#notes').classList.toggle('on');
$('#bFull').onclick = toggleFull;
$('#bMenu').onclick = () => {
  let html = '', last = '';
  SLIDES.forEach((s, i) => {
    if (s.sec !== last) { html += `<h4>${esc(s.sec)}</h4>`; last = s.sec; }
    const tmp = document.createElement('div'); tmp.innerHTML = s.html();
    const title = (tmp.querySelector('h2, h1')?.textContent || '').trim();
    html += `<button data-go="${i}">${i + 1}. ${esc(title)}</button>`;
  });
  $('#menuList').innerHTML = html;
  $$('[data-go]', $('#menuList')).forEach((b) => (b.onclick = () => { $('#menu').hidden = true; go(+b.dataset.go, { back: true }); }));
  $('#menu').hidden = false;
};
$('#menuClose').onclick = () => ($('#menu').hidden = true);
document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

const start = parseInt(location.hash.slice(1), 10);
go(Number.isFinite(start) ? start - 1 : 0);

// per prove dalla console
window.slides = { go, next, prev, SLIDES, roots };
