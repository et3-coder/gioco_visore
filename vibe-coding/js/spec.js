// Lo "stato del gioco": tutto quello che i bambini hanno chiesto ad AIBI.
// Il motore (engine.js) disegna e fa giocare questo stato; codegen.js lo trasforma nel codice mostrato.
import { HEROES, ITEMS, ENEMIES, FALLERS } from './understand.js';

export const newSpec = () => ({
  hero: null, // { kind, emoji, color, size, speed }
  bg: 'bianco', bgColor: null,
  controls: null, // 'frecce' | 'salto'
  jump: 1,
  items: null, // { kind, emoji, n, points, color, size }
  enemies: null, // { kind, emoji, n, move: 'fall'|'bounce'|'chase', speed, color, size }
  lives: 0, timer: 0,
  win: null, // { type: 'raccolti'|'punti'|'tempo', n }
  music: false,
  bug: false, // errore voluto di AIBI (sfida 5): i punti non salgono
  speedBug: false, // errore voluto di AIBI (sfida 12): "più veloce" diventa più lento
});
export const clone = (s) => JSON.parse(JSON.stringify(s));

const PL = {
  fantasma: 'fantasmi', granchio: 'granchi', ciliegia: 'ciliegie', goccia: 'gocce', roccia: 'rocce', strega: 'streghe',
  uva: 'grappoli d\'uva', virus: 'virus', cactus: 'cactus', zombie: 'zombie', hamburger: 'hamburger', medusa: 'meduse',
};
export const plural = (w) => PL[w] || (/[cg]o$/.test(w) ? w.slice(0, -1) + 'hi' : /a$/.test(w) ? w.slice(0, -1) + 'e' : /[oe]$/.test(w) ? w.slice(0, -1) + 'i' : w);
export const MOVE_NAME = { fall: 'cadono dall\'alto', bounce: 'rimbalzano', chase: 'ti inseguono' };
const BG_NAME = { bianco: 'bianco', spazio: 'lo spazio', cielo: 'il cielo', mare: 'il mare', prato: 'un prato', bosco: 'il bosco', notte: 'la notte', deserto: 'il deserto', neve: 'la neve', citta: 'la città', lava: 'un vulcano' };
const who = (s, target) => (target === 'hero' ? `il personaggio (${s.hero.kind})` : target === 'items' ? `le ${plural(s.items.kind)}`.replace(/^le ([a-z]+i)$/, 'i $1') : `i nemici (${plural(s.enemies.kind)})`);

