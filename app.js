const exampleA=[[4,2,1],[12,10,5],[-8,8,7]], exampleB=[14,46,26];
let result=null, stage=0;
const $=id=>document.getElementById(id);
const fmt=n=>Math.abs(n)<1e-10?'0':Number(n.toFixed(6)).toString();

function buildInputs(){
  $('matrixA').innerHTML=''; $('vectorB').innerHTML='';
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)$('matrixA').insertAdjacentHTML('beforeend',`<input type="number" step="any" data-a="${i}-${j}" aria-label="a${i+1}${j+1}">`);
  for(let i=0;i<3;i++)$('vectorB').insertAdjacentHTML('beforeend',`<input type="number" step="any" data-b="${i}" aria-label="b${i+1}">`);
}
function loadExample(){document.querySelectorAll('[data-a]').forEach(x=>{let[i,j]=x.dataset.a.split('-');x.value=exampleA[i][j]});document.querySelectorAll('[data-b]').forEach(x=>x.value=exampleB[x.dataset.b]);}
function numericValue(input,label){
  const raw=input.value.trim();
  if(raw==='')throw new Error(`Falta completar ${label}. Todos los campos de A y B son obligatorios.`);
  const value=Number(raw);
  if(!Number.isFinite(value))throw new Error(`${label} debe ser un número válido.`);
  return value;
}
function readData(){
  return{
    a:[0,1,2].map(i=>[0,1,2].map(j=>numericValue(document.querySelector(`[data-a="${i}-${j}"]`),`a${i+1}${j+1}`))),
    b:[0,1,2].map(i=>numericValue(document.querySelector(`[data-b="${i}"]`),`b${i+1}`))
  }
}
const EPS=1e-10;
const clean=n=>Math.abs(n)<EPS?0:n;
const clone=m=>m.map(r=>[...r]);
function rank(m){
  const w=clone(m);let row=0;
  for(let col=0;col<w[0].length&&row<w.length;col++){
    let pivot=row;for(let r=row+1;r<w.length;r++)if(Math.abs(w[r][col])>Math.abs(w[pivot][col]))pivot=r;
    if(Math.abs(w[pivot][col])<EPS)continue;
    [w[row],w[pivot]]=[w[pivot],w[row]];const d=w[row][col];for(let j=col;j<w[0].length;j++)w[row][j]/=d;
    for(let r=0;r<w.length;r++){if(r===row)continue;const f=w[r][col];for(let j=col;j<w[0].length;j++)w[r][j]-=f*w[row][j]}
    row++;
  }return row;
}
function classify(a,b){
  const ra=rank(a),rab=rank(a.map((r,i)=>[...r,b[i]])),n=a[0].length;
  if(ra!==rab)return{code:'SI',label:'Sistema incompatible',explanation:'Los rangos son distintos; el sistema no tiene solución.',rank_a:ra,rank_augmented:rab,variables:n};
  if(ra===n)return{code:'SCD',label:'Sistema compatible determinado',explanation:'Tiene solución y es única.',rank_a:ra,rank_augmented:rab,variables:n};
  return{code:'SCI',label:'Sistema compatible indeterminado',explanation:'Tiene infinitas soluciones.',rank_a:ra,rank_augmented:rab,variables:n};
}
function factorLU(a){
  const n=a.length,l=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0)),u=Array.from({length:n},()=>Array(n).fill(0)),steps=[];let number=1;
  for(let i=0;i<n;i++){
    for(let k=i;k<n;k++){let sum=0;for(let j=0;j<i;j++)sum+=l[i][j]*u[j][k];u[i][k]=clean(a[i][k]-sum);steps.push({number:number++,phase:'Construcción de U',target:`u${i+1}${k+1}`,formula:`a${i+1}${k+1} - Σ(l${i+1}j·uj${k+1})`,value:u[i][k],explanation:`Calculamos u${i+1}${k+1} para completar la fila ${i+1} de la matriz triangular superior U.`})}
    if(Math.abs(u[i][i])<EPS)throw new Error(`Se obtuvo un pivote cero en u${i+1}${i+1}. Doolittle sin pivoteo requiere intercambio de filas.`);
    for(let k=i+1;k<n;k++){let sum=0;for(let j=0;j<i;j++)sum+=l[k][j]*u[j][i];l[k][i]=clean((a[k][i]-sum)/u[i][i]);steps.push({number:number++,phase:'Construcción de L',target:`l${k+1}${i+1}`,formula:`(a${k+1}${i+1} - Σ(l${k+1}j·uj${i+1})) / u${i+1}${i+1}`,value:l[k][i],explanation:`Este multiplicador indica cuánto de la fila ${i+1} se usa para eliminar el elemento de la fila ${k+1}.`})}
  }return{l,u,steps};
}
function forward(l,b){const y=Array(b.length).fill(0),steps=[];for(let i=0;i<b.length;i++){let sum=0;for(let j=0;j<i;j++)sum+=l[i][j]*y[j];y[i]=clean((b[i]-sum)/l[i][i]);steps.push({target:`y${i+1}`,formula:`(b${i+1} - Σ(l${i+1}j·yj)) / l${i+1}${i+1}`,value:y[i],explanation:`Despejamos y${i+1} en la fila ${i+1}; solo usamos los valores de Y que ya fueron calculados.`})}return{values:y,steps}}
function backward(u,y){const x=Array(y.length).fill(0),steps=[];for(let i=y.length-1;i>=0;i--){let sum=0;for(let j=i+1;j<y.length;j++)sum+=u[i][j]*x[j];x[i]=clean((y[i]-sum)/u[i][i]);steps.push({target:`x${i+1}`,formula:`(y${i+1} - Σ(u${i+1}j·xj)) / u${i+1}${i+1}`,value:x[i],explanation:`Despejamos x${i+1} desde la fila ${i+1}, aprovechando las incógnitas que ya conocemos.`})}return{values:x,steps}}
const matVec=(a,x)=>a.map(r=>clean(r.reduce((s,v,j)=>s+v*x[j],0)));
const matMul=(a,b)=>a.map((r,i)=>b[0].map((_,j)=>clean(r.reduce((s,_,k)=>s+a[i][k]*b[k][j],0))));
function solveLocal(a,b){
  const classification=classify(a,b);if(classification.code!=='SCD')return{classification,solvable_by_lu:false};
  const f=factorLU(a),fw=forward(f.l,b),bw=backward(f.u,fw.values),ax=matVec(a,bw.values),residual=ax.map((v,i)=>v-b[i]),max=Math.max(...residual.map(Math.abs));
  return{classification,solvable_by_lu:true,a,b,l:f.l,u:f.u,lu:matMul(f.l,f.u),y:fw.values,x:bw.values,ax,residual,max_residual:max,verified:max<1e-8,factor_steps:f.steps,forward_steps:fw.steps,backward_steps:bw.steps};
}
function reuseLocal(a,l,u,b){const fw=forward(l,b),bw=backward(u,fw.values),ax=matVec(a,bw.values),residual=ax.map((v,i)=>v-b[i]),max=Math.max(...residual.map(Math.abs));return{b,y:fw.values,x:bw.values,ax,residual,max_residual:max,verified:max<1e-8,reused:true}}
function matrixHtml(title,m){return `<div class="matrix-box"><h4>${title}</h4><table class="math">${m.map(r=>`<tr>${r.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</table></div>`}
function vectorHtml(title,v){return matrixHtml(title,v.map(x=>[x]));}
function stepsHtml(items){return `<div class="step-list">${items.map((s,i)=>`<div class="calc-step"><span>${i+1}</span><div class="step-math"><strong>${s.phase?`${s.phase}: `:''}${s.target}</strong><code>${s.formula}</code><b>= ${fmt(s.value)}</b></div><p><em>¿Qué hicimos?</em>${s.explanation}</p></div>`).join('')}</div>`}
const copy=[
  ['1. Planteamos y diagnosticamos','Organizamos el sistema como AX = B y verificamos si tiene una solución única.','Leer la matriz A y el vector B.','Comparar los rangos de A y de la matriz aumentada.','Sabemos qué clase de sistema tenemos.'],
  ['2. Separamos A en L y U','Doolittle transforma una matriz difícil en dos matrices triangulares más sencillas.','Construir U por filas y guardar los multiplicadores en L.','Cada elemento calculado aparece con su fórmula.','Dos matrices cuyo producto recupera A.'],
  ['3. Resolvemos LY = B','La matriz L permite encontrar un vector intermedio Y mediante sustitución hacia adelante.','Empezar por la primera fila y avanzar.','Cada nuevo yi usa únicamente valores ya conocidos.','El vector intermedio Y.'],
  ['4. Resolvemos UX = Y','Con U y el vector Y encontramos las incógnitas originales mediante sustitución hacia atrás.','Empezar en la última fila y retroceder.','Cada xi despeja una incógnita del sistema triangular.','La solución final X.'],
  ['5. Comprobamos la solución','Multiplicamos A por X y contrastamos el resultado con B.','Calcular AX y el vector residual AX - B.','Un residual cercano a cero confirma la respuesta.','Una solución verificada, no solamente calculada.']
];
function renderStage(){
  document.querySelectorAll('.flow-step').forEach((b,i)=>b.classList.toggle('active',i===stage));
  const c=copy[stage]; $('stageTitle').textContent=c[0];$('stageIntro').textContent=c[1];$('whatText').textContent=c[2];$('howText').textContent=c[3];$('resultText').textContent=c[4];
  $('stageCounter').textContent=`Etapa ${stage+1} de 5`;$('progressBar').style.width=`${(stage+1)*20}%`;$('previous').disabled=stage===0;$('next').textContent=stage===4?'Volver al inicio':'Siguiente →';
  if(!result)return;
  const p=$('stagePanel');
  if(stage===0)p.innerHTML=`<h3>Del sistema a la clasificación</h3><p>Antes de aplicar un método, confirmamos existencia y unicidad.</p><div class="matrix-row">${matrixHtml('A',result.a)}<span class="equals">· X =</span>${vectorHtml('B',result.b)}</div><div class="verification"><b>${result.classification.label} (${result.classification.code})</b><br>rango(A) = ${result.classification.rank_a}; rango(A|B) = ${result.classification.rank_augmented}; incógnitas = ${result.classification.variables}. ${result.classification.explanation}</div>`;
  if(stage===1)p.innerHTML=`<h3>Factorización de Doolittle</h3><p>L conserva los multiplicadores y U es la forma triangular superior.</p><div class="matrix-row">${matrixHtml('A',result.a)}<span class="equals">=</span>${matrixHtml('L',result.l)}<span class="equals">·</span>${matrixHtml('U',result.u)}</div>${stepsHtml(result.factor_steps)}`;
  if(stage===2)p.innerHTML=`<h3>Sustitución hacia adelante</h3><p>Usamos L y B para calcular primero el vector auxiliar Y.</p><div class="matrix-row">${matrixHtml('L',result.l)}<span class="equals">· Y =</span>${vectorHtml('B',result.b)}<span class="equals">→</span>${vectorHtml('Y',result.y)}</div>${stepsHtml(result.forward_steps)}`;
  if(stage===3)p.innerHTML=`<h3>Sustitución hacia atrás</h3><p>Ahora U y Y permiten despejar las incógnitas originales.</p><div class="matrix-row">${matrixHtml('U',result.u)}<span class="equals">· X =</span>${vectorHtml('Y',result.y)}<span class="equals">→</span>${vectorHtml('X',result.x)}</div>${stepsHtml(result.backward_steps)}`;
  if(stage===4)p.innerHTML=`<h3>Respuesta comprobada</h3><p>Una solución es confiable cuando al sustituirla reproduce los términos independientes.</p><div class="matrix-row">${matrixHtml('A',result.a)}<span class="equals">·</span>${vectorHtml('X',result.x)}<span class="equals">=</span>${vectorHtml('AX',result.ax)}<span class="equals">≈</span>${vectorHtml('B',result.b)}</div><div class="verification"><b>${result.verified?'✓ Comprobación correcta':'⚠ Revisar resultado'}</b><br>Residual máximo: <span class="result-number">${fmt(result.max_residual)}</span></div>`;
}
function solve(){
  $('message').classList.add('hidden');
  try{const d=readData();result=solveLocal(d.a,d.b);if(!result.solvable_by_lu)throw new Error(result.classification.explanation);stage=0;$('results').classList.remove('hidden');$('classification').innerHTML=`<span class="pill">${result.classification.code}</span><div><strong>${result.classification.label}</strong><br>${result.classification.explanation}</div>`;renderStage();$('results').scrollIntoView({behavior:'smooth'});}catch(e){$('message').textContent=e.message;$('message').classList.remove('hidden')}
}
function reuseFactors(){
  if(!result)return;
  const box=$('reuseResult');
  try{
    const b=[...document.querySelectorAll('#reuseB input')].map((x,i)=>numericValue(x,`nuevo b${i+1}`));
    const r=reuseLocal(result.a,result.l,result.u,b);
    box.innerHTML=`<b>✓ Se conservaron las mismas matrices L y U.</b><div class="matrix-row">${vectorHtml('Nuevo B',r.b)}<span class="equals">→</span>${vectorHtml('Nuevo Y',r.y)}<span class="equals">→</span>${vectorHtml('Nueva solución X',r.x)}</div><span>Residual máximo: <b>${fmt(r.max_residual)}</b></span>`;
    box.classList.remove('hidden');
  }catch(e){box.textContent=e.message;box.classList.remove('hidden')}
}
buildInputs();loadExample();renderStage();
$('loadExample').onclick=loadExample;$('solve').onclick=solve;$('reuse').onclick=reuseFactors;$('reset').onclick=()=>{buildInputs();result=null;$('results').classList.add('hidden');$('reuseResult').classList.add('hidden');};$('previous').onclick=()=>{if(stage>0)stage--;renderStage()};$('next').onclick=()=>{stage=stage===4?0:stage+1;renderStage()};document.querySelectorAll('.flow-step').forEach(b=>b.onclick=()=>{stage=Number(b.dataset.stage);renderStage()});
