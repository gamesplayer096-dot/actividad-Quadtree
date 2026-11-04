
const socket=io();
const qs=new URLSearchParams(location.search);
const codeFromUrl=qs.get("code")||"";
const $=id=>document.getElementById(id);
let state=null, myTeam=null, myRole=null, lastFeedback=null;
const PIXELS=[
"0000001111110101","0000001111111010","0000001111110101","0000001111111010",
"0101111100000000","1010111100000000","0101111111110000","1010111111110000",
"0011000001011111","0011000010101111","0011000001011111","0011000010101111",
"1111010100000000","1111101000000000","1111010100001111","1111101000001111"
].map(s=>s.split("").map(Number));
[[0,6],[1,6],[2,6],[3,6],[4,0],[4,1],[5,0],[5,1],[8,8],[8,9],[9,8],[9,9],[12,0],[12,1],[13,0],[13,1]].forEach(([r,c])=>PIXELS[r][c]=2);
const colors={0:"#fff",1:"#111",2:"#8b0000"};
function uniform(n){const v=PIXELS[n.r][n.c];for(let r=n.r;r<n.r+n.size;r++)for(let c=n.c;c<n.c+n.size;c++)if(PIXELS[r][c]!==v)return false;return true}
function children(n){const s=n.size/2;return[
{id:n.id+"-NO",owner:n.owner,r:n.r,c:n.c,size:s},{id:n.id+"-NE",owner:n.owner,r:n.r,c:n.c+s,size:s},
{id:n.id+"-SO",owner:n.owner,r:n.r+s,c:n.c,size:s},{id:n.id+"-SE",owner:n.owner,r:n.r+s,c:n.c+s,size:s}]}
function regionSvg(n,cell=22){let out="",w=n.size*cell;for(let r=0;r<n.size;r++)for(let c=0;c<n.size;c++)out+=`<rect x="${c*cell}" y="${r*cell}" width="${cell}" height="${cell}" fill="${colors[PIXELS[n.r+r][n.c+c]]}" stroke="#64748b" stroke-width=".6"/>`;return `<svg viewBox="0 0 ${w} ${w}" width="${w}">${out}</svg>`}
function boardSvg(team){const s=24;let out="";for(let r=0;r<16;r++)for(let c=0;c<16;c++)out+=`<rect x="${c*s}" y="${r*s}" width="${s}" height="${s}" fill="${colors[PIXELS[r][c]]}" stroke="#94a3b8" stroke-width=".5"/>`;out+=`<path d="M 192 0 V 384 M 0 192 H 384" stroke="#39ff14" stroke-width="3"/>`;team.nodes.filter(n=>n.status==="internal").forEach(n=>{let x=n.c*s,y=n.r*s,w=n.size*s,mx=x+w/2,my=y+w/2;out+=`<path d="M ${mx} ${y} V ${y+w} M ${x} ${my} H ${x+w}" stroke="#39ff14" stroke-width="2.6" fill="none"/>`});return `<svg viewBox="0 0 384 384">${out}</svg>`}
function setNotice(message,type="error"){const el=$("notice");if(el){el.textContent=message;el.className="notice "+type}}
socket.on("state",s=>{state=s;refresh()});
socket.on("notice",m=>setNotice(m));
socket.on("feedback",f=>{lastFeedback=f;setNotice(f.message,f.ok?"success":"error")});
socket.on("created",d=>{state=d.state;const u=`${location.origin}`;if($("createdInfo")){$("createdInfo").classList.remove("hidden");$("roomCode").textContent=d.code;$("projectorLink").href=`${u}/proyector.html?code=${d.code}`;$("playerLink").href=`${u}/jugador.html?code=${d.code}`;$("teamsLink").href=`${u}/equipos.html?code=${d.code}`;$("createdUrl").textContent=`${u}/jugador.html?code=${d.code}`}refresh()});
socket.on("joined",d=>{state=d.state;myTeam=d.teamIndex;myRole=d.role;refresh()});
function refresh(){if(typeof renderPage==="function")renderPage()}
function joinViewer(kind){const code=($("code")?.value||codeFromUrl).trim().toUpperCase();if(!code)return setNotice("Escribe el código de la sala.");socket.emit("joinRoom",{code,kind})}
