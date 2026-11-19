// I livelli del gioco, dal più facile al più difficile. Superato un livello si sblocca il successivo.
// I robot giocano a turno: EMO cerca la nota, Loona l'osso, AIBI la stella.
// In OGNI livello bisogna girare sia a destra sia a sinistra.
//
// Coordinate griglia: x = colonna (0 a sinistra), z = riga (0 lontano, l'ultima è vicina al giocatore).
// dir: 'N' (lontano), 'E' (destra), 'S' (verso il giocatore), 'W' (sinistra).
// Carte: F avanti, L gira a sinistra, R gira a destra, REPn ripeti n volte, END fine ripeti.
// max = carte massime nel programma; target = sfida "programma corto" (facoltativa).
// solution = una soluzione possibile (serve per controllare che il livello si possa risolvere).

export const INTRO = 'EMO, Loona e AIBI hanno perso i loro tesori: le note di EMO, l\'ossino di Loona e le stelle di AIBI! Metti in fila le carte per guidarli, poi premi Via!';

export const ROBOTS = {
  emo: { goal: 'note', goalName: 'la nota' },
  loona: { goal: 'bone', goalName: "l'osso" },
  aibi: { goal: 'star', goalName: 'la stella' },
};

const TURNS = ['F', 'L', 'R'];
const LOOPS = ['F', 'L', 'R', 'REP2', 'REP3', 'REP4', 'REP5', 'END'];

