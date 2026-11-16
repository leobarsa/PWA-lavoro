const ROW_HEIGHT = 28;
const COL_WIDTH = 96;
const HEADER_WIDTH = 48;
const HEADER_HEIGHT = 28;

const engine = new SpreadsheetEngine();
const viewport = document.getElementById('grid-viewport');
const spacer = document.getElementById('grid-spacer');
const content = document.getElementById('grid-content');
const formulaBar = document.getElementById('formula-bar');
const activeLabel = document.getElementById('active-cell-label');

let selectedRow = 0;
let selectedCol = 0;
let activeEditor = null;

// Dimensione virtuale totale del foglio (100x100)
spacer.style.width = `${HEADER_WIDTH + MAX_COLS * COL_WIDTH}px`;
spacer.style.height = `${HEADER_HEIGHT + MAX_ROWS * ROW_HEIGHT}px`;

// Ripristino dati da localStorage
function loadFromStorage() {
  const saved = localStorage.getItem('mini_sheet_data');
  if (!saved) return;
  try {
    const entries = JSON.parse(saved);
    entries.forEach(([ref, val]) => engine.setCell(ref, val));
  } catch (e) {
    console.error('Errore lettura localStorage', e);
  }
}

function saveToStorage() {
  localStorage.setItem('mini_sheet_data', JSON.stringify(Array.from(engine.raw.entries())));
}

// Rendering virtualizzato: disegna solo le celle visibili
function renderGrid() {
  const scrollTop = viewport.scrollTop;
  const scrollLeft = viewport.scrollLeft;
  const viewW = viewport.clientWidth;
  const viewH = viewport.clientHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
  const endRow = Math.min(MAX_ROWS - 1, Math.ceil((scrollTop + viewH) / ROW_HEIGHT) + 1);
  const startCol = Math.max(0, Math.floor(scrollLeft / COL_WIDTH) - 1);
  const endCol = Math.min(MAX_COLS - 1, Math.ceil((scrollLeft + viewW) / COL_WIDTH) + 1);

  const frag = document.createDocumentFragment();

  // Angolo in alto a sinistra
  const corner = document.createElement('div');
  corner.className = 'sheet-corner';
  corner.style.cssText = `top:0; left:0; width:${HEADER_WIDTH}px; height:${HEADER_HEIGHT}px;`;
  frag.appendChild(corner);

  // Intestazioni colonne visibili
  for (let c = startCol; c <= endCol; c++) {
    const left = HEADER_WIDTH + c * COL_WIDTH - scrollLeft;
    const colHdr = document.createElement('div');
    colHdr.className = `sheet-header-col ${c === selectedCol ? 'highlight' : ''}`;
    colHdr.style.cssText = `top:0; left:${left}px; width:${COL_WIDTH}px; height:${HEADER_HEIGHT}px;`;
    colHdr.textContent = colIndexToLabel(c);
    frag.appendChild(colHdr);
  }

  // Intestazioni righe e celle visibili
  for (let r = startRow; r <= endRow; r++) {
    const top = HEADER_HEIGHT + r * ROW_HEIGHT - scrollTop;

    const rowHdr = document.createElement('div');
    rowHdr.className = `sheet-header-row ${r === selectedRow ? 'highlight' : ''}`;
    rowHdr.style.cssText = `top:${top}px; left:0; width:${HEADER_WIDTH}px; height:${ROW_HEIGHT}px;`;
    rowHdr.textContent = r + 1;
    frag.appendChild(rowHdr);

    for (let c = startCol; c <= endCol; c++) {
      const left = HEADER_WIDTH + c * COL_WIDTH - scrollLeft;
      const ref = coordsToRef(r, c);
      const val = engine.getValue(ref);

      const cell = document.createElement('div');
      const isSelected = r === selectedRow && c === selectedCol;
      const isError = typeof val === 'string' && val.startsWith('#');
      cell.className = `sheet-cell ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}`;
      cell.style.cssText = `top:${top}px; left:${left}px; width:${COL_WIDTH}px; height:${ROW_HEIGHT}px;`;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = val;

      if (typeof val === 'number') cell.style.justifyContent = 'flex-end';
      frag.appendChild(cell);
    }
  }

  content.innerHTML = '';
  content.appendChild(frag);
}

function selectCell(r, c, ensureVisible = true) {
  selectedRow = Math.max(0, Math.min(MAX_ROWS - 1, r));
  selectedCol = Math.max(0, Math.min(MAX_COLS - 1, c));
  const ref = coordsToRef(selectedRow, selectedCol);

  activeLabel.textContent = ref;
  formulaBar.value = engine.getRaw(ref);

  if (ensureVisible) {
    const cellTop = selectedRow * ROW_HEIGHT;
    const cellLeft = selectedCol * COL_WIDTH;
    const visibleH = viewport.clientHeight - HEADER_HEIGHT;
    const visibleW = viewport.clientWidth - HEADER_WIDTH;

    if (cellTop < viewport.scrollTop) viewport.scrollTop = cellTop;
    else if (cellTop + ROW_HEIGHT > viewport.scrollTop + visibleH) {
      viewport.scrollTop = cellTop + ROW_HEIGHT - visibleH;
    }

    if (cellLeft < viewport.scrollLeft) viewport.scrollLeft = cellLeft;
    else if (cellLeft + COL_WIDTH > viewport.scrollLeft + visibleW) {
      viewport.scrollLeft = cellLeft + COL_WIDTH - visibleW;
    }
  }

  renderGrid();
}

