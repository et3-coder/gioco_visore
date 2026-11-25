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

// La voce vera si prova SEMPRE (il browser del visore spesso dice di non avere voci, ma parla lo stesso).
// In più i robot hanno un po' di "voce da robot" (bip e sillabe), che diventa forte solo se la voce vera non parte.
let speakId = 0;

// pitch/rate permettono voci diverse per ogni robot (EMO più acuto, Loona ancora di più...)
export function speak(text, { pitch = 1.25, rate = 0.95 } = {}) {
  if (!enabled) return;
  const t = clean(text);
  const id = ++speakId;
  sfx.babble(t, pitch, 0.04);
  const fallback = () => { if (id === speakId) sfx.babble(t, pitch, 0.11); };
  if (!('speechSynthesis' in window)) return fallback();
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'it-IT';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    let started = false;
    u.onstart = () => { started = true; };
    u.onerror = (e) => { if (!started && e.error !== 'interrupted' && e.error !== 'canceled') fallback(); };
    speechSynthesis.speak(u);
    setTimeout(() => { if (!started && !speechSynthesis.speaking) fallback(); }, 1200);
  } catch (e) {
    fallback();
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
