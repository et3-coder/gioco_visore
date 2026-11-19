# L'avventura di EMO

Gioco educativo in realtà virtuale (WebXR) per bambini: si impara il **coding** guidando il robot **EMO**
con le carte comando. Funziona nel browser del visore Meta Quest: non serve installare app.

## Com'è fatto il gioco

EMO ha perso le sue note musicali: il bambino mette in fila le **carte comando** (avanti, gira a sinistra,
gira a destra, ripeti, fine ripeti) e preme *Via!* per farlo arrivare alla nota.

Ci sono **12 livelli** a difficoltà crescente; superato un livello si sblocca il successivo
(i progressi restano salvati nel browser del visore):

| Livelli | Griglia | Novità |
|---|---|---|
| 1-2 | 4×4 | solo la carta *Avanti* |
| 3-5 | 5×5 | le svolte (*sinistra* / *destra*) e il primo ostacolo |
| 6-7 | 6×6 | percorsi lunghi con più curve, un piccolo labirinto |
| 8-12 | 6×6 → 8×8 | la carta *Ripeti* (cicli), *Fine ripeti*, scale e un ciclo dentro l'altro |

Dopo l'ultimo livello c'è la **festa finale**. Dal menu si può riprendere dall'ultimo livello sbloccato,
rigiocare un livello già superato o ricominciare da capo.

**Il palco** (pulsante nel menu) è una modalità creativa senza obiettivo: il bambino compone una coreografia
con le carte azione (*balla*, *salta*, *giravolta*, *inchino*, *parla*, *musica*, *felici*, più *ripeti* e
*fine ripeti*) e premendo *Spettacolo!* EMO, Loona e AIBI la eseguono insieme, con applausi finali
(codice in `js/game/stage.js`). Durante lo spettacolo e la festa finale suona una base musicale allegra
generata dal browser (batteria, basso, accordi e melodia, in `js/audio.js` → `music`), che si abbassa
quando i robot parlano.

**AIBI** è l'aiutante: legge le istruzioni ad alta voce (pulsante con l'altoparlante per riascoltarle)
e dopo 2 tentativi sbagliati dà un suggerimento. Dal livello 8 c'è anche la sfida del "programma più corto".

Per gli adulti: Meta consiglia i visori Quest dai 10 anni in su. Con i bambini più piccoli fate partite brevi
(10-15 minuti) e restate sempre vicini.

## Provare sul PC

1. Apri PowerShell nella cartella `robot-vr` ed esegui:
   ```powershell
   powershell -ExecutionPolicy Bypass -File serve.ps1
   ```
