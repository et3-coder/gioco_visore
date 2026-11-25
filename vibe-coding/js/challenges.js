// Le sfide: piccoli obiettivi per costruire, un passo alla volta, il proprio videogioco con AIBI.
// done(stato, eventi) dice quando la sfida è completata. eventi: played, collected, won, bugFixed, clarified, changes.
// bug: in questa sfida AIBI sbaglia apposta per insegnare a controllare
//   'score' = i punti non salgono, 'speed' = "più veloce" diventa più lento.
// discuss: carta "Parliamone" da mostrare quando si passa alla sfida successiva.

export const CHALLENGES = [
  {
    title: 'Il tuo personaggio',
    text: 'Chiedete ad AIBI di creare un personaggio e di scegliere uno sfondo.',
    examples: ['fai un gatto rosso', 'lo sfondo è lo spazio', 'voglio un dinosauro nel deserto'],
    intro: 'Ciao! Io sono AIBI, un\'intelligenza artificiale (finta, ma ci provo!). Insieme creiamo un videogioco: voi mi dite a parole cosa volete e io scrivo il codice. Questo si chiama vibe coding! Cominciamo: che personaggio volete? E dove si trova?',
    lesson: 'Visto? Avete descritto il gioco in italiano e io ho scritto il codice. Guardate le righe verdi: sono quelle nuove!',
    done: (s) => s.hero && s.bg !== 'bianco',
  },
  {
    title: 'Muoviti!',
    text: 'Chiedete ad AIBI di far muovere il personaggio con le frecce, oppure di farlo saltare. Poi premete ▶ Gioca e provatelo con la tastiera!',
    examples: ['si muove con le frecce', 'salta quando premo spazio', 'fallo più veloce'],
    intro: 'Adesso il personaggio sta fermo. Ditemi come si deve muovere!',
    lesson: 'Funziona! Prima l\'IA scrive, poi voi provate: è il ciclo del vibe coding.',
    done: (s, e) => s.controls && e.played,
  },
  {
    title: 'Cose da raccogliere',
    text: 'Aggiungete delle cose da raccogliere (stelle, monete, mele, pizze...) e giocate per prenderne qualcuna.',
    examples: ['aggiungi 5 stelle da raccogliere', 'ogni stella vale 10 punti', 'metti delle mele'],
    intro: 'Un gioco è più divertente se c\'è qualcosa da raccogliere. Cosa volete?',
    lesson: 'Bene! Ogni volta che il personaggio tocca un oggetto, il codice aggiunge dei punti.',
    done: (s, e) => s.items && e.collected,
  },
  {
    title: 'Attenzione ai pericoli!',
    text: 'Aggiungete dei nemici o dei pericoli e qualche vita. Poi giocate!',
    examples: ['metti 3 meteoriti che cadono', 'ho 3 vite', 'aggiungi dei fantasmi che mi inseguono'],
    intro: 'Ora un po\' di avventura: cosa deve evitare il personaggio? E quante vite ha?',
    lesson: 'Che avventura! Avete visto come il codice controlla quando un nemico tocca il personaggio?',
    done: (s, e) => s.enemies && s.lives > 0 && e.played,
  },
  {
    title: 'AIBI sbaglia!',
    bug: 'score',
    discuss: 'afterMistake',
    text: 'Chiedete ad AIBI di cambiare le cose da raccogliere (per esempio monete o mele). Poi giocate e controllate bene: funziona tutto? Guardate anche il codice!',
    examples: ['cambia le stelle in monete', 'aggiungi 8 mele da raccogliere', 'ogni moneta vale 5 punti'],
    intro: 'Questa è facilissima per me, sono sicurissimo! Ditemi pure cosa cambiare negli oggetti da raccogliere.',
    lesson: 'Avevate ragione voi! Anche le intelligenze artificiali sbagliano, a volte anche quando sembrano sicurissime. Per questo bisogna sempre provare e controllare quello che scrivono.',
    done: (s, e) => e.bugFixed,
  },
  {
    title: 'Parole vaghe',
    text: 'Scrivete ad AIBI "fallo più bello" oppure "mettine tanti". Cosa fa AIBI? Poi spiegatevi meglio.',
    examples: ['fallo più bello', 'mettine tanti', 'metti tante stelle'],
    intro: 'Adesso provate a scrivermi una richiesta un po\' vaga... vediamo cosa succede!',
    lesson: 'Con le parole precise vi ho capito subito. Anche con Gemini: più la richiesta (il "prompt") è chiara, migliore è il risultato!',
    done: (s, e) => e.clarified,
  },
  {
    title: 'Come si vince?',
    text: 'Decidete come si vince: raccogliendo un certo numero di oggetti, facendo tanti punti o resistendo fino alla fine del tempo. Poi provate a vincere!',
    examples: ['vinco quando prendo 10 stelle', 'aggiungi un timer di 30 secondi', 'vinco se resisto fino alla fine del tempo'],
    intro: 'Ogni gioco ha delle regole per vincere. Quali sono le vostre?',
    lesson: 'Avete inventato le regole e io le ho trasformate in codice. Il gioco è vostro!',
    done: (s, e) => s.win && e.won,
  },
  {
    title: 'Errori di battitura',
    text: 'Scrivete ad AIBI una richiesta con qualche errore apposta (lettere scambiate o mancanti). Riesce a capirvi lo stesso? Poi guardate 🔍 Come mi hai capito?',
    examples: ['fai un dinosuaro nel desreto', 'metti 4 fantasmmi', 'aggiugni 6 baanne da raccogliere'],
    intro: 'A volte si scrive di fretta e si sbaglia qualche lettera. Provate a mettermi alla prova!',
    lesson: 'Vi ho capito lo stesso: ho indovinato la parola più simile tra quelle che conosco, come il correttore del telefono. Ma attenzione: a volte un\'IA indovina male!',
    done: (s, e) => e.typo,
  },
  {
    title: 'Una frase, tanti cambi',
    text: 'In una sola frase chiedete ad AIBI di cambiare almeno 3 cose del gioco (personaggio, sfondo, oggetti, nemici, colori...).',
    examples: ['fai un pinguino blu sulla neve con 6 pesci e 2 squali', 'voglio un astronauta nello spazio con 5 diamanti e 3 meteoriti'],
    intro: 'Sapete che posso fare tante modifiche insieme? Basta una frase lunga e chiara.',
    lesson: 'Con una frase ben scritta ho cambiato tante cose insieme. Anche con Gemini: una richiesta completa fa risparmiare tempo!',
    done: (s, e) => e.big,
  },
  {
    title: 'Torna indietro!',
    text: 'Chiedete una modifica che non vi piace (per esempio uno sfondo strano). Poi premete ↶ Annulla, oppure scrivete "annulla".',
    examples: ['sfondo marrone', 'fallo minuscolo', 'annulla'],
    intro: 'Non sempre il risultato ci piace. Per fortuna si può tornare indietro!',
    lesson: 'Anche i programmatori veri salvano le versioni del codice e tornano indietro quando qualcosa non va. Provare e sbagliare fa parte del lavoro!',
    done: (s, e) => e.undone,
  },
  {
    title: 'Più difficile!',
    text: 'Scrivete ad AIBI "rendi il gioco più difficile". Cosa succede? Poi spiegate cosa intendete con parole precise e provate il gioco.',
    examples: ['rendi il gioco più difficile', 'metti 6 meteoriti', 'i nemici più veloci'],
    intro: 'Il gioco è troppo facile? Ditemelo!',
    lesson: '"Difficile" per ognuno vuol dire una cosa diversa: per questo vi ho chiesto. Dire esattamente cosa si vuole è il segreto per lavorare bene con un\'IA.',
    done: (s, e) => e.clarified && s.enemies && (s.enemies.n >= 5 || s.enemies.speed > 1) && e.played,
  },
  {
    title: 'AIBI sbaglia di nuovo!',
    bug: 'speed',
    discuss: 'afterMistake2',
    text: 'Chiedete ad AIBI di rendere il personaggio più veloce. Poi provate il gioco: è davvero più veloce? Controllate anche il numero della velocità nel codice!',
    examples: ['fallo più veloce', 'è più lento!', 'il personaggio va piano'],
    intro: 'Oggi sono in formissima, non sbaglio niente! Cosa volete cambiare?',
    lesson: 'Questa volta l\'errore era nascosto in un numero: per accorgersene bisognava provare il gioco o leggere bene il codice. Bravissimi!',
    done: (s, e) => e.speedFixed,
  },
  {
    title: 'Personaggi inventati',
    text: 'Chiedete ad AIBI un personaggio famoso di un videogioco o di un cartone. Cosa risponde? Poi inventate un personaggio tutto vostro.',
    examples: ['fai pikachu', 'fai mario', 'fai un drago viola gigante'],
    intro: 'Avete un personaggio preferito? Provate a chiedermelo...',
    lesson: 'I personaggi famosi appartengono a chi li ha inventati: non si copiano. Il vostro personaggio invece è solo vostro!',
    done: (s, e) => e.copyAsked && e.heroAfterCopy,
  },
  {
    title: 'Corsa contro il tempo',
    text: 'Create una sfida a tempo: un timer e un numero di punti da raggiungere prima che finisca. Poi provate a vincere!',
    examples: ['aggiungi un timer di 20 secondi', 'vinco con 50 punti', 'ogni stella vale 10 punti'],
    intro: 'Adesso mettiamo un po\' di fretta: riuscirete a fare abbastanza punti prima che finisca il tempo?',
    lesson: 'Avete creato un vero gioco a tempo! Il timer è una delle regole più usate nei videogiochi.',
    done: (s, e) => s.timer && s.win && s.win.type === 'punti' && e.won,
  },
  {
    title: 'Gioco libero',
    text: 'Inventate il vostro gioco! Uno scrive ad AIBI, l\'altro gioca e dice cosa cambiare. Poi vi scambiate. (Potete ripartire da zero con 🗑️ Nuovo gioco.)',
    examples: ['fai un pinguino sulla neve', 'metti dei pesci da raccogliere', 'gli squali mi inseguono'],
    intro: 'Ultima sfida: siete voi i game designer! Io scrivo il codice, voi decidete tutto il resto.',
    lesson: 'Siete diventati bravissimi a lavorare con un\'intelligenza artificiale!',
    done: (s, e) => e.won || (e.played && e.changes >= 3),
  },
];