export const LEVELS = [
  // ---------- 1-3: prime curve (griglia 5x5) ----------
  { robot: 'emo', size: [5, 5], start: { x: 1, z: 4, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [[1, 2], [3, 1]], cards: TURNS, max: 7,
    intro: 'Tocca a EMO! Girare non fa camminare: cambia solo la direzione. Qui serve girare a destra e poi a sinistra.',
    hint: 'Avanti, gira a destra, avanti, gira a sinistra, avanti.',
    solution: ['F', 'R', 'F', 'L', 'F'] },
  { robot: 'loona', size: [5, 5], start: { x: 3, z: 4, dir: 'N' }, goal: { x: 2, z: 1 }, walls: [[3, 2], [1, 3]], cards: TURNS, max: 8,
    intro: 'Ora tocca a Loona! Il suo ossino è da quella parte: prima a sinistra, poi a destra.',
    hint: 'Avanti, gira a sinistra, avanti, gira a destra, avanti, avanti.',
    solution: ['F', 'L', 'F', 'R', 'F', 'F'] },
  { robot: 'aibi', size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 2, z: 1 }, walls: [[0, 1], [3, 2], [1, 4]], cards: TURNS, max: 9,
    intro: 'Adesso tocca a me, AIBI! Scendo dal mio piedistallo: aiutami a prendere la stella!',
    hint: 'Due passi avanti, gira a destra, due passi, gira a sinistra, un passo.',
    solution: ['F', 'F', 'R', 'F', 'F', 'L', 'F'] },

  // ---------- 4-6: griglia più grande e ostacoli (6x6) ----------
  { robot: 'emo', size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 3, z: 1 }, walls: [[0, 2], [1, 2], [2, 4], [4, 3], [3, 4]], cards: TURNS, max: 11,
    intro: 'La griglia è più grande! Conta bene le caselle prima di ogni curva.',
    hint: 'Due passi, destra, tre passi, sinistra, due passi.',
    solution: ['F', 'F', 'R', 'F', 'F', 'F', 'L', 'F', 'F'] },
  { robot: 'loona', size: [6, 6], start: { x: 5, z: 5, dir: 'N' }, goal: { x: 3, z: 0 }, walls: [[5, 1], [4, 1], [2, 2], [4, 4]], cards: TURNS, max: 11,
    intro: 'Loona parte dall\'angolo a destra. Segui la strada con il dito prima di mettere le carte!',
    hint: 'Tre passi, sinistra, due passi, destra, due passi.',
    solution: ['F', 'F', 'F', 'L', 'F', 'F', 'R', 'F', 'F'] },
  { robot: 'aibi', size: [6, 6], start: { x: 2, z: 5, dir: 'N' }, goal: { x: 2, z: 0 }, walls: [[2, 3], [2, 2], [0, 3], [3, 1]], cards: TURNS, max: 13,
    intro: 'Un muro in mezzo alla strada! Devo fare il giro: esco a sinistra e rientro a destra.',
    hint: 'Avanti, sinistra, avanti, destra, tre passi, destra, avanti, sinistra, avanti.',
    solution: ['F', 'L', 'F', 'R', 'F', 'F', 'F', 'R', 'F', 'L', 'F'] },

  // ---------- 7-9: scale, labirinti e percorsi lunghi (7x7) ----------
  { robot: 'emo', size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 3, z: 3 }, walls: [[0, 4], [2, 5], [1, 3], [3, 4], [4, 3]], cards: TURNS, max: 13,
    intro: 'Una scala! EMO deve salire un gradino alla volta: destra, sinistra, destra, sinistra...',
    hint: 'Avanti, destra, avanti, sinistra... e così via fino alla nota.',
    solution: ['F', 'R', 'F', 'L', 'F', 'R', 'F', 'L', 'F', 'R', 'F'] },
  { robot: 'loona', size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 4, z: 4 }, walls: [[1, 5], [1, 6], [3, 4], [3, 5], [0, 3], [1, 3], [5, 5]], cards: TURNS, max: 16,
    intro: 'Un labirinto a zig-zag per Loona! Ci sono due curve a destra e due a sinistra.',
    hint: 'Su di due, destra, due passi, destra, giù di due, sinistra, due passi, sinistra, su di due.',
    solution: ['F', 'F', 'R', 'F', 'F', 'R', 'F', 'F', 'L', 'F', 'F', 'L', 'F', 'F'] },
  { robot: 'aibi', size: [7, 7], start: { x: 6, z: 6, dir: 'N' }, goal: { x: 5, z: 1 }, walls: [[6, 3], [2, 4], [3, 1], [5, 3], [4, 5]], cards: TURNS, max: 16,
    intro: 'Il percorso più lungo senza Ripeti! Quattro curve: guarda bene da che parte gira ognuna.',
    hint: 'Due passi, sinistra, tre passi, destra, due passi, destra, due passi, sinistra, un passo.',
    solution: ['F', 'F', 'L', 'F', 'F', 'F', 'R', 'F', 'F', 'R', 'F', 'F', 'L', 'F'] },

  // ---------- 10-12: la carta Ripeti (7x7) ----------
  { robot: 'emo', size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 5, z: 0 }, walls: [[1, 3], [3, 2], [2, 4], [6, 1]], cards: LOOPS, max: 14, target: 9,
    intro: 'Nuova carta: Ripeti! Ripete le carte fino a Fine ripeti. Così i tratti lunghi diventano corti. Obiettivo: 9 carte!',
    hint: 'Ripeti 5 Avanti Fine ripeti, Destra, Ripeti 5 Avanti Fine ripeti, Sinistra, Avanti.',
    solution: ['REP5', 'F', 'END', 'R', 'REP5', 'F', 'END', 'L', 'F'] },
  { robot: 'loona', size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 4, z: 2 }, walls: [[0, 4], [2, 5], [1, 3], [3, 4], [2, 2], [4, 3]], cards: LOOPS, max: 12, target: 6,
    intro: 'Una scala per Loona! Lo schema avanti, destra, avanti, sinistra si ripete. Obiettivo: 6 carte!',
    hint: 'Ripeti 4: avanti, destra, avanti, sinistra. Poi Fine ripeti.',
    solution: ['REP4', 'F', 'R', 'F', 'L', 'END'] },
  { robot: 'aibi', size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 4, z: 0 }, walls: [[0, 2], [1, 5], [2, 5], [3, 3], [1, 2], [5, 1]], cards: LOOPS, max: 14, target: 10,
    intro: 'Gradini doppi! Trova lo schema, ripetilo, e poi aggiungi gli ultimi passi. Obiettivo: 10 carte!',
    hint: 'Ripeti 2: avanti, avanti, destra, avanti, avanti, sinistra. Fine ripeti, poi due passi.',
    solution: ['REP2', 'F', 'F', 'R', 'F', 'F', 'L', 'END', 'F', 'F'] },

  // ---------- 13-15: Ripeti su griglie grandi (8x8) ----------
  { robot: 'emo', size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 4, z: 1 }, walls: [[0, 3], [1, 5], [3, 4], [1, 1], [2, 0], [5, 2]], cards: LOOPS, max: 14, target: 9,
    intro: 'Griglia gigante! Lo schema ha tre passi, una curva a destra, due passi e una a sinistra. Obiettivo: 9 carte!',
    hint: 'Ripeti 2: avanti, avanti, avanti, destra, avanti, avanti, sinistra. Fine ripeti.',
    solution: ['REP2', 'F', 'F', 'F', 'R', 'F', 'F', 'L', 'END'] },
  { robot: 'loona', size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 7, z: 4 }, walls: [[2, 3], [3, 3], [4, 4], [2, 5], [5, 6], [7, 2]], cards: LOOPS, max: 16, target: 12,
    intro: 'Loona fa il giro lungo! Puoi mettere un Ripeti dentro un altro Ripeti. Obiettivo: 12 carte!',
    hint: 'Ripeti 2 [ Ripeti 3: avanti avanti, Fine, destra ], Fine. Poi Ripeti 3 avanti, Fine, sinistra, avanti.',
    solution: ['REP2', 'REP3', 'F', 'F', 'END', 'R', 'END', 'REP3', 'F', 'END', 'L', 'F'] },
  { robot: 'aibi', size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 6, z: 1 }, walls: [[0, 4], [1, 6], [3, 5], [1, 3], [5, 2], [6, 3], [3, 1]], cards: LOOPS, max: 14, target: 8,
    intro: 'Una grande scala a gradini doppi per me! Obiettivo: 8 carte!',
    hint: 'Ripeti 3: avanti, avanti, destra, avanti, avanti, sinistra. Fine ripeti.',
    solution: ['REP3', 'F', 'F', 'R', 'F', 'F', 'L', 'END'] },

  // ---------- 16-18: le sfide finali (8x8) ----------
  { robot: 'emo', size: [8, 8], start: { x: 7, z: 7, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [[7, 5], [5, 6], [6, 4], [4, 5], [5, 3], [3, 4], [4, 2], [2, 3]], cards: LOOPS, max: 14, target: 6,
    intro: 'Una scala al contrario: EMO sale verso sinistra! Prima sinistra, poi destra. Obiettivo: 6 carte!',
    hint: 'Ripeti 5: avanti, sinistra, avanti, destra. Fine ripeti.',
    solution: ['REP5', 'F', 'L', 'F', 'R', 'END'] },
  { robot: 'loona', size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 6, z: 7 }, walls: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]], cards: LOOPS, max: 16, target: 12,
    intro: 'Il serpente! Loona sale, scende e risale verso destra. Lo schema si ripete 3 volte. Obiettivo: 12 carte!',
    hint: 'Ripeti 3: avanti avanti, destra, avanti, destra, avanti avanti, sinistra, avanti, sinistra. Fine ripeti.',
    solution: ['REP3', 'F', 'F', 'R', 'F', 'R', 'F', 'F', 'L', 'F', 'L', 'END'] },
  { robot: 'aibi', size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 6, z: 1 }, walls: [[0, 3], [1, 5], [4, 4], [2, 2], [3, 0], [7, 1], [5, 3]], cards: LOOPS, max: 16, target: 10,
    intro: 'Ultimo livello, il più difficile! Gradini da tre caselle: un Ripeti dentro l\'altro. Obiettivo: 10 carte!',
    hint: 'Ripeti 2 [ Ripeti 3 avanti Fine, destra, Ripeti 3 avanti Fine, sinistra ] Fine.',
    solution: ['REP2', 'REP3', 'F', 'END', 'R', 'REP3', 'F', 'END', 'L', 'END'] },
];

export const DIRS = { N: 0, E: 1, S: 2, W: 3 };
export const DIR_VEC = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
