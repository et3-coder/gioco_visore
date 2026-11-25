// Dallo stato del gioco al "codice" che AIBI mostra: JavaScript semplice, con nomi e commenti in italiano.
// (Il gioco vero lo fa girare engine.js: questo codice serve per far vedere cosa ha scritto l'IA.)
import { plural, MOVE_NAME } from './spec.js';

const num = (x) => String(Math.round(x * 10) / 10);
const ident = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '');

export function generate(s) {
  const L = [];
  const sfondo = s.bg === 'colore' ? s.bgColor : s.bg;
  L.push('// Il nostro videogioco, scritto da AIBI 🤖');
  L.push(`const gioco = creaGioco({ sfondo: '${sfondo}' });`);

  if (!s.hero) {
    L.push('', '// (ancora nessun personaggio: chiedilo ad AIBI!)');
  } else {
    const h = s.hero, o = [];
    if (h.color) o.push(`colore: '${h.color}'`);
    if (h.size !== 1) o.push(`grandezza: ${num(h.size)}`);
    if (h.speed !== 1) o.push(`velocità: ${num(h.speed)}`);
    L.push('', `// il personaggio: ${h.kind}`);
    L.push(`const eroe = gioco.aggiungiPersonaggio('${h.emoji}'${o.length ? `, { ${o.join(', ')} }` : ''});${s.speedBug ? '   // più veloce!' : ''}`);
    if (s.controls === 'frecce') L.push('eroe.muoviConLeFrecce();   // ← ↑ → ↓');
    if (s.controls === 'salto') {
      L.push("eroe.muoviConLeFrecce(['←', '→']);");
      L.push(`eroe.saltaConIlTasto('spazio'${s.jump !== 1 ? `, { altezza: ${num(s.jump)} }` : ''});`);
    }
  }

  if (s.items || s.lives || s.win) {
    L.push('', '// i contatori');
    if (s.items) L.push('let punti = 0;');
    if (s.win && s.win.type === 'raccolti') L.push('let raccolti = 0;');
    if (s.lives) L.push(`let vite = ${s.lives};`);
  }

  if (s.items) {
    const it = s.items, name = ident(plural(it.kind)), o = [];
    if (it.color) o.push(`colore: '${it.color}'`);
    if (it.size !== 1) o.push(`grandezza: ${num(it.size)}`);
    L.push('', `// cose da raccogliere: ${plural(it.kind)}`);
    L.push(`const ${name} = gioco.aggiungiOggetti('${it.emoji}', ${it.n}${o.length ? `, { ${o.join(', ')} }` : ''});`);
    L.push(`eroe.quandoTocca(${name}, (oggetto) => {`);
    L.push(s.bug ? '  punti = punti + 0;   // aggiorno i punti' : `  punti = punti + ${it.points};`);
    if (s.win && s.win.type === 'raccolti') L.push('  raccolti = raccolti + 1;');
    L.push('  oggetto.spostaAltrove();');
    L.push("  suona('ding');");
    L.push('});');
  }

  if (s.enemies) {
    const e = s.enemies, o = [`movimento: '${MOVE_NAME[e.move]}'`];
    if (e.speed !== 1) o.push(`velocità: ${num(e.speed)}`);
    if (e.color) o.push(`colore: '${e.color}'`);
    if (e.size !== 1) o.push(`grandezza: ${num(e.size)}`);
    L.push('', `// pericoli: ${plural(e.kind)}`);
    L.push(`const nemici = gioco.aggiungiNemici('${e.emoji}', ${e.n}, { ${o.join(', ')} });`);
    L.push('eroe.quandoTocca(nemici, () => {');
    if (s.lives) { L.push('  vite = vite - 1;'); L.push('  if (vite === 0) gioco.perdi();'); }
    else L.push('  gioco.perdi();');
    L.push('});');
  }

  if (s.timer) {
    L.push('', '// il tempo');
    L.push(`gioco.timer(${s.timer}, () => ${s.win && s.win.type === 'tempo' ? 'gioco.vinci()' : 'gioco.fine()'});`);
  }
  if (s.win && s.win.type !== 'tempo') {
    L.push('', '// come si vince');
    L.push(s.win.type === 'raccolti' ? `quando(() => raccolti >= ${s.win.n}, () => gioco.vinci());` : `quando(() => punti >= ${s.win.n}, () => gioco.vinci());`);
  }
  if (s.music) L.push('', "gioco.musica('allegra');");
  L.push('', 'gioco.avvia();');
  return L;
}

// righe nuove o cambiate rispetto alla versione precedente
export function diff(oldLines, newLines) {
  const count = new Map();
  for (const l of oldLines) count.set(l, (count.get(l) || 0) + 1);
  return newLines.map((l) => {
    const c = count.get(l) || 0;
    if (c > 0) { count.set(l, c - 1); return false; }
    return l.trim() !== '';
  });
}

// colori semplici per il codice (commenti, testi, numeri, parole chiave)
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function highlight(line) {
  const ci = line.indexOf('//');
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const comment = ci >= 0 ? line.slice(ci) : '';
  let h = esc(code)
    .replace(/('[^']*')/g, '<span class="s">$1</span>')
    .replace(/\b(const|let|if)\b/g, '<span class="k">$1</span>')
    .replace(/(^|[^\w'])(\d+(\.\d+)?)/g, '$1<span class="n">$2</span>');
  if (comment) h += `<span class="c">${esc(comment)}</span>`;
  return h;
}
