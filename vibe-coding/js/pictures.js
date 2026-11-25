// Pulsanti a immagini per chi non sa ancora leggere o scrivere.
// Ogni pulsante diventa una frase in italiano che passa da AIBI come se fosse stata scritta:
// così il gioco funziona allo stesso modo (e "🔍 Come mi hai capito?" mostra la frase).
import { plural } from './spec.js';

const kindOf = (s, what, def) => (s && s[what] ? s[what].kind : def);
const pl = (k) => plural(k);

export const TABS = [
  { id: 'hero', ico: '🐱', name: 'Personaggio', items: [
    { ico: '🐱', say: 'gatto', text: 'fai un gatto' },
    { ico: '🐶', say: 'cane', text: 'fai un cane' },
    { ico: '🤖', say: 'robot', text: 'fai un robot' },
    { ico: '🦄', say: 'unicorno', text: 'fai un unicorno' },
    { ico: '🐉', say: 'drago', text: 'fai un drago' },
    { ico: '🦖', say: 'dinosauro', text: 'fai un dinosauro' },
    { ico: '🐧', say: 'pinguino', text: 'fai un pinguino' },
    { ico: '🚀', say: 'razzo', text: 'fai un razzo' },
  ] },
  { id: 'bg', ico: '🌌', name: 'Sfondo', items: [
    { ico: '🌌', say: 'spazio', text: 'lo sfondo è lo spazio' },
    { ico: '🌊', say: 'mare', text: 'lo sfondo è il mare' },
    { ico: '🌳', say: 'prato', text: 'lo sfondo è un prato' },
    { ico: '❄️', say: 'neve', text: 'lo sfondo è la neve' },
    { ico: '🏜️', say: 'deserto', text: 'lo sfondo è il deserto' },
    { ico: '🌙', say: 'notte', text: 'lo sfondo è la notte' },
    { ico: '🌋', say: 'vulcano', text: 'lo sfondo è un vulcano' },
  ] },
  { id: 'color', ico: '🎨', name: 'Colore', items: [
    { sw: '#ff3b3b', say: 'rosso', text: 'fallo rosso' },
    { sw: '#3b6bff', say: 'blu', text: 'fallo blu' },
    { sw: '#2fbf71', say: 'verde', text: 'fallo verde' },
    { sw: '#ffd23f', say: 'giallo', text: 'fallo giallo' },
    { sw: '#ff7ac8', say: 'rosa', text: 'fallo rosa' },
    { sw: '#9b5cff', say: 'viola', text: 'fallo viola' },
    { ico: '🌈', say: 'arcobaleno', text: 'fallo arcobaleno' },
  ] },
  { id: 'move', ico: '🏃', name: 'Movimento', items: [
    { ico: '⬅️➡️', say: 'si muove con le frecce', text: 'si muove con le frecce' },
    { ico: '🦘', say: 'salta', text: 'salta quando premo spazio' },
    { ico: '🐇', say: 'più veloce', text: 'fallo più veloce' },
    { ico: '🐢', say: 'più lento', text: 'fallo più lento' },
    { ico: '🔼', say: 'più grande', text: 'fallo più grande' },
    { ico: '🔽', say: 'più piccolo', text: 'fallo più piccolo' },
  ] },
  { id: 'items', ico: '⭐', name: 'Da prendere', items: [
    { ico: '⭐', say: 'stelle', text: 'aggiungi 5 stelle da raccogliere' },
    { ico: '🪙', say: 'monete', text: 'aggiungi 5 monete da raccogliere' },
    { ico: '🍎', say: 'mele', text: 'aggiungi 5 mele da raccogliere' },
    { ico: '🍕', say: 'pizze', text: 'aggiungi 5 pizze da raccogliere' },
    { ico: '➕', say: 'di più', text: (s) => `metti più ${pl(kindOf(s, 'items', 'stella'))}` },
    { ico: '🔟', say: 'vale dieci punti', text: (s) => `ogni ${kindOf(s, 'items', 'stella')} vale 10 punti` },
  ] },
  { id: 'enemies', ico: '☄️', name: 'Pericoli', items: [
    { ico: '☄️', say: 'meteoriti', text: 'metti 3 meteoriti che cadono' },
    { ico: '👻', say: 'fantasmi', text: 'aggiungi 3 fantasmi' },
    { ico: '🐝', say: 'api', text: 'aggiungi 3 api' },
    { ico: '🦈', say: 'squali', text: 'aggiungi 2 squali' },
    { ico: '⬇️', say: 'cadono dal cielo', text: 'i nemici cadono' },
    { ico: '🏃‍♂️', say: 'mi inseguono', text: 'i nemici mi inseguono' },
    { ico: '➕', say: 'più pericoli', text: 'più nemici' },
    { ico: '🚫', say: 'via i pericoli', text: 'togli i nemici' },
  ] },
  { id: 'rules', ico: '🏆', name: 'Regole', items: [
    { ico: '❤️', say: 'tre vite', text: 'ho 3 vite' },
    { ico: '⏱️', say: 'timer', text: 'aggiungi un timer di 30 secondi' },
    { ico: '🏆', say: 'vinco se ne prendo dieci', text: (s) => `vinco quando prendo 10 ${pl(kindOf(s, 'items', 'stella'))}` },
    { ico: '💯', say: 'vinco con cinquanta punti', text: 'vinco con 50 punti' },
    { ico: '🛡️', say: 'vinco se resisto', text: 'vinco se resisto fino alla fine del tempo' },
    { ico: '🎵', say: 'musica', text: 'aggiungi la musica' },
  ] },
];

