// Capitolo 2: Loona e l'osso nascosto — CONDIZIONI "SE... ALLORA".
// Loona va sempre dritta; il bambino decide cosa fa quando passa su un colore (o trova un ostacolo).
import { LEVELS, CHAPTERS, DIRS, DIR_VEC } from '../levels.js';
import { makeButton, makePanel, makeLabel } from '../ui/ui.js';
import { icons } from '../ui/icons.js';
import { roundRect, drawIcon, CARD_INFO, FONT } from '../util/text.js';
import { wait, clearTweens } from '../util/tween.js';
import { sfx } from '../audio.js';
import { phrases } from '../hints.js';
import { LAYOUT } from '../ui/layout.js';

const COLOR_CSS = { red: '#ff5d5d', blue: '#4d8dff', yellow: '#ffd23f' };
const COLOR_NAME = { red: 'rosso', blue: 'blu', yellow: 'giallo' };
const CYCLE = ['S', 'R', 'L'];

function drawRule(ctx, W, H, cond, action, active) {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, 4, 12, W - 8, H - 14, 40);
  ctx.fill();
  ctx.fillStyle = active ? '#fff3b0' : '#ffffff';
  roundRect(ctx, 4, 4, W - 8, H - 14, 40);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = active ? '#ffb800' : '#d9d2f5';
  roundRect(ctx, 8, 8, W - 16, H - 22, 36);
  ctx.stroke();
  const h = H - 14;
  ctx.fillStyle = '#5a3fd6';
  ctx.font = `bold ${h * 0.24}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SE', W * 0.1, h * 0.5);
  // Condizione
  const cs = h * 0.62;
  const cx = W * 0.27, cy = h * 0.46;
  if (cond === 'wall') {
    ctx.fillStyle = '#b08cff';
    roundRect(ctx, cx - cs / 2, cy - cs / 2, cs, cs, cs * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${cs * 0.6}px ${FONT}`;
    ctx.fillText('!', cx, cy + 2);
  } else {
    ctx.fillStyle = COLOR_CSS[cond];
    roundRect(ctx, cx - cs / 2, cy - cs / 2, cs, cs, cs * 0.2);
    ctx.fill();
  }
  ctx.fillStyle = '#6b6488';
  ctx.font = `bold ${h * 0.15}px ${FONT}`;
  ctx.fillText(cond === 'wall' ? 'ostacolo' : COLOR_NAME[cond], cx, h * 0.89);
  // ALLORA
  ctx.fillStyle = '#5a3fd6';
  ctx.font = `bold ${h * 0.2}px ${FONT}`;
  ctx.fillText('ALLORA', W * 0.53, h * 0.5);
  // Azione (carta)
  const ax = W * 0.82, as = h * 0.78;
  const info = CARD_INFO[action];
  ctx.fillStyle = info.color;
  roundRect(ctx, ax - as / 2, h * 0.08, as, as, as * 0.2);
  ctx.fill();
  drawIcon(ctx, action, ax, h * 0.08 + as * 0.42, as * 0.27);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${as * 0.17}px ${FONT}`;
  ctx.fillText(info.label, ax, h * 0.08 + as * 0.85);
}

export class RulesChapter {
  constructor(game, levelIndex) {
    this.game = game;
    this.chapterId = 2;
    this.levelIndex = levelIndex;
    this.levels = LEVELS[2][game.age];
    this.level = this.levels[levelIndex];
    this.chapter = CHAPTERS.find((c) => c.id === 2);
    this.robot = game.robots.loona;
    this.token = 0;
    this.running = false;
    this.dirty = false;
    this.fails = 0;
    const conds = [];
    for (const [, , c] of this.level.colors) if (!conds.includes(c)) conds.push(c);
    if (this.level.wallRule) conds.push('wall');
    this.conds = conds;
    this.actions = Object.fromEntries(conds.map((c) => [c, 'S']));
    this.ruleMeshes = {};
  }

  start() {
    const { game, level } = this;
    game.board.build(level, 'bone');
    game.showRobots(['loona']);
    this.placeAtStart();
    this.buildUI();
    game.say(this.levelIndex === 0 ? `${this.chapter.intro} ${level.intro}` : level.intro);
  }

  placeAtStart() {
    const { start } = this.level;
    this.game.placeRobot(this.robot, start.x, start.z, DIRS[start.dir]);
    this.game.board.resetGoal();
    this.robot.face.set('normal');
    this.dirty = false;
  }

  buildUI() {
    const { game } = this;
    const scr = game.screen;
    scr.clear();
    game.buildHeader(`Capitolo 2: ${this.chapter.title}  ·  Livello ${this.levelIndex + 1} di ${this.levels.length}`);

    const n = this.conds.length;
    const w = n > 2 ? 0.62 : 0.7, h = 0.24;
    const step = w + 0.06;
    const x0 = -((n - 1) * step) / 2;
    this.conds.forEach((cond, i) => {
      const mesh = makePanel(w, h, (ctx, W, H, active = false) => drawRule(ctx, W, H, cond, this.actions[cond], active));
      mesh.userData.hoverable = true;
      mesh.userData.onClick = () => this.cycle(cond);
      scr.add(mesh, x0 + i * step, LAYOUT.track - 0.02);
      this.ruleMeshes[cond] = mesh;
    });

    const base = makeLabel(1.7, 0.09, 'Regola base: Loona va sempre dritta. Tocca le regole per cambiare la freccia!', { size: 40, color: '#6b6488', weight: '600' });
    scr.add(base, 0, LAYOUT.palette - 0.02);

    const by = LAYOUT.buttons;
    this.playBtn = makeButton(0.42, 0.14, 'Via!', () => (this.running ? this.stop() : this.run()), { color: '#2fbf71', icon: icons.play });
    scr.add(this.playBtn, -0.7, by);
    scr.add(makeButton(0.36, 0.14, 'Menu', () => this.exit(), { color: '#8a7fb0', icon: icons.home, size: 52 }), -0.25, by);
    this.nextBtn = makeButton(0.4, 0.14, 'Avanti', () => this.next(), { color: '#ff3fa4', icon: icons.next });
    this.nextBtn.visible = false;
    scr.add(this.nextBtn, 0.75, by);
  }

  cycle(cond) {
    if (this.running) return;
    if (this.dirty) this.placeAtStart();
    const cur = CYCLE.indexOf(this.actions[cond]);
    this.actions[cond] = CYCLE[(cur + 1) % CYCLE.length];
    this.ruleMeshes[cond].userData.redraw(false);
    sfx.place();
  }

  async flash(cond) {
    const m = this.ruleMeshes[cond];
    if (!m) return;
    m.userData.redraw(true);
    await wait(0.45);
    if (m.parent) m.userData.redraw(false);
  }

  setRunning(r) {
    this.running = r;
    this.playBtn.userData.setText(r ? 'Stop' : 'Via!');
    this.playBtn.userData.setColor(r ? '#ff5d5d' : '#2fbf71');
  }

  stop() {
    this.token++;
    clearTweens();
    this.setRunning(false);
    for (const c of this.conds) this.ruleMeshes[c].userData.redraw(false);
    this.placeAtStart();
  }

  async turn(action, dir) {
    if (action === 'S') return dir;
    const nd = (dir + (action === 'R' ? 1 : 3)) % 4;
    sfx.turn();
    await this.robot.turnToDir(nd, 0.3);
    return nd;
  }

  async run() {
    this.nextBtn.visible = false;
    this.placeAtStart();
    const token = ++this.token;
    this.setRunning(true);
    this.dirty = true;
    const { board } = this.game;
    let { x, z } = this.level.start;
    let dir = DIRS[this.level.start.dir];
    const seen = new Set();
    await wait(0.3);
    for (let i = 0; i < 80; i++) {
      if (token !== this.token) return;
      let [dx, dz] = DIR_VEC[dir];
      let blocked = !board.inBounds(x + dx, z + dz) || board.isWall(x + dx, z + dz);
      if (blocked && this.level.wallRule && this.actions.wall !== 'S') {
        this.flash('wall');
        dir = await this.turn(this.actions.wall, dir);
        if (token !== this.token) return;
        [dx, dz] = DIR_VEC[dir];
        blocked = !board.inBounds(x + dx, z + dz) || board.isWall(x + dx, z + dz);
      }
      if (blocked) {
        sfx.bump();
        await this.robot.bump(this.game.dirVector(dir), board.cell);
        if (token !== this.token) return;
        return this.fail(board.inBounds(x + dx, z + dz) ? 'bump' : 'edge');
      }
      x += dx; z += dz;
      sfx.step();
      await this.robot.moveTo(board.cellPos(x, z), 0.36, 0.01);
      if (token !== this.token) return;
      if (board.isGoal(x, z)) return this.win();
      const color = board.colorAt(x, z);
      if (color) {
        this.flash(color);
        dir = await this.turn(this.actions[color], dir);
        if (token !== this.token) return;
      }
      const key = `${x},${z},${dir}`;
      if (seen.has(key)) return this.fail('loop');
      seen.add(key);
      await wait(0.05);
    }
    return this.fail('loop');
  }

  fail(reason) {
    this.setRunning(false);
    this.fails++;
    sfx.fail();
    let msg = reason === 'edge' ? phrases.edge('Loona') : reason === 'bump' ? phrases.bump('Loona') : phrases.loop('Loona');
    if (this.fails >= 2 && this.level.hint) msg += ' Suggerimento: ' + this.level.hint;
    this.robot.sad();
    this.game.say(msg);
  }

  async win() {
    this.setRunning(false);
    sfx.win();
    this.game.confettiAt(this.robot.group);
    this.nextBtn.visible = true;
    this.game.say(phrases.win() + ' Loona ha trovato l\'osso!');
    const token = this.token;
    await Promise.all([this.game.board.collectGoal(), this.robot.turnToDir(DIRS.S, 0.3)]);
    if (token !== this.token) return;
    await this.robot.celebrate();
  }

  next() {
    this.token++;
    clearTweens();
    this.game.nextLevel(2, this.levelIndex);
  }

  exit() {
    this.token++;
    clearTweens();
    this.game.goChapters();
  }
}

export function createChapter2(game, levelIndex) {
  return new RulesChapter(game, levelIndex);
}
