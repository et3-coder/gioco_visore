// Voce di AIBI (sintesi vocale del browser) e frasi ricorrenti.
import { sfx } from './audio.js';

let enabled = true;
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('it')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

// Toglie emoji e simboli che la voce leggerebbe in modo strano.
function clean(text) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '')
    .replace(/[→←↑↓]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// La sintesi vocale del browser non sempre funziona (sul visore spesso mancano le voci italiane):
// per questo i robot "parlano" anche con la loro voce da robot (bip e sillabe), che si sente sempre.
const hasTTS = () => 'speechSynthesis' in window && speechSynthesis.getVoices().length > 0;

// pitch/rate permettono voci diverse per ogni robot (EMO più acuto, Loona ancora di più...)
export function speak(text, { pitch = 1.25, rate = 0.95 } = {}) {
  if (!enabled) return;
  const t = clean(text);
  const tts = hasTTS();
  sfx.babble(t, pitch, tts ? 0.04 : 0.11); // con la voce vera i bip sono più piano
  if (!tts) return;
  try {
    speechSynthesis.cancel();
    speechSynthesis.resume(); // Chrome a volte resta "in pausa"
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'it-IT';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    setTimeout(() => speechSynthesis.speak(u), 60); // subito dopo cancel() a volte la frase si perde
  } catch (e) {
    /* la voce non è disponibile: restano i bip e il testo */
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export function setVoiceEnabled(v) {
  enabled = v;
  if (!v) stopSpeaking();
}
export function isVoiceEnabled() {
  return enabled;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const phrases = {
  win: () => pick(['Evviva! Ce l\'hai fatta!', 'Fantastico! Funziona!', 'Grande! Programma perfetto!', 'Sì! Bellissimo lavoro!']),
  empty: () => 'Prima metti qualche carta nel programma!',
  bump: (name) => `Ops! ${name} ha sbattuto contro un ostacolo. Guarda bene le carte e riprova!`,
  edge: (name) => `Ops! ${name} stava per cadere dal tavolo! Controlla le carte e riprova.`,
  notThere: (name, thing) => `Quasi! ${name} si è fermato, ma non ha raggiunto ${thing}. Serve qualche carta in più o diversa?`,
  passed: (name, thing) => `${name} è passato sopra ${thing}, ma ha continuato a camminare! Togli qualche carta.`,
  loop: (name) => `${name} continua a girare in tondo! Prova a cambiare una regola.`,
  tooMany: () => 'Il programma è troppo lungo! Usa meno carte.',
};