const HEROES = ['gatto', 'cane', 'robot', 'unicorno', 'drago', 'dinosauro', 'pinguino'];
const PLACES = [['spazio', 'nello spazio'], ['mare', 'nel mare'], ['neve', 'sulla neve'], ['deserto', 'nel deserto'], ['prato', 'sul prato']];
const THINGS = ['stelle', 'monete', 'mele', 'pizze'];
const anyOf = (a, not) => { const c = a.filter((x) => x !== not); return c[Math.floor(Math.random() * c.length)]; };

// pulsanti speciali, sempre visibili
export const SPECIAL = [
  { id: 'undo', ico: '↶', say: 'annulla', text: 'annulla' },
  { id: 'bello', ico: '✨', say: 'più bello', text: 'fallo più bello' },
  { id: 'hard', ico: '😈', say: 'più difficile', text: 'rendi il gioco più difficile' },
  { id: 'famous', ico: '🎬', say: 'personaggio famoso', text: 'fai pikachu' },
  { id: 'dice', ico: '🎲', say: 'sorpresa!', text: (s) => {
    const h = anyOf(HEROES, s && s.hero ? s.hero.kind : '');
    const [bg, where] = PLACES.filter(([b]) => !s || s.bg !== b)[Math.floor(Math.random() * 4)];
    const t = anyOf(THINGS, s && s.items ? pl(s.items.kind) : '');
    return `fai un ${h} ${where} con 5 ${t}`;
  } },
  { id: 'bug', ico: '🤔', say: 'qualcosa non va', sub: 'bug' },
];

// "qualcosa non va": per scoprire gli errori di AIBI
export const BUGS = [
  { ico: '⭐ 0️⃣', say: 'i punti non salgono', text: 'i punti non salgono' },
  { ico: '🐢', say: 'non va veloce', text: 'il personaggio non va veloce' },
  { ico: '🧍', say: 'non si muove', text: 'non si muove' },
];

