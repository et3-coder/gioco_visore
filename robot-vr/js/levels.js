// Dati dei livelli. Coordinate griglia: x = colonna (0 a sinistra), z = riga (0 lontano, ultima vicino al giocatore).
// dir: 'N' (lontano), 'E' (destra), 'S' (verso il giocatore), 'W' (sinistra).
// Carte: F avanti, L gira a sinistra, R gira a destra, REPn ripeti n volte, END fine ripeti.

export const AGES = [
  { id: 'small', label: '3-5 anni' },
  { id: 'mid', label: '6-8 anni' },
  { id: 'big', label: '9-11 anni' },
];

export const CHAPTERS = [
  {
    id: 1,
    title: 'EMO e le note perdute',
    concept: 'Sequenze',
    intro: 'EMO vuole fare una festa, ma ha perso le sue note musicali! Metti in fila le carte per dirgli dove andare, poi premi Via!',
  },
  {
    id: 2,
    title: "Loona e l'osso nascosto",
    concept: 'Se... allora',
    intro: 'Loona va sempre dritta, come un cucciolo curioso! Tu decidi cosa fa quando passa sopra un colore: tocca le frecce per cambiarle.',
  },
  {
    id: 3,
    title: 'Gli errori di AIBI',
    concept: 'Trova l\'errore',
    intro: 'Ho scritto dei programmi per EMO... ma ho fatto qualche errore! Premi Prova per vedere cosa succede, poi aiutami ad aggiustarli.',
  },
];

const SEQ_SMALL_CARDS = ['F'];
const SEQ_MID_CARDS = ['F', 'L', 'R'];
const SEQ_BIG_CARDS = ['F', 'L', 'R', 'REP2', 'REP3', 'REP4', 'END'];

