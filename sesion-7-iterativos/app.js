const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { n: 3, A: [], b: [], method: null, errorType: 'relative', tolerance: 1e-4, maxIterations: 100, x0: [], current: [], next: [], errors: [], k: 0, history: [], phase: 'calculate', converged: false, stoppedByLimit: false, guarantee: false };
const examples = {
  3: { A: [[5,-2,1],[2,-7,-1],[1,4,-6]], b: [1,2,-1] },
  2: { A: [[2,-1],[1,2]], b: [1,3] },
  4: { A: [[10,-1,2,0],[-1,11,-1,3],[2,-1,10,-1],[0,3,-1,8]], b: [6,25,-11,15] }
};

function fmt(v, digits=8){
  if (!Number.isFinite(v)) return String(v);
  if (Math.abs(v) < 1e-12) return '0';
  return Number(v.toFixed(digits)).toString();
}
function signed(v, variable){ return `${v >= 0 ? '+ ' : '− '}${fmt(Math.abs(v))}${variable}`; }
function renderInputs(fill=true){
  state.n = Number($('#dimension').value);
  const ex = examples[state.n];
  $('#matrixInputs').style.gridTemplateColumns = `repeat(${state.n}, 76px)`;
  $('#matrixInputs').innerHTML = '';
  $('#vectorInputs').innerHTML = '';
  for(let i=0;i<state.n;i++){
    for(let j=0;j<state.n;j++){
      const input=document.createElement('input'); input.type='number'; input.step='any'; input.dataset.row=i; input.dataset.col=j; input.value=fill ? ex.A[i][j] : ''; input.setAttribute('aria-label',`a${i+1}${j+1}`); $('#matrixInputs').append(input);
    }
    const input=document.createElement('input'); input.type='number'; input.step='any'; input.dataset.b=i; input.value=fill ? ex.b[i] : ''; input.setAttribute('aria-label',`b${i+1}`); $('#vectorInputs').append(input);
  }
}
function readProblem(){
  state.n=Number($('#dimension').value); state.A=Array.from({length:state.n},()=>Array(state.n).fill(0)); state.b=[];
  for(const input of $$('#matrixInputs input')) state.A[+input.dataset.row][+input.dataset.col]=Number(input.value);
  for(const input of $$('#vectorInputs input')) state.b[+input.dataset.b]=Number(input.value);
  state.method=null; state.errorType=$('#errorType').value; state.tolerance=Number($('#tolerance').value); state.maxIterations=Number($('#maxIterations').value);
  if([...state.A.flat(),...state.b,state.tolerance,state.maxIterations].some(v=>!Number.isFinite(v))) throw new Error('Completa todos los datos con números válidos.');
  if(state.tolerance<=0) throw new Error('La tolerancia debe ser mayor que cero.');
  if(state.A.some((row,i)=>Math.abs(row[i])<1e-14)) throw new Error('La diagonal contiene un cero. Reordena las ecuaciones antes de despejar.');
}
function determinant(M){
  const a=M.map(r=>r.slice()); let det=1;
  for(let i=0;i<a.length;i++){
    let p=i; for(let r=i+1;r<a.length;r++) if(Math.abs(a[r][i])>Math.abs(a[p][i])) p=r;
    if(Math.abs(a[p][i])<1e-12) return 0;
    if(p!==i){[a[p],a[i]]=[a[i],a[p]];det*=-1;} det*=a[i][i];
    for(let r=i+1;r<a.length;r++){const q=a[r][i]/a[i][i];for(let c=i+1;c<a.length;c++)a[r][c]-=q*a[i][c];}
  } return det;
}
function rank(M){
  const a=M.map(r=>r.slice()); let row=0;
  for(let col=0;col<a[0].length&&row<a.length;col++){
    let p=row; for(let r=row+1;r<a.length;r++)if(Math.abs(a[r][col])>Math.abs(a[p][col]))p=r;
    if(Math.abs(a[p][col])<1e-10)continue; [a[p],a[row]]=[a[row],a[p]];
    for(let r=0;r<a.length;r++)if(r!==row){const q=a[r][col]/a[row][col];for(let c=col;c<a[0].length;c++)a[r][c]-=q*a[row][c];} row++;
  } return row;
}
function dominance(){ return state.A.map((row,i)=>({diag:Math.abs(row[i]), off:row.reduce((s,v,j)=>s+(j===i?0:Math.abs(v)),0)})); }
function sassenfeld(){
  const beta=[];
  for(let i=0;i<state.n;i++){
    let sum=0; for(let j=0;j<state.n;j++) if(j!==i) sum += Math.abs(state.A[i][j])*(j<i?beta[j]:1);
    beta[i]=sum/Math.abs(state.A[i][i]);
  } return beta;
}
function showScreen(index){
  $$('.screen').forEach((x,i)=>x.classList.toggle('active',i===index));
  $$('.step').forEach((x,i)=>{x.classList.toggle('active',i===index);x.classList.toggle('done',i<index)});
  window.scrollTo({top:230,behavior:'smooth'});
}
function matrixText(A){ return `<div class="row-checks">${A.map((r,i)=>`<div class="row-check"><span>Fila ${i+1}</span><strong>${r.map((v,j)=>`${fmt(v)}x${j+1}`).join(' &nbsp; ')} = ${fmt(state.b[i])}</strong></div>`).join('')}</div>`; }
function buildDiagnosis(){
  const det=determinant(state.A), rA=rank(state.A), rAug=rank(state.A.map((r,i)=>[...r,state.b[i]])), dom=dominance(), strict=dom.every(x=>x.diag>x.off), weak=dom.every(x=>x.diag>=x.off)&&dom.some(x=>x.diag>x.off), beta=sassenfeld(), bmax=Math.max(...beta);
  const scd=Math.abs(det)>1e-10, jacobiAllowed=scd&&strict, seidelAllowed=scd&&(strict||bmax<1);
  let classification=scd?'SCD · solución única':(rA<rAug?'SI · sin solución':'SCI · infinitas soluciones');
  $('#diagnosisContent').innerHTML=`
    <div class="result-grid"><div class="metric"><small>DETERMINANTE</small><strong>det(A) = ${fmt(det)}</strong></div><div class="metric"><small>RANGOS</small><strong>r(A)=${rA}; r(A|B)=${rAug}</strong></div><div class="metric"><small>CLASIFICACIÓN</small><strong>${classification}</strong></div></div>
    <div class="alert ${scd?'good':'bad'}"><b>${scd?'✓ El método puede aplicarse':'✕ El método iterativo se detiene'}</b><br>${scd?'det(A) ≠ 0, por tanto existe una solución única.':'Este programa aplica Jacobi y Gauss-Seidel únicamente a sistemas compatibles determinados.'}</div>
    <div class="criterion"><h3>Criterio 1 · Dominancia diagonal por filas</h3><div class="row-checks">${dom.map((x,i)=>`<div class="row-check"><span>Fila ${i+1}: |a${i+1}${i+1}| ${x.diag>x.off?'&gt;':x.diag===x.off?'=':'&lt;'} Σ|a${i+1}j|</span><strong>${fmt(x.diag)} ${x.diag>x.off?'&gt;':x.diag===x.off?'=':'&lt;'} ${fmt(x.off)} ${x.diag>x.off?'✓':'⚠'}</strong></div>`).join('')}</div></div>
    <div class="criterion"><h3>Criterio 2 · Sassenfeld para Gauss-Seidel</h3><p>Se usa como segunda prueba cuando la dominancia estricta no se cumple completamente.</p><div class="row-checks">${beta.map((v,i)=>`<div class="row-check"><span>β${i+1}</span><strong>${fmt(v,6)}</strong></div>`).join('')}<div class="row-check"><span>βmáx &lt; 1</span><strong>${fmt(bmax,6)} ${bmax<1?'&lt; 1 ✓':'≥ 1 ⚠'}</strong></div></div></div>
    <h3 class="method-choice-title">Métodos que puedes utilizar con garantía</h3>
    <div class="method-choices">
      <button class="method-option" data-method="jacobi" ${jacobiAllowed?'':'disabled'}><span><strong>Jacobi</strong><span>${jacobiAllowed?'La dominancia diagonal estricta garantiza su convergencia.':'No está garantizado por la dominancia diagonal estricta.'}</span></span><em>${jacobiAllowed?'USAR MÉTODO':'NO HABILITADO'}</em></button>
      <button class="method-option" data-method="seidel" ${seidelAllowed?'':'disabled'}><span><strong>Gauss-Seidel</strong><span>${seidelAllowed?(strict?'Garantizado por dominancia diagonal estricta.':'Garantizado mediante el criterio de Sassenfeld.'):'Ninguno de los criterios analizados garantiza su convergencia.'}</span></span><em>${seidelAllowed?'USAR MÉTODO':'NO HABILITADO'}</em></button>
    </div>
    ${!jacobiAllowed&&!seidelAllowed?'<div class="no-methods"><b>No se puede continuar con estos métodos.</b><br>Los criterios estudiados no garantizan la convergencia de Jacobi ni de Gauss-Seidel para este orden del sistema.</div>':''}`;
}
function equationOriginal(row,i){ return row.map((a,j)=>`${j? (a>=0?' + ':' − '):a<0?'− ':''}${fmt(Math.abs(a))}x${j+1}`).join('')+` = ${fmt(state.b[i])}`; }
function formulaHtml(i){
  const aii=state.A[i][i]; const terms=[];
  for(let j=0;j<state.n;j++)if(j!==i)terms.push(`${state.A[i][j]>=0?'−':'+'} ${fmt(Math.abs(state.A[i][j]))}x${j+1}`);
  return `x${i+1}<sup>(k+1)</sup> = (${fmt(state.b[i])} ${terms.join(' ')}) / ${fmt(aii)}`;
}
function buildFormulas(){ $('#formulaSystem').innerHTML=matrixText(state.A); $('#formulasContent').innerHTML=state.A.map((_,i)=>`<div class="equation-line">${formulaHtml(i)}</div>`).join('')+`<p><b>${state.method==='jacobi'?'Jacobi usa únicamente valores de la iteración anterior.':'Gauss-Seidel usa de inmediato los valores nuevos ya calculados.'}</b></p>`; }
function buildInitial(){
  $('#initialInputs').style.gridTemplateColumns=`repeat(${state.n},1fr)`;
  $('#initialInputs').innerHTML=Array.from({length:state.n},(_,i)=>`<div class="initial-zero"><span>x${i+1}<sup>(0)</sup></span><strong>0</strong></div>`).join('');
}
function readInitial(){ state.x0=Array(state.n).fill(0); state.current=state.x0.slice();state.k=0;state.history=[{k:0,x:state.current.slice(),errors:Array(state.n).fill(null),emax:null}];state.phase='calculate';state.converged=false;state.stoppedByLimit=false; }
function computeNext(){
  const next=state.current.slice(), lines=[];
  for(let i=0;i<state.n;i++){
    let sum=state.b[i], parts=[fmt(state.b[i])];
    for(let j=0;j<state.n;j++)if(j!==i){const source=state.method==='seidel'&&j<i?next[j]:state.current[j];sum-=state.A[i][j]*source;parts.push(`${state.A[i][j]>=0?'−':'+'} ${fmt(Math.abs(state.A[i][j]))}(${fmt(source)})`);}
    next[i]=sum/state.A[i][i]; lines.push(`x${i+1}<sup>(${state.k+1})</sup> = (${parts.join(' ')}) / ${fmt(state.A[i][i])} = <span class="value-new">${fmt(next[i])}</span>`);
  }
  state.next=next; state.errors=next.map((v,i)=>state.errorType==='relative'?(Math.abs(v)>1e-14?Math.abs((v-state.current[i])/v):Math.abs(v-state.current[i])):Math.abs(v-state.current[i]));
}
function historyTable(){
  $('#historyHead').innerHTML=`<tr><th>k</th>${Array.from({length:state.n},(_,i)=>`<th>x${i+1}⁽ᵏ⁾</th>`).join('')}${Array.from({length:state.n},(_,i)=>`<th>E${i+1}</th>`).join('')}<th>Emáx</th></tr>`;
  $('#historyBody').innerHTML=state.history.map(r=>`<tr><td>${r.k}</td>${r.x.map(v=>`<td>${fmt(v,7)}</td>`).join('')}${r.errors.map(v=>`<td>${v===null?'—':fmt(v,7)}</td>`).join('')}<td>${r.emax===null?'—':fmt(r.emax,7)}</td></tr>`).join('');
}
function buildIteration(){
  const k=state.k+1; $('#methodBadge').textContent=state.method==='jacobi'?'Método de Jacobi':'Método de Gauss-Seidel';
  if(state.phase==='calculate'){
    computeNext(); $('#iterationTitle').textContent=`Paso 4 · Construimos x⁽${k}⁾`;
    $('#iterationContent').innerHTML=`<div class="iteration-grid"><div class="used-data"><span class="tag">DATOS USADOS · PASO 2</span><h3>Ecuaciones despejadas</h3>${state.A.map((_,i)=>`<div class="equation-line">${formulaHtml(i)}</div>`).join('')}</div><div class="used-data"><span class="tag">DATOS USADOS · ${state.k===0?'PASO 3':'ITERACIÓN ANTERIOR'}</span><h3>Vector x⁽${state.k}⁾</h3><p class="final-vector">[${state.current.map(fmt).join(', ')}]ᵀ</p><p>${state.method==='jacobi'?'Todos estos valores permanecen fijos durante la iteración.':'Los valores nuevos reemplazan a los anteriores de izquierda a derecha.'}</p></div><div class="calculation error-block"><span class="tag">RESULTADO DEL PASO 4</span><h3>Sustitución y nuevos valores</h3>${state.next.map((_,i)=>`<div class="calc-line">${calculationLine(i)}</div>`).join('')}</div></div>`;
    $('#nextIteration').textContent='Calcular el error →';
  }else if(state.phase==='error'){
    const emax=Math.max(...state.errors); $('#iterationTitle').textContent=`Paso 5 · Error de la iteración ${k}`;
    $('#iterationContent').innerHTML=`<div class="iteration-grid"><div class="used-data"><span class="tag">DATOS USADOS · ITERACIÓN ${state.k}</span><h3>Vector anterior</h3><p class="final-vector">[${state.current.map(fmt).join(', ')}]ᵀ</p></div><div class="used-data"><span class="tag">DATOS USADOS · PASO 4</span><h3>Vector actual</h3><p class="final-vector">[${state.next.map(fmt).join(', ')}]ᵀ</p></div><div class="error-block"><span class="tag">RESULTADO DEL PASO 5</span><h3>${state.errorType==='relative'?'Error relativo':'Error absoluto'} por componente</h3><div class="error-list" style="grid-template-columns:repeat(${state.n},1fr)">${state.errors.map((e,i)=>`<div class="error-chip">E${i+1} = ${fmt(e,8)}</div>`).join('')}</div><p><b>Emáx = ${fmt(emax,8)}</b> &nbsp; y &nbsp; ε = ${fmt(state.tolerance,8)}</p></div></div>`;
    $('#nextIteration').textContent='Verificar criterio de parada →';
  }else if(state.phase==='decision'){
    const emax=Math.max(...state.errors); const ok=emax<state.tolerance; $('#iterationTitle').textContent='Paso 6 · Decidimos si continuar';
    $('#iterationContent').innerHTML=`<div class="decision ${ok?'good':'warn'}"><span class="tag">COMPARACIÓN</span><h3>${fmt(emax,8)} ${ok?'&lt;':'≥'} ${fmt(state.tolerance,8)}</h3><p>${ok?'El error máximo es menor que la tolerancia. Se cumple el criterio de parada y ahora sí mostramos la solución aproximada.':'El error todavía no cumple la tolerancia. El vector actual se convierte en el dato de entrada de la siguiente iteración.'}</p></div>`;
    $('#nextIteration').textContent=ok?'Mostrar solución final →':`Calcular iteración ${k+1} →`;
  }else{
    const last=state.history.at(-1); $('#iterationTitle').textContent='Solución aproximada comprobada';
    const residual=state.A.map((r,i)=>Math.abs(r.reduce((s,a,j)=>s+a*last.x[j],0)-state.b[i]));
    $('#iterationContent').innerHTML=`<div class="final-answer"><span class="tag">${state.stoppedByLimit?'LÍMITE ALCANZADO':'RESULTADO FINAL'}</span><h3>${state.stoppedByLimit?`Se detuvo tras ${last.k} iteraciones sin cumplir ε`:`Convergió en ${last.k} iteraciones`}</h3><p class="final-vector">X ≈ [${last.x.map(v=>fmt(v,8)).join(', ')}]ᵀ</p><p>Emáx = ${fmt(last.emax,8)} ${state.stoppedByLimit?'≥':'&lt;'} ε = ${fmt(state.tolerance,8)}</p><p>Comprobación: residual máximo ‖AX − B‖∞ = <b>${fmt(Math.max(...residual),10)}</b></p></div>`;
    $('#nextIteration').textContent='Volver al inicio';
  }
  historyTable();
}
function calculationLine(i){
  const parts=[fmt(state.b[i])];
  for(let j=0;j<state.n;j++)if(j!==i){const source=state.method==='seidel'&&j<i?state.next[j]:state.current[j];parts.push(`${state.A[i][j]>=0?'−':'+'} ${fmt(Math.abs(state.A[i][j]))}(${fmt(source)})`);}
  return `x${i+1}<sup>(${state.k+1})</sup> = (${parts.join(' ')}) / ${fmt(state.A[i][i])} = <span class="value-new">${fmt(state.next[i])}</span>`;
}
function advanceIteration(){
  if(state.phase==='calculate') state.phase='error';
  else if(state.phase==='error') state.phase='decision';
  else if(state.phase==='decision'){
    const emax=Math.max(...state.errors); state.k++; state.current=state.next.slice(); state.history.push({k:state.k,x:state.current.slice(),errors:state.errors.slice(),emax});
    if(emax<state.tolerance){state.converged=true;state.phase='finished';} else if(state.k>=state.maxIterations){state.stoppedByLimit=true;state.phase='finished';} else state.phase='calculate';
  }else{showScreen(0);return;} buildIteration();
}

