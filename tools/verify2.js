// STAR ORBIT 目标可行性验证 v2（独立新文件，不修改任何已有文件）
const fs = require('fs');
const src = fs.readFileSync('/sdcard/Download/star-orbit-game/tools/solver.js', 'utf8');
eval(src.slice(0, src.indexOf('function bfs(')));

let gates;
function prep(level) {
  const g = geom(level);
  gates = findGates(g.centers, g.R);
  return { nRings: g.centers.length, gates };
}
const G = (c, s) => gates[c + '-' + s];
const isGate = (c, s) => !!G(c, s);
const ringsOf = b => { const r = []; b.pos.forEach((s, c) => { if (s != null) r.push(c); }); return r; };
const mk = (n, t, o) => { const p = Array(n).fill(null); for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
function stateKey(st) { const g = {}; for (const b of st) { const k = b.type + ':' + b.pos.join(','); g[k] = (g[k] || 0) + 1; } return Object.keys(g).sort().map(k => k + '#' + g[k]).join('|'); }

function beam(L, width, maxDepth) {
  const t0 = Date.now();
  const start = clone(L.bodies);
  if (L.goal(start)) return { solved: true, moves: 0, note: '起点即目标(退化)' };
  const seen = new Set([stateKey(start)]);
  let cur = [start], best = L.h(start), trace = [];
  for (let d = 1; d <= maxDepth; d++) {
    const cand = [];
    for (const st of cur) for (let c = 0; c < L.nRings; c++) for (const dir of [1, -1]) {
      const ns = clone(st); rotate(ns, gates, L.nRings, c, dir);
      const k = stateKey(ns); if (seen.has(k)) continue; seen.add(k);
      if (L.goal(ns)) return { solved: true, moves: d, states: seen.size, ms: Date.now() - t0 };
      cand.push({ st: ns, h: L.h(ns) });
    }
    if (!cand.length) return { solved: false, note: '状态穷尽', depth: d, states: seen.size, ms: Date.now() - t0 };
    cand.sort((a, b) => a.h - b.h);
    cur = cand.slice(0, Math.min(width, cand.length)).map(x => x.st);
    best = Math.min(best, cand[0].h);
    trace.push(cand[0].h);
    if (seen.size > 300000) return { solved: null, note: '状态上限', best, states: seen.size, ms: Date.now() - t0 };
  }
  return { solved: false, note: '深度上限', best, states: seen.size, ms: Date.now() - t0, hTrace: trace.slice(0, 12) };
}

// ---------- L0：蓝归左轨 / 橙归右轨 / 潮汐体留在交点 ----------
function L0() {
  const { nRings } = prep(0);
  const bodies = [];
  // 紫色潮汐体占据两个交点对
  bodies.push(mk(2, 2, { 0: 2, 1: 4 }), mk(2, 2, { 0: 10, 1: 8 }));
  // 左轨空闲槽 0,1,3,4,5,6,7,8,9,11；右轨空闲槽 0,1,2,3,5,6,7,9,10,11
  const blueL = [0, 1, 3, 4, 5, 6], blueR = [0, 1, 2, 3];
  const orangeL = [7, 8, 9, 11], orangeR = [5, 6, 7, 9, 10, 11];
  blueL.forEach(s => bodies.push(mk(2, 0, { 0: s })));
  blueR.forEach(s => bodies.push(mk(2, 0, { 1: s })));
  orangeL.forEach(s => bodies.push(mk(2, 1, { 0: s })));
  orangeR.forEach(s => bodies.push(mk(2, 1, { 1: s })));
  const h = st => { let v = 0; for (const b of st) { const r = ringsOf(b); if (b.type === 2) { if (r.length !== 2) v += 2; } else if (!(r.length === 1 && r[0] === b.type)) v++; } return v; };
  return { bodies, h, goal: st => h(st) === 0, nRings, name: 'L0 分离' };
}

// ---------- L1：六颗枢纽体全部回到交点 ----------
function L1() {
  const { nRings } = prep(1);
  const bodies = [];
  const gatePairs = [];
  for (const k in gates) { const [c, s] = k.split('-').map(Number); const [c2, s2] = gates[k]; if (c < c2) gatePairs.push([[c, s], [c2, s2]]); }
  gatePairs.forEach(([a, b]) => { const o = {}; o[a[0]] = a[1]; o[b[0]] = b[1]; bodies.push(mk(3, 2, o)); });
  const nonGate = c => { const r = []; for (let s = 0; s < 12; s++) if (!isGate(c, s)) r.push(s); return r; };
  const free = [nonGate(0), nonGate(1), nonGate(2)];
  const take = (c, n, from) => free[c].splice(free[c].indexOf(from), 1) && from;
  const blue = [[0, 4], [1, 4], [2, 4]], orange = [[0, 4], [1, 4], [2, 4]];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 4; i++) { const s = free[c].pop(); blue[c][1] = 4; bodies.push(mk(3, 0, { [c]: s })); }
    for (let i = 0; i < 4; i++) { const s = free[c].pop(); bodies.push(mk(3, 1, { [c]: s })); }
  }
  const h = st => { let v = 0; for (const b of st) if (b.type === 2 && ringsOf(b).length !== 2) v++; return v; };
  return { bodies, h, goal: st => h(st) === 0, nRings, name: 'L1 枢纽归位' };
}

// ---------- L2：两种镜像终局 ----------
function L2(goalKind) {
  const { nRings } = prep(2);
  const bodies = [mk(2, 0, { 0: 10, 1: 8 }), mk(2, 1, { 0: 2, 1: 4 }), mk(2, 0, { 0: 6 }), mk(2, 1, { 1: 0 })];
  const singles = st => st.filter(b => ringsOf(b).length === 1);
  const h = st => {
    const s = singles(st);
    let v = 0;
    if (goalKind === 'A') { // 蓝在左右外侧，橙在上下交点
      const blueOut = s.filter(b => b.type === 0 && ((b.pos[0] === 6) || (b.pos[1] === 0))).length;
      const orangeGate = st.filter(b => b.type === 1 && ringsOf(b).length === 2).length;
      v = (2 - blueOut) + (2 - orangeGate) + (s.length - 2 > 0 ? s.length - 2 : 0);
    } else { // B：蓝在上下交点，橙在左右外侧
      const orangeOut = s.filter(b => b.type === 1 && ((b.pos[0] === 6) || (b.pos[1] === 0))).length;
      const blueGate = st.filter(b => b.type === 0 && ringsOf(b).length === 2).length;
      v = (2 - orangeOut) + (2 - blueGate) + (s.length - 2 > 0 ? s.length - 2 : 0);
    }
    return v;
  };
  const goal = st => {
    const s = singles(st), d = st.filter(b => ringsOf(b).length === 2);
    if (s.length !== 2 || d.length !== 2) return false;
    const outer0 = b => b.pos[0] === 6, outer1 = b => b.pos[1] === 0;
    if (goalKind === 'A') return s.every(b => b.type === 0 && (outer0(b) || outer1(b))) && d.every(b => b.type === 1);
    return s.every(b => b.type === 1 && (outer0(b) || outer1(b))) && d.every(b => b.type === 0);
  };
  return { bodies, h, goal, nRings, name: 'L2 镜像' + goalKind };
}

console.log('L0:', JSON.stringify(beam(L0(), 400, 30)));
console.log('L1:', JSON.stringify(beam(L1(), 400, 30)));
console.log('L2A:', JSON.stringify(beam(L2('A'), 400, 30)));
console.log('L2B:', JSON.stringify(beam(L2('B'), 400, 30)));