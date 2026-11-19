// Traduce la fila di carte in una lista di passi da eseguire (gestisce Ripeti / Fine ripeti).

// Restituisce un array di { cmd: 'F'|'L'|'R', index } dove index è la posizione della carta.
export function compile(cards, maxSteps = 80) {
  let pos = 0;
  function parseBlock(insideLoop) {
    const out = [];
    while (pos < cards.length) {
      const c = cards[pos];
      if (c === 'END') {
        pos++;
        if (insideLoop) return out;
        continue; // "fine" senza "ripeti": ignorata
      }
      if (c.startsWith('REP')) {
        const n = parseInt(c.slice(3), 10);
        const idx = pos;
        pos++;
        const body = parseBlock(true);
        out.push({ loop: n, index: idx, body });
      } else {
        out.push({ cmd: c, index: pos });
        pos++;
      }
    }
    return out;
  }
  const tree = parseBlock(false);
  const steps = [];
  function flatten(nodes, loopIdx) {
    for (const n of nodes) {
      if (steps.length > maxSteps) return;
      if (n.loop) {
        for (let i = 0; i < n.loop; i++) flatten(n.body, [...loopIdx, n.index]);
      } else {
        steps.push({ cmd: n.cmd, index: n.index, loops: loopIdx });
      }
    }
  }
  flatten(tree, []);
  return steps.slice(0, maxSteps);
}