// applica una modifica e restituisce la frase con cui AIBI la racconta (o null se non c'era niente da fare)
export function applyChange(s, c) {
  let pre = '';
  const ensureHero = () => {
    if (!s.hero) { s.hero = { kind: 'robot', emoji: HEROES.robot, color: null, size: 1, speed: 1 }; pre = 'non c\'era ancora un personaggio, quindi ho messo un robot 🤖 e '; }
  };
  const ensureItems = () => {
    if (!s.items) { s.items = { kind: 'stella', emoji: ITEMS.stella, n: 5, points: 1, color: null, size: 1 }; pre = 'ho aggiunto 5 stelle ⭐ da raccogliere e '; }
  };
  switch (c.t) {
    case 'hero': {
      if (s.hero && s.hero.kind === c.kind) return null;
      const was = s.hero;
      s.hero = { ...(was || { size: 1, speed: 1 }), color: null, kind: c.kind, emoji: HEROES[c.kind] };
      return was ? `ho trasformato il personaggio in: ${c.kind} ${HEROES[c.kind]}` : `ho creato il personaggio: ${c.kind} ${HEROES[c.kind]}`;
    }
    case 'bg':
      if (s.bg === c.bg) return null;
      s.bg = c.bg; s.bgColor = null;
      return `ho messo come sfondo ${BG_NAME[c.bg]}`;
    case 'color':
      if (c.target === 'bg') { s.bg = 'colore'; s.bgColor = c.color; return `ho colorato lo sfondo di ${c.color}`; }
      if (c.target === 'items' && !s.items) return null;
      if (c.target === 'enemies' && !s.enemies) return null;
      if (c.target === 'hero') ensureHero();
      { const o = c.target === 'hero' ? s.hero : s[c.target]; o.color = c.color === 'bianco' && c.target === 'hero' ? 'bianco' : c.color; }
      return pre + `ho colorato ${who(s, c.target)} di ${c.color}`;
    case 'size': case 'speed': {
      if (c.target !== 'hero' && !s[c.target]) return null;
      if (c.target === 'hero') ensureHero();
      const o = c.target === 'hero' ? s.hero : s[c.target];
      const key = c.t;
      const lim = key === 'size' ? [0.5, 2.6] : [0.4, 3];
      const v = Math.round(Math.min(lim[1], Math.max(lim[0], o[key] * c.f)) * 10) / 10;
      if (v === o[key]) return `${who(s, c.target)} è già ${c.f > 1 ? 'al massimo' : 'al minimo'}`;
      o[key] = v;
      const word = key === 'size' ? (c.f > 1 ? 'più grande' : 'più piccolo') : (c.f > 1 ? 'più veloce' : 'più lento');
      const name = who(s, c.target);
      const fem = name.startsWith('le ');
      const adj = c.target === 'hero' ? word : /o$/.test(word) ? word.slice(0, -1) + (fem ? 'e' : 'i') : word.replace(/e$/, 'i');
      return pre + `ho reso ${name} ${adj}`;
    }
    case 'controls':
      ensureHero();
      if (s.controls === c.v) return null;
      s.controls = c.v;
      return pre + (c.v === 'salto' ? 'ora si muove con le frecce ← → e salta con la barra spaziatrice' : 'ora si muove con le frecce ← ↑ → ↓');
    case 'jump':
      s.jump = Math.round(Math.min(2.2, Math.max(0.5, s.jump * c.f)) * 10) / 10;
      return `ora salta ${c.f > 1 ? 'più in alto' : 'più in basso'}`;
    case 'items': {
      const was = s.items;
      const kind = c.kind || (was ? was.kind : 'stella');
      const n = c.n ?? (was ? Math.min(30, was.n + (c.more || 0)) : 5);
      s.items = { ...(was || { points: 1, color: null, size: 1 }), kind, emoji: ITEMS[kind], n };
      if (!was) return `ho aggiunto ${n} ${n === 1 ? kind : plural(kind)} ${ITEMS[kind]} da raccogliere, con il punteggio`;
      if (was.kind !== kind) return `ho cambiato le cose da raccogliere: ora sono ${n === 1 ? kind : plural(kind)} ${ITEMS[kind]}`;
      return was.n === n ? null : `ora ci sono ${n} ${n === 1 ? kind : plural(kind)} da raccogliere`;
    }
    case 'points':
      ensureItems();
      s.items.points = Math.max(1, Math.min(1000, c.n));
      return pre + `ogni ${s.items.kind} vale ${s.items.points} ${s.items.points === 1 ? 'punto' : 'punti'}`;
    case 'enemies': {
      const was = s.enemies;
      if (!was && !c.kind && !c.n && c.move && !c.more) return null;
      const kind = c.kind || (was ? was.kind : 'meteorite');
      const n = c.n ?? (was ? Math.max(1, Math.min(15, was.n + (c.more || 0))) : 3);
      const move = c.move || (was && !c.kind ? was.move : FALLERS.has(kind) ? 'fall' : 'bounce');
      s.enemies = { ...(was || { speed: 1, color: null, size: 1 }), kind, emoji: ENEMIES[kind], n, move };
      const name = `${n} ${n === 1 ? kind : plural(kind)} ${ENEMIES[kind]}`;
      if (!was) return `ho aggiunto ${name} che ${MOVE_NAME[move]}: se ti toccano, perdi`;
      if (was.kind !== kind) return `ho cambiato i nemici: ora sono ${name} che ${MOVE_NAME[move]}`;
      if (was.move !== move) return `ora i nemici ${MOVE_NAME[move]}`;
      return was.n === n ? null : `ora ci sono ${name}`;
    }
    case 'lives':
      if (s.lives === c.n) return null;
      s.lives = c.n;
      return `ora hai ${c.n} ${c.n === 1 ? 'vita' : 'vite'} ${'❤️'.repeat(Math.min(c.n, 5))}`;
    case 'timer':
      if (s.timer === c.n) return null;
      s.timer = c.n;
      return `ho aggiunto un timer di ${c.n} secondi ⏱️`;
    case 'win':
      if (c.type === 'raccolti') { ensureItems(); s.win = { type: 'raccolti', n: Math.max(1, Math.min(100, c.n)) }; return pre + `vinci quando raccogli ${s.win.n} ${s.win.n === 1 ? s.items.kind : plural(s.items.kind)}`; }
      if (c.type === 'punti') { ensureItems(); s.win = { type: 'punti', n: Math.max(1, c.n) }; return pre + `vinci quando arrivi a ${s.win.n} punti`; }
      if (!s.timer) { s.timer = 30; pre = 'ho aggiunto un timer di 30 secondi ⏱️ e '; }
      s.win = { type: 'tempo' };
      return pre + 'vinci se resisti fino alla fine del tempo';
    case 'music':
      if (s.music) return null;
      s.music = true;
      return 'ho aggiunto la musica 🎵';
    case 'remove': {
      const w = c.what;
      if (w === 'enemies' && s.enemies) { s.enemies = null; return 'ho tolto i nemici'; }
      if (w === 'items' && s.items) { s.items = null; if (s.win && s.win.type !== 'tempo') s.win = null; return 'ho tolto le cose da raccogliere'; }
      if (w === 'timer' && s.timer) { s.timer = 0; if (s.win && s.win.type === 'tempo') s.win = null; return 'ho tolto il timer'; }
      if (w === 'lives' && s.lives) { s.lives = 0; return 'ho tolto le vite (ora basta un tocco per perdere)'; }
      if (w === 'music' && s.music) { s.music = false; return 'ho tolto la musica'; }
      if (w === 'bg' && s.bg !== 'bianco') { s.bg = 'bianco'; s.bgColor = null; return 'ho tolto lo sfondo'; }
      if (w === 'win' && s.win) { s.win = null; return 'ho tolto la regola per vincere'; }
      return null;
    }
  }
  return null;
}
