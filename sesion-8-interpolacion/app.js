"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const screens = ["input", "validation", "bases", "polynomial", "evaluation", "graph"];
const state = { nodes: [], xEval: 0, bases: [], polynomial: [], baseIndex: -1, screen: 0 };

function fmt(value, digits = 8) {
  if (Math.abs(value) < 1e-12) return "0";
  if (Math.abs(value - Math.round(value)) < 1e-10) return String(Math.round(value));
  return Number(value.toFixed(digits)).toString();
}

function signed(value, variable = "") {
  const abs = Math.abs(value);
  return `${value >= 0 ? "+" : "−"} ${fmt(abs)}${variable}`;
}

function polyMultiply(a, b) {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((av, i) => b.forEach((bv, j) => { out[i + j] += av * bv; }));
  return out;
}

function polyEval(coeffs, x) { return coeffs.reduceRight((sum, c) => sum * x + c, 0); }

function polyText(coeffs, variable = "x") {
  const parts = [];
  for (let power = coeffs.length - 1; power >= 0; power--) {
    const c = coeffs[power];
    if (Math.abs(c) < 1e-10) continue;
    const abs = Math.abs(c);
    let term = power === 0 ? fmt(abs) : `${Math.abs(abs - 1) < 1e-10 ? "" : fmt(abs)}${variable}${power > 1 ? `<sup>${power}</sup>` : ""}`;
    parts.push({ sign: c < 0 ? "−" : "+", term });
  }
  if (!parts.length) return "0";
  return parts.map((p, i) => `${i === 0 && p.sign === "+" ? "" : p.sign + " "}${p.term}`).join(" ");
}

function buildMath() {
  const xs = state.nodes.map((p) => p.x);
  state.bases = xs.map((xk, k) => {
    let numerator = [1]; let denominator = 1;
    xs.forEach((xi, i) => {
      if (i === k) return;
      numerator = polyMultiply(numerator, [-xi, 1]);
      denominator *= xk - xi;
    });
    return { k, xk, numerator, denominator, coeffs: numerator.map((c) => c / denominator) };
  });
  state.polynomial = Array(state.nodes.length).fill(0);
  state.bases.forEach((base, k) => base.coeffs.forEach((c, i) => { state.polynomial[i] += state.nodes[k].y * c; }));
}

function loadExample() {
  [[2,150],[4,85],[8,50],[12,70]].forEach(([x,y], i) => { $(`#x${i}`).value=x; $(`#y${i}`).value=y; });
  $("#xEval").value = 6;
}

function reset() {
  state.nodes=[]; state.xEval=0; state.bases=[]; state.polynomial=[]; state.baseIndex=-1;
  loadExample(); showScreen(0);
}

function clearInputs() { $$(".node-table input").forEach((i) => i.value = ""); $("#xEval").value=""; }

function readInputs() {
  const nodes=[];
  for(let i=0;i<4;i++){
    const x=Number($(`#x${i}`).value), y=Number($(`#y${i}`).value);
    if(!Number.isFinite(x)||!Number.isFinite(y)) throw new Error(`Completa correctamente el punto ${i}.`);
    nodes.push({x,y});
  }
  const xEval=Number($("#xEval").value);
  if(!Number.isFinite(xEval)) throw new Error("Ingresa el punto que deseas evaluar.");
  const distinct=new Set(nodes.map((p)=>p.x));
  if(distinct.size!==nodes.length) throw new Error("Los valores x deben ser distintos para evitar divisiones entre cero.");
  state.nodes=nodes; state.xEval=xEval; buildMath();
}

