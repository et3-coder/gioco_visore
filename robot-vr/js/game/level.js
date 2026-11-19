// Un livello del gioco: il bambino mette in fila le carte comando per portare il robot del livello
// (EMO, Loona o AIBI, a turno) fino al suo tesoro (nota, osso o stella).
import { LEVELS, INTRO, ROBOTS, DIRS, DIR_VEC } from '../levels.js';
import { ProgramTrack, buildPalette } from '../ui/cards.js';
import { makeButton } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { compile } from './program.js';
import { wait, clearTweens } from '../util/tween.js';
import { sfx } from '../audio.js';
import { phrases } from '../hints.js';
import { LAYOUT } from '../ui/layout.js';

export class Level {
  constructor(game, index) {
    this.game = game;
    this.index = index;
    this.level = LEVELS[index];
    this.robotKey = this.level.robot || 'emo';
    this.robot = game.robots[this.robotKey];
    this.goalKind = ROBOTS[this.robotKey].goal;
    this.goalName = ROBOTS[this.robotKey].goalName;
    this.movesAibi = this.robotKey === 'aibi'; // AIBI scende dal piedistallo: all'uscita va rimesso a posto
    this.token = 0;
    this.running = false;
    this.dirty = false;
    this.fails = 0;
    this.cards = [];
  }

  start() {
    const { game, level } = this;
    game.board.build(level, this.goalKind);
    game.showRobots(this.robotKey === 'aibi' ? [] : [this.robotKey]);
    this.placeAtStart();
    this.buildUI();
    game.say(this.index === 0 ? `${INTRO} ${level.intro}` : level.intro);
  }

  placeAtStart() {
    const { start } = this.level;
    this.game.placeRobot(this.robot, start.x, start.z, DIRS[start.dir]);
    this.game.board.resetGoal();
    this.track && this.track.highlight(null);
    this.robot.face.set('normal');
    this.dirty = false;
  }

  buildUI() {
    const { game, level } = this;
    const scr = game.screen;
    scr.clear();
    game.buildHeader(`Livello ${this.index + 1} di ${LEVELS.length}  ·  Gioca ${this.robot.name}`);

    this.track = new ProgramTrack(scr, { y: LAYOUT.track, max: level.max, onSlotClick: (i) => this.onSlotClick(i) });
    this.track.setCards(this.cards);
    buildPalette(scr, level.cards, LAYOUT.palette, (k) => this.onPick(k), level.cards.length > 5 ? 0.15 : 0.17);

    const by = LAYOUT.buttons;
    this.playBtn = makeButton(0.42, 0.14, 'Via!', () => (this.running ? this.stop() : this.run()), { color: '#2fbf71', icon: icons.play });
    scr.add(this.playBtn, -0.8, by);
    scr.add(makeButton(0.44, 0.14, 'Cancella tutto', () => this.clearAll(), { color: '#ff7a59', icon: icons.trash, size: 50 }), -0.3, by);
    scr.add(makeButton(0.36, 0.14, 'Menu', () => this.exit(), { color: '#8a7fb0', icon: icons.home, size: 52 }), 0.18, by);
    this.nextBtn = makeButton(0.4, 0.14, 'Avanti', () => this.next(), { color: '#ff3fa4', icon: icons.next });
    this.nextBtn.visible = false;
    scr.add(this.nextBtn, 0.86, by);
  }

  // ---------- Modifica del programma ----------
  onSlotClick(i) {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    this.cards.splice(i, 1); // toccare una carta del programma la toglie
    this.track.setCards(this.cards);
    sfx.remove();
  }

  onPick(kind) {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    if (this.cards.length >= this.level.max) {
      this.game.say(phrases.tooMany());
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
    this.placeAtStart();
  }

  // ---------- Esecuzione ----------
  setRunning(r) {
    this.running = r;
    this.playBtn.userData.setText(r ? 'Stop' : 'Via!');
    this.playBtn.userData.setColor(r ? '#ff5d5d' : '#2fbf71');
  }

  stop() {
    this.token++;
    clearTweens();
    this.setRunning(false);
    this.placeAtStart();
  }

  async run() {
    if (this.cards.length === 0) {
      this.game.say(phrases.empty());
      return;
    }
    this.nextBtn.visible = false;
    this.placeAtStart();
    const token = ++this.token;
    this.setRunning(true);
    this.dirty = true;
    const { board } = this.game;
    const steps = compile(this.cards);
    let { x, z } = this.level.start;
    let dir = DIRS[this.level.start.dir];
    let passedGoal = false;
    this.robot.face.set('focus');
    await wait(0.3);
    for (const step of steps) {
      if (token !== this.token) return;
      this.track.highlight(step.index);
      if (step.cmd === 'F') {
        const [dx, dz] = DIR_VEC[dir];
        const nx = x + dx, nz = z + dz;
        if (!board.inBounds(nx, nz) || board.isWall(nx, nz)) {
          sfx.bump();
          await this.robot.bump(this.game.dirVector(dir), board.cell);
          if (token !== this.token) return;
          return this.fail(board.inBounds(nx, nz) ? 'bump' : 'edge');
        }
        sfx.step();
        await this.robot.moveTo(board.cellPos(nx, nz), 0.42);
        x = nx; z = nz;
        if (board.isGoal(x, z)) passedGoal = true;
      } else if (step.cmd === 'L' || step.cmd === 'R') {
        dir = (dir + (step.cmd === 'R' ? 1 : 3)) % 4;
        sfx.turn();
        await this.robot.turnToDir(dir, 0.32);
      }
      if (token !== this.token) return;
      await wait(0.08);
    }
    if (token !== this.token) return;
    this.track.highlight(null);
    if (board.isGoal(x, z)) return this.win();
    return this.fail(passedGoal ? 'passed' : 'notThere');
  }

  fail(reason) {
    this.setRunning(false);
    this.fails++;
    sfx.fail();
    const name = this.robot.name;
    let msg = reason === 'edge' ? phrases.edge(name)
      : reason === 'bump' ? phrases.bump(name)
      : reason === 'passed' ? phrases.passed(name, this.goalName)
      : phrases.notThere(name, this.goalName);
    if (this.fails >= 2 && this.level.hint) msg += ' Suggerimento: ' + this.level.hint;
    this.robot.sad();
    this.game.say(msg);
  }

  async win() {
    this.setRunning(false);
    sfx.win();
    this.game.levelCompleted(this.index);
    this.game.confettiAt(this.robot.group);
    let msg = phrases.win();
    const target = this.level.target;
    if (target) {
      if (this.cards.length <= target) {
        msg += ` Super! Hai usato solo ${this.cards.length} carte: programma cortissimo!`;
        sfx.star();
      } else {
        msg += ` Hai usato ${this.cards.length} carte. Sfida: riesci a usarne solo ${target}? Oppure premi Avanti.`;
      }
    }
    msg += this.index + 1 < LEVELS.length ? ' Premi Avanti per il prossimo livello!' : ' Premi Avanti per la festa finale!';
    this.nextBtn.visible = true;
    this.game.say(msg);
    const token = this.token;
    await Promise.all([this.game.board.collectGoal(), this.robot.turnToDir(DIRS.S, 0.3)]);
    if (token !== this.token) return;
    await this.robot.celebrate();
  }

  next() {
    this.token++;
    clearTweens();
    this.game.nextLevel(this.index);
  }

  exit() {
    this.token++;
    clearTweens();
    this.game.goMenu();
  }
}