2. Apri **http://localhost:8080** con Chrome o Edge e gioca con il mouse.
3. (Facoltativo) Per simulare il visore installa l'estensione di Chrome **Immersive Web Emulator** (di Meta):
   i pulsanti *Entra in VR* e *Realtà mista* si attivano e puoi muovere visore e controller virtuali
   (l'emulatore ha anche una stanza simulata per provare la realtà mista).

## Giocare sul Meta Quest (pubblicazione con GitHub Pages)

Il visore può entrare in VR solo da un sito **https**. GitHub Pages lo offre gratis:

1. Crea un account su <https://github.com> (se non lo hai).
2. Crea un nuovo repository pubblico, per esempio `robot-vr`.
3. Nella pagina del repository: *Add file* → *Upload files* e trascina **tutto il contenuto** della cartella
   `robot-vr` (`index.html`, la cartella `js`, ecc.). Premi *Commit changes*.
4. Vai su *Settings* → *Pages*. In *Branch* scegli `main` e la cartella `/ (root)`, poi *Save*.
5. Dopo 1-2 minuti il gioco sarà su `https://TUO-NOME-UTENTE.github.io/robot-vr/`.
6. Sul Quest apri il **Browser**, vai a quell'indirizzo e premi **ENTER VR**.

Nella pagina ci sono due pulsanti:

- **Entra in VR**: il gioco si svolge in una stanza colorata tutta virtuale.
- **Realtà mista**: si vede la propria stanza vera (passthrough) e tabellone e robot si appoggiano su un **tavolo vero**.

Nel visore: punta con il controller e premi il **grilletto** (oppure fai "pinch" con le dita se usi le mani).
In VR, se la scena non è comoda, nel menu iniziale premi **Centra la scena**: si posiziona davanti a te, all'altezza giusta.

## Realtà mista: come si usa

1. Prima volta: sul Quest fai la **configurazione dello spazio** (*Impostazioni → Ambiente fisico → Configurazione
   dello spazio / Space Setup*) e segna il tavolo come **tavolo/scrivania**. Così il visore sa dov'è il piano del tavolo.
2. Premi **Realtà mista**: compare un cartello viola. Punta il controller sul tavolo: vedrai un **mirino giallo**
   con la sagoma viola del tabellone.
3. Premi il grilletto: tabellone e robot compaiono sul tavolo, rivolti verso di te. Lo schermo con le carte
   resta sospeso sopra il bordo lontano del tabellone, e AIBI è seduto sul suo angolo.
4. Per cambiare posto, nel menu iniziale premi **Sposta il gioco**.

Se il visore non trova nessun tavolo (per esempio se lo spazio non è configurato) entro 8 secondi,
il gioco compare comunque, fluttuante davanti al bambino.

Consigli: stanza ben illuminata, tavolo sgombro, bambino seduto o in piedi di fronte al tavolo.

## Robot

I tre robot sono modelli 3D costruiti nel codice con **proporzioni e colori misurati sulle foto**
dei prodotti: ogni parte (testa, cornice, schermo, cuffie, gambe, ruote...) ha le dimensioni
ricavate in pixel dalla foto e convertite in centimetri, e i colori campionati dai pixel della foto.

Sono divisi in **parti articolate**, ognuna con il suo perno:
- **EMO** (`js/robots/emo.js`): testa con cuffie (perno sul collo) e due gambe con i piedi (perno all'anca)
  → cammina alzando i piedi a turno, balla battendo i piedi, si guarda intorno;
- **Loona** (`js/robots/loona.js`): testa con faccia nera curva, orecchie a pinna (attaccate alla testa),
  quattro zampe con ruote appoggiate a terra → orecchie che sbattono, zampe che spingono, ruote che girano;
- **AIBI** (`js/robots/aibi.js`): testa "a televisore" (perno sul collo) e corpo, base ferma con anello luminoso
  → si guarda intorno e annuisce quando parla.

Gli occhi sono uno schermo animato (felice, triste, confuso, cuori...) e le espressioni muovono anche la testa.
Le animazioni sono nei metodi `idle()` dei tre file.

Se in futuro avrai modelli 3D completi (`emo.glb`, `loona.glb`, `aibi.glb` nella cartella `models/`), il gioco
userà quelli al loro posto: vedi [models/LEGGIMI.md](models/LEGGIMI.md).

## Struttura dei file

```
index.html                 pagina principale
serve.ps1                  server locale per le prove sul PC
js/main.js                 scena 3D, stanza, ciclo di gioco, avvio VR / realtà mista, livelli e progressi
js/xr/placement.js         realtà mista: mirino e posizionamento sul tavolo vero (hit-test)
js/levels.js               i 12 livelli in ordine di difficoltà e i testi (qui si modificano o aggiungono)
js/robots/                 modelli 3D e animazioni di EMO, Loona, AIBI (+ faccia-schermo animata)
js/robots/models.js        caricamento di eventuali modelli .glb completi e loro regolazioni
models/                    qui vanno eventuali emo.glb, loona.glb, aibi.glb
js/game/level.js           un livello: carte, esecuzione del programma, vittoria/errore
js/game/board.js           tabellone, blocchi, caselle colorate, note/ossi/stelle
js/game/program.js         traduce le carte in passi (gestisce Ripeti / Fine ripeti)
js/ui/                     pannelli, pulsanti, carte, menu, puntatori (mouse e controller)
js/hints.js                voce di AIBI (sintesi vocale italiana del browser) e frasi
js/audio.js                effetti sonori
```

### Aggiungere un livello

In `js/levels.js` ogni livello è un oggetto, per esempio:

```js
{ size: [5, 5], start: { x: 0, z: 4, dir: 'N' }, goal: { x: 2, z: 2 },
  walls: [[3, 4]], cards: ['F', 'L', 'R'], max: 8,
  intro: 'Testo che AIBI legge all\'inizio', hint: 'Suggerimento dopo 2 errori' }
```

- `x` = colonna (0 a sinistra), `z` = riga (0 è la più lontana dal giocatore).
- `dir`: `N` lontano, `S` verso il giocatore, `E` destra, `W` sinistra.
- `cards`: le carte disponibili (`F`, `L`, `R`, `REP2`…`REP5`, `END`); `max`: quante carte al massimo nel programma;
  `target` (facoltativo): sfida del programma più corto.
- L'ordine nell'elenco è l'ordine dei livelli: metti i livelli nuovi nella posizione giusta per difficoltà.
- La griglia si adatta da sola: le caselle sono grandi al massimo 22 cm e il tabellone al massimo 1,2 m.

Note: i robot sono personaggi in stile cartoon *ispirati* ai prodotti reali (EMO e AIBI di Living.AI,
Loona di KEYi Tech), non riproduzioni dei modelli ufficiali.