// risposte da toccare quando AIBI fa una domanda
export function answersFor(pending, s) {
  if (!pending) return null;
  if (pending.ask === 'number') return [1, 3, 5, 8, 10].map((n) => ({ ico: String(n), say: String(n), text: String(n), num: true }));
  if (pending.ask === 'many') return [
    { ico: '⭐ 10', say: 'dieci stelle', text: 'metti 10 stelle' },
    { ico: '☄️ 6', say: 'sei meteoriti', text: 'metti 6 meteoriti' },
    { ico: '🍎 8', say: 'otto mele', text: 'aggiungi 8 mele da raccogliere' },
  ];
  if (pending.ask === 'hard') return [
    { ico: '☄️ ×6', say: 'più meteoriti', text: 'metti 6 meteoriti che cadono' },
    { ico: '🐇☄️', say: 'pericoli più veloci', text: 'i nemici più veloci' },
    { ico: '❤️ 1', say: 'una vita sola', text: 'ho 1 vita' },
    { ico: '⏱️ 20', say: 'meno tempo', text: 'aggiungi un timer di 20 secondi' },
  ];
  return [
    { sw: '#9b5cff', say: 'viola', text: 'fallo viola' },
    { ico: '🌈', say: 'arcobaleno', text: 'fallo arcobaleno' },
    { ico: '🌌', say: 'nello spazio', text: 'lo sfondo è lo spazio' },
    { ico: '🔼', say: 'più grande', text: 'fallo più grande' },
    { ico: '🎵', say: 'con la musica', text: 'aggiungi la musica' },
  ];
}

const textOf = (it, s) => (typeof it.text === 'function' ? it.text(s) : it.text);
const face = (it) => (it.sw ? `<span class="sw" style="background:${it.sw}"></span>` : `<span class="pi">${it.ico}</span>`);

// Disegna il pannello dentro `box`.
// opts: { getSpec(), onPick(text, label, item), speak(text), hints: [id delle schede da far pulsare], answers: [...] | null }
export function renderPanel(box, opts) {
  const state = box._pics || (box._pics = { tab: 'hero', bugOpen: false });
  const s = opts.getSpec();
  const hints = new Set(opts.hints || []);
  let html = '';
  if (opts.answers) {
    html += `<div class="pics-ask">👉 ${opts.answers.map((it, i) => `<button class="pbtn ans" data-a="${i}" title="${it.say}">${face(it)}</button>`).join('')}</div>`;
  }
  html += `<div class="pics-tabs">${TABS.map((t) => `<button class="ptab${t.id === state.tab ? ' on' : ''}${hints.has(t.id) ? ' hint' : ''}" data-t="${t.id}" title="${t.name}">${t.ico}</button>`).join('')}</div>`;
  const list = state.bugOpen ? BUGS : TABS.find((t) => t.id === state.tab).items;
  html += `<div class="pics-items${state.bugOpen ? ' bugs' : ''}">${list.map((it, i) => `<button class="pbtn" data-i="${i}" title="${it.say}">${face(it)}</button>`).join('')}</div>`;
  html += `<div class="pics-special">${SPECIAL.map((it) => `<button class="pbtn sp${hints.has('special') && it.id !== 'undo' && it.id !== 'bug' ? ' hint' : ''}${it.id === 'bug' && state.bugOpen ? ' on' : ''}" data-s="${it.id}" title="${it.say}">${face(it)}</button>`).join('')}</div>`;
  box.innerHTML = html;

  const pick = (it) => {
    if (opts.disabled && opts.disabled()) return;
    const text = textOf(it, opts.getSpec());
    if (opts.speak) opts.speak(it.say);
    opts.onPick(text, `${it.sw ? '🎨' : it.ico} ${it.say}`, it);
  };
  box.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { state.tab = b.dataset.t; state.bugOpen = false; const t = TABS.find((x) => x.id === state.tab); if (opts.speak) opts.speak(t.name); renderPanel(box, opts); }));
  box.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const it = list[+b.dataset.i]; if (state.bugOpen) state.bugOpen = false; pick(it); }));
  box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => pick(opts.answers[+b.dataset.a])));
  box.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => {
    const it = SPECIAL.find((x) => x.id === b.dataset.s);
    if (it.sub === 'bug') { state.bugOpen = !state.bugOpen; if (opts.speak) opts.speak(state.bugOpen ? 'Cosa non va?' : 'ok'); renderPanel(box, opts); return; }
    pick(it);
  }));
}
