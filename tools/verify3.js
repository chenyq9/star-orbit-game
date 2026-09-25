// STAR ORBIT 最终目标验证 v3（独立新文件，不修改任何已有文件）
// 结论导向：三关目标 = 恢复"唯一规范构型"，可解性由构造+回放保证。
const fs = require('fs');
const src = fs.readFileSync('/sdcard/Download/star-orbit-game/tools/solver.js', 'utf8');
eval(src.slice(0, src.indexOf('function bfs(')));

let gates, NR;
function prep(level) { const g = geom(level); gates = findGates(g.centers, g.R); NR = g.centers.length; return g; }
const isGate = (c, s) => !!gates[c + '-' + s];
const ringsOf = b => { const r = []; b.pos.forEach((s, c) => { if (s != null) r.push(c); }); return r; };
function stateKey(st) { const g = {}; for (const b of st) { const k = b.type + ':' + b.pos.join(','); g[k] = (g[k] || 0) + 1; } return Object.keys(g).sort().map(k => k + '#' + g[k]).join('|'); }

// ---- 规范构型 ----
function canonical(level) {
  const g = prep(level);
  const mk = (t, o) => { const p = Array(NR).fill(null); for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
  const out = [];
  if (level === 0) {
    out.push(mk(2, { 0: 2, 1: 4 }), mk(2, { 0: 10, 1: 8 }));
    [0, 1, 3, 4, 5, 6, 7, 8, 9, 11].forEach(s => out.push(mk(0, { 0: s })));
    [0, 1, 2, 3, 5, 6, 7, 9, 10, 11].forEach(s => out.push(mk(1, { 1: s })));
  } else if (level === 1) {
    const occupied = {};
    for (let c = 0; c < 3; c++) for (let s = 0; s < 12; s++) {
      const k = c + '-' + s;
      if (occupied[k]) continue;
      const b = mk(c, { [c]: s });
      const gg = gates[k];
      if (gg && !occupied[gg[0] + '-' + gg[1]]) { b.pos[gg[0]] = gg[1]; occupied[gg[0] + '-' + gg[1]] = 1; }
      occupied[k] = 1; out.push(b);
    }
  } else {
    out.push(mk(0, { 0: 10, 1: 8 }), mk(1, { 0: 2, 1: 4 }), mk(0, { 0: 6 }), mk(1, { 1: 0 }));
  }
  return { bodies: out, nRings: NR, gates };
}
// 槽位占用统计（验证"规范构型恰好填满"）
function slotStats(bodies) {
  const used = {};
  for (const b of bodies) b.pos.forEach((s, c) => { if (s != null) used[c + '-' + s] = (used[c + '-' + s] || 0) + 1; });
  const total = NR * 12, occ = Object.keys(used).length, dup = Object.values(used).filter(v => v > 1).length;
  return { total, occupied: occ, empty: total - occ, overlaps: dup };
}
function apply(bodies, seq) { const st = clone(bodies); for (const [c, d] of seq) rotate(st, gates, NR, c, d); return st; }
function invert(seq) { return seq.slice().reverse().map(([c, d]) => [c, -d]); }

// ---- 镜像对称（关卡2） ----
function mirrorSymmetric(st) {
  const m = {};
  for (const b of st) {
    const s0 = b.pos[0], s1 = b.pos[1];
    if (s0 != null && s1 != null) { if (s1 !== ((6 - s0) % 12 + 12) % 12) return false; }
    else if (s0 != null) m['a' + b.type + ':' + s0] = (m['a' + b.type + ':' + s0] || 0) + 1;
    else m['b' + b.type + ':' + s1] = (m['b' + b.type + ':' + s1] || 0) + 1;
  }
  for (const k in m) {
    if (k[0] !== 'a') continue;
    const [t, s] = k.slice(1).split(':');
    const mk2 = 'b' + t + ':' + (((6 - (+s)) % 12) + 12) % 12;
    if ((m[mk2] || 0) !== m[k]) return false;
  }
  return true;
}
// 关卡2：从起点用 BFS 找任意镜像对称态
function bfsMirror(start, cap = 200000, maxDepth = 20) {
  if (mirrorSymmetric(start)) return { solved: true, moves: 0, note: '起点已对称' };
  const seen = new Set([stateKey(start)]);
  let cur = [start];
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const st of cur) for (let c = 0; c < NR; c++) for (const dir of [1, -1]) {
      const ns = clone(st); rotate(ns, gates, NR, c, dir);
      const k = stateKey(ns); if (seen.has(k)) continue; seen.add(k);
      if (mirrorSymmetric(ns)) return { solved: true, moves: d, states: seen.size };
      next.push(ns);
      if (seen.size > cap) return { solved: null, note: '状态上限', states: seen.size };
    }
    cur = next;
  }
  return { solved: false, note: '深度上限', states: seen.size };
}

// ---- 逐关验证 ----
const scrambles = {
  0: [[0, 1], [1, 1], [0, 1], [0, 1], [1, 1], [0, 1]],
  1: [[0, 1], [1, 1], [2, 1], [0, 1], [1, 1], [2, 1], [0, 1], [1, 1]],
  2: [[0, 1], [1, 1], [0, 1], [0, 1]]
};
for (const L of [0, 1, 2]) {
  const C = canonical(L);
  const stats = slotStats(C.bodies);
  const seq = scrambles[L];
  const scrambled = apply(C.bodies, seq);
  const back = apply(scrambled, invert(seq));
  const degenerate = stateKey(scrambled) === stateKey(C.bodies);
  console.log(`=== L${L} === 天体数 ${C.bodies.length} 槽位 ${JSON.stringify(stats)}`);
  console.log(`  打乱序列 ${JSON.stringify(seq)} → 起点是否等于规范构型: ${degenerate}`);
  console.log(`  逆序回放是否精确恢复: ${stateKey(back) === stateKey(C.bodies)}`);
  if (L === 2) console.log('  镜像对称可达性 BFS:', JSON.stringify(bfsMirror(scrambled)));
  // 简单度规：打乱后有多少天体"不在位"
  const cm = {}; C.bodies.forEach(b => { const k = b.type + ':' + b.pos.join(','); cm[k] = (cm[k] || 0) + 1; });
  let off = 0; for (const b of scrambled) { const k = b.type + ':' + b.pos.join(','); if (cm[k] > 0) cm[k]--; else off++; }
  console.log(`  打乱后离位天体数: ${off} / ${C.bodies.length}`);
}