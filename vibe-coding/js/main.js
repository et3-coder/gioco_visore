// "Crea il tuo gioco con AIBI": i bambini descrivono a parole un videogioco, AIBI (un'IA simulata)
// scrive il codice e il gioco si aggiorna dal vivo. Poi si gioca, si controlla e si chiedono modifiche.
// Nessun dato viene salvato o inviato: tutto resta nel browser.
import { understand } from './understand.js';
import { newSpec, clone, applyChange, plural } from './spec.js';
import { generate, diff, highlight } from './codegen.js';
import { Engine } from './engine.js';
import { Chat, setVoice, isVoiceOn, unlockAudio, beep, speak } from './chat.js';
import { CHALLENGES, DISCUSS, SHORT } from './challenges.js';
import { renderPanel, answersFor } from './pictures.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chat = new Chat($('chat'), $('aibiStatus'), document.querySelector('.avatar'));

const S = {
  spec: newSpec(), history: [], code: [],
  ci: 0, ev: {}, done: new Set(), discussed: new Set(),
  last: null, pending: null, busy: false, bugIntroduced: false,
  pics: /[?&]immagini/.test(location.search), // modalità immagini: per chi non sa ancora leggere e scrivere
};
const engine = new Engine($('game'), onGameEvent);

// ---------------- codice ----------------
function renderCode(lines, isNew = lines.map(() => false)) {
  const box = $('code');
  box.innerHTML = '';
  let k = 0, first = null;
  lines.forEach((l, i) => {
    const d = document.createElement('div');
    d.className = 'ln' + (isNew[i] ? ' new' : '');
    d.innerHTML = highlight(l) || ' ';
    if (isNew[i]) { d.style.animationDelay = `${k++ * 0.18}s`; first = first || d; }
    box.appendChild(d);
  });
  return { count: k, first };
}

// AIBI "scrive il codice": le righe nuove compaiono una dopo l'altra, poi il gioco si aggiorna
async function writeCode() {
  const lines = generate(S.spec);
  const isNew = diff(S.code, lines);
  S.code = lines;
  const { count, first } = renderCode(lines, isNew);
  if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (count) {
    chat.status.textContent = 'sta scrivendo il codice…';
    for (let i = 0; i < Math.min(count, 14); i++) { beep(); await wait(180); }
    chat.status.textContent = 'assistente IA (simulata) · online';
  }
  stopGame();
  engine.setSpec(S.spec);
}

// ---------------- gioco ----------------
function stopGame() {
  if (engine.playing) engine.stop();
  $('bPlay').textContent = '▶ Gioca';
  $('bPlay').classList.remove('stop');
}
function onGameEvent(type) {
  if (type === 'collect') S.ev.collected = true;
  if (type === 'win') { S.ev.won = true; chat.system('🎉 Hai vinto!'); }
  if (type === 'win' || type === 'end') { $('bPlay').textContent = '▶ Gioca'; $('bPlay').classList.remove('stop'); }
  if (!S.busy) checkChallenge();
}
$('bPlay').onclick = async () => {
  unlockAudio();
  if (engine.playing) { stopGame(); return; }
  if (!S.spec.hero) {
    if (S.busy) return;
    S.busy = true; setBusy(true);
    await chat.aibi(S.pics ? 'Il gioco è vuoto! Prima tocca un personaggio.' : 'Il gioco è ancora vuoto! Prima ditemi che personaggio volete, per esempio: "fai un gatto".');
    S.busy = false; setBusy(false);
    return;
  }
  if (engine.play()) {
    S.ev.played = true;
    $('bPlay').textContent = '⏹ Ferma';
    $('bPlay').classList.add('stop');
    checkChallenge();
  }
};
// clic sul gioco = si può giocare con la tastiera
$('game').addEventListener('mousedown', () => $('game').focus());