function openInlineEditor(initialChar = null) {
  if (activeEditor) return;
  const ref = coordsToRef(selectedRow, selectedCol);
  const top = HEADER_HEIGHT + selectedRow * ROW_HEIGHT - viewport.scrollTop;
  const left = HEADER_WIDTH + selectedCol * COL_WIDTH - viewport.scrollLeft;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-editor';
  input.style.cssText = `top:${top}px; left:${left}px; width:${COL_WIDTH}px; height:${ROW_HEIGHT}px;`;
  input.value = initialChar !== null ? initialChar : engine.getRaw(ref);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEditor(input.value);
      selectCell(selectedRow + 1, selectedCol);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEditor(input.value);
      selectCell(selectedRow, selectedCol + (e.shiftKey ? -1 : 1));
    } else if (e.key === 'Escape') {
      closeEditor();
    }
  });

  input.addEventListener('blur', () => commitEditor(input.value));

  viewport.appendChild(input);
  input.focus();
  activeEditor = input;
}

function commitEditor(newValue) {
  if (!activeEditor) return;
  const ref = coordsToRef(selectedRow, selectedCol);
  engine.setCell(ref, newValue);
  saveToStorage();
  closeEditor();
  formulaBar.value = engine.getRaw(ref);
  renderGrid();
}

function closeEditor() {
  if (activeEditor) {
    activeEditor.remove();
    activeEditor = null;
  }
}

// Eventi mouse e tastiera
viewport.addEventListener('scroll', () => {
  closeEditor();
  renderGrid();
});

viewport.addEventListener('mousedown', (e) => {
  const cell = e.target.closest('.sheet-cell');
  if (!cell) return;
  closeEditor();
  selectCell(Number(cell.dataset.row), Number(cell.dataset.col), false);
});

viewport.addEventListener('dblclick', (e) => {
  if (e.target.closest('.sheet-cell')) openInlineEditor();
});

window.addEventListener('keydown', (e) => {
  if (activeEditor || document.activeElement === formulaBar) return;

  if (e.key === 'ArrowUp') { e.preventDefault(); selectCell(selectedRow - 1, selectedCol); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); selectCell(selectedRow + 1, selectedCol); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); selectCell(selectedRow, selectedCol - 1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); selectCell(selectedRow, selectedCol + 1); }
  else if (e.key === 'Tab') { e.preventDefault(); selectCell(selectedRow, selectedCol + (e.shiftKey ? -1 : 1)); }
  else if (e.key === 'PageDown') { e.preventDefault(); selectCell(selectedRow + 15, selectedCol); }
  else if (e.key === 'PageUp') { e.preventDefault(); selectCell(selectedRow - 15, selectedCol); }
  else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); openInlineEditor(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    const ref = coordsToRef(selectedRow, selectedCol);
    engine.setCell(ref, '');
    formulaBar.value = '';
    saveToStorage();
    renderGrid();
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    openInlineEditor(e.key);
  }
});

// Barra della formula
formulaBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const ref = coordsToRef(selectedRow, selectedCol);
    engine.setCell(ref, formulaBar.value);
    saveToStorage();
    selectCell(selectedRow + 1, selectedCol);
  }
});

// Esporta CSV e Svuota
document.getElementById('btn-export').addEventListener('click', () => {
  const lines = [];
  for (let r = 0; r < MAX_ROWS; r++) {
    const rowVals = [];
    for (let c = 0; c < MAX_COLS; c++) {
      rowVals.push(`"${String(engine.getValue(coordsToRef(r, c))).replace(/"/g, '""')}"`);
    }
    lines.push(rowVals.join(';'));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'minisheet.csv';
  a.click();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  engine.raw.clear();
  engine.values.clear();
  engine.deps.clear();
  engine.dependents.clear();
  localStorage.removeItem('mini_sheet_data');
  formulaBar.value = '';
  renderGrid();
});

// Indicatore stato rete
const offlineBadge = document.getElementById('offline-badge');
function updateOnlineStatus() {
  offlineBadge.textContent = navigator.onLine ? 'Online' : 'Offline';
  offlineBadge.className = `badge ms-auto ${navigator.onLine ? 'bg-success' : 'bg-warning text-dark'}`;
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Avvio iniziale
loadFromStorage();
updateOnlineStatus();
selectCell(0, 0);