# Modelli 3D realistici dei robot

Metti qui i modelli 3D con questi nomi esatti:

- `emo.glb`
- `loona.glb`
- `aibi.glb`

Se un file manca, il gioco usa il robot semplice disegnato nel codice (e funziona comunque).
Nella console del browser compariranno degli avvisi "404": vogliono solo dire che quel file non c'è ancora.

## Come creare i modelli dalle foto (intelligenza artificiale "immagine → 3D")

Esempio con **Meshy** (https://www.meshy.ai). Funziona allo stesso modo con **Tripo** (https://www.tripo3d.ai)
o **Rodin** (https://hyper3d.ai): tutti hanno una prova gratuita.

1. Crea un account e scegli **Image to 3D**.
2. Carica la foto del robot (per esempio `res_de4f6a9287e04b53b5c2166805563ebc.webp` per EMO).
   - Lo sfondo viene tolto da solo.
   - Se puoi, usa la funzione con **più foto** (davanti, di lato, dietro): il retro del robot verrà molto più fedele.
   - La foto di EMO ha anche la base a skateboard: se non la vuoi nel gioco, ritaglia la foto prima di caricarla.
3. Attiva le **texture** (meglio se "PBR") e avvia la generazione. Se il risultato non ti piace, rigeneralo.
4. Prima di scaricare, se c'è l'opzione, riduci i poligoni (*Remesh* / *Low poly*, circa **20.000-50.000 triangoli**)
   e scegli texture **2048** o **1024**. Così il visore resta fluido.
5. Scarica in formato **GLB** e rinomina il file (`emo.glb`, `loona.glb` o `aibi.glb`), poi mettilo in questa cartella.
6. Ricarica il gioco nel browser: il robot vero apparirà al posto di quello semplice.

## Regolazioni

In `js/robots/models.js` per ogni robot puoi regolare:

- `height`: altezza del robot in metri;
- `rotY`: rotazione, se il robot guarda dalla parte sbagliata (prova `Math.PI`);
- `face`: posizione e dimensioni dello schermo con gli **occhi animati** che si sovrappone allo schermo del modello.
  Con `hide: true` restano visibili gli occhi "disegnati" nel modello generato, che però non si animano.

Quando hai i file puoi anche chiedere a Claude di sistemare queste regolazioni guardando il risultato.