// ---------------- chat ----------------
const CHAT = {
  alive: 'No, non sono vivo. Sono un programma che gira dentro questo computer: riconosco alcune parole e seguo delle regole. Voi cosa ne pensate?',
  feelings: 'Non provo emozioni vere. Posso scrivere "che bello!", ma sono solo parole che qualcuno ha preparato per me. Le emozioni le provate voi!',
  think: 'Sembro intelligente, ma non penso come voi: cerco le parole che conosco e seguo delle regole. Premete "🔍 Come mi hai capito?" per vedere come faccio!',
  gemini: 'Gemini è un\'intelligenza artificiale vera e molto più grande di me: ha letto tantissimi testi e scrive indovinando, una parola dopo l\'altra, quella più probabile. Sa scrivere anche codice vero! Io invece sono un programma piccolino con delle regole. Però anche Gemini può sbagliare!',
  who: 'Sono AIBI, un assistente di intelligenza artificiale (simulato): trasformo le vostre parole nel codice di un videogioco.',
  love: 'Che gentile! Io sono un programma e non provo affetto come una persona, però sono qui apposta per aiutarvi.',
  thanks: 'Prego! Cosa aggiungiamo adesso al gioco?',
  hello: 'Ciao! Ditemi cosa volete nel vostro gioco.',
  help: 'So fare queste cose: un personaggio (gatto, robot, drago, unicorno...), lo sfondo (spazio, mare, prato, neve...), i colori, più grande o più veloce, muoversi con le frecce o saltare, cose da raccogliere, nemici, vite, un timer, le regole per vincere e la musica.',
};
const join = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function setBusy(b) {
  for (const id of ['input', 'bUndo', 'bExplain', 'bNew']) $(id).disabled = b;
  document.querySelectorAll('#examples button, .composer .send').forEach((x) => (x.disabled = b));
}

async function onSend(text, shown) {
  text = text.trim();
  if (!text || S.busy) return;
  unlockAudio();
  $('input').value = '';
  S.busy = true; setBusy(true);
  chat.user(shown || text);
  const p = understand(text, S.spec);
  S.last = p;
  try { await respond(p); await checkChallenge(); }
  finally { S.busy = false; setBusy(false); if (!S.pics) $('input').focus(); refreshPics(); }
}

// ---------------- modalità immagini ----------------
function refreshPics() {
  if (!S.pics) return;
  renderPanel($('pics'), {
    getSpec: () => S.spec,
    onPick: (text, label) => onSend(text, label),
    speak: (t) => { if (isVoiceOn()) speak(t); },
    hints: S.done.has(S.ci) ? [] : SHORT[S.ci].tabs,
    answers: answersFor(S.pending, S.spec),
    disabled: () => S.busy,
  });
}
function applyMode() {
  $('examples').hidden = S.pics;
  $('form').hidden = S.pics;
  $('pics').hidden = !S.pics;
  $('bMode').textContent = S.pics ? '⌨️ Scrivo' : '🖼️ Immagini';
  history.replaceState(null, '', location.pathname + (S.pics ? '?immagini' : ''));
  if (S.pics && SHORT[S.ci].writeOnly && !S.done.has(S.ci)) { S.done.add(S.ci); showChallenge(); }
  refreshPics();
}

async function commit(changes, { intro = 'Ecco fatto: ', extra = '' } = {}) {
  const ch = CHALLENGES[S.ci];
  // sfida "AIBI sbaglia di nuovo": chiedete "più veloce" e AIBI lo rende più lento (ma dice il contrario)
  let speedBugNow = false;
  if (ch.bug === 'speed' && !S.speedBugIntroduced) {
    const sc = changes.find((c) => c.t === 'speed' && c.target === 'hero' && c.f > 1);
    if (sc) { changes = changes.map((c) => (c === sc ? { ...c, f: 1 / c.f } : c)); S.speedBugIntroduced = true; speedBugNow = true; }
  }
  const next = clone(S.spec);
  let notes = changes.map((c) => applyChange(next, c)).filter(Boolean);
  if (!notes.length) return chat.aibi('Non ho cambiato niente: il gioco è già così, oppure quello che volete cambiare non c\'è ancora. Guardate il gioco e ditemi cosa aggiungere!');
  if (speedBugNow) { next.speedBug = true; notes = notes.map((n) => n.replace('più lento', 'più veloce')); }
  // sfida 5: AIBI sbaglia apposta (i punti non salgono), ma è sicurissimo
  let bugNow = false;
  if (ch.bug === 'score' && !S.bugIntroduced && next.items) { next.bug = true; S.bugIntroduced = true; bugNow = true; }
  S.history.push(clone(S.spec));
  S.spec = next;
  S.ev.changes = (S.ev.changes || 0) + 1;
  if (S.pending) S.ev.clarified = true;
  if (S.last && S.last.fixes && S.last.fixes.length) S.ev.typo = true;
  if (notes.length >= 3) S.ev.big = true;
  if (S.ev.copyAsked && changes.some((c) => c.t === 'hero')) S.ev.heroAfterCopy = true;
  S.pending = null;
  const msg = bugNow
    ? `Facilissimo! ${cap(join(notes))}. Sono sicuro al cento per cento che funziona perfettamente 😎`
    : speedBugNow
      ? `Fatto! ${cap(join(notes))}. Adesso sfreccia come un razzo, garantito 😎`
      : `${intro}${join(notes)}.${extra} Ecco il codice!`;
  await chat.aibi(msg);
  await writeCode();
}

