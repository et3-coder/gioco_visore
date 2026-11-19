// I livelli del gioco, dal più facile al più difficile. Superato un livello si sblocca il successivo.
// Coordinate griglia: x = colonna (0 a sinistra), z = riga (0 lontano, l'ultima è vicina al giocatore).
// dir: 'N' (lontano), 'E' (destra), 'S' (verso il giocatore), 'W' (sinistra).
// Carte: F avanti, L gira a sinistra, R gira a destra, REPn ripeti n volte, END fine ripeti.
// max = carte massime nel programma; target = sfida "programma corto" (facoltativa).

export const INTRO = 'EMO vuole fare una festa, ma ha perso le sue note musicali! Metti in fila le carte per dirgli dove andare, poi premi Via!';

const ONLY_F = ['F'];
const TURNS = ['F', 'L', 'R'];
const LOOPS = ['F', 'L', 'R', 'REP2', 'REP3', 'REP4', 'REP5', 'END'];

export const LEVELS = [
  // ---- 1-2: solo "avanti" ----
  { size: [4, 4], start: { x: 1, z: 3, dir: 'N' }, goal: { x: 1, z: 1 }, walls: [], cards: ONLY_F, max: 4,
    intro: 'La nota è davanti a EMO! Tocca la carta verde Avanti tante volte quanti sono i passi, poi premi Via!',
    hint: 'Conta le caselle fino alla nota: sono due. Servono due carte Avanti.' },
  { size: [4, 4], start: { x: 0, z: 3, dir: 'N' }, goal: { x: 0, z: 0 }, walls: [[2, 1], [3, 2]], cards: ONLY_F, max: 4,
    intro: 'Ora la nota è più lontana. Quanti passi deve fare EMO?',
    hint: 'Sono tre passi: tre carte Avanti.' },

  // ---- 3-5: le svolte ----
  { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [[3, 4], [4, 1]], cards: TURNS, max: 6,
    intro: 'Nuove carte: Gira a destra e Gira a sinistra! Girare non fa camminare: EMO cambia solo direzione.',
    hint: 'Avanti, avanti, gira a destra, avanti, avanti.' },
  { size: [5, 5], start: { x: 4, z: 4, dir: 'N' }, goal: { x: 1, z: 1 }, walls: [[0, 4], [2, 3]], cards: TURNS, max: 8,
    intro: 'Questa volta la nota è dall\'altra parte. Da che lato deve girare EMO?',
    hint: 'Tre passi avanti, gira a sinistra, poi altri tre passi.' },
  { size: [5, 5], start: { x: 2, z: 4, dir: 'N' }, goal: { x: 2, z: 1 }, walls: [[2, 2], [3, 2]], cards: TURNS, max: 10,
    intro: 'Un blocco in mezzo alla strada! Aiuta EMO a fare il giro.',
    hint: 'Un passo, gira a sinistra, un passo, gira a destra, due passi, gira a destra, un passo.' },

  // ---- 6-7: percorsi lunghi su griglie più grandi ----
  { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 5, z: 0 }, walls: [[0, 1], [1, 1], [4, 1], [4, 2], [2, 4]], cards: TURNS, max: 14,
    intro: 'Una strada con tre curve. Prova a seguirla con il dito prima di mettere le carte!',
    hint: 'Sali di tre, destra, tre passi, sinistra, due passi, destra, due passi.' },
  { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 4, z: 3 }, walls: [[1, 4], [1, 5], [3, 3], [3, 4], [0, 2], [1, 2], [5, 3]], cards: TURNS, max: 15,
    intro: 'Un piccolo labirinto! EMO deve fare zig-zag tra i blocchi.',
    hint: 'Su di due, destra, due passi, destra, giù di due, sinistra, due passi, sinistra, su di due.' },

  // ---- 8-12: la carta Ripeti ----
  { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 0, z: 1 }, walls: [[2, 2], [3, 4]], cards: LOOPS, max: 12, target: 2,
    intro: 'Nuova carta: Ripeti! Ripete le carte che vengono dopo. Riesci a farcela con solo 2 carte?',
    hint: 'Metti Ripeti 4 e poi Avanti: EMO farà 4 passi!' },
  { size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 5, z: 1 }, walls: [[2, 3], [4, 4], [1, 3], [6, 2]], cards: LOOPS, max: 12, target: 6,
    intro: 'Usa la carta Fine ripeti per dire dove finisce la ripetizione. Obiettivo: 6 carte!',
    hint: 'Ripeti 5, Avanti, Fine ripeti, Destra, Ripeti 5, Avanti.' },
  { size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 4, z: 2 }, walls: [[0, 4], [2, 5], [1, 3], [3, 4], [4, 3]], cards: LOOPS, max: 12, target: 6,
    intro: 'Una scala! Il percorso ha uno schema che si ripete. Trovalo e usa Ripeti. Obiettivo: 6 carte!',
    hint: 'Lo schema è: avanti, destra, avanti, sinistra. Ripetilo 4 volte!' },
  { size: [7, 7], start: { x: 0, z: 6, dir: 'N' }, goal: { x: 6, z: 6 }, walls: [[2, 2], [3, 3], [4, 4], [2, 4], [4, 2]], cards: LOOPS, max: 14, target: 7,
    intro: 'Il giro del tavolo! EMO deve fare tre lati della griglia. Si può mettere un Ripeti dentro un altro Ripeti!',
    hint: 'Ogni lato è: 6 passi e gira a destra. Prova: Ripeti 3, Ripeti 3, Avanti, Avanti, Fine ripeti, Destra, Fine ripeti.' },
  { size: [8, 8], start: { x: 0, z: 7, dir: 'N' }, goal: { x: 6, z: 1 }, walls: [[0, 4], [1, 6], [3, 5], [1, 3], [5, 2], [6, 3], [3, 1]], cards: LOOPS, max: 14, target: 8,
    intro: 'Ultimo livello, il più difficile! Una grande scala a gradini doppi. Obiettivo: 8 carte!',
    hint: 'Lo schema è: avanti, avanti, destra, avanti, avanti, sinistra. Ripetilo 3 volte.' },
];

export const DIRS = { N: 0, E: 1, S: 2, W: 3 };
export const DIR_VEC = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