$('#dimension').addEventListener('change',()=>renderInputs(true));
$('#exampleBtn').addEventListener('click',()=>renderInputs(true));
$('#clearBtn').addEventListener('click',()=>renderInputs(false));
$('#startBtn').addEventListener('click',()=>{try{$('#inputError').hidden=true;readProblem();buildDiagnosis();showScreen(1);}catch(e){$('#inputError').textContent=e.message;$('#inputError').hidden=false;}});
$('#diagnosisContent').addEventListener('click',(event)=>{
  const option=event.target.closest('.method-option');
  if(!option||option.disabled)return;
  state.method=option.dataset.method;
  state.guarantee=true;
  buildFormulas();
  showScreen(2);
});
$('#toInitial').addEventListener('click',()=>{buildInitial();showScreen(3)});
$('#toIterations').addEventListener('click',()=>{try{readInitial();buildIteration();showScreen(4);}catch(e){alert(e.message)}});
$('#nextIteration').addEventListener('click',advanceIteration);
$('#iterationBack').addEventListener('click',()=>state.k===0&&state.phase==='calculate'?showScreen(3):showScreen(0));
$('#restartBtn').addEventListener('click',()=>showScreen(0));
$$('.back-step').forEach((b,i)=>b.addEventListener('click',()=>showScreen(i)));
renderInputs(true);