async function respond(p) {
  switch (p.kind) {
    case 'change': {
      let extra = '';
      if (p.cannot === 'copy') S.ev.copyAsked = true;
      if (p.cannot === 'copy') extra = ' (I personaggi di altri giochi e film non li copio: sono di chi li ha inventati. Ne ho usato uno nostro!)';
      else if (p.cannot) extra = ` Invece "${p.cannot}" non lo so ancora fare.`;
      return commit(p.changes, { extra });
    }
    case 'number':
      if (S.pending && S.pending.ask === 'number') return commit([{ t: S.pending.target, kind: S.pending.kindName, n: p.n }], { intro: `Ok, ${p.n}! Adesso è chiaro: ` });
      return chat.aibi(`${p.n}... cosa? Scrivetemi la frase intera, per esempio: "metti ${p.n} stelle".`);
    case 'clarify':
      S.pending = { ask: p.ask, target: p.target, kindName: p.kindName };
      if (p.ask === 'number') {
        const what = p.target === 'items' ? plural(p.kindName || S.spec.items?.kind || 'stella') : plural(p.kindName || S.spec.enemies?.kind || 'meteorite');
        return chat.aibi(`Quante ${what}, esattamente? "Tante" per me non è un numero: potrebbero essere 3 o 100! Scrivetemi un numero.`.replace(/^Quante (\w+i),/, 'Quanti $1,'));
      }
      if (S.pics) return chat.aibi(p.ask === 'number' || p.ask === 'many' ? 'Quanti, esattamente? Tocca un numero!' : p.ask === 'hard' ? 'Più difficile come? Tocca una figura!' : 'Più bello come? Tocca una figura!');
      if (p.ask === 'hard') return chat.aibi('Più difficile... in che modo? Per me "difficile" non vuol dire niente di preciso! Posso mettere più nemici, nemici più veloci, meno vite o meno tempo. Ditemi esattamente cosa volete, per esempio: "metti 6 meteoriti".');
      if (p.ask === 'many') return chat.aibi('Tanti cosa? E quanti, esattamente? Per me "tanti" non è un numero! Scrivetemi per esempio: "metti 10 stelle".');
      return chat.aibi('Più bello... come? Io non so cosa vi piace! Posso cambiare il colore, lo sfondo, la grandezza, aggiungere musica... Ditemi una cosa precisa, per esempio: "fallo viola nello spazio".');
    case 'undo': {
      if (!S.history.length) return chat.aibi('Non c\'è niente da annullare: questa è la prima versione!');
      S.spec = S.history.pop();
      S.ev.undone = true;
      if (!S.spec.bug && S.bugIntroduced && CHALLENGES[S.ci].bug === 'score' && !S.ev.bugFixed) S.bugIntroduced = false;
      if (!S.spec.speedBug && S.speedBugIntroduced && CHALLENGES[S.ci].bug === 'speed' && !S.ev.speedFixed) S.speedBugIntroduced = false;
      await chat.aibi('Fatto: ho rimesso la versione di prima. Anche i programmatori veri tornano indietro quando una modifica non va bene!');
      return writeCode();
    }
    case 'reset':
      S.history.push(clone(S.spec));
      S.spec = newSpec();
      await chat.aibi('Ok, ricominciamo da un gioco vuoto! Che personaggio volete?');
      return writeCode();
    case 'bug':
      if (S.spec.bug && p.about === 'score') {
        S.history.push(clone(S.spec));
        S.spec = { ...clone(S.spec), bug: false };
        S.ev.bugFixed = true;
        await chat.aibi(`Avete ragione, scusate! Nel codice avevo scritto "punti + 0" invece di "punti + ${S.spec.items.points}", quindi i punti restavano sempre uguali. Eppure ero sicurissimo... Ho corretto: riprovate!`);
        return writeCode();
      }
      if (S.spec.speedBug && p.about === 'speed') {
        const wrong = S.spec.hero.speed;
        S.history.push(clone(S.spec));
        const fixed = clone(S.spec);
        fixed.speedBug = false;
        fixed.hero.speed = Math.round(Math.min(3, wrong * 1.96) * 10) / 10;
        S.spec = fixed;
        S.ev.speedFixed = true;
        await chat.aibi(`Avete ragione, scusate! Nel codice ho scritto "velocità: ${wrong}", che è più piccolo di 1: così il personaggio va più piano, non più veloce! Ho sbagliato il calcolo, anche se ero sicurissimo. Ora la velocità è ${fixed.hero.speed}: riprovate!`);
        return writeCode();
      }
      if ((S.spec.bug || S.spec.speedBug) && S.pics) return chat.aibi('Davvero? Io ero sicurissimo... Tocca 🤔 e dimmi cosa non va!');
      if (S.spec.bug || S.spec.speedBug) return chat.aibi(`Davvero? Io ero sicurissimo... Cosa non funziona, esattamente? Descrivetemi cosa succede quando giocate, per esempio: "${S.spec.bug ? 'quando prendo una moneta i punti non salgono' : 'il personaggio è più lento di prima'}".`);
      if (p.about === 'speed' && S.spec.hero) return chat.aibi(`Ho controllato il codice: la velocità del personaggio è ${S.spec.hero.speed}. Se lo volete più veloce, scrivetemi "fallo più veloce".`);
      if (p.about === 'move' && !S.spec.controls) return chat.aibi('Non mi avete ancora detto come si deve muovere! Scrivetemi per esempio: "si muove con le frecce" oppure "salta con lo spazio". E ricordatevi di cliccare sul gioco prima di usare la tastiera.');
      if (p.about === 'move') return chat.aibi('Ho controllato il codice e mi sembra giusto. Provate a cliccare sul gioco prima di usare le frecce: la tastiera funziona solo quando il gioco è selezionato (ha il bordo verde).');
      if (p.about === 'score' && !S.spec.items) return chat.aibi('Non ci sono ancora cose da raccogliere, quindi non ci sono punti! Chiedetemi per esempio: "aggiungi 5 stelle da raccogliere".');
      if (p.about === 'score') return chat.aibi(`Ho controllato il codice: ogni ${S.spec.items.kind} vale ${S.spec.items.points} punti. Giocate e guardate il punteggio in alto a sinistra!`);
      return chat.aibi('Mi dispiace! Ditemi cosa devo cambiare, con parole precise, e lo correggo.');
    case 'cannot':
      if (p.what === 'copy') S.ev.copyAsked = true;
      if (p.what === 'copy') return chat.aibi('I personaggi di altri giochi e film non posso copiarli: sono di chi li ha inventati. Inventiamone uno nostro! Per esempio un drago, un astronauta o un unicorno.');
      return chat.aibi(`"${p.what}" non lo so ancora fare: sono un'IA piccola e conosco poche cose. Un'IA grande come Gemini saprebbe fare molto di più! ${CHAT.help}`);
    case 'chat':
      return chat.aibi(CHAT[p.topic]);
    default:
      return chat.aibi('Non ho capito... 🤔 Io conosco solo alcune parole. ' + CHAT.help + ' Provate con un esempio qui sotto!');
  }
}

