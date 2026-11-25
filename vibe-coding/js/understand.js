// Il "cervello" di AIBI: trasforma una frase in italiano in una lista di modifiche al gioco.
// Non è una vera intelligenza artificiale: cerca parole che conosce e segue delle regole
// (proprio questo si vede con "🔍 Come mi hai capito?").
// Per insegnare ad AIBI parole nuove basta aggiungerle agli elenchi qui sotto.

export const HEROES = {
  gatto: '🐱', gattino: '🐱', cane: '🐶', cagnolino: '🐶', robot: '🤖', unicorno: '🦄', razzo: '🚀', dinosauro: '🦖',
  coniglio: '🐰', pinguino: '🐧', rana: '🐸', drago: '🐉', astronauta: '🧑‍🚀', volpe: '🦊', panda: '🐼', leone: '🦁',
  tigre: '🐯', orso: '🐻', topo: '🐭', polpo: '🐙', principessa: '👸', supereroe: '🦸', ninja: '🥷', mago: '🧙',
  alieno: '👽', auto: '🚗', macchina: '🚗', cavallo: '🐴', scimmia: '🐵', pulcino: '🐥', tartaruga: '🐢', gufo: '🦉',
  farfalla: '🦋', delfino: '🐬', balena: '🐳', koala: '🐨', maiale: '🐷', mucca: '🐮', ufo: '🛸', aereo: '✈️',
};
export const ITEMS = {
  stella: '⭐', moneta: '🪙', mela: '🍎', pizza: '🍕', diamante: '💎', fragola: '🍓', gelato: '🍦', banana: '🍌',
  carota: '🥕', osso: '🦴', pesce: '🐟', fiore: '🌸', caramella: '🍬', biscotto: '🍪', fungo: '🍄', ciambella: '🍩',
  torta: '🎂', regalo: '🎁', palloncino: '🎈', trofeo: '🏆', gemma: '💎', anguria: '🍉', ciliegia: '🍒', uva: '🍇',
  hamburger: '🍔', gioiello: '💍', chiave: '🔑', tesoro: '💰', medaglia: '🏅', foglia: '🍀', ghianda: '🌰',
};
export const ENEMIES = {
  meteorite: '☄️', asteroide: '☄️', fantasma: '👻', ape: '🐝', vespa: '🐝', mostro: '👾', bomba: '💣', squalo: '🦈',
  ragno: '🕷️', pipistrello: '🦇', fuoco: '🔥', fiamma: '🔥', serpente: '🐍', zombie: '🧟', scorpione: '🦂',
  granchio: '🦀', sasso: '🪨', roccia: '🪨', masso: '🪨', virus: '🦠', lupo: '🐺', strega: '🧙‍♀️', fulmine: '⚡',
  goccia: '💧', cactus: '🌵', medusa: '🪼', coccodrillo: '🐊',
};
// nemici che, se non si dice altro, cadono dall'alto
export const FALLERS = new Set(['meteorite', 'asteroide', 'bomba', 'fuoco', 'fiamma', 'sasso', 'roccia', 'masso', 'fulmine', 'goccia']);
export const COLORS = {
  rosso: '#ff3b3b', blu: '#3b6bff', verde: '#2fbf71', giallo: '#ffd23f', rosa: '#ff7ac8', viola: '#9b5cff',
  arancione: '#ff9234', nero: '#222222', bianco: '#ffffff', azzurro: '#5ec8ff', celeste: '#8fd8ff', oro: '#e6b800',
  dorato: '#e6b800', argento: '#c0c6d0', marrone: '#8b5a2b', grigio: '#9aa0aa', fucsia: '#ff2fa0', arcobaleno: 'arcobaleno',
};
export const BGS = {
  spazio: 'spazio', universo: 'spazio', galassia: 'spazio', cielo: 'cielo', nuvola: 'cielo', mare: 'mare', oceano: 'mare',
  acqua: 'mare', fondale: 'mare', prato: 'prato', giardino: 'prato', parco: 'prato', campagna: 'prato', erba: 'prato',
  bosco: 'bosco', foresta: 'bosco', giungla: 'bosco', notte: 'notte', buio: 'notte', deserto: 'deserto', sabbia: 'deserto',
  neve: 'neve', inverno: 'neve', ghiaccio: 'neve', polo: 'neve', montagna: 'neve', citta: 'citta', strada: 'citta',
  lava: 'lava', vulcano: 'lava',
};
const NUM = {
  un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  undici: 11, dodici: 12, quindici: 15, venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60, cento: 100,
};
const W = (s) => new Set(s.split(' '));
const GENERIC_ENEMY = W('nemico nemici pericolo pericoli ostacolo ostacoli cattivo cattivi mostriciattoli');
const GENERIC_ITEM = W('cose oggetti tesori premi bonus');
const COLLECT = W('raccogliere raccogli raccolgo raccoglie prendere collezionare mangiare mangia acchiappare');
const FALL = W('cadono cade cadere piovono piove scendono scende');
const BOUNCE = W('rimbalzano rimbalza rimbalzare girano camminano');
const CHASE = W('inseguono insegue inseguire inseguano segue seguono rincorrono rincorre');
const ARROWS = W('frecce freccette freccia tastiera muove muovere muoversi muovi cammina camminare vola volare nuota nuotare wasd');
const BIG = { grande: 1.4, grandi: 1.4, grosso: 1.4, grossa: 1.4, grossi: 1.4, grosse: 1.4, enorme: 1.8, enormi: 1.8, gigante: 1.8, giganti: 1.8 };
const SMALL = { piccolo: 0.7, piccola: 0.7, piccoli: 0.7, piccole: 0.7, piccino: 0.7, mini: 0.6, minuscolo: 0.55, minuscola: 0.55, minuscoli: 0.55 };
const FAST = { veloce: 1.4, veloci: 1.4, rapido: 1.4, rapida: 1.4, rapidi: 1.4, svelto: 1.4, svelta: 1.4, velocissimo: 1.8, velocissima: 1.8, velocissimi: 1.8, corre: 1.4, corrono: 1.4 };
const SLOW = { lento: 0.7, lenta: 0.7, lenti: 0.7, lente: 0.7, piano: 0.7, lentissimo: 0.5, lentissima: 0.5, lentissimi: 0.5 };
const HERO_WORDS = W('personaggio eroe protagonista fallo falla rendilo rendila lui lei');
const LIVES = W('vite vita cuori');
const TIMER = W('timer cronometro tempo secondi secondo minuti minuto rovescia');
const WIN = W('vinco vinci vince vincere vittoria vinto vinciamo vincono');
const SURVIVE = W('sopravvivo sopravvivi sopravvivere resisto resisti resistere sopravvive');
const MUSIC = W('musica canzone canzoncina melodia musichetta');
const REMOVE = W('togli togliere elimina eliminare rimuovi leva cancella senza niente basta');
const MORE = W('piu altri altre ancora');
const VAGUE = W('bello bella belli belle figo fico carino carina divertente meglio migliore fantastico fantastica fighissimo spettacolare interessante speciale');
const HARD = W('difficile difficili facile facili difficilissimo facilissimo impossibile complicato duro');
const MANY = W('tanti tante molti molte tantissimi tantissime sacco');
const KEYPREV = W('premo premi preme tasto barra schiaccio schiacci con col clicco');
const NOTBG = W('dal dalla dallo dall da');
const STOP = W(', . e poi che quando se ma');
// cose che AIBI non sa fare (risponde in modo onesto)
const CANNOT = W('spara sparare sparano proiettili pistola parla parlare livello livelli boss 3d online multiplayer salva salvare poteri potere scudo teletrasporto');
// personaggi di altri giochi o film: non li copiamo, ne inventiamo di nostri
const COPY = W('mario luigi sonic pikachu pokemon minecraft fortnite roblox spiderman batman superman elsa topolino peppa stitch zelda kirby');
// parole comuni che non vanno "corrette"
const COMMON = W('premo premi preme loro come sono fare fallo falla metti mettine quando prendo ogni punti punto molto anche della delle dello nella nelle sulla sopra sotto dentro fuori tutto tutti tutte questo quello vale valgono tasto voglio vorrei deve devono puoi gioco giochi gioca perde perdo dopo prima ancora altro sempre solo personaggio sfondo colore alto alta basso bassa rendilo rendila aggiungi cambia diventa essere sale salgono conta dove casa dalla dallo grazie ciao tipo nello sulle tanto tanta cosa cose fai fate mio mia miei sia sei');

