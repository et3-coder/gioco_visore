// Il palco: modalità creativa. Il bambino compone una coreografia con le carte azione
// e EMO, Loona e AIBI la eseguono insieme. Non c'è un giusto o sbagliato.
import { DIRS } from '../levels.js';
import { ProgramTrack, buildPalette } from '../ui/cards.js';
import { makeButton } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { compile } from './program.js';
import { wait, clearTweens } from '../util/tween.js';
import { sfx, music } from '../audio.js';
import { speak } from '../hints.js';
import { LAYOUT } from '../ui/layout.js';

const STAGE_CARDS = ['DANCE', 'JUMP', 'SPIN', 'BOW', 'TALK', 'MUSIC', 'HAPPY', 'REP2', 'REP3', 'END'];
const MAX_CARDS = 12;
const LINES = [
  'Ciao a tutti!',
  'Siamo i tre amici robot!',
  'Che bello ballare insieme!',
  'Applausi, per favore!',
  'Questo è il nostro spettacolo!',
  'Bip bop, che divertimento!',
];

export class Stage {
  constructor(game) {
    this.game = game;
    this.isStage = true;
    this.token = 0;
    this.running = false;
    this.cards = [];
    this.lineIndex = 0;
    this.tuneIndex = 0;
    this.robots = [game.robots.emo, game.robots.loona, game.robots.aibi];
  }

  start() {
    const { game } = this;
    game.board.build({ size: [5, 3], walls: [], colors: [] }, null);
    game.showRobots(['emo', 'loona']);
    this.placeAll();
    this.buildUI();
    game.say('Benvenuti sul palco! Metti in fila le carte e inventa uno spettacolo per EMO, Loona e me. Poi premi Spettacolo!');
  }

  // I tre robot in fila sul palco, rivolti verso il pubblico
  placeAll() {
    const { game } = this;
    game.placeRobot(game.robots.emo, 1, 1, DIRS.S);
    game.placeRobot(game.robots.loona, 3, 1, DIRS.S);
    game.placeRobot(game.robots.aibi, 2, 1, DIRS.S); // AIBI scende dal suo piedistallo
    for (const r of this.robots) {
      r.stopDance();
      r.acting = false;
      r.face.set('normal');
    }
  }

  buildUI() {
    const { game } = this;
    const scr = game.screen;
    scr.clear();
    game.buildHeader('Il palco: inventa uno spettacolo!');
    this.track = new ProgramTrack(scr, { y: LAYOUT.track, max: MAX_CARDS, onSlotClick: (i) => this.onSlotClick(i) });
    this.track.setCards(this.cards);
    buildPalette(scr, STAGE_CARDS, LAYOUT.palette, (k) => this.onPick(k), 0.15);

    const by = LAYOUT.buttons;
    this.playBtn = makeButton(0.52, 0.14, 'Spettacolo!', () => (this.running ? this.stop() : this.run()), { color: '#ff4fa3', icon: icons.play, size: 54 });
    scr.add(this.playBtn, -0.72, by);
    scr.add(makeButton(0.44, 0.14, 'Cancella tutto', () => this.clearAll(), { color: '#ff7a59', icon: icons.trash, size: 50 }), -0.15, by);
    scr.add(makeButton(0.36, 0.14, 'Menu', () => this.exit(), { color: '#8a7fb0', icon: icons.home, size: 52 }), 0.33, by);
  }

  onSlotClick(i) {
    if (this.running) return;
    this.cards.splice(i, 1);
    this.track.setCards(this.cards);
    sfx.remove();
  }

  onPick(kind) {
    if (this.running) return;
    if (this.cards.length >= MAX_CARDS) {
      this.game.say('Il palco è pieno! Premi Spettacolo, oppure togli qualche carta toccandola.');
      return;
    }
    this.cards.push(kind);
    this.track.setCards(this.cards);
    sfx.place();
  }

  clearAll() {
    if (this.running) return;
    this.cards = [];
    this.track.setCards(this.cards);
  }

  setRunning(r) {
    this.running = r;
    this.playBtn.userData.setText(r ? 'Stop' : 'Spettacolo!');
    this.playBtn.userData.setColor(r ? '#ff5d5d' : '#ff4fa3');
  }

  stop() {
    this.token++;
    music.stop(0.3);
    clearTweens();
    this.setRunning(false);
    this.track.highlight(null);
    this.placeAll();
  }

  // Esegue una carta con tutti e tre i robot insieme
  async perform(cmd) {
    const all = (fn) => Promise.all(this.robots.map(fn));
    switch (cmd) {
      case 'DANCE':
        return all((r) => r.danceFor(2.03)); // circa una battuta di musica
      case 'JUMP':
        sfx.boing();
        // salti uno dopo l'altro, come un'onda
        return all((r, i) => wait(i * 0.15).then(() => r.jump()));
      case 'SPIN':
        sfx.whoosh();
        return all((r) => r.spin());
      case 'BOW':
        return all((r) => r.bow());
      case 'TALK': {
        const line = LINES[this.lineIndex++ % LINES.length];
        music.duck(true); // la musica si abbassa mentre parlano
        this.game.say(line);
        for (const r of this.robots) { r.talk(1.6); r.face.set('happy', 1.6); }
        await wait(1.9);
        music.duck(false);
        return;
      }
      case 'MUSIC':
        music.duck(true);
        sfx.melody(this.tuneIndex++);
        for (const r of this.robots) { r.face.set('love', 1.5); r.talk(1.5); }
        await wait(1.5);
        music.duck(false);
        return;
      case 'HAPPY':
        for (const r of this.robots) r.face.set('happy', 1.2);
        return wait(1.2);
      default:
        return wait(0.2);
    }
  }

  async run() {
    if (this.cards.length === 0) {
      this.game.say('Prima metti qualche carta: per esempio Balla, Salta e Inchino!');
      return;
    }
    this.placeAll();
    const token = ++this.token;
    this.setRunning(true);
    const steps = compile(this.cards, 40);
    music.start(); // parte la musica per tutto lo spettacolo
    speak('Si comincia!');
    await wait(0.8);
    for (const step of steps) {
      if (token !== this.token) return;
      this.track.highlight(step.index);
      await this.perform(step.cmd);
      if (token !== this.token) return;
      await wait(0.15);
    }
    if (token !== this.token) return;
    this.track.highlight(null);
    this.setRunning(false);
    // gran finale: la musica sfuma, applausi e coriandoli
    music.stop(1.2);
    sfx.applause();
    for (const r of this.robots) this.game.confettiAt(r.group);
    this.game.say('Che spettacolo fantastico! Vuoi cambiare qualche carta e provarne un altro?');
    await Promise.all(this.robots.map((r) => r.bow()));
  }

  exit() {
    this.token++;
    clearTweens();
    this.game.goMenu();
  }
}
