const MAX_ROWS = 100;
const MAX_COLS = 100;

// Converte indice colonna (0 -> A, 25 -> Z, 26 -> AA, 99 -> CV)
function colIndexToLabel(index) {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

// Converte etichetta colonna (A -> 0, CV -> 99)
function colLabelToIndex(label) {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Converte (row, col) in "A1"
function coordsToRef(row, col) {
  return `${colIndexToLabel(col)}${row + 1}`;
}

// Converte "A1" in { row, col } oppure null se fuori range
function refToCoords(ref) {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!match) return null;
  const col = colLabelToIndex(match[1].toUpperCase());
  const row = parseInt(match[2], 10) - 1;
  if (row < 0 || row >= MAX_ROWS || col < 0 || col >= MAX_COLS) return null;
  return { row, col };
}

// Espande un intervallo "A1:B2" nell'elenco di coordinate ["A1", "B1", "A2", "B2"]
function expandRange(rangeStr) {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return null;
  const start = refToCoords(parts[0]);
  const end = refToCoords(parts[1]);
  if (!start || !end) return null;

  const rMin = Math.min(start.row, end.row);
  const rMax = Math.max(start.row, end.row);
  const cMin = Math.min(start.col, end.col);
  const cMax = Math.max(start.col, end.col);

  const refs = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      refs.push(coordsToRef(r, c));
    }
  }
  return refs;
}