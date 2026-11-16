class SpreadsheetEngine {
  constructor() {
    this.raw = new Map();        // ref -> stringa inserita dall'utente
    this.values = new Map();     // ref -> valore calcolato
    this.deps = new Map();       // ref -> Set di celle da cui dipende
    this.dependents = new Map(); // ref -> Set di celle che dipendono da ref
  }

  getRaw(ref) {
    return this.raw.get(ref) || '';
  }

  getValue(ref) {
    return this.values.has(ref) ? this.values.get(ref) : '';
  }

  setCell(ref, input) {
    const trimmed = input === null || input === undefined ? '' : String(input);
    if (trimmed === '') {
      this.raw.delete(ref);
    } else {
      this.raw.set(ref, trimmed);
    }

    // Rimuove vecchie dipendenze di ref
    const oldDeps = this.deps.get(ref);
    if (oldDeps) {
      oldDeps.forEach((d) => {
        if (this.dependents.has(d)) this.dependents.get(d).delete(ref);
      });
    }
    this.deps.set(ref, new Set());

    // Ricalcola ref e propaga ai dipendenti
    this.recalculate(ref);
  }

  recalculate(startRef) {
    const queue = [startRef];
    const visitedInCycle = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      this.evaluateCell(current);

      const children = this.dependents.get(current);
      if (children) {
        children.forEach((child) => {
          if (!visitedInCycle.has(child)) {
            visitedInCycle.add(child);
            queue.push(child);
          }
        });
      }
    }
  }

  evaluateCell(ref, callStack = new Set()) {
    if (callStack.has(ref)) {
      this.values.set(ref, '#CIRC!');
      return '#CIRC!';
    }

    const raw = this.getRaw(ref);
    if (raw === '') {
      this.values.delete(ref);
      return '';
    }

    if (!raw.startsWith('=')) {
      const num = Number(raw);
      const val = !isNaN(num) && raw.trim() !== '' ? num : raw;
      this.values.set(ref, val);
      return val;
    }

    callStack.add(ref);
    try {
      const expr = raw.slice(1).trim();
      const result = this.evalExpression(expr, ref, callStack);
      this.values.set(ref, result);
      return result;
    } catch (err) {
      const code = err.message.startsWith('#') ? err.message : '#VALORE!';
      this.values.set(ref, code);
      return code;
    } finally {
      callStack.delete(ref);
    }
  }

  registerDependency(ownerRef, targetRef) {
    if (!this.deps.has(ownerRef)) this.deps.set(ownerRef, new Set());
    this.deps.get(ownerRef).add(targetRef);

    if (!this.dependents.has(targetRef)) this.dependents.set(targetRef, new Set());
    this.dependents.get(targetRef).add(ownerRef);
  }

  evalExpression(expr, ownerRef, callStack) {
    // 1. Risolve le funzioni (es. SOMMA(...), CONTA.SE(...))
    const resolvedFuncs = this.replaceFunctions(expr, ownerRef, callStack);

    // 2. Sostituisce i riferimenti a celle singole (es. A1, CV100)
    const resolvedRefs = resolvedFuncs.replace(/\b([A-Za-z]+\d+)\b/g, (match) => {
      const coords = refToCoords(match);
      if (!coords) throw new Error('#RIF!');
      const targetRef = coordsToRef(coords.row, coords.col);

      this.registerDependency(ownerRef, targetRef);
      if (callStack.has(targetRef)) throw new Error('#CIRC!');

      const val = this.values.has(targetRef)
        ? this.values.get(targetRef)
        : this.evaluateCell(targetRef, callStack);

      if (typeof val === 'string' && val.startsWith('#')) throw new Error(val);
      if (val === '' || val === null || val === undefined) return '0';
      if (typeof val === 'number') return String(val);
      throw new Error('#VALORE!');
    });

    // 3. Controlla eventuali nomi di funzioni non riconosciuti
    if (/[A-Za-z_]/.test(resolvedRefs)) {
      throw new Error('#NOME?');
    }

    // 4. Valuta l'espressione aritmetica in sicurezza (solo numeri, operatori e parentesi)
    if (!/^[\d+\-*/().\s]+$/.test(resolvedRefs)) {
      throw new Error('#VALORE!');
    }

    const result = Function(`"use strict"; return (${resolvedRefs});`)();
    if (!isFinite(result)) throw new Error('#DIV/0!');
    if (isNaN(result)) throw new Error('#VALORE!');
    return Number(result.toFixed(10)); // evita imprecisioni floating-point
  }

  replaceFunctions(expr, ownerRef, callStack) {
    const funcRegex = /([A-Z.]+)\(([^()]*)\)/gi;
    let current = expr;
    let match;

    // Risolve dalle parentesi più interne verso l'esterno
    while ((match = funcRegex.exec(current)) !== null) {
      const funcName = match[1].toUpperCase();
      const argsStr = match[2];
      const val = this.executeFunction(funcName, argsStr, ownerRef, callStack);
      current = current.slice(0, match.index) + val + current.slice(match.index + match[0].length);
      funcRegex.lastIndex = 0;
    }
    return current;
  }

  executeFunction(name, argsStr, ownerRef, callStack) {
    const args = argsStr.split(';').map((a) => a.trim());
    const allowed = ['SOMMA', 'MEDIA', 'CONTA', 'CONTA.VALORI', 'MAX', 'MIN', 'SOMMA.SE', 'CONTA.SE', 'MEDIA.SE'];
    if (!allowed.includes(name)) throw new Error('#NOME?');

    // Funzioni condizionali: =SOMMA.SE(A1:A10;">5")
    if (name.endsWith('.SE')) {
      if (args.length !== 2) throw new Error('#VALORE!');
      const refs = this.extractRefsFromArg(args[0], ownerRef);
      const condition = args[1].replace(/^["']|["']$/g, '');
      const predicate = this.buildPredicate(condition);

      const matchedNums = [];
      let countMatched = 0;

      for (const r of refs) {
        const v = this.getCellValForRange(r, callStack);
        if (predicate(v)) {
          countMatched++;
          if (typeof v === 'number') matchedNums.push(v);
        }
      }

      if (name === 'CONTA.SE') return countMatched;
      if (name === 'SOMMA.SE') return matchedNums.reduce((a, b) => a + b, 0);
      if (name === 'MEDIA.SE') {
        if (matchedNums.length === 0) throw new Error('#DIV/0!');
        return matchedNums.reduce((a, b) => a + b, 0) / matchedNums.length;
      }
    }

    // Funzioni standard su uno o più argomenti/intervalli
    const allValues = [];
    for (const arg of args) {
      if (arg === '') continue;
      if (arg.includes(':')) {
        const refs = this.extractRefsFromArg(arg, ownerRef);
        refs.forEach((r) => allValues.push(this.getCellValForRange(r, callStack)));
      } else if (refToCoords(arg)) {
        const norm = coordsToRef(refToCoords(arg).row, refToCoords(arg).col);
        this.registerDependency(ownerRef, norm);
        allValues.push(this.getCellValForRange(norm, callStack));
      } else if (!isNaN(Number(arg))) {
        allValues.push(Number(arg));
      } else {
        throw new Error('#RIF!');
      }
    }

    const nums = allValues.filter((v) => typeof v === 'number');

    switch (name) {
      case 'SOMMA':
        return nums.reduce((a, b) => a + b, 0);
      case 'MEDIA':
        if (nums.length === 0) throw new Error('#DIV/0!');
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case 'CONTA':
        return nums.length;
      case 'CONTA.VALORI':
        return allValues.filter((v) => v !== '' && v !== null && v !== undefined).length;
      case 'MAX':
        return nums.length === 0 ? 0 : Math.max(...nums);
      case 'MIN':
        return nums.length === 0 ? 0 : Math.min(...nums);
      default:
        throw new Error('#NOME?');
    }
  }

  extractRefsFromArg(rangeArg, ownerRef) {
    const refs = expandRange(rangeArg);
    if (!refs) throw new Error('#RIF!');
    refs.forEach((r) => this.registerDependency(ownerRef, r));
    return refs;
  }

  getCellValForRange(ref, callStack) {
    if (callStack.has(ref)) throw new Error('#CIRC!');
    const val = this.values.has(ref) ? this.values.get(ref) : this.evaluateCell(ref, callStack);
    if (typeof val === 'string' && val.startsWith('#')) throw new Error(val);
    return val;
  }

  buildPredicate(cond) {
    const match = /^(>=|<=|<>|>|<|=)?(.*)$/.exec(cond.trim());
    const op = match[1] || '=';
    const rawTarget = match[2].trim();
    const numTarget = Number(rawTarget);
    const isNum = rawTarget !== '' && !isNaN(numTarget);

    return (cellVal) => {
      if (cellVal === '' || cellVal === null || cellVal === undefined) return false;
      if (isNum && typeof cellVal === 'number') {
        if (op === '>') return cellVal > numTarget;
        if (op === '<') return cellVal < numTarget;
        if (op === '>=') return cellVal >= numTarget;
        if (op === '<=') return cellVal <= numTarget;
        if (op === '<>') return cellVal !== numTarget;
        return cellVal === numTarget;
      }
      const sVal = String(cellVal).toLowerCase();
      const sTarget = rawTarget.toLowerCase();
      if (op === '<>') return sVal !== sTarget;
      if (op === '=') return sVal === sTarget;
      return false;
    };
  }
}