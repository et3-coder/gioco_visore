// Logica comune ai capitoli "a carte" (1: costruisci il programma, 3: correggi il programma).
import { LEVELS, CHAPTERS, DIRS, DIR_VEC } from '../levels.js';
import { ProgramTrack, buildPalette } from '../ui/cards.js';
import { makeButton } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { compile } from '../game/program.js';
import { wait, clearTweens } from '../util/tween.js';
import { sfx } from '../audio.js';
import { phrases } from '../hints.js';
import { LAYOUT } from '../ui/layout.js';

export class SequenceChapter {
  constructor(game, chapterId, levelIndex, { debug = false, goalKind = 'note', goalName = 'la nota' } = {}) {
    this.game = game;
    this.chapterId = chapterId;
    this.levelIndex = levelIndex;
    this.debug = debug;
    this.goalKind = goalKind;
    this.goalName = goalName;
    this.levels = LEVELS[chapterId][game.age];
    this.level = this.levels[levelIndex];
    this.chapter = CHAPTERS.find((c) => c.id === chapterId);
    this.robot = game.robots.emo;
    this.token = 0;
    this.running = false;
    this.dirty = false;
    this.fails = 0;
    this.selected = null;
    this.cards = debug ? [...this.level.preset] : [];
  }

  start() {
    const { game, level } = this;
    game.board.build(level, this.goalKind);
    game.showRobots(['emo']);
    this.placeAtStart();
    this.buildUI();
    const intro = this.levelIndex === 0 ? `${this.chapter.intro} ${level.intro}` : level.intro;
    game.say(intro);
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
    game.buildHeader(`Capitolo ${this.chapterId}: ${this.chapter.title}  ·  Livello ${this.levelIndex + 1} di ${this.levels.length}`);

    this.track = new ProgramTrack(scr, { y: LAYOUT.track, max: level.max, onSlotClick: (i) => this.onSlotClick(i) });
    this.track.setCards(this.cards);
    buildPalette(scr, level.cards, LAYOUT.palette, (k) => this.onPick(k), level.cards.length > 5 ? 0.15 : 0.17);

    const by = LAYOUT.buttons;
    this.playBtn = makeButton(0.42, 0.14, this.debug ? 'Prova' : 'Via!', () => (this.running ? this.stop() : this.run()), { color: '#2fbf71', icon: icons.play });
    scr.add(this.playBtn, -0.8, by);
    if (this.debug) {
      scr.add(makeButton(0.4, 0.14, 'Togli carta', () => this.removeSelected(), { color: '#ff7a59', icon: icons.trash, size: 52 }), -0.33, by);
      scr.add(makeButton(0.36, 0.14, 'Da capo', () => this.restorePreset(), { color: '#4d8dff', icon: icons.undo, size: 52 }), 0.09, by);
    } else {
      scr.add(makeButton(0.44, 0.14, 'Cancella tutto', () => this.clearAll(), { color: '#ff7a59', icon: icons.trash, size: 50 }), -0.3, by);
    }
    scr.add(makeButton(0.36, 0.14, 'Menu', () => this.exit(), { color: '#8a7fb0', icon: icons.home, size: 52 }), this.debug ? 0.5 : 0.18, by);
    this.nextBtn = makeButton(0.4, 0.14, 'Avanti', () => this.next(), { color: '#ff3fa4', icon: icons.next });
    this.nextBtn.visible = false;
    scr.add(this.nextBtn, 0.86, by);
  }

  // ---------- Modifica del programma ----------
  onSlotClick(i) {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    if (this.debug) {
      this.selected = this.selected === i ? null : i;
      this.track.select(this.selected);
      sfx.click();
      if (this.selected != null && this.fails === 0 && this.game.age === 'small') {
        this.game.say('Ora tocca la carta giusta qui sotto, oppure premi Togli carta.');
      }
    } else {
      this.cards.splice(i, 1);
      this.track.setCards(this.cards);
      sfx.remove();
    }
  }

  onPick(kind) {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    if (this.debug && this.selected != null) {
      this.cards[this.selected] = kind;
      this.selected = null;
      this.track.select(null);
    } else if (this.cards.length < this.level.max) {
      this.cards.push(kind);
    } else {
      this.game.say(phrases.tooMany());
      return;
    }
    this.track.setCards(this.cards);
    sfx.place();
  }

  clearAll() {
    if (this.running) return;
    this.cards = [];
    this.track.setCards(this.cards);
    this.placeAtStart();
  }

  removeSelected() {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    if (this.selected == null) {
      this.game.say('Prima tocca una carta del programma, poi premi Togli carta.');
      return;
    }
    this.cards.splice(this.selected, 1);
    this.selected = null;
    this.track.select(null);
    this.track.setCards(this.cards);
    sfx.remove();
  }

  restorePreset() {
    if (this.running) return;
    this.cards = [...this.level.preset];
    this.selected = null;
    this.track.select(null);
    this.track.setCards(this.cards);
    this.placeAtStart();
  }

  // ---------- Esecuzione ----------
  setRunning(r) {
    this.running = r;
    this.playBtn.userData.setText(r ? 'Stop' : this.debug ? 'Prova' : 'Via!');
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
    this.selected = null;
    this.track.select(null);
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
    const { board } = this.game;
    this.game.confettiAt(this.robot.group);
    let msg = phrases.win();
    const target = this.level.target;
    if (target && !this.debug) {
      if (this.cards.length <= target) {
        msg += ` Super! Hai usato solo ${this.cards.length} carte: programma cortissimo!`;
        sfx.star();
      } else {
        msg += ` Hai usato ${this.cards.length} carte. Sfida: riesci a usarne solo ${target}? Oppure premi Avanti.`;
      }
    }
    this.nextBtn.visible = true;
    this.game.say(msg);
    const token = this.token;
    await Promise.all([board.collectGoal(), this.robot.turnToDir(DIRS.S, 0.3)]);
    if (token !== this.token) return;
    await this.robot.celebrate();
  }

  next() {
    this.token++;
    clearTweens();
    this.game.nextLevel(this.chapterId, this.levelIndex);
  }

  exit() {
    this.token++;
    clearTweens();
    this.game.goChapters();
  }
}