// ---------------- sfide ----------------
function showChallenge() {
  const ch = CHALLENGES[S.ci];
  const done = S.done.has(S.ci);
  $('title').textContent = `Sfida ${S.ci + 1} di ${CHALLENGES.length}: ${ch.title}`;
  $('chTitle').textContent = (done ? '✅ ' : '🏆 ') + `Sfida ${S.ci + 1}: ${ch.title}`;
  $('chText').textContent = ch.text;
  $('challenge').classList.toggle('done', done);
  $('bNext').hidden = !done;
  $('bNext').textContent = S.ci + 1 < CHALLENGES.length ? 'Prossima sfida ▶' : 'Fine 🎉';
  const ex = $('examples');
  ex.innerHTML = '';
  for (const t of ch.examples) {
    const b = document.createElement('button');
    b.textContent = '💡 ' + t;
    b.disabled = S.busy;
    b.onclick = () => { $('input').value = t; $('input').focus(); };
    ex.appendChild(b);
  }
}
async function loadChallenge(i) {
  stopGame();
  S.ci = i;
  S.ev = {};
  S.pending = null;
  if (CHALLENGES[i].bug === 'score' && !S.done.has(i)) S.bugIntroduced = false;
  if (CHALLENGES[i].bug === 'speed' && !S.done.has(i)) S.speedBugIntroduced = false;
  // se si lascia la sfida dell'errore senza correggerlo, AIBI lo sistema da solo
  const fix = clone(S.spec);
  let fixedSilently = false;
  if (fix.bug && CHALLENGES[i].bug !== 'score') { fix.bug = false; fixedSilently = true; }
  if (fix.speedBug && CHALLENGES[i].bug !== 'speed') { fix.speedBug = false; fix.hero.speed = Math.round(Math.min(3, fix.hero.speed * 1.96) * 10) / 10; fixedSilently = true; }
  if (fixedSilently) { S.spec = fix; S.code = generate(S.spec); renderCode(S.code); engine.setSpec(S.spec); }
  showChallenge();
  chat.system(`— Sfida ${i + 1}: ${CHALLENGES[i].title} —`);
  S.busy = true; setBusy(true);
  await chat.aibi(S.pics ? SHORT[i].intro : CHALLENGES[i].intro);
  if (S.pics && SHORT[i].writeOnly && !S.done.has(i)) { S.done.add(i); showChallenge(); }
  S.busy = false; setBusy(false);
  if (!S.pics) $('input').focus();
  refreshPics();
}
async function checkChallenge() {
  const ch = CHALLENGES[S.ci];
  if (S.done.has(S.ci) || !ch.done(S.spec, S.ev)) return;
  S.done.add(S.ci);
  showChallenge();
  sfxDone();
  const wasBusy = S.busy;
  S.busy = true; setBusy(true);
  await chat.aibi('✅ Sfida completata! ' + (S.pics ? SHORT[S.ci].lesson : ch.lesson));
  refreshPics();
  if (!wasBusy) { S.busy = false; setBusy(false); }
}
function sfxDone() { [660, 880, 1100].forEach((f, i) => setTimeout(beep, i * 90)); }

