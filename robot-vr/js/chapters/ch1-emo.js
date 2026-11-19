// Capitolo 1: EMO e le note perdute — SEQUENZE.
// Il bambino mette in fila le carte comando per portare EMO fino alla nota.
import { SequenceChapter } from './sequenceChapter.js';

export function createChapter1(game, levelIndex) {
  return new SequenceChapter(game, 1, levelIndex, { debug: false, goalKind: 'note', goalName: 'la nota' });
}