export const LEVELS = {
  // ---------------- CAPITOLO 1: EMO, sequenze ----------------
  1: {
    small: [
      { size: [3, 3], start: { x: 1, z: 2, dir: 'N' }, goal: { x: 1, z: 1 }, walls: [], cards: SEQ_SMALL_CARDS, max: 3,
        intro: 'La nota è proprio davanti a EMO! Tocca la carta verde Avanti, poi premi Via!',
        hint: 'Basta una sola carta verde. Toccala e poi premi Via!' },
      { size: [3, 3], start: { x: 1, z: 2, dir: 'N' }, goal: { x: 1, z: 0 }, walls: [], cards: SEQ_SMALL_CARDS, max: 3,
        intro: 'Ora la nota è più lontana. Quanti passi deve fare EMO? Contali insieme a me!',
        hint: 'Conta le caselle: uno, due! Servono due carte Avanti.' },
      { size: [3, 3], start: { x: 0, z: 1, dir: 'E' }, goal: { x: 2, z: 1 }, walls: [[1, 2]], cards: SEQ_SMALL_CARDS, max: 3,
        intro: 'EMO guarda verso destra. Quante carte Avanti servono per arrivare alla nota?',
        hint: 'EMO cammina dove guarda. Due passi e ci arriva!' },
    ],
    mid: [
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [[3, 4], [4, 1]], cards: SEQ_MID_CARDS, max: 8,
        intro: 'EMO deve andare avanti e poi girare. Ricorda: girare non fa muovere, fa solo cambiare direzione!',
        hint: 'Prova: avanti, avanti, gira a destra, avanti, avanti.' },
      { size: [5, 5], start: { x: 2, z: 4, dir: 'N' }, goal: { x: 2, z: 1 }, walls: [[2, 2], [3, 2]], cards: SEQ_MID_CARDS, max: 10,
        intro: 'Oh no, c\'è un blocco in mezzo alla strada! Aiuta EMO a fare il giro.',
        hint: 'Fai un passo, gira a sinistra per evitare il blocco, poi risali e rientra a destra.' },
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 4, z: 0 }, walls: [[1, 3], [1, 2], [3, 1], [3, 2]], cards: SEQ_MID_CARDS, max: 10,
        intro: 'La nota è nell\'angolo più lontano! Trova una strada libera tra i blocchi.',
        hint: 'Sali fino in cima lungo il bordo sinistro, poi gira a destra e vai dritto.' },
    ],
    big: [
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 0, z: 1 }, walls: [[2, 2], [3, 4]], cards: SEQ_BIG_CARDS, max: 12, target: 2,
        intro: 'Nuova carta: Ripeti! Ripete le carte che vengono dopo. Riesci a farcela con solo 2 carte?',
        hint: 'Metti Ripeti 4 e poi Avanti: EMO farà 4 passi!' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 4, z: 1 }, walls: [[2, 3], [3, 4], [1, 2]], cards: SEQ_BIG_CARDS, max: 12, target: 5,
        intro: 'Usa la carta Fine ripeti per dire dove finisce la ripetizione. Obiettivo: 5 carte!',
        hint: 'Ripeti 4, Avanti, Fine ripeti, Destra, Ripeti 4, Avanti.' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 3, z: 2 }, walls: [[0, 3], [2, 4], [3, 3]], cards: SEQ_BIG_CARDS, max: 12, target: 6,
        intro: 'Una scala! Il percorso ha uno schema che si ripete. Trovalo e usa Ripeti. Obiettivo: 6 carte!',
        hint: 'Lo schema è: avanti, destra, avanti, sinistra. Ripetilo 3 volte!' },
    ],
  },

  // ---------------- CAPITOLO 2: Loona, condizioni SE... ALLORA ----------------
  2: {
    small: [
      { size: [3, 3], start: { x: 0, z: 2, dir: 'N' }, goal: { x: 2, z: 0 }, walls: [], colors: [[0, 0, 'red']],
        intro: 'Loona va sempre dritta. Quando arriva sul rosso, da che parte deve girare per trovare l\'osso?',
        hint: 'L\'osso è a destra! Tocca la freccia del rosso finché diventa Destra.' },
      { size: [3, 3], start: { x: 2, z: 2, dir: 'N' }, goal: { x: 0, z: 0 }, walls: [], colors: [[2, 0, 'blue']],
        intro: 'Ora c\'è il blu! Cosa deve fare Loona quando lo tocca?',
        hint: 'L\'osso è a sinistra. Fai diventare la freccia del blu Sinistra.' },
      { size: [3, 3], start: { x: 0, z: 2, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [], colors: [[0, 0, 'red'], [2, 0, 'red']],
        intro: 'Due caselle rosse! La regola vale ogni volta che Loona passa sul rosso.',
        hint: 'Se sul rosso gira a destra, girerà due volte e tornerà indietro dall\'altra parte!' },
    ],
    mid: [
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 3, z: 0 }, walls: [[4, 3], [1, 3]], colors: [[0, 1, 'red'], [3, 1, 'blue']],
        intro: 'Due colori, due regole! Decidi cosa fa Loona sul rosso e cosa fa sul blu.',
        hint: 'Sul rosso gira a destra, sul blu gira a sinistra.' },
      { size: [5, 5], start: { x: 4, z: 4, dir: 'N' }, goal: { x: 1, z: 0 }, walls: [[0, 2], [3, 0]], colors: [[4, 2, 'blue'], [1, 2, 'red']],
        intro: 'Loona parte dall\'altro lato. Segui con il dito il percorso prima di decidere!',
        hint: 'Sul blu gira a sinistra, sul rosso gira a destra.' },
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 4, z: 0 }, walls: [[0, 1], [3, 3]], colors: [[0, 3, 'red'], [2, 3, 'blue'], [2, 1, 'red'], [4, 1, 'blue']],
        intro: 'Uno zig-zag! Le stesse due regole servono più volte.',
        hint: 'Rosso: destra. Blu: sinistra. Prova e guarda!' },
    ],
    big: [
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 5, z: 0 }, walls: [[3, 3], [2, 4]], colors: [], wallRule: true,
        intro: 'Nuova regola: SE davanti c\'è un ostacolo o il bordo, ALLORA... decidi tu!',
        hint: 'Quando Loona arriva al bordo in alto, deve girare a destra.' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 5, z: 4 }, walls: [[2, 0], [4, 4]], colors: [[0, 2, 'red'], [3, 2, 'yellow']], wallRule: true,
        intro: 'Tre regole insieme! A volte la cosa giusta è andare dritto.',
        hint: 'Rosso: destra. Giallo: dritto. Bordo: destra.' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 2, z: 5 }, walls: [[4, 2], [1, 3]], colors: [[3, 0, 'blue']], wallRule: true,
        intro: 'L\'osso è vicino alla partenza, ma la strada è lunga! Pensa a tutto il giro.',
        hint: 'Blu: destra. Bordo: destra. Loona farà un grande giro!' },
    ],
  },

  // ---------------- CAPITOLO 3: AIBI, trova l'errore (debug) ----------------
  3: {
    small: [
      { size: [3, 3], start: { x: 1, z: 2, dir: 'N' }, goal: { x: 1, z: 0 }, walls: [], cards: ['F', 'R'], preset: ['F', 'R'], max: 3,
        intro: 'Premi Prova: cosa fa EMO? Poi tocca la carta sbagliata e scegli quella giusta.',
        hint: 'La carta arancione fa girare EMO. Toccala, poi tocca la carta verde Avanti.' },
      { size: [3, 3], start: { x: 0, z: 1, dir: 'E' }, goal: { x: 2, z: 1 }, walls: [], cards: ['F'], preset: ['F', 'F', 'F'], max: 3,
        intro: 'Questo programma ha troppe carte! Premi Prova e guarda.',
        hint: 'Tocca una carta verde e premi Togli. Ne bastano due!' },
      { size: [3, 3], start: { x: 1, z: 2, dir: 'N' }, goal: { x: 1, z: 0 }, walls: [], cards: ['F', 'L'], preset: ['L', 'F', 'F'], max: 3,
        intro: 'C\'è una carta che non serve. Quale sarà?',
        hint: 'La carta blu fa girare EMO dalla parte sbagliata. Toccala e premi Togli.' },
    ],
    mid: [
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 2, z: 2 }, walls: [[3, 4], [4, 1]], cards: SEQ_MID_CARDS, preset: ['F', 'F', 'L', 'F', 'F'], max: 8,
        intro: 'C\'è un errore in questo programma. Premi Prova e trovalo!',
        hint: 'EMO gira dalla parte sbagliata. Cambia la carta Sinistra con Destra.' },
      { size: [5, 5], start: { x: 2, z: 4, dir: 'N' }, goal: { x: 2, z: 1 }, walls: [[2, 2], [3, 2]], cards: SEQ_MID_CARDS, preset: ['F', 'L', 'F', 'L', 'F', 'F', 'R', 'F'], max: 10,
        intro: 'EMO deve evitare il blocco, ma una carta è sbagliata.',
        hint: 'Guarda la quarta carta: dopo aver evitato il blocco, EMO deve girare a destra.' },
      { size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 4, z: 0 }, walls: [[1, 3], [1, 2], [3, 1], [3, 2]], cards: SEQ_MID_CARDS, preset: ['F', 'F', 'F', 'F', 'L', 'F', 'F', 'F', 'R'], max: 10,
        intro: 'Attenzione: questa volta gli errori sono due!',
        hint: 'In cima EMO deve girare a destra, e l\'ultima carta deve essere Avanti.' },
    ],
    big: [
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 0, z: 1 }, walls: [[2, 2], [3, 4]], cards: SEQ_BIG_CARDS, preset: ['REP3', 'F'], max: 12,
        intro: 'Ho usato la carta Ripeti, ma EMO non arriva alla nota. Perché?',
        hint: 'Conta le caselle: servono 4 passi, non 3.' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 4, z: 1 }, walls: [[2, 3], [3, 4], [1, 2]], cards: SEQ_BIG_CARDS, preset: ['REP4', 'F', 'END', 'L', 'REP4', 'F'], max: 12,
        intro: 'Leggi il programma come se fossi EMO, carta per carta.',
        hint: 'Dopo la salita EMO deve girare verso destra, non sinistra.' },
      { size: [6, 6], start: { x: 0, z: 5, dir: 'N' }, goal: { x: 3, z: 2 }, walls: [[0, 3], [2, 4], [3, 3]], cards: SEQ_BIG_CARDS, preset: ['REP3', 'F', 'L', 'F', 'R', 'END'], max: 12,
        intro: 'La scala dell\'altra volta... ma qualcosa è al contrario!',
        hint: 'Dentro la ripetizione, Sinistra e Destra sono scambiate.' },
    ],
  },
};

export const DIRS = { N: 0, E: 1, S: 2, W: 3 };
export const DIR_VEC = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
