// La chat con AIBI: bolle dei messaggi, "AIBI sta scrivendo…", risposta una parola alla volta
// (come un vero LLM che genera il testo pezzo per pezzo) e voce.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const CARD_LABEL = { F: '⬆️ avanti', L: '↩️ sinistra', R: '↪️ destra', END: '🔚 fine ripeti' };
export const cardLabel = (c) => (c.startsWith('REP') ? `🔁 ripeti ${c.slice(3)}` : CARD_LABEL[c]);
export const cardClass = (c) => (c.startsWith('REP') ? 'REP' : c);

export class Chat {
  constructor(list, status, avatar) {
    this.list = list;
    this.status = status;
    this.avatar = avatar;
  }

  scroll() { this.list.scrollTop = this.list.scrollHeight; }

  user(text) {
    const b = document.createElement('div');
    b.className = 'msg user';
    b.textContent = text;
    this.list.appendChild(b);
    this.scroll();
  }

  system(text) {
    const b = document.createElement('div');
    b.className = 'msg system';
    b.textContent = text;
    this.list.appendChild(b);
    this.scroll();
  }

  // risponde come un LLM: prima "sta scrivendo", poi una parola alla volta.
  // cards: carte da mostrare nella bolla mentre "scrive il codice" (onCard viene chiamato per ognuna)
  async aibi(text, { cards = [], onCard = null, speakIt = true } = {}) {
    const b = document.createElement('div');
    b.className = 'msg aibi';
    b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    this.list.appendChild(b);
    this.scroll();
    this.status.textContent = 'sta scrivendo…';
    await wait(700 + Math.random() * 500);
    if (speakIt) speak(text);
    this.avatar.classList.add('talking');
    b.textContent = '';
    const words = text.split(' ');
    for (const w of words) {
      b.textContent += (b.textContent ? ' ' : '') + w;
      this.scroll();
      await wait(55 + Math.random() * 45);
    }
    if (cards.length) {
      this.status.textContent = 'sta scrivendo il codice…';
      const row = document.createElement('div');
      row.className = 'cards';
      b.appendChild(row);
      for (const c of cards) {
        const chip = document.createElement('span');
        chip.className = 'chip ' + cardClass(c);
        chip.textContent = cardLabel(c);
        row.appendChild(chip);
        if (onCard) onCard(c);
        this.scroll();
        beep();
        await wait(230);
      }
    }
    this.avatar.classList.remove('talking');
    this.status.textContent = 'assistente IA (simulata) · online';
  }
}

// ---------------- voce ----------------
let voiceOn = true;
let ac = null;
export function setVoice(on) { voiceOn = on; if (!on && 'speechSynthesis' in window) speechSynthesis.cancel(); }
export function isVoiceOn() { return voiceOn; }
function audio() {
  if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function unlockAudio() { audio(); }
export function tone(f, d, vol = 0.08, type = 'triangle', when = 0) {
  const c = audio(); if (!c || c.state !== 'running') return;
  const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
export function beep() { tone(700 + Math.random() * 300, 0.07, 0.05); }
export const sfx = {
  step: () => tone(330, 0.07, 0.04, 'square'),
  turn: () => tone(480, 0.12, 0.06, 'sine'),
  bump: () => tone(150, 0.25, 0.1, 'sawtooth'),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 0.12, 'triangle', i * 0.12)),
};
// voce da robot (bip) se la sintesi vocale non parte
function babble(text, vol) {
  const n = Math.max(2, Math.min(14, Math.round(text.length / 3)));
  for (let i = 0; i < n; i++) tone(320 * (0.8 + Math.random() * 0.6), 0.08, vol, i % 3 ? 'triangle' : 'square', i * 0.11);
}
let speakId = 0;
export function speak(text) {
  if (!voiceOn) return;
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
  const id = ++speakId;
  const fallback = () => { if (id === speakId) babble(clean, 0.1); };
  if (!('speechSynthesis' in window)) return fallback();
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'it-IT'; u.pitch = 1.25; u.rate = 1.0;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('it'));
    if (v) u.voice = v;
    let started = false;
    u.onstart = () => { started = true; };
    u.onerror = (e) => { if (!started && e.error !== 'interrupted' && e.error !== 'canceled') fallback(); };
    speechSynthesis.speak(u);
    setTimeout(() => { if (!started && !speechSynthesis.speaking) fallback(); }, 1200);
  } catch { fallback(); }
}
