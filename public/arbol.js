function renderTree(team){
 const host=document.getElementById("treeView");
 if(!host || !team) return;
 const nodes=team.nodes||[];
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const roots=["NO","NE","SO","SE"].map(id=>byId.get(id)).filter(Boolean);
 const gap=76, levelGap=88, radius=10;
 const childrenOf=n=>nodes.filter(x=>x.id.startsWith(n.id+"-") && x.id.slice(n.id.length+1).indexOf("-")===-1);
 function span(n){
   const kids=n.status==="internal"?childrenOf(n):[];
   if(!kids.length) return 1;
   return kids.reduce((sum,k)=>sum+span(k),0);
 }
 const totalUnits=Math.max(4,roots.reduce((sum,n)=>sum+span(n),0));
 const width=Math.max(420,totalUnits*gap+80);
 const positions=[];
 function place(n, start, depth){
   const units=span(n), x=(start+units/2)*gap+40, y=48+depth*levelGap;
   positions.push({n,x,y});
   const kids=n.status==="internal"?childrenOf(n):[];
   let cursor=start;
   kids.forEach(k=>{place(k,cursor,depth+1);cursor+=span(k);});
 }
 let cursor=(totalUnits-roots.reduce((sum,n)=>sum+span(n),0))/2;
 roots.forEach(n=>{place(n,cursor,1);cursor+=span(n);});
 const rootX=width/2, rootY=35;
 const maxDepth=positions.reduce((m,p)=>Math.max(m,p.y),rootY);
 const height=maxDepth+62;
 const byNode=new Map(positions.map(p=>[p.n.id,p]));
 let edges="";
 positions.forEach(p=>{
   const parentId=p.n.id.includes("-")?p.n.id.slice(0,p.n.id.lastIndexOf("-")):"";
   const parent=parentId?byNode.get(parentId):{x:rootX,y:rootY};
   if(parent) edges+=`<line class="tree-edge" x1="${parent.x}" y1="${parent.y+radius}" x2="${p.x}" y2="${p.y-radius}"/>`;
 });
 const dots=positions.map(p=>{
   const n=p.n, wrong=n.isCorrect===false;
   const state=n.status==="internal"?"Subdividido":n.status==="leaf"?"Hoja":"Pendiente";
   const color=wrong?"#b91c1c":n.status==="internal"?"#17365D":n.status==="leaf"?"#16803d":"#9ca3af";
   const label=n.id.split("-").pop();
   const verdict=wrong?" · Error":n.isCorrect===true?" · Correcto":"";
   return `<g class="tree-point" tabindex="0"><title>${n.id} — ${state}${verdict}</title><circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${color}"/><text class="tree-point-label" x="${p.x}" y="${p.y+27}">${label}</text><text class="tree-point-state" x="${p.x}" y="${p.y+41}">${wrong?"Incorrecto":state}</text></g>`;
 }).join("");
 host.innerHTML=`<div class="tree-visual-wrap"><svg class="tree-visual" viewBox="0 0 ${width} ${height}" role="img" aria-label="Árbol Quadtree del equipo"><g>${edges}</g><g class="tree-root-point"><circle cx="${rootX}" cy="${rootY}" r="13"/><text x="${rootX}" y="${rootY-21}">Imagen completa</text><text class="tree-root-size" x="${rootX}" y="${rootY+29}">Raíz 16×16</text></g>${dots}</svg></div>`;
 document.getElementById("score").textContent=team.points??0;
 document.getElementById("pending").textContent=nodes.filter(n=>n.status==="pending").length;
 document.getElementById("leaves").textContent=nodes.filter(n=>n.status==="leaf").length;
}
