// STAR ORBIT 难度标定 v4（独立新文件，不改动任何已有文件）
const fs = require('fs');
const src = fs.readFileSync('/sdcard/Download/star-orbit-game/tools/solver.js', 'utf8');
eval(src.slice(0, src.indexOf('function bfs(')));

let gates, NR;
function prep(level) { const g = geom(level); gates = findGates(g.centers, g.R); NR = g.centers.length; }
const ringsOf = b => { const r = []; b.pos.forEach((s, c) => { if (s != null) r.push(c); }); return r; };
function stateKey(st) { const g = {}; for (const b of st) { const k = b.type + ':' + b.pos.join(','); g[k] = (g[k] || 0) + 1; } return Object.keys(g).sort().map(k => k + '#' + g[k]).join('|'); }
function apply(bodies, seq) { const st = clone(bodies); for (const [c, d] of seq) rotate(st, gates, NR, c, d); return st; }

// ---------- L2：精确恢复原始四球布局，全枚举 BFS 求最短解 ----------
function L2shortest() {
  prep(2);
  const mk = (t, o) => { const p = [null, null]; for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
  const goalState = [mk(0, { 0: 10, 1: 8 }), mk(1, { 0: 2, 1: 4 }), mk(0, { 0: 6 }), mk(1, { 1: 0 })];
  const gk = stateKey(goalState);
  function bfsFrom(start, cap = 300000, maxDepth = 30) {
    const seen = new Set([stateKey(start)]);
    let cur = [start];
    for (let d = 1; d <= maxDepth; d++) {
      const next = [];
      for (const st of cur) for (let c = 0; c < NR; c++) for (const dir of [1, -1]) {
        const ns = clone(st); rotate(ns, gates, NR, c, dir);
        const k = stateKey(ns); if (seen.has(k)) continue; seen.add(k);
        if (k === gk) return { depth: d, states: seen.size };
        next.push(ns);
        if (seen.size > cap) return { depth: null, states: seen.size, note: 'cap' };
      }
      cur = next;
    }
    return { depth: null, states: seen.size, note: 'exhausted' };
  }
  const res = [];
  for (const len of [1, 2, 3, 4, 5, 6]) {
    const seq = [];
    let c = 0;
    for (let i = 0; i < len; i++) { seq.push([c % 2, 1]); c++; }
    const start = apply(goalState, seq);
    if (stateKey(start) === gk) { res.push({ scramble: len, note: '退化' }); continue; }
    const r = bfsFrom(start);
    res.push({ scramble: len, shortest: r.depth, states: r.states });
  }
  console.log('L2 打乱长度 vs 最短解:', JSON.stringify(res));
  // 全部可达状态数
  const total = bfsFrom(goalState, 300000, 40);
  console.log('L2 从规范态可达状态总数(深度上限内):', JSON.stringify(total));
}

// ---------- L0/L1：beam 搜索验证从打乱态能回到规范构型 ----------
function beamToCanonical(level, scrambleSeq, width, maxDepth) {
  prep(level);
  const mk = (t, o) => { const p = Array(NR).fill(null); for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
  let canon = [];
  if (level === 0) {
    canon.push(mk(2, { 0: 2, 1: 4 }), mk(2, { 0: 10, 1: 8 }));
    [0, 1, 3, 4, 5, 6, 7, 8, 9, 11].forEach(s => canon.push(mk(0, { 0: s })));
    [0, 1, 2, 3, 5, 6, 7, 9, 10, 11].forEach(s => canon.push(mk(1, { 1: s })));
  } else {
    const occupied = {};
    for (let c = 0; c < 3; c++) for (let s = 0; s < 12; s++) {
      const k = c + '-' + s; if (occupied[k]) continue;
      const b = mk(c, { [c]: s }); const gg = gates[k];
      if (gg && !occupied[gg[0] + '-' + gg[1]]) { b.pos[gg[0]] = gg[1]; occupied[gg[0] + '-' + gg[1]] = 1; }
      occupied[k] = 1; canon.push(b);
    }
  }
  const canonCount = {};
  canon.forEach(b => { const k = b.type + ':' + b.pos.join(','); canonCount[k] = (canonCount[k] || 0) + 1; });
  const h = st => { const c2 = Object.assign({}, canonCount); let off = 0; for (const b of st) { const k = b.type + ':' + b.pos.join(','); if (c2[k] > 0) c2[k]--; else off++; } return off; };
  const goal = st => h(st) === 0;
  const start = apply(canon, scrambleSeq);
  if (goal(start)) return { note: '退化' };
  const t0 = Date.now();
  const seen = new Set([stateKey(start)]);
  let cur = [start];
  for (let d = 1; d <= maxDepth; d++) {
    const cand = [];
    for (const st of cur) for (let c = 0; c < NR; c++) for (const dir of [1, -1]) {
      const ns = clone(st); rotate(ns, gates, NR, c, dir);
      const k = stateKey(ns); if (seen.has(k)) continue; seen.add(k);
      if (goal(ns)) return { solved: true, moves: d, states: seen.size, ms: Date.now() - t0 };
      cand.push({ st: ns, h: h(ns) });
    }
    if (!cand.length) return { solved: false, note: '穷尽', states: seen.size, ms: Date.now() - t0 };
    cand.sort((a, b) => a.h - b.h);
    cur = cand.slice(0, Math.min(width, cand.length)).map(x => x.st);
    if (seen.size > 250000) return { solved: null, note: '状态上限', best: cand[0].h, states: seen.size, ms: Date.now() - t0 };
  }
  return { solved: false, note: '深度上限', states: seen.size, ms: Date.now() - t0 };
}
console.log('L0 beam:', JSON.stringify(beamToCanonical(0, [[0, 1], [1, 1], [0, 1], [0, 1], [1, 1], [0, 1]], 300, 20)));
console.log('L1 beam:', JSON.stringify(beamToCanonical(1, [[0, 1], [1, 1], [2, 1], [0, 1], [1, 1], [2, 1], [0, 1], [1, 1]], 300, 20)));
L2shortest();