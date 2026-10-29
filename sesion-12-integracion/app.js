"use strict";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const screens = ["input", "validation", "table", "result", "convergence"];
const state = { expression:"", f:null, a:0, b:0, n:1, exact:null, nodes:[], values:[], screen:0 };

function fmt(value, digits=8){
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1e-12) return "0";
  if (Math.abs(value - Math.round(value)) < 1e-10) return String(Math.round(value));
  return Number(value.toFixed(digits)).toString();
}
function show(index){
  state.screen = index;
  $$(".screen").forEach(s => s.classList.remove("active"));
  $(`#screen-${screens[index]}`).classList.add("active");
  $$(".step").forEach((step, i) => { step.classList.toggle("active", i === index); step.classList.toggle("done", i < index); });
  window.scrollTo({ top:0, behavior:"smooth" });
}
function compileExpression(raw){
  let expr = raw.trim().toLowerCase().replaceAll("π", "pi").replace(/\^/g, "**");
  if (!expr || !/^[0-9a-z_+\-*/().\s]+$/.test(expr)) throw Error("Usa solamente números, t, operadores y funciones como sin(), cos(), exp(), sqrt() o log().");
  const allowed = new Set(["t","sin","cos","tan","exp","sqrt","log","abs","pi"]);
  const words = expr.match(/[a-z_]+/g) || [];
  if (words.some(word => !allowed.has(word))) throw Error("La función contiene un nombre no permitido. Usa t y funciones como sin(), cos(), exp(), sqrt() o log().");
  expr = expr.replace(/\b(sin|cos|tan|exp|sqrt|log|abs)\b/g, "Math.$1").replace(/\bpi\b/g, "Math.PI");
  const fn = new Function("t", `"use strict"; return (${expr});`);
  const probe = fn(0);
  if (!Number.isFinite(probe)) throw Error("La función no produce un valor numérico válido.");
  return fn;
}
function trapezoid(n){
  const h = (state.b - state.a) / n;
  let weighted = .5 * (state.f(state.a) + state.f(state.b));
  for(let i=1; i<n; i++) weighted += state.f(state.a + i*h);
  return h * weighted;
}
function read(){
  state.expression = $("#functionInput").value.trim();
  state.f = compileExpression(state.expression);
  state.a = Number($("#aInput").value); state.b = Number($("#bInput").value); state.n = Number($("#nInput").value);
  const exactText = $("#exactInput").value.trim(); state.exact = exactText === "" ? null : Number(exactText);
  if (!Number.isFinite(state.a) || !Number.isFinite(state.b) || state.b <= state.a) throw Error("El límite superior b debe ser mayor que el límite inferior a.");
  if (!Number.isInteger(state.n) || state.n < 1) throw Error("n debe ser un número entero mayor o igual que 1.");
  if (state.exact !== null && !Number.isFinite(state.exact)) throw Error("El valor exacto debe ser numérico o quedar vacío.");
  const h = (state.b-state.a)/state.n;
  state.nodes = Array.from({length:state.n+1}, (_,i) => state.a+i*h);
  state.values = state.nodes.map(t => state.f(t));
  if (state.values.some(v => !Number.isFinite(v))) throw Error("La función no es válida en todos los nodos del intervalo.");
}
function renderValidation(){
  const h = (state.b-state.a)/state.n;
  $("#validationContent").innerHTML = `<div class="check-grid"><div class="check-card"><small>INTERVALO</small><b>[${fmt(state.a)}, ${fmt(state.b)}]</b><span>Extremos válidos</span></div><div class="check-card"><small>SUBINTERVALOS</small><b>n = ${state.n}</b><span>${state.n+1} nodos en la malla</span></div><div class="check-card"><small>ANCHO DE PASO</small><b>h = ${fmt(h)}</b><span>(b − a)/n</span></div></div><div class="banner">✓ La malla es uniforme: tᵢ = ${fmt(state.a)} + i(${fmt(h)}), con i = 0, …, ${state.n}.</div><div class="formula-box"><b>Función:</b> f(t) = ${state.expression}<br><b>Método:</b> ${state.n === 1 ? "Regla del trapecio simple" : "Regla del trapecio compuesto"}.</div>`;
}
function renderTable(){
  const h = (state.b-state.a)/state.n;
  const rows = state.nodes.map((t,i) => { const weight=(i===0||i===state.n)?.5:1; const value=state.values[i]; return `<tr><td>${i}</td><td>${fmt(t)}</td><td>${fmt(value)}</td><td>${weight===.5?"½":"1"}</td><td class="${weight===.5?"":"emph"}">${fmt(weight*value)}</td></tr>`; }).join("");
  const interior = state.values.slice(1,-1).reduce((sum,v)=>sum+v,0);
  $("#tableContent").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>i</th><th>tᵢ</th><th>f(tᵢ)</th><th>Peso</th><th>Aporte ponderado</th></tr></thead><tbody>${rows}</tbody></table></div><div class="formula-box"><b>Suma interna:</b> Σ f(tᵢ) = ${fmt(interior)}<br><b>Fórmula:</b> T<sub>${state.n}</sub> = ${fmt(h)} [½(${fmt(state.values[0])}) + ${fmt(interior)} + ½(${fmt(state.values.at(-1))})].</div>`;
}
function renderResult(){
  const h=(state.b-state.a)/state.n, estimate=trapezoid(state.n), err=state.exact===null?null:Math.abs(state.exact-estimate), pct=err===null?null:100*err/Math.abs(state.exact);
  $("#resultContent").innerHTML = `<div class="result-equation">T<sub>${state.n}</sub> = ${fmt(estimate,10)}</div><div class="formula-box"><span class="tag">SUSTITUCIÓN</span><br>T<sub>${state.n}</sub> = ${fmt(h)} [½(${fmt(state.values[0])}) + Σ f(tᵢ) + ½(${fmt(state.values.at(-1))})]</div>${err===null?"":`<div class="result-equation">Error absoluto = |I exacta − T<sub>${state.n}</sub>| = ${fmt(err,10)}<br>Error porcentual = ${fmt(pct,8)}%</div>`}`;
  $("#auditContent").innerHTML = `<div class="audit-row"><b>Interpretación</b><span>La tasa se integra en el intervalo [${fmt(state.a)}, ${fmt(state.b)}].</span></div><div class="audit-row"><b>Resultado</b><span>Datos transferidos aproximados: ${fmt(estimate,8)} ${state.expression.includes("sin") ? "Megabits" : "unidades²"}.</span></div>${state.exact===null?`<div class="audit-row"><b>Valor exacto</b><span>No ingresado: se muestra solo la aproximación.</span></div>`:`<div class="audit-row"><b>Con valor exacto</b><span>I = ${fmt(state.exact,10)}; el error se calculó automáticamente.</span></div>`}`;
  drawChart();
}
function renderConvergence(){
  const ns = [4,10,50,100,1000];
  const rows=ns.map(n => { const value=trapezoid(n), err=state.exact===null?null:Math.abs(state.exact-value), pct=err===null?null:100*err/Math.abs(state.exact); return `<tr><td>${n}</td><td>${fmt((state.b-state.a)/n,8)}</td><td class="emph">${fmt(value,10)}</td><td>${err===null?"—":fmt(err,10)}</td><td>${pct===null?"—":fmt(pct,8)+"%"}</td></tr>`; }).join("");
  const note=state.exact===null?"Ingresa el valor exacto si deseas que el sistema calcule el error absoluto real y el porcentaje.":"Al aumentar n, la aproximación se acerca al valor exacto y el error disminuye.";
  $("#convergenceContent").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>n</th><th>h</th><th>Trapecio compuesto Tₙ</th><th>Error absoluto real</th><th>Error porcentual</th></tr></thead><tbody>${rows}</tbody></table></div><div class="banner">✓ ${note}</div>`;
}
function drawChart(){
  const canvas=$("#chart"), ctx=canvas.getContext("2d"), W=canvas.width,H=canvas.height,p={l:62,r:26,t:22,b:48};
  const x0=state.a,x1=state.b, curve=Array.from({length:240},(_,i)=>{const t=x0+(x1-x0)*i/239;return {t,y:state.f(t)}}), ys=curve.map(q=>q.y); let y0=Math.min(0,...ys),y1=Math.max(...ys); const pad=(y1-y0||1)*.12;y0-=pad;y1+=pad;
  const X=t=>p.l+(t-x0)/(x1-x0)*(W-p.l-p.r),Y=y=>H-p.b-(y-y0)/(y1-y0)*(H-p.t-p.b);ctx.clearRect(0,0,W,H);ctx.fillStyle="#fbfdfe";ctx.fillRect(0,0,W,H);
  for(let i=0;i<=5;i++){const y=y0+(y1-y0)*i/5,py=Y(y);ctx.strokeStyle="#dce8ed";ctx.beginPath();ctx.moveTo(p.l,py);ctx.lineTo(W-p.r,py);ctx.stroke();ctx.fillStyle="#607985";ctx.font="12px Segoe UI";ctx.textAlign="right";ctx.fillText(fmt(y,2),p.l-7,py+4)}
  ctx.fillStyle="rgba(39,172,208,.16)";ctx.beginPath();state.nodes.forEach((t,i)=>{const px=X(t),py=Y(state.values[i]);if(i===0){ctx.moveTo(px,Y(0));ctx.lineTo(px,py)}else ctx.lineTo(px,py)});ctx.lineTo(X(state.nodes.at(-1)),Y(0));ctx.closePath();ctx.fill();
  ctx.strokeStyle="#27acd0";ctx.lineWidth=3;ctx.beginPath();curve.forEach((q,i)=>i?ctx.lineTo(X(q.t),Y(q.y)):ctx.moveTo(X(q.t),Y(q.y)));ctx.stroke();ctx.strokeStyle="#08789d";ctx.lineWidth=2;ctx.beginPath();state.nodes.forEach((t,i)=>i?ctx.lineTo(X(t),Y(state.values[i])):ctx.moveTo(X(t),Y(state.values[i])));ctx.stroke();state.nodes.forEach((t,i)=>{ctx.fillStyle="#08789d";ctx.beginPath();ctx.arc(X(t),Y(state.values[i]),5,0,Math.PI*2);ctx.fill()});ctx.fillStyle="#173b4b";ctx.textAlign="center";ctx.font="bold 14px Segoe UI";ctx.fillText("Tiempo t (s)",W/2,H-14);
}
function loadExample(){ $("#functionInput").value="10 + 5*sin(pi*t/4) + exp(0.15*t)"; $("#aInput").value=0; $("#bInput").value=12; $("#nInput").value=4; $("#exactInput").value="166.39671187677126"; }
$("#exampleBtn").addEventListener("click",loadExample);$("#clearBtn").addEventListener("click",()=>{$("#functionInput").value="";$("#aInput").value="";$("#bInput").value="";$("#nInput").value=4;$("#exactInput").value="";});
$("#startBtn").addEventListener("click",()=>{try{read();$("#inputError").hidden=true;renderValidation();show(1)}catch(error){$("#inputError").textContent=error.message;$("#inputError").hidden=false}});$("#toTable").addEventListener("click",()=>{renderTable();show(2)});$("#toResult").addEventListener("click",()=>{renderResult();show(3)});$("#toConvergence").addEventListener("click",()=>{renderConvergence();show(4)});$$(".back-step").forEach(button=>button.addEventListener("click",()=>show(Math.max(0,state.screen-1))));window.addEventListener("resize",()=>{if(state.screen===3)drawChart()});
