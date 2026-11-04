const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "equipos.html")));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const TEAM_NAMES = ["Alfa", "Beta", "Gamma"];
const ROLES = ["NO", "NE", "SO", "SE"];
const PIXELS = [
"0000001111110101","0000001111111010","0000001111110101","0000001111111010",
"0101111100000000","1010111100000000","0101111111110000","1010111111110000",
"0011000001011111","0011000010101111","0011000001011111","0011000010101111",
"1111010100000000","1111101000000000","1111010100001111","1111101000001111"
].map(row => row.split("").map(Number));
[[0,6],[1,6],[2,6],[3,6],[4,0],[4,1],[5,0],[5,1],[8,8],[8,9],[9,8],[9,9],[12,0],[12,1],[13,0],[13,1]].forEach(([r,c]) => PIXELS[r][c] = 2);

function makeInitialTree() {
  return ["NO","NE","SO","SE"].map((id,i) => ({
    id, owner:id, r:i>=2?8:0, c:i%2?8:0, size:8,
    status:"pending", verifiedHetero:false
  }));
}
function createRoom() {
  let code;
  do { code = crypto.randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(code));
  const room = {
    code, createdAt: Date.now(), teams: TEAM_NAMES.map(name => ({
      name, points:0, nodes:makeInitialTree(), players:{NO:null,NE:null,SO:null,SE:null}
    }))
  };
  rooms.set(code, room);
  return room;
}
function uniform(n) {
  const first = PIXELS[n.r][n.c];
  for (let r=n.r;r<n.r+n.size;r++) for (let c=n.c;c<n.c+n.size;c++) if (PIXELS[r][c] !== first) return false;
  return true;
}
function kids(n) {
  const s=n.size/2;
  return [
    {id:n.id+"-NO",owner:n.owner,r:n.r,c:n.c,size:s,status:"pending",verifiedHetero:false},
    {id:n.id+"-NE",owner:n.owner,r:n.r,c:n.c+s,size:s,status:"pending",verifiedHetero:false},
    {id:n.id+"-SO",owner:n.owner,r:n.r+s,c:n.c,size:s,status:"pending",verifiedHetero:false},
    {id:n.id+"-SE",owner:n.owner,r:n.r+s,c:n.c+s,size:s,status:"pending",verifiedHetero:false}
  ];
}
function publicState(room) {
  return {code:room.code, teams:room.teams.map(t=>({
    name:t.name, points:t.points, nodes:t.nodes,
    players:Object.fromEntries(Object.entries(t.players).map(([role,p])=>[role,p?{name:p.name,online:p.online}:null]))
  }))};
}
function broadcast(room) { io.to(room.code).emit("state", publicState(room)); }
function emitError(socket,msg) { socket.emit("notice",msg); }

