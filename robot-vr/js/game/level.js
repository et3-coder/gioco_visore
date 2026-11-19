// Un livello del gioco: il bambino mette in fila le carte comando per portare il robot del livello
// (EMO, Loona o AIBI, a turno) fino al suo tesoro (nota, osso o stella).
import { LEVELS, INTRO, ROBOTS, DIRS, DIR_VEC } from '../levels.js';
import { ProgramTrack, buildPalette } from '../ui/cards.js';
import { makeButton } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { compile } from './program.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { wait, clearTweens, animate, ease } from '../util/tween.js';

const STEPS = 5; // gradini della scala magica
const RISE = 0.045; // altezza di ogni gradino (metri)
const STEP_COLORS = [0xff5d8f, 0xffb020, 0x2fbf71, 0x4d8dff, 0x9b5cff];
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
    // il robot arriva scendendo da una scala magica; nel frattempo le carte sono bloccate
    this.busy = true;
    this.enterStairs().finally(() => { this.busy = false; });
  }

  // ---------- Scala magica tra un livello e l'altro ----------
  // Costruisce STEPS gradini colorati che partono da "origin" nella direzione "dirVec" e salgono.
  async buildStairs(origin, dirVec, token) {
    const board = this.game.board;
    const cell = board.cell;
    const group = new THREE.Group();
    board.content.add(group);
    const tops = [];
    const steps = [];
    for (let i = 0; i < STEPS; i++) {
      const color = STEP_COLORS[i % STEP_COLORS.length];
      const step = new THREE.Mesh(
        new RoundedBoxGeometry(cell * 0.62, 0.02, cell * 0.62, 2, 0.007),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.4 })
      );
      const top = origin.clone().addScaledVector(dirVec, cell * 0.42 * (i + 1));
      top.y = origin.y + RISE * (i + 1);
      step.position.copy(top).setY(top.y - 0.01);
      step.scale.setScalar(0.001);
      group.add(step);
      steps.push(step);
      tops.push(top);
    }
    // i gradini compaiono uno alla volta, con una nota che sale
    for (let i = 0; i < STEPS; i++) {
      if (token !== this.token) return null;
      sfx.stepNote(i);
      await animate(0.12, (t) => steps[i].scale.setScalar(Math.max(0.001, t)), ease.backOut);
    }
    return { group, steps, tops };
  }

  async removeStairs(stairs) {
    if (!stairs) return;
    await animate(0.3, (t) => stairs.steps.forEach((s) => s.scale.setScalar(Math.max(0.001, 1 - t))));
    if (stairs.group.parent) stairs.group.parent.remove(stairs.group);
  }

  // Entrata: il robot compare in cima alla scala e scende fino alla casella di partenza
  async enterStairs() {
    const token = this.token;
    const r = this.robot;
    const { start } = this.level;
    const startPos = this.game.board.cellPos(start.x, start.z);
    const back = this.game.dirVector((DIRS[start.dir] + 2) % 4); // la scala arriva da dietro il robot
    const size = r.group.scale.x;
    r.group.scale.setScalar(0.0001);
    const stairs = await this.buildStairs(startPos, back, token);
    if (!stairs || token !== this.token) return;
    r.group.position.copy(stairs.tops[STEPS - 1]);
    r.setDir(DIRS[start.dir]);
    sfx.boing();
    r.face.set('happy', 2.5);
    await animate(0.35, (t) => r.group.scale.setScalar(Math.max(0.0001, size * t)), ease.backOut);
    for (let i = STEPS - 2; i >= -1; i--) {
      if (token !== this.token) return;
      await r.moveTo(i >= 0 ? stairs.tops[i] : startPos, 0.24, 0.03);
      sfx.stepNote(i + 1, true);
    }
    r.group.scale.setScalar(size);
    if (token !== this.token) return;
    await this.removeStairs(stairs);
  }

  // Uscita: il robot sale una scala di lato e sparisce verso il livello successivo
  async exitStairs() {
    const token = this.token;
    const r = this.robot;
    const board = this.game.board;
    r.body.position.set(0, 0, 0);
    r.body.rotation.set(0, 0, 0);
    r.moving = false;
    const dir = this.level.goal.x >= (board.W - 1) / 2 ? DIRS.E : DIRS.W;
    await r.turnToDir(dir, 0.3);
    if (token !== this.token) return false;
    const stairs = await this.buildStairs(r.group.position.clone(), this.game.dirVector(dir), token);
    if (!stairs) return false;
    r.face.set('happy', 4);
    for (let i = 0; i < STEPS; i++) {
      if (token !== this.token) return false;
      await r.moveTo(stairs.tops[i], 0.24, 0.03);
    }
    // in cima: giravolta, coriandoli e... sparisce!
    sfx.whee();
    this.game.confettiAt(r.group);
    const size = r.group.scale.x;
    const rot0 = r.pivot.rotation.y;
    await animate(0.5, (t) => {
      r.group.scale.setScalar(Math.max(0.0001, size * (1 - t)));
      r.pivot.rotation.y = rot0 + t * Math.PI * 3;
    });
    return token === this.token;
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
    if (this.running || this.busy) return;
    if (this.dirty) this.placeAtStart();
    this.cards.splice(i, 1); // toccare una carta del programma la toglie
    this.track.setCards(this.cards);
    sfx.remove();
  }

  onPick(kind) {
    if (this.running || this.busy) return;
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
    if (this.running || this.busy) return;
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
    if (this.busy) return; // il robot sta ancora scendendo dalla scala
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

  async next() {
    if (this.busy) return;
    this.busy = true;
    this.nextBtn.visible = false;
    this.token++; // ferma i festeggiamenti in corso
    clearTweens();
    const ok = await this.exitStairs(); // il robot sale la scala magica e sparisce
    if (ok) this.game.nextLevel(this.index);
  }

  exit() {
    this.token++;
    clearTweens();
    this.game.goMenu();
  }
}
