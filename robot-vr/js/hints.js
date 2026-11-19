// Voce di AIBI (sintesi vocale del browser) e frasi ricorrenti.
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

export function speak(text) {
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = 'it-IT';
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1.25;
    speechSynthesis.speak(u);
  } catch (e) {
    /* la voce non è disponibile: si legge solo il testo */
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
