// Capitolo 3: Gli errori di AIBI — DEBUG (e cicli per i più grandi).
// AIBI ha scritto dei programmi per EMO, ma contengono errori: il bambino li trova e li corregge.
import { SequenceChapter } from './sequenceChapter.js';

export function createChapter3(game, levelIndex) {
  return new SequenceChapter(game, 3, levelIndex, { debug: true, goalKind: 'star', goalName: 'la stella' });
}
