import {DAYS,variantMeta} from './workouts.js';
import {clone,uid,localDate,validDate,displayDate,createSession,finishSession,completedSets,lastExercise,nextLoad,weeklySessions,currentStreak,weightTrend,weeklyVolume,allSessionDates} from './core.js';
import {Store,parseBackup,backupText} from './storage.js';
import {esc,lineChart} from './charts.js';
const $=id=>document.getElementById(id), main=$('main'),modal=$('modal');
let state,view='workout',dayId='ua',editingId=null,selectedLift='',deload=false,expanded=new Set(),unsaved=false;
const store=new Store({onStatus:(message,error=false)=>{$('storageStatus').textContent=message;$('storageStatus').classList.toggle('error',error);unsaved=error||message==='Saving…';}});
const persist=()=>store.save(state);
const active=()=>state.sessions.find(s=>s.id===(editingId||state.activeId));
function announce(text){$('announcer').textContent=text;}
function showError(error){alert(error.message||String(error));}
function dialog(title,body){$('modalBody').innerHTML=`<h2 id="modalTitle">${esc(title)}</h2>${body}<button data-action="close">Done</button>`;modal.showModal();}
function field(label,inner){return `<label class="field">${label}${inner}</label>`;}
function pref(ex){return state.preferences[ex.id]||{};}
function formatSets(e){return e.sets.filter(t=>t.done).map(t=>`${t.weight??'—'} × ${t.reps??'—'}`).join(' · ')+` (${e.basis}; ${e.unit})`;}
function render(){
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('on',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
 $('chips').hidden=view!=='workout'||!!active();
 $('chips').innerHTML=DAYS.map(d=>`<button class="chip ${dayId===d.id?'on':''}" data-day="${d.id}" aria-pressed="${dayId===d.id}">${esc(d.title)}<small>${esc(d.sub)}</small></button>`).join('');
 if(view==='progress')renderProgress();else if(active())renderSession(active());else renderPlan();
}
function renderPlan(){
 const day=DAYS.find(d=>d.id===dayId);
 main.innerHTML=`${state.legacy?'<div class="notice">Your original save is preserved. Older charts remain available under Progress → Original history. Start a fresh session to track actual sets accurately.</div>':''}
 <h2 class="daytitle">${esc(day.title)}</h2><p class="lead">${esc(day.subtitle)}</p>
 <div class="actions"><button class="primary" data-action="start">Start workout</button><button class="secondary" data-action="deload" aria-pressed="${deload}">${deload?'✓ ':''}Deload</button></div>
 <p class="muted">${deload?'About half the sets; initial loads reduced to 60%. You can adjust them.':`${day.exercises.reduce((n,e)=>n+e.sets,0)} planned sets · ${state.settings.minutes} minutes available`}</p>
 ${state.settings.minutes<=35&&!day.id.startsWith('s')?'<div class="notice">Short on time? Survival 1 and Survival 2 are available above, or finish this workout early with your completed sets saved.</div>':''}
 ${state.settings.notes?`<p class="notice">${esc(state.settings.notes)}</p>`:''}
 ${day.exercises.map(ex=>{const p=pref(ex),v=ex.variants.find(v=>v.id===p.variantId)||ex.variants[0],meta=variantMeta(ex,v);return `<article class="ex"><div class="top"><h3>${esc(ex.name)}</h3><span class="reps">${deload?Math.ceil(ex.sets/2):ex.sets} × ${esc(meta.target)}</span></div>
 <details><summary>Exercise, equipment & notes</summary>
 ${field('Variation',`<select data-pref="variantId" data-slot="${ex.id}">${ex.variants.map(v=>`<option value="${v.id}" ${v.id===(p.variantId||ex.variants[0].id)?'selected':''}>${esc(v.name)}</option>`).join('')}</select>`)}
 ${field('Equipment name (optional; separate history)',`<input data-pref="equipment" data-slot="${ex.id}" maxlength="100" value="${esc(p.equipment||'')}" placeholder="e.g. Life Time hack squat">`)}
 <div class="field-row">${field('Weight means',`<select data-pref="basis" data-slot="${ex.id}">${['total lb','lb per dumbbell','added lb'].map(x=>`<option ${(p.basis||meta.basis)===x?'selected':''}>${x}</option>`).join('')}</select>`)}${field('Increase (lb)',`<input type="number" min="0.25" max="100" step="0.25" data-pref="increment" data-slot="${ex.id}" value="${p.increment||meta.increment}">`)}</div>
 ${field('Your coaching notes',`<textarea data-pref="note" data-slot="${ex.id}" maxlength="5000" placeholder="Grip, setup, or a reminder to reassess a movement">${esc(p.note??state.legacy?.exNotes?.[ex.legacyKey]??'')}</textarea>`)}
 </details></article>`;}).join('')}`;
}
function renderSession(s){
 const done=completedSets(s),total=s.exercises.filter(e=>!e.skipped).reduce((n,e)=>n+e.sets.length,0);
 main.innerHTML=`<h2 class="daytitle">${editingId?'Edit: ':''}${esc(s.title)} ${s.deload?'<span class="deload-tag">DELOAD</span>':''}</h2><p class="muted">${editingId?'Correct your saved workout. Changes save as you edit.':'Workout in progress · resume here after reopening.'}</p>
 ${field('Workout date',`<input type="date" data-session-date value="${s.date}" max="${localDate()}">`)}
 <div class="session-progress" role="progressbar" aria-label="Completed sets" aria-valuenow="${done}" aria-valuemax="${total}" aria-valuemin="0"><span style="width:${total?done/total*100:0}%"></span></div><p class="muted">${done} / ${total} sets completed</p>
 ${s.exercises.map((e,i)=>{
  const last=lastExercise(state,e.id,s.id),allDone=e.sets.every(t=>t.done),collapse=(allDone||e.skipped)&&!expanded.has(e.slotId);
  let card=`<article class="ex ${e.skipped?'skipped':''}"><div class="top"><h3>${esc(e.name)}</h3><span class="reps">${e.sets.length} × ${esc(e.target)} ${e.unit!=='reps'?e.unit:''}</span></div>
  ${last?`<div class="last-session">Last · ${displayDate(last.date)}${last.deload?' · deload':''}<br>${esc(formatSets(last))}</div>`:'<p class="muted">First session for this variation and equipment.</p>'}
  ${e.note?`<p class="note">${esc(e.note)}</p>`:''}
  ${!e.skipped?`<div class="setgrid head" aria-hidden="true"><span>Set</span><span>${esc(e.basis)}</span><span>${esc(e.unit)}</span><span>RIR*</span><span>Done</span></div>${e.sets.map((t,j)=>`<div class="setgrid ${t.done?'completed':''}"><span class="setno">${j+1}</span>${['weight','reps','rir'].map(key=>`<input type="number" inputmode="decimal" min="0" max="${key==='rir'?10:key==='reps'?1000:10000}" step="${key==='weight'?'.25':'1'}" data-ex="${i}" data-set="${j}" data-value="${key}" value="${t[key]??''}" aria-label="${esc(e.name)} set ${j+1} ${key==='reps'?e.unit:key}" placeholder="${key==='rir'?'—':'0'}">`).join('')}<button class="pip ${t.done?'done':''}" data-action="set" data-ex="${i}" data-set="${j}" aria-pressed="${t.done}" aria-label="Complete ${esc(e.name)} set ${j+1}">${t.done?'✓':j+1}</button></div>`).join('')}`:''}
  ${allDone&&!e.skipped?`<p class="suggestion">Next time: ${nextLoad(e,s.deload).increase?`${nextLoad(e,s.deload).weight} ${esc(e.basis)}. `:''}${esc(nextLoad(e,s.deload).reason)}</p>`:''}
  <details><summary>Notes & exercise options</summary>${field('Session note',`<textarea data-ex-note="${i}" maxlength="5000">${esc(e.note)}</textarea>`)}<div class="actions"><button class="secondary" data-action="skip" data-ex="${i}">${e.skipped?'Restore exercise':'Skip remaining exercise'}</button><button class="secondary" data-action="rest" data-ex="${i}">Rest ${e.rest}s</button></div></details></article>`;
  if(collapse)card=`<details class="finished"><summary class="complete-summary"><b>${e.skipped?'–':'✓'}</b><span>${esc(e.name)}</span><small>${e.skipped?'Skipped':e.sets.length+' sets'}</small></summary>${card}</details>`;
  return card;
 }).join('')}<p class="muted">* RIR = reps you could still do; optional. Log 0 lb for bodyweight movements. Suggested increases never alter today’s records.</p>
 <div class="actions"><button class="primary" data-action="finish">${editingId?'Save corrections':'Finish workout'}</button>${!editingId?'<button class="secondary" data-action="leave">Save & leave</button><button class="secondary" data-action="discard">Discard workout</button>':''}</div>`;
}
function renderProgress(){
 const sessions=state.sessions.filter(s=>s.status==='finished').sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
 const trend=weightTrend(state.measurements.bw,state.settings.goal),volume=weeklyVolume(state),week=weeklySessions(state),points=new Map();
 for(const s of [...sessions].reverse())for(const e of s.exercises){if(e.skipped)continue;const done=e.sets.filter(t=>t.done&&t.weight!==null&&t.reps!==null);if(!done.length)continue;const best=done.reduce((a,b)=>b.weight>a.weight||(b.weight===a.weight&&b.reps>a.reps)?b:a);if(!points.has(e.id))points.set(e.id,{name:e.name,basis:e.basis,unit:e.unit,points:[]});points.get(e.id).points.push({date:s.date,v:best.weight,reps:best.reps,deload:s.deload});}
 if(!points.has(selectedLift))selectedLift=points.keys().next().value||'';
 const lift=points.get(selectedLift),total=allSessionDates(state).length;
 main.innerHTML=`<h2 class="daytitle">Your progress</h2><p class="lead">Actual completed work, one session at a time.</p><div class="metric-grid"><div><strong>${total}</strong><span>Sessions${state.legacy?' incl. original':''}</span></div><div><strong>${currentStreak(state)}</strong><span>Week streak</span></div><div><strong>${trend.current===null?'—':trend.current.toFixed(1)}</strong><span>7-day avg · lb</span></div></div>
 <section class="chartcard"><h3>Lift history</h3>${lift?`${field('Exercise & equipment',`<select id="liftSelect">${[...points].map(([id,l])=>`<option value="${esc(id)}" ${id===selectedLift?'selected':''}>${esc(l.name)} · ${esc(l.basis)}</option>`).join('')}</select>`)}<p class="muted">Heaviest completed set · ${esc(lift.basis)}. Compare reps too; a heavier load alone does not prove a strength gain.</p>${lineChart(lift.points,lift.name+' actual load')}<details><summary>Set results & rep progress</summary><table><thead><tr><th>Date</th><th>Load</th><th>${esc(lift.unit)}</th><th>Mode</th></tr></thead><tbody>${lift.points.slice().reverse().map(p=>`<tr><td>${displayDate(p.date)}</td><td>${p.v}</td><td>${p.reps}</td><td>${p.deload?'Deload':'Normal'}</td></tr>`).join('')}</tbody></table></details>`:'<p class="empty">Finish a workout to see its actual loads and reps here.</p>'}</section>
 <section class="chartcard"><h3>Body weight</h3><p class="muted">Goal: ${state.settings.goal==='bulk'?'Gain':state.settings.goal==='cut'?'Lose':'Maintain'} · ${trend.range[0]} to ${trend.range[1]} lb/week. Adjust your goal in Settings.</p><p class="suggestion">${trend.delta===null?'Log weigh-ins across two weeks for a comparison.':`${trend.delta>0?'+':''}${trend.delta.toFixed(2)} lb versus the previous 7 days${trend.onPace?' · Within target range':' · Outside target range'}`}</p>${lineChart(state.measurements.bw.map(m=>({date:m.date,v:m.v})),'Body weight in pounds')}<p class="muted">The average uses the last 7 calendar days, averaging duplicate same-day weigh-ins first.</p>${['waist','arm'].map(k=>{const a=[...state.measurements[k]].sort((a,b)=>a.date.localeCompare(b.date));return `<p class="muted">${k==='waist'?'Waist':'Flexed arm'}: ${a.length?`${a.at(-1).v} in · ${displayDate(a.at(-1).date)}`:'no measurements yet'}</p>`;}).join('')}</section>
 <section class="chartcard"><h3>Consistency · last 8 weeks</h3>${week.map(w=>`<div class="barrow"><span>${displayDate(w.date)}</span><i style="width:${w.count/Math.max(...week.map(w=>w.count),1)*100}%"></i><b>${w.count}</b></div>`).join('')}<p class="muted">Weeks begin Monday. Empty weeks break a streak; the current week has time to continue last week’s streak.</p></section>
 <section class="chartcard"><h3>Completed sets this week</h3>${Object.keys(volume).length?Object.entries(volume).map(([g,n])=>`<div class="measrow"><span>${esc(g)}</span><b>${n}</b></div>`).join(''):'<p class="empty">Your completed sets will appear here.</p>'}<p class="muted">Primary exercise groups only; compound sets are not counted again for each assisting muscle. Includes deload sets; original history lacks set details.</p></section>
 <h3 class="section-title">Workout history</h3>${sessions.length?sessions.map(s=>`<div class="history-row"><div><b>${esc(s.title)}${s.deload?' · Deload':''}</b><p class="muted">${displayDate(s.date)} · ${completedSets(s)} completed sets</p></div><button class="secondary" data-edit-session="${esc(s.id)}">Edit</button></div>`).join(''):'<p class="empty">Finished workouts appear here, including shortened sessions.</p>'}
 ${state.legacy?`<details><summary class="section-title">Original history · unverified</summary><p class="notice">Preserved exactly from the old app. Some loads may already include automatic increases; they cannot be reliably corrected without your records. Original date labels are retained.</p>${Object.values(state.legacy.history?.lifts||{}).map(l=>`<div class="chartcard"><h3>${esc(l.name)} · ${esc(l.day||'')}</h3>${lineChart((l.pts||[]).filter(p=>validDate(p.d)&&Number.isFinite(p.w)).map(p=>({date:p.d,v:p.w})),l.name+' original history')}</div>`).join('')||'<p class="muted">No original charts. Saved loads, notes and checkmarks remain in your backup.</p>'}</details>`:''}`;
}
function settings(){
 dialog('Settings & backup',`${field('Training goal',`<select id="goal"><option value="bulk" ${state.settings.goal==='bulk'?'selected':''}>Gain · +0.25 to +0.5 lb/week</option><option value="cut" ${state.settings.goal==='cut'?'selected':''}>Lose · −1 to −0.25 lb/week</option><option value="maintain" ${state.settings.goal==='maintain'?'selected':''}>Maintain · ±0.25 lb/week</option></select>`)}
 ${field('Available workout time (minutes)',`<input id="minutes" type="number" min="10" max="180" value="${state.settings.minutes}">`)}${field('Personal reminders / current training considerations',`<textarea id="globalNotes" maxlength="10000" placeholder="Your own current notes; update as circumstances change.">${esc(state.settings.notes)}</textarea>`)}
 <button data-action="save-settings">Save settings</button>
 <h3 class="gsec">Keep your history safe</h3><p class="dim">Workouts are saved in this browser. Export regularly and before changing devices or clearing browser data. There is no automatic cloud sync.</p><div class="actions"><button data-action="export">Export backup</button><button class="secondary" data-action="import">Import backup</button></div>${store.blocked?'<button data-action="recovery">Export unreadable original data</button>':''}<p class="dim">Import replaces the current device’s data after downloading a safety copy. You can restore either copy later.</p>
 <h3 class="gsec">Using Training Card</h3><p class="dim">Choose a variation and equipment before starting. Enter each set’s load and result, then tap its checkmark. Finish saves completed sets even if you skip exercises. RIR is optional. Suggested load increases require every planned set at the same weight to meet the rep target; distance, timed, explosive and drop-set movements use manual progression.</p><p class="dim">Coaching notes are editable. This app does not assess injuries or decide which movements are appropriate for you.</p>`);
}
function logDialog(){
 dialog('Measurements',`${field('Measurement',`<select id="logKind"><option value="bw">Body weight · lb</option><option value="waist">Waist at navel · in</option><option value="arm">Flexed arm · in</option></select>`)}<div class="field-row">${field('Date',`<input id="logDate" type="date" value="${localDate()}" max="${localDate()}">`)}${field('Value',`<input id="logValue" type="number" min="0.01" max="2000" step="0.01" inputmode="decimal">`)}</div><button data-action="add-log">Save measurement</button><h3 class="gsec">Edit a recent entry</h3>${['bw','waist','arm'].flatMap(kind=>state.measurements[kind].map(m=>({...m,kind}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(m=>`<div class="history-row"><div><b>${m.kind==='bw'?'Weight':m.kind==='waist'?'Waist':'Arm'} · ${m.v}</b><p class="muted">${displayDate(m.date)}</p></div><button class="secondary" data-edit-log="${esc(m.id)}" data-kind="${m.kind}">Edit</button></div>`).join('')}`);
}
function download(text,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backup(){download(backupText(state),'training-card-'+localDate()+'.json');}
let timerId,endTime=0,audio=null;
function startRest(seconds){clearInterval(timerId);endTime=Date.now()+seconds*1000;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}const tick=()=>{const left=Math.max(0,Math.ceil((endTime-Date.now())/1000));$('timer').style.display='block';$('timer').textContent=left?`REST ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} · tap to stop`:'GO · rest complete';if(!left){clearInterval(timerId);announce('Rest complete');try{navigator.vibrate?.(200);const o=audio.createOscillator(),g=audio.createGain();g.gain.value=.1;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.2);}catch{}}};tick();timerId=setInterval(tick,250);}
$('timer').onclick=()=>{clearInterval(timerId);$('timer').style.display='none';};
let wakeWanted=false,wakeLock=null;
async function acquireWake(){try{if(wakeWanted&&document.visibilityState==='visible'&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}}catch{wakeWanted=false;$('wakeBtn').classList.remove('on');$('wakeBtn').setAttribute('aria-pressed','false');announce('Keep awake is unavailable in this browser.');}}
$('wakeBtn').onclick=async()=>{wakeWanted=!wakeWanted;$('wakeBtn').classList.toggle('on',wakeWanted);$('wakeBtn').setAttribute('aria-pressed',String(wakeWanted));if(wakeWanted)await acquireWake();else{await wakeLock?.release();wakeLock=null;}};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')acquireWake();});
window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key==='gym-card-state-v2'){store.blocked=true;unsaved=true;$('storageStatus').textContent='This data changed in another tab. Export any local changes, then reload before continuing.';$('storageStatus').classList.add('error');}});

