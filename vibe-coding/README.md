# Crea il tuo gioco con AIBI

Gioco per il computer per la lezione su **vibe coding** e **intelligenza artificiale** (bambini di 10-13 anni).
I bambini descrivono a parole, nella chat, un mini-videogioco ("fai un gatto rosso nello spazio", "aggiungi 5 stelle
da raccogliere", "metti 3 meteoriti che cadono"...). AIBI, un'IA **simulata**, risponde come un chatbot, scrive il codice
(le righe nuove si illuminano di verde) e il gioco si aggiorna subito. Poi si gioca con la tastiera e si chiedono modifiche.

- **15 sfide** in ordine (menu 🏆 Sfide): personaggio e sfondo → movimento → cose da raccogliere → nemici e vite →
  **AIBI sbaglia** (scrive `punti + 0` con sicurezza: bisogna accorgersene giocando e farlo correggere) →
  parole vaghe ("fallo più bello") → regole per vincere → errori di battitura → tante modifiche in una frase →
  Annulla → "più difficile" (AIBI chiede cosa significa) → **AIBI sbaglia di nuovo** ("più veloce" diventa
  `velocità: 0.7`) → personaggi famosi che non si copiano → corsa contro il tempo → gioco libero.
- **🔍 Come mi hai capito?** mostra le parole riconosciute: AIBI non capisce come una persona, riconosce parole e segue regole.
- **Carte "Parliamone"** (all'inizio, dopo le sfide 5 e 12 e alla fine): domande da discutere a voce. **Nessun dato viene salvato.**
- Niente servizi esterni, niente chiavi: funziona anche offline. Gemini vero si usa a parte, nella sessione pratica.

**Modalità immagini** (per chi non sa ancora leggere o scrivere): pulsante 🖼️ Immagini in alto, oppure il link
`…/vibe-coding/?immagini`. Al posto della chat scritta ci sono grandi pulsanti con figure (personaggi, sfondi, colori,
movimento, cose da prendere, pericoli, regole, 🤔 "qualcosa non va"); AIBI legge tutto ad alta voce con frasi brevi.
Ogni figura diventa una frase che AIBI capisce come se fosse scritta (`js/pictures.js`).

**Slide per la lezione** (`slide/`): presentazione interattiva da proiettare prima di giocare (IA e LLM, vibe coding,
il gioco e le sue sfide, Parliamone, Gemini, quiz). Frecce per avanzare, tasto N per le note, F per lo schermo intero.
Online: `https://et3-coder.github.io/gioco_visore/vibe-coding/slide/`.

Tasti nel gioco: frecce (o WASD) per muoversi, barra spaziatrice per saltare. Clicca sul gioco prima di usare la tastiera.

## Avviarlo sul PC
I file JavaScript sono moduli, quindi serve un piccolo server locale (incluso):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

poi apri http://localhost:8080 nel browser (Chrome o Edge). Per fermarlo: Ctrl+C.

## Pubblicarlo su GitHub Pages
Basta che la cartella `vibe-coding/` sia nel repository pubblicato: sarà raggiungibile su
`https://<utente>.github.io/<repository>/vibe-coding/`.

## Personalizzarlo
- `js/understand.js`: le parole che AIBI conosce (personaggi, oggetti, nemici, colori, sfondi...). Per esempio,
  per un nuovo personaggio aggiungi `fenicottero: '🦩'` a `HEROES`.
- `js/challenges.js`: testi, esempi e condizioni delle sfide; domande delle carte "Parliamone".
- `js/engine.js`: il motore del mini-gioco (canvas). `js/codegen.js`: il codice mostrato. `js/spec.js`: come ogni richiesta
  cambia il gioco. `js/chat.js`: chat parola per parola e voce.