function showScreen(index) {
  state.screen=index;
  $$(".screen").forEach((s)=>s.classList.remove("active"));
  $(`#screen-${screens[index]}`).classList.add("active");
  $$(".step").forEach((s,i)=>{s.classList.toggle("active",i===index);s.classList.toggle("done",i<index);});
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderValidation() {
  const sorted=[...state.nodes].sort((a,b)=>a.x-b.x);
  const inside=state.xEval>=sorted[0].x&&state.xEval<=sorted.at(-1).x;
  $("#validationContent").innerHTML=`
    <div class="check-grid">${state.nodes.map((p,i)=>`<div class="check-card"><small>NODO ${i}</small><b>x${i} = ${fmt(p.x)}</b><span>y${i} = ${fmt(p.y)}</span></div>`).join("")}</div>
    <div class="ok-banner">✓ Los cuatro valores x son distintos. Los denominadores de Lagrange no serán cero.</div>
    <div class="formula-box"><strong>Grado máximo:</strong> n = 4 − 1 = 3. Construiremos un polinomio cúbico P<sub>3</sub>(x).</div>
    <div class="formula-box"><strong>Ubicación de x<sub>eval</sub>:</strong> ${fmt(sorted[0].x)} ≤ ${fmt(state.xEval)} ≤ ${fmt(sorted.at(-1).x)} · ${inside?"interpolación dentro del intervalo":"extrapolación fuera del intervalo"}.</div>`;
}

function factorsText(k, xSymbol="x") {
  return state.nodes.map((p,i)=>i===k?null:`(${xSymbol} − ${fmt(p.x)})`).filter(Boolean).join("");
}

function renderBaseSource() { $("#baseSource").innerHTML=state.nodes.map((p,i)=>`<span class="node-chip">x<sub>${i}</sub> = ${fmt(p.x)}</span>`).join(""); }

function renderCurrentBase() {
  const i=state.baseIndex;
  $("#baseProgress").style.width=`${Math.max(0,(i+1)/4*100)}%`;
  if(i<0){$("#baseTitle").textContent="Polinomio base";$("#baseContent").innerHTML='<p class="explain">Pulsa el botón para construir L₀(x). Cada pulsación revelará una base adicional.</p>';$("#nextBase").textContent="Mostrar L₀(x) →";return;}
  const b=state.bases[i];
  const denominatorFactors=state.nodes.map((p,j)=>j===i?null:`(${fmt(b.xk)} − ${fmt(p.x)})`).filter(Boolean).join("");
  $("#baseTitle").innerHTML=`Polinomio L<sub>${i}</sub>(x)`;
  $("#baseContent").innerHTML=`
    <div class="formula-box"><span class="tag">FÓRMULA CON LOS NODOS</span><br>L<sub>${i}</sub>(x) = ${factorsText(i)} / [${denominatorFactors}]</div>
    <div class="formula-box"><span class="tag">DENOMINADOR</span><br>${denominatorFactors} = <strong>${fmt(b.denominator)}</strong></div>
    <div class="formula-box"><span class="tag">FORMA SIMPLIFICADA</span><br>L<sub>${i}</sub>(x) = <strong>${polyText(b.coeffs)}</strong></div>
    <p class="explain">Usamos todos los valores x excepto x<sub>${i}</sub>. Así L<sub>${i}</sub>(${fmt(b.xk)}) = 1 y las demás bases se anulan en ese nodo.</p>`;
  $("#nextBase").textContent=i<3?`Mostrar L${i+1}(x) →`:"Combinar los cuatro aportes →";
}

function renderPolynomial() {
  const rows=state.bases.map((b,k)=>`<div class="contribution"><b>y<sub>${k}</sub>L<sub>${k}</sub>(x)</b><span>${fmt(state.nodes[k].y)}[${polyText(b.coeffs)}] = ${polyText(b.coeffs.map(c=>c*state.nodes[k].y))}</span></div>`).join("");
  const headers=state.polynomial.map((_,i)=>`x<sup>${i}</sup>`).reverse();
  const coeffs=[...state.polynomial].reverse().map((value)=>fmt(value));
  $("#polynomialContent").innerHTML=`
    <div class="source-grid"><div class="source-card"><small>DATOS USADOS · PASO 2</small><h3>Bases construidas</h3>${state.bases.map((b,k)=>`<div class="calc-line">L<sub>${k}</sub>(x) = ${polyText(b.coeffs)}</div>`).join("")}</div><div class="source-card accent"><small>RESULTADO DEL PASO 3</small><h3>Aporte de cada medición</h3><div class="contribution-list">${rows}</div></div></div>
    <table class="coeff-table"><thead><tr>${headers.map(h=>`<th>Coeficiente de ${h}</th>`).join("")}</tr></thead><tbody><tr>${coeffs.map(c=>`<td>${c}</td>`).join("")}</tr></tbody></table>
    <div class="result-equation">P<sub>3</sub>(x) = ${polyText(state.polynomial)}</div>`;
}

function renderEvaluation() {
  const basisValues=state.bases.map((b)=>polyEval(b.coeffs,state.xEval));
  const contributions=basisValues.map((v,i)=>v*state.nodes[i].y);
  const result=contributions.reduce((a,b)=>a+b,0);
  $("#evaluationContent").innerHTML=`
    <div class="substitution-grid"><div class="data-origin"><small class="tag">DATO USADO · PASO 3</small><h3>Polinomio obtenido</h3><div class="formula-box">P<sub>3</sub>(x) = ${polyText(state.polynomial)}</div><p class="explain">Punto de la guía: x<sub>eval</sub> = ${fmt(state.xEval)} GB.</p></div><div class="data-origin"><small class="tag">DATOS USADOS · PASO 2</small><h3>Evaluación de las bases</h3>${basisValues.map((v,i)=>`<div class="calc-line">L<sub>${i}</sub>(${fmt(state.xEval)}) = ${fmt(v)}</div>`).join("")}</div></div>
    <div class="formula-box"><span class="tag">REEMPLAZO NUMÉRICO ORDENADO</span><br>P<sub>3</sub>(${fmt(state.xEval)}) = ${contributions.map((v,i)=>`${fmt(state.nodes[i].y)}(${fmt(basisValues[i])})`).join(" + ")}</div>
    <div class="formula-box">P<sub>3</sub>(${fmt(state.xEval)}) = ${contributions.map((value)=>fmt(value)).join(" + ")} = <strong>${fmt(result)} ms</strong></div>`;
}

function renderResult() {
  const result=polyEval(state.polynomial,state.xEval);
  $("#resultContent").innerHTML=`<div class="result-card"><small>RESULTADO FINAL</small><div class="final-polynomial"><span>POLINOMIO INTERPOLADOR FINAL</span><strong>P<sub>3</sub>(x) = ${polyText(state.polynomial)}</strong></div><h3>Evaluación: P<sub>3</sub>(${fmt(state.xEval)}) = ${fmt(result)} ms</h3><p class="interpretation">Con ${fmt(state.xEval)} GB de RAM, el modelo predice una latencia media de aproximadamente <strong>${fmt(result)} milisegundos</strong>.</p></div>`;
  $("#auditContent").innerHTML=state.nodes.map((p,i)=>{const got=polyEval(state.polynomial,p.x),err=Math.abs(got-p.y);return `<div class="audit-row"><b>P(${fmt(p.x)}) = ${fmt(got)}</b><span>Dato original y${i} = ${fmt(p.y)}</span><span class="audit-ok">${err<1e-7?"✓ Coincide exactamente":"Diferencia: "+fmt(err)}</span></div>`}).join("");
  requestAnimationFrame(drawChart);
}

function drawChart(){
  const canvas=$("#chart"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,pad={l:65,r:28,t:25,b:52};
  const xs=state.nodes.map(p=>p.x), minNode=Math.min(...xs),maxNode=Math.max(...xs),span=maxNode-minNode||1;
  const xmin=minNode-span*.08,xmax=maxNode+span*.08;
  const samples=Array.from({length:241},(_,i)=>{const x=xmin+(xmax-xmin)*i/240;return{x,y:polyEval(state.polynomial,x)}});
  const ys=[...state.nodes.map(p=>p.y),...samples.map(p=>p.y),polyEval(state.polynomial,state.xEval)],ymin0=Math.min(...ys),ymax0=Math.max(...ys),ypad=(ymax0-ymin0||1)*.12,ymin=ymin0-ypad,ymax=ymax0+ypad;
  const X=x=>pad.l+(x-xmin)/(xmax-xmin)*(W-pad.l-pad.r),Y=y=>H-pad.b-(y-ymin)/(ymax-ymin)*(H-pad.t-pad.b);
  ctx.clearRect(0,0,W,H);ctx.fillStyle="#fbfdfe";ctx.fillRect(0,0,W,H);ctx.font="13px Segoe UI";ctx.textAlign="right";ctx.textBaseline="middle";
  for(let i=0;i<=5;i++){const y=ymin+(ymax-ymin)*i/5,py=Y(y);ctx.strokeStyle="#dce8ed";ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(W-pad.r,py);ctx.stroke();ctx.fillStyle="#607985";ctx.fillText(fmt(y,2),pad.l-9,py)}
  ctx.textAlign="center";ctx.textBaseline="top";for(let i=0;i<=5;i++){const x=xmin+(xmax-xmin)*i/5,px=X(x);ctx.strokeStyle="#edf3f5";ctx.beginPath();ctx.moveTo(px,pad.t);ctx.lineTo(px,H-pad.b);ctx.stroke();ctx.fillStyle="#607985";ctx.fillText(fmt(x,2),px,H-pad.b+10)}
  ctx.strokeStyle="#21a9cf";ctx.lineWidth=4;ctx.beginPath();samples.forEach((p,i)=>i?ctx.lineTo(X(p.x),Y(p.y)):ctx.moveTo(X(p.x),Y(p.y)));ctx.stroke();
  state.nodes.forEach((p)=>{ctx.fillStyle="#096b8f";ctx.beginPath();ctx.arc(X(p.x),Y(p.y),7,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()});
  const ey=polyEval(state.polynomial,state.xEval);ctx.setLineDash([6,5]);ctx.strokeStyle="#d98710";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(state.xEval),Y(ey));ctx.lineTo(X(state.xEval),H-pad.b);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#d98710";ctx.beginPath();ctx.arc(X(state.xEval),Y(ey),9,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#18394a";ctx.font="bold 14px Segoe UI";ctx.textAlign="center";ctx.fillText("Memoria asignada x (GB)",(pad.l+W-pad.r)/2,H-21);ctx.save();ctx.translate(18,(pad.t+H-pad.b)/2);ctx.rotate(-Math.PI/2);ctx.fillText("Latencia y (ms)",0,0);ctx.restore();
}

$("#exampleBtn").addEventListener("click",loadExample);$("#clearBtn").addEventListener("click",clearInputs);$("#homeBtn").addEventListener("click",reset);
$("#startBtn").addEventListener("click",()=>{try{readInputs();$("#inputError").hidden=true;renderValidation();showScreen(1)}catch(e){$("#inputError").textContent=e.message;$("#inputError").hidden=false}});
$("#toBases").addEventListener("click",()=>{state.baseIndex=-1;renderBaseSource();renderCurrentBase();showScreen(2)});
$("#nextBase").addEventListener("click",()=>{if(state.baseIndex<3){state.baseIndex++;renderCurrentBase()}else{renderPolynomial();showScreen(3)}});
$("#toEvaluation").addEventListener("click",()=>{renderEvaluation();showScreen(4)});$("#toGraph").addEventListener("click",()=>{renderResult();showScreen(5)});
$$('.back-step').forEach((b)=>b.addEventListener('click',()=>showScreen(Math.max(0,state.screen-1))));
window.addEventListener("resize",()=>{if(state.screen===5)drawChart()});
loadExample();