function next() {
  if (S.ci + 1 >= CHALLENGES.length) {
    discuss('end', () => chat.aibi('Grazie per aver giocato con me! Ora provate a chiedere a Gemini di inventare un gioco e confrontate: cosa fa meglio lui? Cosa avete fatto meglio voi?'));
    return;
  }
  const d = CHALLENGES[S.ci].discuss;
  if (d && !S.discussed.has(d)) { discuss(d, () => loadChallenge(S.ci + 1)); return; }
  loadChallenge(S.ci + 1);
}

// ---------------- finestre ----------------
function modal(html, buttons) {
  $('modalBody').innerHTML = html;
  const box = $('modalBtns');
  box.innerHTML = '';
  for (const [label, fn, primary] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    if (primary) b.className = 'primary';
    b.onclick = () => { $('modal').hidden = true; if (fn) fn(); };
    box.appendChild(b);
  }
  $('modal').hidden = false;
}
function discuss(key, then) {
  const d = DISCUSS[key];
  S.discussed.add(key);
  stopGame();
  modal(`<h2>💬 ${d.title}</h2>${d.questions.map((q) => `<div class="q">${q}</div>`).join('')}
    <p class="small">Discutetene insieme: il gioco non registra le risposte.</p>`, [['Ne abbiamo parlato ✓', then, true]]);
  if (S.pics && isVoiceOn()) speak(d.title + '. ' + d.questions.join(' '));
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LEGEND = { H: 'personaggio', B: 'sfondo', C: 'colore', M: 'grandezza/velocità', K: 'movimento', I: 'da raccogliere', E: 'nemici', N: 'numero', G: 'regole', A: 'togliere', V: 'parola vaga', X: 'non so farlo' };
function explain() {
  const p = S.last;
  if (!p) return modal('<h2>🔍 Come ti ho capito</h2><p>Scrivetemi prima qualcosa nella chat!</p>', [['Ok', null, true]]);
  const types = new Map(p.matches.map((m) => [m.i, m.type]));
  const fixes = new Map(p.fixes.map((f) => [f.i, f]));
  const words = p.tokens.map((w, i) => {
    const t = types.get(i), f = fixes.get(i);
    const title = f ? ` title="Avevi scritto “${esc(f.from)}”: ho pensato che volessi dire “${esc(f.to)}”"` : '';
    return `<span class="w${t ? ' hit ' + t : ''}${f ? ' fixed' : ''}"${title}>${esc(w)}</span>`;
  }).join(' ');
  const used = [...new Set(p.matches.map((m) => m.type))];
  const legend = used.map((t) => `<span class="w ${t}">${LEGEND[t]}</span>`).join(' ');
  const why = {
    change: 'Ho cercato nella frase le parole che conosco (quelle colorate). Ogni parola fa scattare una regola che cambia una parte del codice. Le parole grigie le ho ignorate!',
    chat: 'Era una domanda su di me: ho una risposta già preparata da chi mi ha programmato.',
    clarify: 'Ho trovato parole come “bello” o “tanti”, ma non so trasformarle in codice: “bello” per ognuno è diverso e “tanti” non è un numero. Per questo vi ho fatto una domanda.',
    bug: 'Ho trovato parole come “non funziona” o “non sale”: allora ho controllato il codice.',
    cannot: 'Ho riconosciuto la parola barrata, ma non ho nessuna regola per farla: non so farlo!',
    unknown: 'Non ho trovato nessuna parola che conosco, quindi non ho potuto scrivere il codice.',
  }[p.kind] || 'Ho riconosciuto le parole colorate e ho seguito le mie regole.';
  const fixNote = p.fixes.length ? `<p class="small">Le parole sottolineate avevano un errore di battitura: le ho corrette indovinando la parola più simile tra quelle che conosco.</p>` : '';
  modal(`<h2>🔍 Come ti ho capito</h2>
    <p>La vostra frase: <b>“${esc(p.raw)}”</b></p>
    <div class="explain">${words}</div>
    ${legend ? `<p class="legend">${legend}</p>` : ''}
    <p>${why}</p>${fixNote}
    <p class="small">Io non capisco come una persona: riconosco solo alcune parole. Gemini è molto più grande e lavora in un altro modo (impara dalle probabilità delle parole), ma anche lui non “pensa” come noi.</p>`,
  [['Ho capito ✓', null, true]]);
  if (S.pics && isVoiceOn()) speak(why);
}

function challengeMenu() {
  modal(`<h2>🏆 Sfide</h2><div class="missionList">${CHALLENGES.map((c, i) => `<button data-i="${i}" class="${S.done.has(i) ? 'ok' : ''}"><b>${i + 1}.</b> ${S.done.has(i) ? '✅ ' : ''}${esc(c.title)}</button>`).join('')}</div>`,
    [['Chiudi', null]]);
  $('modalBody').querySelectorAll('button[data-i]').forEach((b) => {
    b.onclick = () => { if (S.busy) return; $('modal').hidden = true; loadChallenge(+b.dataset.i); };
  });
}

// ---------------- avvio ----------------
$('form').addEventListener('submit', (e) => { e.preventDefault(); onSend($('input').value); });
$('bUndo').onclick = () => { if (!S.busy) onSend('annulla'); };
$('bNew').onclick = () => { if (!S.busy) onSend('nuovo gioco'); };
$('bExplain').onclick = explain;
$('bNext').onclick = next;
$('bChallenges').onclick = challengeMenu;
$('bMode').onclick = () => { S.pics = !S.pics; applyMode(); };
$('bChSay').onclick = () => { unlockAudio(); speak(S.pics ? SHORT[S.ci].intro : CHALLENGES[S.ci].text); };
$('bVoice').onclick = () => { setVoice(!isVoiceOn()); $('bVoice').textContent = isVoiceOn() ? '🔊 Voce' : '🔇 Voce'; };
S.code = generate(S.spec);
renderCode(S.code);
engine.setSpec(S.spec);
showChallenge();
applyMode();
discuss('start', () => { unlockAudio(); loadChallenge(0); });

// utile per fare prove dalla console del browser
window.vibe = { S, understand, onSend, loadChallenge, engine };