// Versione per la "modalità immagini" (chi non sa ancora leggere): frasi brevi lette da AIBI,
// schede dei pulsanti da far pulsare e sfide che richiedono la scrittura (si possono saltare).
export const SHORT = [
  { intro: 'Ciao! Io sono AIBI. Scegli un personaggio e uno sfondo!', lesson: 'Bravo! Hai creato il tuo personaggio!', tabs: ['hero', 'bg', 'color'] },
  { intro: 'Adesso fallo muovere! Poi premi Gioca.', lesson: 'Si muove! Bravissimo!', tabs: ['move'] },
  { intro: 'Aggiungi delle cose da prendere!', lesson: 'Le hai prese! Che bello!', tabs: ['items'] },
  { intro: 'Metti dei pericoli e le vite!', lesson: 'Che avventura!', tabs: ['enemies', 'rules'] },
  { intro: 'Cambia le cose da prendere. Poi gioca e controlla bene!', lesson: 'Avevi ragione tu! Anche le IA sbagliano.', tabs: ['items'] },
  { intro: 'Tocca la stellina magica: più bello!', lesson: 'Con le parole precise ti capisco meglio!', tabs: ['special'] },
  { intro: 'Scegli come si vince! Poi gioca.', lesson: 'Hai vinto! Il gioco è tuo!', tabs: ['rules'] },
  { intro: 'Questa sfida è per chi sa scrivere. La saltiamo!', lesson: '', tabs: [], writeOnly: true },
  { intro: 'Tocca il dado della sorpresa!', lesson: 'Tante cose insieme!', tabs: ['special'] },
  { intro: 'Cambia qualcosa, poi tocca la freccia indietro!', lesson: 'Si può sempre tornare indietro!', tabs: ['bg', 'special'] },
  { intro: 'Tocca il diavoletto: più difficile! Poi gioca.', lesson: 'Bravo! Mi hai detto cosa volevi.', tabs: ['special'] },
  { intro: 'Fai il personaggio più veloce. Poi gioca e controlla!', lesson: 'Hai trovato il mio errore!', tabs: ['move'] },
  { intro: 'Chiedimi un personaggio famoso!', lesson: 'I personaggi famosi non si copiano!', tabs: ['special', 'hero'] },
  { intro: 'Metti un timer e i punti per vincere!', lesson: 'Una corsa contro il tempo!', tabs: ['rules', 'items'] },
  { intro: 'Inventa il tuo gioco!', lesson: 'Sei bravissimo!', tabs: ['hero', 'bg', 'move', 'items', 'enemies', 'rules'] },
];
// Carte "Parliamone": domande da discutere insieme. Il gioco non registra le risposte.
export const DISCUSS = {
  start: {
    title: 'Prima di cominciare... parliamone!',
    questions: [
      'Secondo voi un\'intelligenza artificiale pensa come noi?',
      'Avete mai parlato con un\'IA (per esempio Gemini)? Cosa vi ha colpito?',
    ],
  },
  afterMistake: {
    title: 'AIBI ha sbagliato... parliamone!',
    questions: [
      'AIBI ha scritto un codice sbagliato, ma diceva di essere sicurissimo. Come ve ne siete accorti?',
      'Se un gioco (o un compito) fatto con l\'IA ha un errore, di chi è la colpa?',
      'Vi fidereste di un\'IA per fare i compiti? Perché?',
    ],
  },
  afterMistake2: {
    title: 'AIBI ha sbagliato di nuovo... parliamone!',
    questions: [
      'Questa volta l\'errore era più facile o più difficile da trovare? Perché?',
      'Come si può controllare il lavoro di un\'IA?',
      'Se un\'IA sbaglia anche quando sembra sicura, quando possiamo fidarci?',
    ],
  },
  end: {
    title: 'Sfide finite! Ultime domande...',
    questions: [
      'Secondo voi AIBI ha capito davvero le vostre frasi, o ha solo riconosciuto delle parole?',
      'AIBI è vivo? Pensa? Ha sentimenti?',
      'Chi ha inventato il gioco: voi o AIBI?',
      'Che differenza c\'è tra AIBI e Gemini? Provate a chiedere a Gemini di inventare un gioco!',
    ],
  },
};