export function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, ' ').replace(/([.,;:!?])/g, ' $1 ').replace(/[^a-z0-9.,;:!? ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// forme diverse della stessa parola: stelle -> stella, meteoriti -> meteorite, funghi -> fungo...
function stems(w) {
  const c = [w];
  if (w.length >= 3) {
    const b = w.slice(0, -1);
    if (/[aeio]$/.test(w)) c.push(b + 'o', b + 'e', b + 'a');
    if (/(chi|che)$/.test(w)) c.push(w.slice(0, -3) + 'co', w.slice(0, -3) + 'ca');
    if (/(ghi|ghe)$/.test(w)) c.push(w.slice(0, -3) + 'go', w.slice(0, -3) + 'ga');
    if (/[cg]e$/.test(w)) c.push(b + 'ia');
    if (/[cg]ie$/.test(w)) c.push(b + 'a');
  }
  return c;
}
const lookup = (dict, w) => { if (!w) return null; for (const c of stems(w)) if (c in dict) return c; return null; };
const inSet = (set, w) => set.has(w) || stems(w).some((c) => set.has(c));

const DICTS = [HEROES, ITEMS, ENEMIES, COLORS, BGS, NUM, BIG, SMALL, FAST, SLOW];
const SETS = [HARD, GENERIC_ENEMY, GENERIC_ITEM, COLLECT, FALL, BOUNCE, CHASE, ARROWS, LIVES, TIMER, WIN, SURVIVE, MUSIC, REMOVE, VAGUE, MANY, CANNOT, COPY];
const known = (t) => COMMON.has(t) || DICTS.some((d) => lookup(d, t)) || SETS.some((s) => s.has(t)) || /^salt/.test(t);
const VOCAB = [...new Set([...DICTS.flatMap((d) => Object.keys(d)), ...SETS.flatMap((s) => [...s]), 'salta', 'saltare', 'spazio'])];

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
// corregge piccoli errori di battitura: "gato" -> "gatto", "metoriti" -> "meteoriti"
function fixTypos(tokens) {
  const fixes = [];
  const out = tokens.map((t, i) => {
    if (t.length < 4 || /^\d+$/.test(t) || known(t)) return t;
    const max = t.length >= 7 ? 2 : 1;
    let best = null, bestD = max + 1;
    for (const w of VOCAB) {
      if (w.length < (t.length === 4 ? 5 : 4) || Math.abs(w.length - t.length) > max) continue;
      const dd = lev(t, w);
      if (dd < bestD) { bestD = dd; best = w; }
    }
    // prova anche con il plurale: "metoriti" ~ "meteorite"
    if (!best) {
      for (const w of VOCAB) {
        if (w.length < 5) continue;
        const pl = [w.slice(0, -1) + 'i', w.slice(0, -1) + 'e'].find((p) => Math.abs(p.length - t.length) <= max && lev(t, p) <= max);
        if (pl) { best = pl; bestD = 1; break; }
      }
    }
    if (best && bestD <= max) { fixes.push({ i, from: t, to: best }); return best; }
    return t;
  });
  return { tokens: out, fixes };
}

const numAt = (tokens, i) => {
  const t = tokens[i];
  if (t === undefined) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (t in NUM) {
    // "un/una/uno/sei" sono numeri solo se dopo c'è una cosa da contare ("una stella"), non in "un gatto" o "sei vivo"
    if (['un', 'una', 'uno', 'sei'].includes(t)) {
      const n = tokens[i + 1];
      if (!n || !(lookup(ITEMS, n) || lookup(ENEMIES, n) || GENERIC_ENEMY.has(n) || LIVES.has(n) || TIMER.has(n) || n === 'punti' || n === 'punto')) return null;
    }
    return NUM[t];
  }
  return null;
};

const ONLY_NUM = new RegExp(`^(\\d+|${Object.keys(NUM).join('|')})$`);

export function understand(raw, spec) {
  const { tokens, fixes } = fixTypos(normalize(raw).split(' ').filter(Boolean));
  const text = ' ' + tokens.join(' ') + ' ';
  const matches = [];
  const base = { raw, tokens, fixes, matches };
  const mark = (i, type) => { if (!matches.some((m) => m.i === i)) matches.push({ i, type }); };
  const has = (re) => re.test(text);
  const used = new Set();

  // ----- risposte brevi e richieste speciali -----
  const plain = tokens.filter((t) => !/^[.,;:!?]$/.test(t));
  if (plain.length === 1 && ONLY_NUM.test(plain[0])) {
    return { ...base, kind: 'number', n: /^\d+$/.test(plain[0]) ? +plain[0] : NUM[plain[0]], matches: [{ i: tokens.indexOf(plain[0]), type: 'N' }] };
  }
  if (has(/ (annulla|annullare|annullala) | torna (come )?(prima|indietro) | come (era )?prima | versione (di )?prima /)) return { ...base, kind: 'undo' };
  if (has(/ (ricomincia|ricominciamo|cancella tutto|da capo|azzera|resetta) | nuovo gioco /)) return { ...base, kind: 'reset' };
  if (has(/ non (funziona|funzionano|va|vanno|sale|salgono|aumenta|aumentano|conta|contano|cambia|cambiano|da|danno|prende|prendono|si muove|parte|succede|cresce|crescono)| bug | errore | sbagliat| rotto | rotti | guasto | resta(no)? a zero | sempre (a )?zero | zero punti | fermo a zero /)) {
    const about = has(/punt|conta|zero| sal|aument|cresc/) ? 'score' : has(/veloc|lent|piano/) ? 'speed' : has(/muov|cammin|salt|fermo/) ? 'move' : 'generic';
    return { ...base, kind: 'bug', about };
  }
  // dopo l'errore voluto sulla velocità: "è più lento!", "va piano"
  if (spec.speedBug && has(/ (e|va|sembra|diventato|diventa) (ancora |piu |troppo |molto )*(lento|lenta|piano)|lumaca| non (e|va) (piu )?veloce/)) return { ...base, kind: 'bug', about: 'speed' };

  // ----- modifiche al gioco -----
  const changes = [];
  const add = (c) => changes.push(c);
  const removed = new Set();
  const nearNum = (i, before = 3, after = 2, afterFirst = false) => {
    const scanBefore = () => {
      for (let k = i - 1; k >= Math.max(0, i - before); k--) {
        if (STOP.has(tokens[k])) break;
        const n = numAt(tokens, k);
        if (n !== null && !used.has(k)) { used.add(k); mark(k, 'N'); return n; }
      }
      return null;
    };
    const scanAfter = () => {
      for (let k = i + 1; k <= Math.min(tokens.length - 1, i + after); k++) {
        if (STOP.has(tokens[k])) break;
        const n = numAt(tokens, k);
        if (n !== null && !used.has(k)) { used.add(k); mark(k, 'N'); return n; }
      }
      return null;
    };
    return afterFirst ? (scanAfter() ?? scanBefore()) : (scanBefore() ?? scanAfter());
  };
  const idx = (pred) => tokens.map((t, i) => (pred(t, i) ? i : -1)).filter((i) => i >= 0);
  const isItem = (t) => !!lookup(ITEMS, t);
  const isEnemy = (t) => !!lookup(ENEMIES, t) || GENERIC_ENEMY.has(t);
  const isBg = (t, i) => !!lookup(BGS, t) && !NOTBG.has(tokens[i - 1]) && !(t === 'spazio' && spaceKey(i));
  const jumpSentence = tokens.some((t) => /^salt/.test(t));
  const spaceKey = (i) => jumpSentence && [tokens[i - 1], tokens[i - 2]].some((w) => KEYPREV.has(w));
  const hasWin = tokens.some((t) => WIN.has(t));

  // copie di personaggi famosi e cose che AIBI non sa fare
  const copyIdx = idx((t) => COPY.has(t));
  const cannotIdx = idx((t) => CANNOT.has(t));
  copyIdx.forEach((i) => mark(i, 'X'));
  cannotIdx.forEach((i) => mark(i, 'X'));

  // togliere qualcosa: "togli i nemici", "senza timer"
  for (const i of idx((t) => REMOVE.has(t))) {
    for (let k = i + 1; k <= i + 4 && k < tokens.length; k++) {
      const t = tokens[k];
      let what = null;
      if (isEnemy(t)) what = 'enemies';
      else if (isItem(t) || GENERIC_ITEM.has(t)) what = 'items';
      else if (TIMER.has(t)) what = 'timer';
      else if (LIVES.has(t)) what = 'lives';
      else if (MUSIC.has(t)) what = 'music';
      else if (t === 'sfondo') what = 'bg';
      else if (t === 'regola' || WIN.has(t)) what = 'win';
      if (what) { mark(i, 'A'); mark(k, 'A'); used.add(k); removed.add(what); add({ t: 'remove', what }); break; }
    }
  }

  // regola per vincere: "vinco quando prendo 10 stelle", "vinco a 100 punti", "vinco se resisto 30 secondi"
  if (hasWin && !removed.has('win')) {
    const wi = tokens.findIndex((t) => WIN.has(t));
    mark(wi, 'G');
    let rule = null;
    const order = [...tokens.keys()].filter((k) => k >= wi).concat([...tokens.keys()].filter((k) => k < wi && k >= wi - 4).reverse());
    for (const k of order) {
      if (rule) break;
      const n = numAt(tokens, k);
      if (n === null || used.has(k)) continue;
      const next = tokens[k + 1];
      if (next && TIMER.has(next)) { used.add(k); mark(k, 'N'); mark(k + 1, 'G'); add({ t: 'timer', n: next.startsWith('minut') ? n * 60 : n }); rule = { t: 'win', type: 'tempo' }; }
      else if (next === 'punti' || next === 'punto') { used.add(k); mark(k, 'N'); mark(k + 1, 'G'); rule = { t: 'win', type: 'punti', n }; }
      else { used.add(k); mark(k, 'N'); rule = { t: 'win', type: 'raccolti', n }; if (next && isItem(next)) { used.add(k + 1); mark(k + 1, 'I'); if (!spec.items) add({ t: 'items', kind: lookup(ITEMS, next) }); } }
    }
    if (!rule && tokens.some((t) => SURVIVE.has(t) || TIMER.has(t))) rule = { t: 'win', type: 'tempo' };
    if (rule) { tokens.forEach((t, i) => { if (SURVIVE.has(t)) mark(i, 'G'); }); add(rule); }
  }

  // punti: "ogni stella vale 10 punti"
  for (const i of idx((t) => t === 'punti' || t === 'punto' || t === 'vale' || t === 'valgono')) {
    if (used.has(i)) continue;
    const n = tokens[i].startsWith('val') ? (numAt(tokens, i + 1) !== null && !used.has(i + 1) ? (used.add(i + 1), mark(i + 1, 'N'), numAt(tokens, i + 1)) : null) : nearNum(i, 2, 0);
    if (n !== null) { mark(i, 'G'); add({ t: 'points', n }); break; }
  }

  // vite
  if (!removed.has('lives')) {
    const li = tokens.findIndex((t, i) => LIVES.has(t) && !used.has(i));
    if (li >= 0) { mark(li, 'G'); const n = nearNum(li); add({ t: 'lives', n: Math.max(1, Math.min(9, n ?? 3)) }); }
  }
  // timer
  if (!removed.has('timer')) {
    const ti = tokens.findIndex((t, i) => TIMER.has(t) && !used.has(i) && t !== 'tempo');
    const tempoI = tokens.findIndex((t, i) => t === 'tempo' && !used.has(i));
    const i = ti >= 0 ? ti : (!hasWin ? tempoI : -1);
    if (i >= 0 && !changes.some((c) => c.t === 'timer')) {
      mark(i, 'G');
      const n = nearNum(i, 2, 3, true);
      const mins = tokens.slice(i - 1, i + 3).some((t) => t && t.startsWith('minut'));
      add({ t: 'timer', n: Math.max(5, Math.min(180, n === null ? 30 : mins ? n * 60 : n)) });
    }
  }

  // personaggio
  const copied = copyIdx.length > 0;
  const hi = tokens.findIndex((t) => lookup(HEROES, t));
  if (hi >= 0) { mark(hi, 'H'); add({ t: 'hero', kind: lookup(HEROES, tokens[hi]) }); }

  // sfondo
  const bi = tokens.findIndex((t, i) => isBg(t, i));
  if (bi >= 0) { mark(bi, 'B'); add({ t: 'bg', bg: BGS[lookup(BGS, tokens[bi])] }); }

  // come si muove
  if (jumpSentence) {
    tokens.forEach((t, i) => { if (/^salt/.test(t)) mark(i, 'K'); if (t === 'spazio' && spaceKey(i)) mark(i, 'K'); });
    const higher = has(/ (piu )?(in )?alto /) && !has(/ meno /) ? 1.3 : has(/ (piu )?(in )?basso | meno alto /) ? 0.8 : null;
    if (spec.controls !== 'salto' || !higher) add({ t: 'controls', v: 'salto' });
    if (higher) add({ t: 'jump', f: higher });
  } else {
    const ai = tokens.findIndex((t) => ARROWS.has(t));
    if (ai >= 0) { mark(ai, 'K'); add({ t: 'controls', v: 'frecce' }); }
  }

  // nemici
  const enemyIdx = idx((t, i) => isEnemy(t) && !used.has(i));
  if (enemyIdx.length && !removed.has('enemies')) {
    enemyIdx.forEach((i) => mark(i, 'E'));
    const specific = enemyIdx.map((i) => lookup(ENEMIES, tokens[i])).filter(Boolean);
    const c = { t: 'enemies' };
    if (specific.length) c.kind = specific[specific.length - 1];
    const ei = enemyIdx[enemyIdx.length - 1];
    const n = nearNum(ei);
    if (n !== null) c.n = Math.max(1, Math.min(15, n));
    else if (MORE.has(tokens[ei - 1]) || MORE.has(tokens[ei - 2])) c.more = 2;
    else if (tokens[ei - 1] === 'meno' || tokens[ei - 2] === 'meno') c.more = -1;
    else if ([tokens[ei - 1], tokens[ei - 2]].some((w) => w && MANY.has(w))) c.many = true;
    tokens.forEach((t, i) => {
      if (FALL.has(t)) { c.move = 'fall'; mark(i, 'E'); }
      if (BOUNCE.has(t)) { c.move = 'bounce'; mark(i, 'E'); }
      if (CHASE.has(t)) { c.move = 'chase'; mark(i, 'E'); }
    });
    add(c);
  } else if (!removed.has('enemies')) {
    // "i meteoriti cadono" senza nominarli: cambia solo il movimento
    const mi = tokens.findIndex((t) => FALL.has(t) || CHASE.has(t) || BOUNCE.has(t));
    if (mi >= 0 && spec.enemies) { mark(mi, 'E'); add({ t: 'enemies', move: FALL.has(tokens[mi]) ? 'fall' : CHASE.has(tokens[mi]) ? 'chase' : 'bounce' }); }
  }

  // cose da raccogliere
  const itemIdx = idx((t, i) => isItem(t) && !used.has(i));
  const collectI = tokens.findIndex((t) => COLLECT.has(t));
  if (!removed.has('items') && (itemIdx.length || (collectI >= 0 && (tokens.some((t) => GENERIC_ITEM.has(t)) || !spec.items)))) {
    itemIdx.forEach((i) => mark(i, 'I'));
    if (collectI >= 0) mark(collectI, 'I');
    const c = { t: 'items' };
    if (itemIdx.length) c.kind = lookup(ITEMS, tokens[itemIdx[itemIdx.length - 1]]);
    const ii = itemIdx.length ? itemIdx[itemIdx.length - 1] : collectI;
    const n = nearNum(ii);
    if (n !== null) c.n = Math.max(1, Math.min(30, n));
    else if (MORE.has(tokens[ii - 1]) || MORE.has(tokens[ii - 2])) c.more = 3;
    else if ([tokens[ii - 1], tokens[ii - 2]].some((w) => w && MANY.has(w))) c.many = true;
    add(c);
  }

  // musica
  const mu = tokens.findIndex((t) => MUSIC.has(t));
  if (mu >= 0 && !removed.has('music')) { mark(mu, 'G'); add({ t: 'music', on: true }); }

  // colori, grandezza, velocità: a chi si riferiscono? alla cosa nominata più vicina (se no al personaggio)
  const targetFor = (i, allowBg) => {
    let best = 'hero', bestD = 99;
    tokens.forEach((t, k) => {
      let what = null;
      if (lookup(HEROES, t) || HERO_WORDS.has(t)) what = 'hero';
      else if (isEnemy(t) && !used.has(k)) what = 'enemies';
      else if (isItem(t) || GENERIC_ITEM.has(t)) what = 'items';
      else if (allowBg && t === 'sfondo') what = 'bg';
      const d = Math.abs(k - i);
      if (what && d <= 4 && d < bestD) { best = what; bestD = d; }
    });
    return best;
  };
  tokens.forEach((t, i) => {
    if (used.has(i)) return;
    const col = lookup(COLORS, t);
    if (col) { mark(i, 'C'); add({ t: 'color', target: targetFor(i, true), color: col === 'dorato' ? 'oro' : col }); return; }
    const less = tokens[i - 1] === 'meno' || tokens[i - 2] === 'meno';
    let f = BIG[t] || SMALL[t];
    if (f) { mark(i, 'M'); if (less) f = 1 / f; add({ t: 'size', target: targetFor(i), f }); return; }
    f = FAST[t] || SLOW[t];
    if (f) { mark(i, 'M'); if (less) f = 1 / f; add({ t: 'speed', target: targetFor(i), f }); }
  });

  const cannot = copied ? 'copy' : cannotIdx.length ? tokens[cannotIdx[0]] : null;
  const many = changes.find((c) => c.many);
  if (many && changes.length === 1) {
    tokens.forEach((t, i) => { if (MANY.has(t)) mark(i, 'V'); });
    return { ...base, kind: 'clarify', ask: 'number', target: many.t, kindName: many.kind };
  }
  changes.forEach((c) => delete c.many);
  // "i nemici più lenti": nomina i nemici solo per cambiarli, non per aggiungerne
  for (const what of ['enemies', 'items']) {
    const c = changes.find((x) => x.t === what);
    const modified = changes.some((x) => ['color', 'size', 'speed'].includes(x.t) && x.target === what);
    const cur = spec[what];
    if (c && modified && c.n === undefined && !c.more && !c.move && (!c.kind || (cur && cur.kind === c.kind) || !cur)) changes.splice(changes.indexOf(c), 1);
  }
  // ordine in cui applicare le modifiche (prima si crea, poi si colora...)
  const ORDER = ['remove', 'hero', 'bg', 'controls', 'jump', 'enemies', 'items', 'points', 'lives', 'timer', 'win', 'music', 'color', 'size', 'speed'];
  changes.sort((a, b) => ORDER.indexOf(a.t) - ORDER.indexOf(b.t));
  if (changes.length) return { ...base, kind: 'change', changes, cannot };

  // ----- niente da cambiare: chiacchiere, cose che non so fare, frasi vaghe -----
  if (cannot) return { ...base, kind: 'cannot', what: cannot };
  if (has(/ sei (viv|vera |vero |una persona|umano|umana|reale)/)) return { ...base, kind: 'chat', topic: 'alive' };
  if (has(/ (sentimenti|emozioni|sei felice|sei triste|provi qualcosa|ti senti)/)) return { ...base, kind: 'chat', topic: 'feelings' };
  if (has(/ (intelligente|pensi|ragioni|capisci|come funzioni|come fai)/)) return { ...base, kind: 'chat', topic: 'think' };
  if (has(/ (gemini|chatgpt|chat gpt)/)) return { ...base, kind: 'chat', topic: 'gemini' };
  if (has(/ chi sei | come ti chiami /)) return { ...base, kind: 'chat', topic: 'who' };
  if (has(/ ti voglio bene | sei simpatic/)) return { ...base, kind: 'chat', topic: 'love' };
  if (has(/ grazie /)) return { ...base, kind: 'chat', topic: 'thanks' };
  if (has(/ cosa sai fare | cosa puoi fare | aiuto | aiutami | non so /)) return { ...base, kind: 'chat', topic: 'help' };
  const hd = tokens.findIndex((t) => HARD.has(t));
  if (hd >= 0) { mark(hd, 'V'); return { ...base, kind: 'clarify', ask: 'hard' }; }
  const vi = tokens.findIndex((t) => VAGUE.has(t) || MANY.has(t));
  if (vi >= 0) { mark(vi, 'V'); return { ...base, kind: 'clarify', ask: MANY.has(tokens[vi]) ? 'many' : 'what' }; }
  if (has(/ (ciao|salve|buongiorno|buonasera|hey|ehi) /)) return { ...base, kind: 'chat', topic: 'hello' };
  return { ...base, kind: 'unknown' };
}
