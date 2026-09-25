// STAR ORBIT 目标可行性求解器（独立新文件，不改动任何现有文件）
// 用束搜索 + 启发式求"最短可解序列"，同时检验若干结构不变量。
const fs = require('fs');
const src = fs.readFileSync('/sdcard/Download/star-orbit-game/tools/solver.js', 'utf8');
// 复用 solver.js 的几何/闸点/旋转定义（截取到 bfs 定义之前）
const cut = src.indexOf('function bfs(');
eval(src.slice(0, cut));

function isGate(c, s) { return !!gates[gateKey0(c, s)]; }
let gates, gateKey0;
function prep(level) {
  const g = geom(level);
  gates = findGates(g.centers, g.R);
  gateKey0 = (c, s) => c + '-' + s;
  return { centers: g.centers, R: g.R, nRings: g.centers.length, gates };
}
function occRings(b) { const r = []; b.pos.forEach((s, c) => { if (s != null) r.push(c); }); return r; }

// ---------- 关卡 0 ----------
function L0() {
  const { nRings } = prep(0);
  const mk = (t, o) => { const p = [null, null]; for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
  const bodies = [];
  for (const s of [0, 1, 3, 4, 5, 6, 7, 8, 9, 11]) bodies.push(mk(0, { 0: s }));
  for (const s of [0, 1, 2, 3, 5, 6, 7, 9, 10, 11]) bodies.push(mk(1, { 1: s }));
  bodies.push(mk(2, { 0: 2, 1: 4 }), mk(2, { 0: 10, 1: 8 }));
  const h = st => {
    let v = 0;
    for (const b of st) {
      const r = occRings(b);
      if (b.type === 2) { if (r.length !== 2) v += 2; }
      else { if (!(r.length === 1 && r[0] === b.type)) v += 1; }
    }
    return v;
  };
  const goal = st => h(st) === 0;
  return { bodies, h, goal, nRings, name: 'L0 各归其轨' };
}

// ---------- 关卡 1 ----------
// 目标 G1：清除所有交点——每颗天体都落在非交点槽位，且槽位所属轨道 == 天体颜色
function L1() {
  const { nRings } = prep(1);
  const mk = (t, o) => { const p = [null, null, null]; for (const k in o) p[+k] = o[k]; return { type: t, pos: p }; };
  const occupied = {}, bodies = [];
  for (let c = 0; c < 3; c++) for (let s = 0; s < 12; s++) {
    const k = c + '-' + s;
    if (occupied[k]) continue;
    const b = mk(c, { [c]: s });
    const g = gates[k];
    if (g && !occupied[g[0] + '-' + g[1]]) { b.pos[g[0]] = g[1]; occupied[g[0] + '-' + g[1]] = 1; }
    occupied[k] = 1;
    bodies.push(b);
  }
  const h = st => {
    let v = 0;
    for (const b of st) {
      const r = occRings(b);
      if (r.length > 1) v += 2;                 // 仍在交点
      else if (r[0] !== b.type) v += 1;          // 站错轨道
    }
    return v;
  };
  const goal = st => h(st) === 0;
  return { bodies, h, goal, nRings, name: 'L1 清除交点' };
}

function stateKey(st) {
  const g = {};
  for (const b of st) { const k = b.type + ':' + b.pos.join(','); g[k] = (g[k] || 0) + 1; }
  return Object.keys(g).sort().map(k => k + '#' + g[k]).join('|');
}
function beam(L, width = 300, maxDepth = 40) {
  const t0 = Date.now();
  let start = clone(L.bodies);
  if (L.goal(start)) return { solved: true, moves: 0, note: '起点即目标' };
  const seen = new Set([stateKey(start)]);
  let cur = [start], best = L.h(start);
  for (let d = 1; d <= maxDepth; d++) {
    const cand = [];
    for (const st of cur) {
      for (let c = 0; c < L.nRings; c++) for (const dir of [1, -1]) {
        const ns = clone(st);
        rotate(ns, gates, L.nRings, c, dir);
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        if (L.goal(ns)) return { solved: true, moves: d, states: seen.size, ms: Date.now() - t0 };
        cand.push({ st: ns, h: L.h(ns) });
      }
    }
    if (!cand.length) return { solved: false, note: '穷尽', depth: d, states: seen.size, ms: Date.now() - t0 };
    cand.sort((a, b) => a.h - b.h);
    const w = Math.min(width, cand.length);
    cur = cand.slice(0, w).map(x => x.st);
    best = Math.min(best, cand[0].h);
    if (d % 10 === 0) console.log('  深度', d, '剩余违规', cand[0].h, '已探索', seen.size);
    if (cand[0].h === best && cand[0].h <= 0) break;
  }
  return { solved: false, note: '达到深度上限', bestViolations: best, states: seen.size, ms: Date.now() - t0 };
}

// 不变量检查：整圈旋转是否等于恒等
prep(0);
{
  const L = L0();
  const a = clone(L.bodies);
  for (let i = 0; i < 12; i++) rotate(a, gates, 2, 0, 1);
  console.log('L0: 环0整圈后是否等于原状态 =', stateKey(a) === stateKey(L.bodies));
  const b = clone(L.bodies);
  for (let i = 0; i < 12; i++) rotate(b, gates, 2, 1, 1);
  console.log('L0: 环1整圈后是否等于原状态 =', stateKey(b) === stateKey(L.bodies));
}

for (const [name, f] of [['L0', L0], ['L1', L1]]) {
  const L = f();
  console.log('===', name, '=== 天体数', L.bodies.length, '初始违规', L.h(L.bodies));
  console.log('结果:', JSON.stringify(beam(L)));
}