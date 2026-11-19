// Menu iniziale (scelta dell'età) e scelta del capitolo.
import { makeButton, makeLabel } from './ui.js';
import { icons } from './icons.js';
import { AGES, CHAPTERS } from '../levels.js';
import { LAYOUT } from './layout.js';
import { isVoiceEnabled, setVoiceEnabled, speak } from '../hints.js';
import { DIRS } from '../levels.js';

function voiceButton(game) {
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
  game.buildHeader("L'avventura dei tre amici: impara a programmare con EMO, Loona e AIBI");
  const colors = ['#ffb020', '#2fbf71', '#4d8dff'];
  AGES.forEach((a, i) => {
    const b = makeButton(0.56, 0.2, a.label, () => {
      game.age = a.id;
      game.goChapters();
    }, { color: colors[i], size: 80 });
    scr.add(b, (i - 1) * 0.66, LAYOUT.track - 0.02);
  });
  const note = makeLabel(2.0, 0.12,
    'Per gli adulti: Meta consiglia i visori dai 10 anni in su. Con i bambini più piccoli fate partite brevi (10-15 minuti) e restate sempre vicini.',
    { size: 30, color: '#7a7391', weight: '600' });
  scr.add(note, 0, LAYOUT.palette - 0.04);
  scr.add(voiceButton(game), -0.35, LAYOUT.buttons);
  if (game.mode === 'ar') {
    scr.add(makeButton(0.48, 0.13, 'Sposta il gioco', () => game.startPlacement(), { color: '#8a7fb0', size: 46 }), 0.2, LAYOUT.buttons);
  } else {
    scr.add(makeButton(0.48, 0.13, 'Centra la scena', () => game.recenter(), { color: '#8a7fb0', size: 46 }), 0.2, LAYOUT.buttons);
  }
  game.say('Ciao! Io sono AIBI. Insieme a EMO e Loona impareremo a programmare i robot! Quanti anni hai? Tocca un pulsante.');
}

export function showChapterMenu(game) {
  const scr = game.screen;
  scr.clear();
  welcomeBoard(game);
  const ageLabel = AGES.find((a) => a.id === game.age).label;
  game.buildHeader(`Scegli un'avventura  ·  Età: ${ageLabel}`);
  const colors = ['#ff8a3d', '#4d8dff', '#9b5cff'];
  const robots = ['con EMO', 'con Loona', 'con AIBI'];
  CHAPTERS.forEach((c, i) => {
    const b = makeButton(0.68, 0.32, `${c.id}. ${c.title}\n${c.concept} (${robots[i]})`, () => game.startChapter(c.id, 0), { color: colors[i], size: 50 });
    scr.add(b, (i - 1) * 0.74, LAYOUT.track - 0.06);
  });
  scr.add(makeButton(0.44, 0.13, 'Festa finale', () => game.finale(), { color: '#ff3fa4', icon: icons.star, size: 48 }), 0.3, LAYOUT.buttons + 0.03);
  scr.add(makeButton(0.4, 0.13, 'Cambia età', () => game.goMenu(), { color: '#8a7fb0', icon: icons.back, size: 48 }), -0.3, LAYOUT.buttons + 0.03);
  game.say('Scegli un\'avventura! Ti consiglio di iniziare dalla prima, con EMO.');
}
