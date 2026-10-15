"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens=["input","validation","table","polynomial","result"];
const state={method:"newton",nodes:[],xEval:0,M:0,exact:null,table:[],coeffs:[],poly:[],screen:0,h:null};

function fmt(v,d=8){if(Math.abs(v)<1e-12)return"0";if(Math.abs(v-Math.round(v))<1e-10)return String(Math.round(v));return Number(v.toFixed(d)).toString()}
function factorial(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function polyMul(a,b){const o=Array(a.length+b.length-1).fill(0);a.forEach((x,i)=>b.forEach((y,j)=>o[i+j]+=x*y));return o}
function polyEval(c,x){return c.reduceRight((s,a)=>s*x+a,0)}
function polyText(c){const p=[];for(let k=c.length-1;k>=0;k--){if(Math.abs(c[k])<1e-11)continue;const a=Math.abs(c[k]),term=k===0?fmt(a):`${Math.abs(a-1)<1e-10?"":fmt(a)}x${k>1?`<sup>${k}</sup>`:""}`;p.push({s:c[k]<0?"−":"+",term})}return p.length?p.map((q,i)=>`${i===0&&q.s==="+"?"":q.s+" "}${q.term}`).join(" "):"0"}
function currentMethod(){return $("input[name=method]:checked").value}
function count(){return Number($("#nodeCount").value)}
function degree(){return state.nodes.length-1}

function renderRows(n,values=[]){$("#nodeCount").value=String(n);$("#nodeRows").innerHTML=Array.from({length:n},(_,i)=>`<div class="node-label">Punto ${i}</div><input id="x${i}" type="number" step="any" value="${values[i]?.x??""}"><input id="y${i}" type="number" step="any" value="${values[i]?.y??""}">`).join("")}
function example(){
  const preset=$("#exampleSelect").value;
  if(preset==="task"){selectMethod("newton");renderRows(4,[{x:1,y:45},{x:2,y:65},{x:4,y:110},{x:7,y:220}]);$("#xEval").value=5}
  else if(preset==="class"){selectMethod("newton");renderRows(3,[{x:-1,y:15},{x:0,y:8},{x:3,y:-1}]);$("#xEval").value=1}
  else if(preset==="newton"){selectMethod("newton");renderRows(3,[{x:0,y:1.3},{x:.5,y:2.5},{x:1,y:.9}]);$("#xEval").value=.8}
  else if(preset==="gregory"){selectMethod("gregory");renderRows(4,[{x:1,y:2},{x:2,y:5},{x:3,y:10},{x:4,y:17}]);$("#xEval").value=2.5}
  else{selectMethod("error");renderRows(3,[{x:.1,y:2.82},{x:.2,y:2.67},{x:.4,y:2.43}]);$("#xEval").value=.25;$("#maxDerivative").value=16;$("#exactValue").value=2.6}
}
function selectMethod(method){const radio=$(`input[name=method][value=${method}]`);radio.checked=true;$$('.method-card').forEach(c=>c.classList.toggle('active',c.contains(radio)));$("#mField").hidden=method!=="error";$("#exactField").hidden=method!=="error"}
function reset(){state.screen=0;show(0);example()}
function clearAll(){renderRows(count());$("#xEval").value="";$("#maxDerivative").value="";$("#exactValue").value=""}
function read(){
  state.method=currentMethod();state.nodes=[];
  for(let i=0;i<count();i++){const x=Number($(`#x${i}`).value),y=Number($(`#y${i}`).value);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error(`Completa correctamente el punto ${i}.`);state.nodes.push({x,y})}
  state.xEval=Number($("#xEval").value);if(!Number.isFinite(state.xEval))throw Error("Ingresa el punto a evaluar.");
  if(new Set(state.nodes.map(p=>p.x)).size!==state.nodes.length)throw Error("Todos los valores x deben ser distintos.");
  if(state.method==="gregory"){
    const h=state.nodes[1].x-state.nodes[0].x;if(h<=0)throw Error("Newton-Gregory requiere nodos x en orden ascendente.");
    if(state.nodes.slice(1).some((p,i)=>Math.abs((p.x-state.nodes[i].x)-h)>1e-8*Math.max(1,Math.abs(h))))throw Error("Newton-Gregory requiere que todos los nodos tengan el mismo paso h.");state.h=h;
  }
  if(state.method==="error"){state.M=Number($("#maxDerivative").value);if(!Number.isFinite(state.M)||state.M<0)throw Error("Ingresa un valor válido para M.");const raw=$("#exactValue").value.trim();state.exact=raw===""?null:Number(raw);if(state.exact!==null&&!Number.isFinite(state.exact))throw Error("Ingresa un valor exacto válido o deja el campo vacío.")}
  buildMath();
}
function buildMath(){
  const n=state.nodes.length;state.table=Array.from({length:n},()=>Array(n).fill(null));state.nodes.forEach((p,i)=>state.table[i][0]=p.y);
  for(let j=1;j<n;j++)for(let i=0;i<n-j;i++)state.table[i][j]=state.method==="gregory"?state.table[i+1][j-1]-state.table[i][j-1]:(state.table[i+1][j-1]-state.table[i][j-1])/(state.nodes[i+j].x-state.nodes[i].x);
  state.coeffs=Array.from({length:n},(_,j)=>state.method==="gregory"?state.table[0][j]/(factorial(j)*Math.pow(state.h,j)):state.table[0][j]);
  state.poly=Array(n).fill(0);let basis=[1];for(let k=0;k<n;k++){basis.forEach((v,i)=>state.poly[i]+=state.coeffs[k]*v);basis=polyMul(basis,[-state.nodes[k].x,1])}
}
function show(i){state.screen=i;$$('.screen').forEach(s=>s.classList.remove('active'));$(`#screen-${screens[i]}`).classList.add('active');$$('.step').forEach((s,j)=>{s.classList.toggle('active',j===i);s.classList.toggle('done',j<i)});window.scrollTo({top:0,behavior:'smooth'})}
function methodName(){return state.method==="newton"?"Newton con diferencias divididas":state.method==="gregory"?"Newton-Gregory progresivo":"Límite superior del error"}
function renderValidation(){
  const xs=state.nodes.map(p=>p.x),min=Math.min(...xs),max=Math.max(...xs),inside=state.xEval>=min&&state.xEval<=max;
  $("#validationContent").innerHTML=`<div class="check-grid">${state.nodes.map((p,i)=>`<div class="check-card"><small>NODO ${i}</small><b>x${i} = ${fmt(p.x)}</b><span>f(x${i}) = ${fmt(p.y)}</span></div>`).join("")}</div><div class="banner">✓ ${state.nodes.length} nodos distintos · ${methodName()}</div><div class="formula-box"><b>Grado máximo:</b> ${state.nodes.length} − 1 = ${degree()}. ${state.method==="gregory"?`Paso uniforme h = ${fmt(state.h)}.`:""}</div><div class="formula-box"><b>Ubicación:</b> ${fmt(min)} ≤ ${fmt(state.xEval)} ≤ ${fmt(max)} · ${inside?"interpolación":"extrapolación"}.</div>${state.method==="error"?`<div class="formula-box"><b>Derivada requerida:</b> orden ${state.nodes.length}; M = ${fmt(state.M)}.</div>`:""}`;
  $("#toTable").textContent=state.method==="error"?"Analizar los factores →":"Construir la tabla →";
}
function renderTable(){
  if(state.method==="error"){
    $("#tableTitle").textContent="Factores del término de error";
    $("#differenceContent").innerHTML=`<div class="term-list">${state.nodes.map((p,i)=>`<div class="term"><b>|x − x${i}|</b> = |${fmt(state.xEval)} − ${fmt(p.x)}| = ${fmt(Math.abs(state.xEval-p.x))}</div>`).join("")}</div><div class="result-equation">∏ |x − xᵢ| = ${fmt(state.nodes.reduce((r,p)=>r*Math.abs(state.xEval-p.x),1))}</div>`;return;
  }
  $("#tableTitle").textContent=state.method==="gregory"?"Tabla de diferencias finitas":"Tabla de diferencias divididas";
  const n=state.nodes.length,heads=["x","f(x)",...Array.from({length:n-1},(_,i)=>state.method==="gregory"?`Δ<sup>${i+1}</sup>f`:`Orden ${i+1}`)];
  $("#differenceContent").innerHTML=`<div class="diff-wrap"><table class="diff-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${state.nodes.map((p,i)=>`<tr><td>${fmt(p.x)}</td>${Array.from({length:n},(_,j)=>`<td class="${i===0?'used':''}">${state.table[i][j]==null?'':fmt(state.table[i][j])}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="banner">✓ Los coeficientes se toman de la primera fila resaltada.</div>`;
}
function newtonTerm(k){if(k===0)return fmt(state.coeffs[0]);return `${fmt(state.coeffs[k])}${state.nodes.slice(0,k).map(p=>`(x − ${fmt(p.x)})`).join("")}`}
function renderPolynomial(){
  if(state.method==="error"){
    const m=state.nodes.length,prod=state.nodes.reduce((r,p)=>r*Math.abs(state.xEval-p.x),1),bound=state.M*prod/factorial(m);
    $("#polynomialContent").innerHTML=`<div class="formula-box"><span class="tag">TEOREMA DEL ERROR</span><br>|E<sub>${degree()}</sub>(x)| ≤ M/(n+1)! · ∏|x − xᵢ|</div><div class="formula-box">|E<sub>${degree()}</sub>(${fmt(state.xEval)})| ≤ ${fmt(state.M)} / ${m}! · ${fmt(prod)}</div><div class="result-equation">|E<sub>${degree()}</sub>(${fmt(state.xEval)})| ≤ ${fmt(bound)}</div>`;return;
  }
  const terms=state.coeffs.map((_,k)=>`<div class="term"><b>a${k}</b> = ${fmt(state.coeffs[k])} ${k?`→ ${newtonTerm(k)}`:""}</div>`).join("");
  let form=state.coeffs.map((_,k)=>newtonTerm(k)).join(" + ").replace(/\+ −/g,"− ");
  $("#polynomialContent").innerHTML=`<div class="term-list">${terms}</div>${state.method==="gregory"?`<div class="formula-box"><b>Variable normalizada:</b> s = (x − ${fmt(state.nodes[0].x)})/${fmt(state.h)}</div>`:""}<div class="result-equation">P<sub>${degree()}</sub>(x) = ${form}</div><div class="formula-box"><span class="tag">FORMA ESTÁNDAR</span><br>P<sub>${degree()}</sub>(x) = ${polyText(state.poly)}</div>`;
}
function errorBound(){const m=state.nodes.length;return state.M*state.nodes.reduce((r,p)=>r*Math.abs(state.xEval-p.x),1)/factorial(m)}
function renderResult(){
  const value=polyEval(state.poly,state.xEval),absolute=state.method==="error"&&state.exact!==null?`<div class="result-equation">Error absoluto = |${fmt(state.exact)} − ${fmt(value)}| = ${fmt(Math.abs(state.exact-value))}</div>`:"",extra=state.method==="error"?`${absolute}<div class="result-equation">Límite teórico: |E<sub>${degree()}</sub>(${fmt(state.xEval)})| ≤ ${fmt(errorBound())}</div>`:"";
  $("#resultContent").innerHTML=`<div class="result-equation">P<sub>${degree()}</sub>(x) = ${polyText(state.poly)}</div><div class="result-equation">P<sub>${degree()}</sub>(${fmt(state.xEval)}) = ${fmt(value)}</div>${extra}`;
  $("#auditContent").innerHTML=state.nodes.map((p,i)=>{const v=polyEval(state.poly,p.x),ok=Math.abs(v-p.y)<1e-6;return`<div class="audit-row"><b>P(${fmt(p.x)}) = ${fmt(v)}</b><span>${ok?'✓ Coincide con f(x'+i+') = '+fmt(p.y):'Diferencia: '+fmt(Math.abs(v-p.y))}</span></div>`}).join("");requestAnimationFrame(drawChart);
}
function drawChart(){const c=$("#chart"),g=c.getContext("2d"),W=c.width,H=c.height,p={l:62,r:25,t:22,b:48},xs=state.nodes.map(q=>q.x),mn=Math.min(...xs),mx=Math.max(...xs),span=mx-mn||1,x0=mn-.08*span,x1=mx+.08*span,s=Array.from({length:240},(_,i)=>{const x=x0+(x1-x0)*i/239;return{x,y:polyEval(state.poly,x)}}),ys=[...state.nodes.map(q=>q.y),...s.map(q=>q.y)];let y0=Math.min(...ys),y1=Math.max(...ys);const yp=(y1-y0||1)*.12;y0-=yp;y1+=yp;const X=x=>p.l+(x-x0)/(x1-x0)*(W-p.l-p.r),Y=y=>H-p.b-(y-y0)/(y1-y0)*(H-p.t-p.b);g.clearRect(0,0,W,H);g.fillStyle="#fbfdfe";g.fillRect(0,0,W,H);for(let i=0;i<=5;i++){const yy=y0+(y1-y0)*i/5,py=Y(yy);g.strokeStyle="#dce8ed";g.beginPath();g.moveTo(p.l,py);g.lineTo(W-p.r,py);g.stroke();g.fillStyle="#607985";g.font="12px Segoe UI";g.textAlign="right";g.fillText(fmt(yy,2),p.l-7,py+4)}g.strokeStyle="#27acd0";g.lineWidth=4;g.beginPath();s.forEach((q,i)=>i?g.lineTo(X(q.x),Y(q.y)):g.moveTo(X(q.x),Y(q.y)));g.stroke();state.nodes.forEach(q=>{g.fillStyle="#08789d";g.beginPath();g.arc(X(q.x),Y(q.y),7,0,Math.PI*2);g.fill()});const ev=polyEval(state.poly,state.xEval);g.fillStyle="#d98710";g.beginPath();g.arc(X(state.xEval),Y(ev),9,0,Math.PI*2);g.fill();g.fillStyle="#173b4b";g.textAlign="center";g.font="bold 14px Segoe UI";g.fillText("Variable x",W/2,H-14)}

$$('input[name=method]').forEach(r=>r.addEventListener('change',()=>{$$('.method-card').forEach(c=>c.classList.toggle('active',c.contains(r)&&r.checked));$("#mField").hidden=currentMethod()!=="error";$("#exactField").hidden=currentMethod()!=="error"}));
$("#nodeCount").addEventListener('change',()=>{const old=Array.from({length:$("#nodeRows").children.length/3},(_,i)=>({x:$(`#x${i}`)?.value??"",y:$(`#y${i}`)?.value??""}));renderRows(count(),old)});
$("#exampleBtn").addEventListener('click',example);$("#exampleSelect").addEventListener('change',example);$("#clearBtn").addEventListener('click',clearAll);$("#homeBtn").addEventListener('click',reset);
$("#startBtn").addEventListener('click',()=>{try{read();$("#inputError").hidden=true;renderValidation();show(1)}catch(e){$("#inputError").textContent=e.message;$("#inputError").hidden=false}});
$("#toTable").addEventListener('click',()=>{renderTable();show(2)});$("#toPolynomial").addEventListener('click',()=>{renderPolynomial();show(3)});$("#toResult").addEventListener('click',()=>{renderResult();show(4)});$$('.back-step').forEach(b=>b.addEventListener('click',()=>show(Math.max(0,state.screen-1))));window.addEventListener('resize',()=>{if(state.screen===4)drawChart()});
renderRows(4);example();
