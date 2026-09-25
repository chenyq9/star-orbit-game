from pathlib import Path
p=Path('/sdcard/Download/star-orbit-game/app/src/main/assets/index.html')
s=p.read_text()
s=s.replace("let W,H,D=1,stars=[],level=-1,moves=0,drag=null,visual=[],rings=[],bodies=[],gates={};", "let W,H,D=1,stars=[],level=-1,moves=0,drag=null,visual=[],rings=[],bodies=[],gates={},targetKey='',solutionUpper=0;")
s=s.replace("function body(type,slots){let p=Array(rings.length).fill(null);Object.keys(slots).forEach(k=>p[+k]=slots[k]);return{type,pos:p}}", "function body(type,slots){let p=Array(rings.length).fill(null);Object.keys(slots).forEach(k=>p[+k]=slots[k]);return{type,pos:p}}function stateKey(){let g={};for(let b of bodies){let k=b.type+':'+b.pos.map(x=>x==null?'_':x).join(',');g[k]=(g[k]||0)+1}return Object.keys(g).sort().map(k=>k+'#'+g[k]).join('|')}const SCRAMBLES=[[[0,1],[1,1],[0,1],[0,1],[1,1],[0,1]],[[0,1],[1,1],[2,1],[0,1],[1,1],[2,1],[0,1],[1,1]],[[0,1],[1,1],[0,1],[0,1]]];")
needle="if(n===2){bodies=[body(0,{0:10,1:8}),body(1,{0:2,1:4}),body(0,{0:6}),body(1,{1:0})]}\ndocument.querySelector"
repl="if(n===2){bodies=[body(0,{0:10,1:8}),body(1,{0:2,1:4}),body(0,{0:6}),body(1,{1:0})]}\n// 先保存规范终局，再施加固定可逆打乱；反向操作序列即构成性解。\ntargetKey=stateKey();solutionUpper=SCRAMBLES[n].length;for(const [c,d] of SCRAMBLES[n])rotate(c,d,true);moves=0;\ndocument.querySelector"
if needle not in s: raise SystemExit('setup needle missing')
s=s.replace(needle,repl)
s=s.replace("function rotate(ci,dir){", "function rotate(ci,dir,silent=false){")
s=s.replace("moves++;updateHUD();pulse(12);if(check())setTimeout(win,350)", "if(!silent){moves++;updateHUD();pulse(12);if(check())setTimeout(win,350)}")
start=s.index("function check(){")
end=s.index("function updateHUD",start)
s=s[:start]+"function check(){return stateKey()===targetKey}\n"+s[end:]
s=s.replace("String(moves).padStart(2,'0')+' 次校准'", "String(moves).padStart(2,'0')+' 次校准 · 保证解≤'+solutionUpper")
p.write_text(s)
print('patched',p,'bytes',p.stat().st_size)