io.on("connection", socket => {
  socket.on("createRoom", ({adminName}={}) => {
    const room=createRoom();
    socket.data.room=room.code; socket.data.kind="admin";
    socket.join(room.code);
    socket.emit("created", {code:room.code, state:publicState(room)});
  });

  socket.on("joinRoom", ({code,kind,name,teamIndex,role}={}) => {
    code=String(code||"").trim().toUpperCase();
    const room=rooms.get(code);
    if(!room) return emitError(socket,"No encontramos esa sala. Revisa el código.");
    if(kind==="player") {
      if(!Number.isInteger(teamIndex)||teamIndex<0||teamIndex>2||!ROLES.includes(role)) return emitError(socket,"Selecciona un equipo y un cuadrante válidos.");
      const team=room.teams[teamIndex], existing=team.players[role];
      const playerName=String(name||"Jugador").trim().slice(0,28);
      // Si el mismo jugador vuelve con el mismo nombre, toma el puesto anterior
      // aunque la conexión vieja todavía no haya terminado de expirar.
      const samePlayer=existing && existing.name.trim().toLocaleLowerCase()===playerName.toLocaleLowerCase();
      if(existing && existing.online && existing.socketId!==socket.id && !samePlayer)
        return emitError(socket,`El puesto ${role} del equipo ${team.name} ya está ocupado. Si es tu reconexión, entra usando el mismo nombre que tenías.`);
      team.players[role]={name:playerName,socketId:socket.id,online:true};
      socket.data.teamIndex=teamIndex;socket.data.role=role;
    }
    socket.data.room=code;socket.data.kind=kind||"viewer";socket.join(code);
    socket.emit("joined",{state:publicState(room),kind:socket.data.kind,teamIndex:socket.data.teamIndex,role:socket.data.role});
    broadcast(room);
  });

  socket.on("classify", ({nodeId,homogeneous}={}) => {
    const room=rooms.get(socket.data.room); if(!room||socket.data.kind!=="player") return;
    const team=room.teams[socket.data.teamIndex], role=socket.data.role;
    const node=team.nodes.find(n=>n.id===nodeId && n.owner===role && n.status==="pending");
    if(!node || node.verifiedHetero) return emitError(socket,"Esa región ya no está disponible.");
    const actual=uniform(node);
    const choseHomogeneous=Boolean(homogeneous);
    node.decision=choseHomogeneous?"homogeneous":"heterogeneous";
    node.isCorrect=(choseHomogeneous===actual);
    team.points += node.isCorrect ? 10 : -2;

    if(choseHomogeneous) {
      // La respuesta del estudiante manda: aunque sea incorrecta, se registra como hoja.
      node.status="leaf";
      socket.emit("feedback",{ok:node.isCorrect,message:node.isCorrect
        ?"¡Correcto! La región queda como hoja. +10 puntos."
        :"Respuesta registrada: queda como hoja, aunque la región necesitaba subdividirse. -2 puntos."});
    } else if(node.size<=1) {
      // Un píxel ya no puede subdividirse. Se registra el error y se deja como terminal.
      node.status="leaf";
      socket.emit("feedback",{ok:false,message:"Respuesta registrada, pero una región de 1×1 ya no puede subdividirse. Se deja como hoja. -2 puntos."});
    } else {
      // Se subdivide porque el jugador decidió que era heterogénea.
      node.verifiedHetero=true;
      socket.emit("feedback",{ok:node.isCorrect,message:node.isCorrect
        ?"¡Correcto! Es heterogénea. Ahora clasifica sus cuatro hijos. +10 puntos."
        :"Respuesta registrada: se subdivide según tu decisión. Continúa con los cuatro hijos. -2 puntos."});
    }
    broadcast(room);
  });

  socket.on("classifyChildren", ({nodeId,answers}={}) => {
    const room=rooms.get(socket.data.room); if(!room||socket.data.kind!=="player") return;
    const team=room.teams[socket.data.teamIndex], role=socket.data.role;
    const node=team.nodes.find(n=>n.id===nodeId&&n.owner===role&&n.status==="pending"&&n.verifiedHetero);
    if(!node || !Array.isArray(answers)) return emitError(socket,"No se pudo registrar esa subdivisión.");
    const children=kids(node);
    if(answers.length!==4 || answers.some(a=>!["H","X"].includes(a))) return emitError(socket,"Clasifica los cuatro cuadrantes.");

    let correctCount=0, wrongCount=0;
    node.status="internal"; node.verifiedHetero=false;
    children.forEach((child,i)=>{
      const choseHomogeneous=answers[i]==="H";
      const actual=uniform(child);
      child.decision=choseHomogeneous?"homogeneous":"heterogeneous";
      child.isCorrect=(choseHomogeneous===actual);
      if(child.isCorrect) correctCount++; else wrongCount++;
      if(choseHomogeneous) {
        child.status="leaf";
      } else {
        child.status="pending";
        child.verifiedHetero=true;
      }
      team.nodes.push(child);
    });
    team.points += correctCount*5 - wrongCount*2;
    socket.emit("feedback",{ok:wrongCount===0,message:`Respuestas registradas. ${correctCount} correctas y ${wrongCount} incorrectas. ${correctCount*5-wrongCount*2>=0?"+":""}${correctCount*5-wrongCount*2} puntos. Puedes continuar.`});
    broadcast(room);
  });

  socket.on("resetTeam", () => {
    const room=rooms.get(socket.data.room); if(!room||socket.data.kind!=="admin") return;
    room.teams.forEach(t=>{t.points=0;t.nodes=makeInitialTree()});broadcast(room);
  });

  socket.on("disconnect", () => {
    const room=rooms.get(socket.data.room); if(!room) return;
    if(socket.data.kind==="player") {
      const t=room.teams[socket.data.teamIndex], role=socket.data.role, p=t&&t.players[role];
      if(p&&p.socketId===socket.id) p.online=false;
      broadcast(room);
    }
  });
});

server.listen(PORT,()=>console.log(`QUADTREE ARENA escuchando en ${PORT}`));