document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b||!state)return;
 try{
  if(b.dataset.day){dayId=b.dataset.day;render();return;}
  if(b.dataset.view){view=b.dataset.view;editingId=null;render();window.scrollTo(0,0);return;}
  if(b.dataset.editSession){editingId=b.dataset.editSession;view='workout';expanded.clear();render();window.scrollTo(0,0);return;}
  if(b.dataset.editLog){const m=state.measurements[b.dataset.kind].find(x=>x.id===b.dataset.editLog);const v=prompt('Correct value:',m.v);if(v!==null&&Number.isFinite(+v)&&+v>0&&+v<=2000){m.v=+v;await persist();modal.close();logDialog();render();}return;}
  const a=b.dataset.action,s=active(),i=+b.dataset.ex,j=+b.dataset.set;
  if(store.blocked&&['start','set','skip','finish','discard','add-log','save-settings'].includes(a))throw Error('Saving is paused to protect existing data. Export a backup and reload, or import a valid backup in Settings.');
  if(a==='close'){modal.close();return;}
  if(a==='settings'){settings();return;}
  if(a==='log'){logDialog();return;}
  if(a==='save-settings'){const minutes=+$('minutes').value;if(minutes<10||minutes>180||!Number.isFinite(minutes))throw Error('Choose 10–180 minutes.');state.settings={goal:$('goal').value,minutes,notes:$('globalNotes').value};await persist();modal.close();render();return;}
  if(a==='export'){backup();return;}if(a==='recovery'){download(store.lastRaw||'','training-card-recovery.txt');return;}
  if(a==='import'){$('importFile').click();return;}
  if(a==='deload'){deload=!deload;render();return;}
  if(a==='start'){createSession(state,DAYS.find(d=>d.id===dayId),variantMeta,{deload});expanded.clear();await persist();render();return;}
  if(a==='set'){
   const invalid=[...main.querySelectorAll('input')].find(el=>!el.checkValidity());if(invalid){invalid.reportValidity();return;}
   const e=s.exercises[i],t=e.sets[j];if(!t.done&&(t.weight===null||t.reps===null||t.reps<=0))throw Error('Enter a weight (0 for bodyweight) and a positive result before checking this set.');
   t.done=!t.done;s.updatedAt=new Date().toISOString();if(t.done&&!editingId)startRest(e.rest);await persist();render();return;
  }
  if(a==='skip'){
   const e=s.exercises[i];if(e.skipped)e.skipped=false;
   else if(e.sets.some(t=>t.done)){if(!confirm('Keep completed sets and remove the remaining planned sets?'))return;e.sets=e.sets.filter(t=>t.done);e.partial=true;}
   else e.skipped=true;s.updatedAt=new Date().toISOString();await persist();render();return;
  }
  if(a==='rest'){startRest(s.exercises[i].rest);return;}
  if(a==='discard'){if(!confirm('Discard this in-progress workout? Finished history will stay unchanged.'))return;state.sessions=state.sessions.filter(x=>x.id!==s.id);state.activeId=null;editingId=null;await persist();render();return;}
  if(a==='leave'){view='progress';await persist();render();return;}
  if(a==='finish'){
   const invalid=[...main.querySelectorAll('input')].find(el=>!el.checkValidity());if(invalid){invalid.reportValidity();return;}
   const pending=s.exercises.reduce((n,e)=>n+(e.skipped?0:e.sets.filter(t=>!t.done).length),0);
   if(pending&&!confirm(`Finish with ${completedSets(s)} completed sets and ${pending} unfinished sets? Your completed work will be saved.`))return;
   finishSession(state,s.id);await persist();editingId=null;view='progress';$('timer').click();render();window.scrollTo(0,0);announce('Workout saved');return;
  }
  if(a==='add-log'){
   const v=+$('logValue').value,date=$('logDate').value,kind=$('logKind').value;
   if(!Number.isFinite(v)||v<=0||v>2000||!validDate(date)||date>localDate())throw Error('Enter a valid date and positive measurement.');
   state.measurements[kind].push({id:uid(),date,v});await persist();modal.close();logDialog();render();return;
  }
 }catch(error){showError(error);}
});
document.addEventListener('input',event=>{
 const el=event.target,s=active();
 if(store.blocked)return;
 if(el.dataset.value){
  const key=el.dataset.value,v=el.value===''?null:Number(el.value),max=key==='rir'?10:key==='reps'?1000:10000;
  if(v!==null&&(!Number.isFinite(v)||v<0||v>max)){el.setCustomValidity('Enter a valid nonnegative value.');return;}el.setCustomValidity('');
  const t=s.exercises[+el.dataset.ex].sets[+el.dataset.set];t[key]=v;if(t.done&&(t.weight===null||t.reps===null||t.reps<=0))t.done=false;s.updatedAt=new Date().toISOString();persist();
 }
 if(el.dataset.exNote!==undefined){s.exercises[+el.dataset.exNote].note=el.value;s.updatedAt=new Date().toISOString();persist();}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(store.blocked)return;
 try{
  if(el.dataset.pref){const ex=DAYS.flatMap(d=>d.exercises).find(e=>e.id===el.dataset.slot),p=pref(ex),v=ex.variants.find(v=>v.id===p.variantId)||ex.variants[0],meta=variantMeta(ex,v);
   const next={variantId:v.id,equipment:'',note:state.legacy?.exNotes?.[ex.legacyKey]??'',basis:meta.basis,increment:meta.increment,...p};
   if(el.dataset.pref==='increment'&&(!Number.isFinite(+el.value)||+el.value<.25||+el.value>100))throw Error('Choose an increment from 0.25–100 lb.');
   next[el.dataset.pref]=el.dataset.pref==='increment'?+el.value:el.value;
   if(el.dataset.pref==='variantId')next.basis=variantMeta(ex,ex.variants.find(v=>v.id===el.value)).basis;
   state.preferences[ex.id]=next;persist();if(el.dataset.pref==='variantId')render();
  }
  if(el.hasAttribute('data-session-date')){if(!validDate(el.value)||el.value>localDate())throw Error('Choose a valid date, today or earlier.');active().date=el.value;active().updatedAt=new Date().toISOString();persist();}
  if(el.id==='liftSelect'){selectedLift=el.value;renderProgress();}
 }catch(error){showError(error);render();}
});
$('importFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>10*1024*1024)throw Error('Backup is larger than 10 MB.');const next=parseBackup(await file.text());
  if(!confirm('Replace this device’s workouts and settings with this backup? A safety copy of the current data will download first.'))return;
  if(store.blocked&&store.lastRaw)download(store.lastRaw,'training-card-recovery-before-import.txt');else backup();
  if(!await store.replace(next))throw Error('Import could not be saved. The current screen has not been replaced.');
  state=next;editingId=null;view='workout';modal.close();render();announce('Backup imported');
 }catch(error){showError(error);}finally{event.target.value='';}
};
state=await store.load();render();if(!store.blocked)await persist();
