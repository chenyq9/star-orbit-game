// STAR ORBIT 机制验证器（独立新文件，不影响任何现有文件）
// 复刻 index.html 的几何/闸点/旋转语义，用 BFS 检验三关目标是否可达。

function geom(level, W = 1000, H = 1000) {
  const R = 200;
  let centers;
  if (level === 0 || level === 2) {
    centers = [[W / 2 - R / 2, H / 2], [W / 2 + R / 2, H / 2]];
  } else {
    const s3 = Math.sqrt(3);
    centers = [[W / 2 - R / 2, H / 2 + s3 * R / 6], [W / 2 + R / 2, H / 2 + s3 * R / 6], [W / 2, H / 2 - s3 * R / 3]];
  }
  return { R, centers };
}
function pt(centers, R, c, s) {
  const a = s * Math.PI / 6;
  return { x: centers[c][0] + R * Math.cos(a), y: centers[c][1] + R * Math.sin(a) };
}
function findGates(centers, R) {
  const gates = {};
  for (let a = 0; a < centers.length; a++) for (let s = 0; s < 12; s++) {
    const p = pt(centers, R, a, s);
    for (let b = 0; b < centers.length; b++) {
      if (a === b) continue;
      const dx = p.x - centers[b][0], dy = p.y - centers[b][1];
      if (Math.abs(Math.hypot(dx, dy) - R) < R * 0.07) {
        let t = Math.round(Math.atan2(dy, dx) / Math.PI * 6);
        t = ((t % 12) + 12) % 12;
        gates[a + '-' + s] = [b, t];
        break;
      }
    }
  }
  return gates;
}

function rotate(bodies, gates, nRings, ci, dir) {
  const old = bodies.map(b => b.pos.slice());
  for (const b of bodies) if (b.pos[ci] != null) b.pos[ci] = (b.pos[ci] + dir + 12) % 12;
  for (let k = 0; k < bodies.length; k++) {
    const b = bodies[k];
    if (b.pos[ci] == null) continue;
    const ns = b.pos[ci], os = old[k][ci];
    for (let c = 0; c < nRings; c++) if (c !== ci) {
      const before = os == null ? null : gates[ci + '-' + os];
      const after = gates[ci + '-' + ns];
      if (after && after[0] === c) b.pos[c] = after[1];
      else if (before && before[0] === c) b.pos[c] = null;
    }
  }
}

function key(bodies) {
  const groups = {};
  for (const b of bodies) {
    const k = b.type + ':' + b.pos.map(x => x == null ? '_' : x).join(',');
    groups[k] = (groups[k] || 0) + 1;
  }
  return Object.keys(groups).sort().map(k => k + 'x' + groups[k]).join('|');
}
function clone(bodies) { return bodies.map(b => ({ type: b.type, pos: b.pos.slice() })); }

// 关卡构造：返回 {bodies, goal(state)=>bool, desc}
function buildLevel(level) {
  const { R, centers } = geom(level);
  const gates = findGates(centers, R);
  const nRings = centers.length;
  const mk = (type, slots) => { const p = Array(nRings).fill(null); for (const k in slots) p[+k] = slots[k]; return { type, pos: p }; };
  let bodies = [], goal = null, desc = '';

  if (level === 0) {
    // 起点：颜色整体互换（蓝在右轨、橙在左轨），两颗潮汐体位于交点
    const BLUE = [0, 1, 3, 4, 5, 6, 7, 8, 9, 11];
    const ORANGE = [0, 1, 2, 3, 5, 6, 7, 9, 10, 11];
    BLUE.forEach(s => bodies.push(mk(0, { 1: s })));
    ORANGE.forEach(s => bodies.push(mk(1, { 0: s })));
    bodies.push(mk(2, { 0: 2, 1: 4 }), mk(2, { 0: 10, 1: 8 }));
    desc = '蓝色全部在左轨、橙色全部在右轨、两颗潮汐体在交点';
    goal = st => st.every(b => {
      if (b.type === 2) return b.pos[0] != null && b.pos[1] != null;
      return b.pos[0] != null && b.pos[1] == null;
    });
    goal = st => st.every(b => {
      if (b.type === 2) return b.pos[0] != null && b.pos[1] != null;
      if (b.type === 0) return b.pos[0] != null && b.pos[1] == null;
      return b.pos[1] != null && b.pos[0] == null;
    });
  }
  if (level === 1) {
    // 三轨：每轨 12 槽，6 个交点双占体 + 24 个单体
    const occupied = {};
    for (let c = 0; c < 3; c++) for (let s = 0; s < 12; s++) {
      const k = c + '-' + s;
      if (occupied[k]) continue;
      const b = mk(c, { [c]: s });
      const g = gates[k];
      if (g && !occupied[g[0] + '-' + g[1]]) { b.pos[g[0]] = g[1]; occupied[g[0] + '-' + g[1]] = 1; }
      occupied[k] = 1;
      bodies.push(b);
    }
    desc = '每条轨道 12 槽全部由同色天体占据';
    goal = st => st.every(b => {
      const occ = [];
      b.pos.forEach((s, c) => { if (s != null) occ.push(c); });
      return occ.length === 1 && occ[0] === b.type;
    });
  }
  if (level === 2) {
    bodies = [mk(0, { 0: 10, 1: 8 }), mk(1, { 0: 2, 1: 4 }), mk(0, { 0: 6 }), mk(1, { 1: 0 })];
    desc = '蓝在左右外侧点、橙在上下交点（镜像对称）';
    goal = st => {
      const singles = st.filter(b => b.pos.filter(x => x != null).length === 1);
      const doubles = st.filter(b => b.pos.filter(x => x != null).length > 1);
      if (singles.length !== 2 || doubles.length !== 2) return false;
      const blue = singles.find(b => b.type === 0), orange = singles.find(b => b.type === 1);
      if (!blue || !orange) return false;
      return blue.pos[1] === 0 && orange.pos[0] === 6;
    };
  }
  return { bodies, goal, gates, nRings, desc, centers, R };
}

function bfs(level, cap = 400000) {
  const { bodies, goal, gates, nRings, desc } = buildLevel(level);
  const start = clone(bodies);
  if (goal(start)) return { level, desc, solved: true, moves: 0, note: '起点即目标（平凡）' };
  const seen = new Set([key(start)]);
  let frontier = [start], depth = 0;
  const t0 = Date.now();
  while (frontier.length) {
    depth++;
    const next = [];
    for (const st of frontier) {
      for (let c = 0; c < nRings; c++) for (const d of [1, -1]) {
        const ns = clone(st);
        rotate(ns, gates, nRings, c, d);
        const k = key(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        if (goal(ns)) return { level, desc, solved: true, moves: depth, states: seen.size, ms: Date.now() - t0 };
        next.push(ns);
        if (seen.size > cap) return { level, desc, solved: null, note: '超过搜索上限', states: seen.size, ms: Date.now() - t0 };
      }
    }
    frontier = next;
  }
  return { level, desc, solved: false, states: seen.size, ms: Date.now() - t0, note: '目标不可达' };
}

for (const L of [0, 1, 2]) {
  const g = geom(L);
  console.log('=== 关卡', L, '=== 轨道数', g.centers.length);
  console.log('闸点:', JSON.stringify(findGates(g.centers, g.R)));
  console.log('BFS:', JSON.stringify(bfs(L)));
}
