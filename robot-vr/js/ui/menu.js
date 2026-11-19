// Menu iniziale: pulsante "Gioca" (riparte dall'ultimo livello sbloccato) e scelta dei livelli già sbloccati.
import { makeButton } from './ui.js';
import { icons } from './icons.js';
import { LEVELS, DIRS } from '../levels.js';
import { LAYOUT } from './layout.js';
import { isVoiceEnabled, setVoiceEnabled, speak } from '../hints.js';

function voiceButton() {
  const b = makeButton(0.4, 0.13, isVoiceEnabled() ? 'Voce: sì' : 'Voce: no', () => {
    setVoiceEnabled(!isVoiceEnabled());
    b.userData.setText(isVoiceEnabled() ? 'Voce: sì' : 'Voce: no');
    if (isVoiceEnabled()) speak('Ciao! Adesso parlo io!');
  }, { color: '#4db6ac', icon: icons.speaker, size: 50 });
  return b;
}

function welcomeBoard(game) {
  game.board.build({ size: [5, 3], walls: [], colors: [] }, null);
  game.showRobots(['emo', 'loona']);
  game.placeRobot(game.robots.emo, 1, 1, DIRS.S);
  game.placeRobot(game.robots.loona, 3, 1, DIRS.S);
  game.robots.emo.face.set('happy', 2);
  game.robots.loona.face.set('love', 2);
}

export function showMainMenu(game) {
  const scr = game.screen;
  scr.clear();
  welcomeBoard(game);
  game.buildHeader("L'avventura di EMO: impara a programmare un robot");

  const unlocked = game.unlocked; // numero di livelli sbloccati
  const next = Math.min(unlocked, LEVELS.length) - 1;
  const play = makeButton(0.86, 0.2, unlocked > 1 ? `Gioca! (livello ${next + 1})` : 'Gioca!', () => game.startLevel(next), { color: '#2fbf71', icon: icons.play, size: 72 });
  scr.add(play, -0.46, LAYOUT.track + 0.01);
  const stage = makeButton(0.72, 0.2, 'Il palco', () => game.startStage(), { color: '#ff4fa3', icon: icons.star, size: 72 });
  scr.add(stage, 0.42, LAYOUT.track + 0.01);

  // Livelli: quelli sbloccati si possono rigiocare, gli altri sono grigi
  const n = LEVELS.length;
  const size = 0.135, step = 0.155;
  const x0 = -((n - 1) * step) / 2;
  for (let i = 0; i < n; i++) {
    const open = i < unlocked;
    const b = makeButton(size, size, String(i + 1), () => game.startLevel(i), { color: i < unlocked - 1 ? '#ffb020' : '#4d8dff', size: 64 });
    b.userData.setEnabled(open);
    scr.add(b, x0 + i * step, LAYOUT.palette);
  }

  scr.add(voiceButton(), -0.5, LAYOUT.buttons);
  if (game.mode === 'ar') {
    scr.add(makeButton(0.48, 0.13, 'Sposta il gioco', () => game.startPlacement(), { color: '#8a7fb0', size: 46 }), 0.02, LAYOUT.buttons);
  } else {
    scr.add(makeButton(0.48, 0.13, 'Centra la scena', () => game.recenter(), { color: '#8a7fb0', size: 46 }), 0.02, LAYOUT.buttons);
  }
  scr.add(makeButton(0.46, 0.13, 'Ricomincia', () => { game.resetProgress(); showMainMenu(game); }, { color: '#ff7a59', icon: icons.undo, size: 46 }), 0.55, LAYOUT.buttons);

  game.say(unlocked > 1
    ? `Eccoti di nuovo! Premi Gioca per continuare dal livello ${next + 1}, oppure scegli un livello qui sotto.`
    : 'Ciao! Io sono AIBI. Aiutiamo EMO a ritrovare le sue note? Ogni livello è un po\' più difficile del precedente. Premi Gioca! Oppure sali sul palco e inventa uno spettacolo.');
}
