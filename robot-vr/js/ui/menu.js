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
  game.buildHeader('I tre amici robot: impara a programmare con EMO, Loona e AIBI');

  const unlocked = game.unlocked; // numero di livelli sbloccati
  const next = Math.min(unlocked, LEVELS.length) - 1;
  // Le quattro modalità: livelli, palco, coccole e lanci, laboratorio
  const W4 = 0.5, STEP4 = 0.54;
  const play = makeButton(W4, 0.2, unlocked > 1 ? `Gioca! (liv. ${next + 1})` : 'Gioca!', () => game.startLevel(next), { color: '#2fbf71', icon: icons.play, size: 56 });
  scr.add(play, -1.5 * STEP4, LAYOUT.track + 0.01);
  const stage = makeButton(W4, 0.2, 'Il palco', () => game.startStage(), { color: '#ff4fa3', icon: icons.star, size: 56 });
  scr.add(stage, -0.5 * STEP4, LAYOUT.track + 0.01);
  const cuddle = makeButton(W4, 0.2, 'Coccole e lanci', () => game.startPlay(), { color: '#ff8a3d', icon: icons.heart, size: 50 });
  scr.add(cuddle, 0.5 * STEP4, LAYOUT.track + 0.01);
  const lab = makeButton(W4, 0.2, 'Laboratorio', () => game.openLab(), { color: '#3d6dff', size: 52 });
  scr.add(lab, 1.5 * STEP4, LAYOUT.track + 0.01);

  // Livelli su due file: superati = dorati, da fare = colore del robot, bloccati = grigi
  const ROBOT_COLOR = { emo: '#6a5cff', loona: '#ff8a3d', aibi: '#22b07d' };
  const n = LEVELS.length;
  const perRow = Math.ceil(n / 2);
  const size = 0.12, step = 0.142;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = row === 0 ? perRow : n - perRow;
    const x = (col - (inRow - 1) / 2) * step;
    const y = LAYOUT.palette + 0.07 - row * 0.15;
    const done = i < unlocked - 1;
    const b = makeButton(size, size, String(i + 1), () => game.startLevel(i), { color: done ? '#ffb020' : ROBOT_COLOR[LEVELS[i].robot], size: 60 });
    b.userData.setEnabled(i < unlocked);
    scr.add(b, x, y);
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
    : 'Ciao! Io sono AIBI. In ogni livello guiderai uno di noi tre: EMO, Loona o me! Ogni livello è un po\' più difficile. Premi Gioca, sali sul palco per inventare uno spettacolo, scegli Coccole e lanci per giocare con noi, oppure visita il Laboratorio di Binot e Galaxine!');
}
