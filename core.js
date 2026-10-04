export const VERSION=2;
export const clone=value=>JSON.parse(JSON.stringify(value));
export const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function localDate(value=new Date()) {
 const d=value instanceof Date?value:new Date(value);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function validDate(s) {
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T12:00:00');return !isNaN(d)&&localDate(d)===s;
}
export function displayDate(s){return validDate(s)?new Date(s+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Unknown date';}
export function weekStart(s=localDate()) {
 const d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return localDate(d);
}
export function addDays(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d);}
export function freshState(){return {schemaVersion:VERSION,settings:{goal:'bulk',minutes:60,notes:''},preferences:{},sessions:[],activeId:null,measurements:{bw:[],waist:[],arm:[]},legacy:null};}
export function migrate(raw) {
 if(raw?.schemaVersion!==undefined&&raw.schemaVersion!==VERSION)throw Error('Unsupported backup version. Nothing was replaced.');
 if(raw?.schemaVersion===VERSION){validate(raw);return clone(raw);}
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['weights','history','checks','log'].some(k=>k in raw))throw Error('This is not a Training Card backup.');
 const s=freshState();s.legacy=clone(raw);
 if(raw.log&&['bw','waist','arm'].some(k=>raw.log[k]!==undefined&&!Array.isArray(raw.log[k])))throw Error('Original measurement data is malformed.');
 if(raw.history&&((raw.history.sessions!==undefined&&!Array.isArray(raw.history.sessions))||(raw.history.lifts!==undefined&&(!raw.history.lifts||typeof raw.history.lifts!=='object'||Array.isArray(raw.history.lifts)))))throw Error('Original workout history is malformed.');
 for(const kind of ['bw','waist','arm'])s.measurements[kind]=(raw.log?.[kind]||[]).filter(e=>Number.isFinite(e.v)&&e.v>0&&!isNaN(new Date(e.d))).map((e,i)=>({id:`legacy-${kind}-${i}-${e.d}`,date:localDate(new Date(e.d)),v:e.v}));
 validate(s);return s;
}
const finite=(v,min=0,max=10000)=>Number.isFinite(v)&&v>=min&&v<=max;
const str=(s,n=1000)=>typeof s==='string'&&s.length<=n;
export function validate(s){
 const bad=()=>{throw Error('Backup has invalid or unsupported data. Nothing was replaced.');};
 if(!s||s.schemaVersion!==VERSION||!Array.isArray(s.sessions)||s.sessions.length>20000||!s.settings||!['bulk','cut','maintain'].includes(s.settings.goal)||!finite(s.settings.minutes,10,180)||!str(s.settings.notes,10000)||!s.preferences||typeof s.preferences!=='object'||Array.isArray(s.preferences))bad();
 if(s.legacy!=null){if(typeof s.legacy!=='object'||Array.isArray(s.legacy))bad();const h=s.legacy.history;if(h){if(h.sessions!==undefined&&!Array.isArray(h.sessions))bad();if(h.lifts!==undefined&&(!h.lifts||typeof h.lifts!=='object'||Array.isArray(h.lifts)))bad();for(const l of Object.values(h.lifts||{}))if(!l||!str(l.name)||!Array.isArray(l.pts))bad();}}
 for(const p of Object.values(s.preferences)){
  if(!p||!str(p.variantId)||!str(p.equipment,100)||!str(p.note,5000)||!['total lb','lb per dumbbell','added lb'].includes(p.basis)||!finite(p.increment,0.25,100))bad();
 }
 const ids=new Set();let active=0;
 for(const session of s.sessions){
  if(!session||!str(session.id)||ids.has(session.id)||!validDate(session.date)||!str(session.dayId)||!str(session.title)||!['active','finished'].includes(session.status)||!Array.isArray(session.exercises)||session.exercises.length>100||typeof session.deload!=='boolean'||!str(session.startedAt)||!str(session.updatedAt))bad();
  ids.add(session.id);if(session.status==='active')active++;
  for(const e of session.exercises){
   if(!e||!str(e.id)||!str(e.slotId)||!str(e.name)||!str(e.group)||!str(e.note,5000)||!['reps','seconds','meters'].includes(e.unit)||!['total lb','lb per dumbbell','added lb'].includes(e.basis)||!['manual','double'].includes(e.progression)||!str(e.target)||!finite(e.increment,0.25,100)||!finite(e.rest,0,1800)||typeof e.skipped!=='boolean'||(e.partial!==undefined&&typeof e.partial!=='boolean')||!Array.isArray(e.sets)||e.sets.length>30)bad();
   for(const set of e.sets)if(!set||typeof set.done!=='boolean'||!(set.weight===null||finite(set.weight))||!(set.reps===null||finite(set.reps,0,1000))||!(set.rir===null||finite(set.rir,0,10)))bad();
  }
 }
 if(active>1||(s.activeId!==null&&(!str(s.activeId)||!s.sessions.some(x=>x.id===s.activeId&&x.status==='active')))||(active===1&&s.activeId===null))bad();
 for(const kind of ['bw','waist','arm']){
  if(!Array.isArray(s.measurements?.[kind])||s.measurements[kind].length>50000)bad();
  const mids=new Set();for(const m of s.measurements[kind]){if(!m||!str(m.id)||mids.has(m.id)||!validDate(m.date)||!finite(m.v,0.01,2000))bad();mids.add(m.id);}
 }
 return true;
}
export function exerciseKey(variantId,equipment='',basis='total lb'){return JSON.stringify([variantId,equipment.trim().toLowerCase(),basis]);}
export function lastExercise(s,id,beforeId=null) {
 return s.sessions.filter(x=>x.status==='finished'&&x.id!==beforeId).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt)).flatMap(x=>x.exercises.filter(e=>e.id===id&&!e.skipped&&e.sets.some(t=>t.done)).map(e=>({...e,date:x.date,deload:x.deload}))).find(Boolean)||null;
}
export function topTarget(target){const nums=target.match(/\d+/g);return nums?Math.max(...nums.map(Number)):null;}
export function nextLoad(e,deload=false) {
 const done=e.sets.filter(s=>s.done), top=topTarget(e.target);
 if(!done.length)return {weight:null,increase:false,reason:'No completed sets yet.'};
 const weight=done.at(-1).weight;
 if(deload)return {weight,increase:false,reason:'Deload recorded separately; no automatic increase.'};
 if(e.progression!=='double'||e.unit!=='reps')return {weight,increase:false,reason:'Progress this movement manually.'};
 const ready=!e.skipped&&!e.partial&&top!==null&&e.sets.length>0&&e.sets.every(s=>s.done&&s.weight===weight&&s.reps>=top&&s.reps!==null)&&weight>0;
 return {weight:ready?Math.round((weight+e.increment)*100)/100:weight,increase:ready,reason:ready?`All sets reached ${top}. Suggested increase: ${e.increment} lb.`:`Repeat the load until all planned sets reach ${top??'the target'} with consistent form.`};
}
export function createSession(state,day,metaFor,{deload=false,date=localDate()}={}){
 if(state.activeId)throw Error('Finish or resume your current workout first.');
 const now=new Date().toISOString();
 const session={id:uid(),dayId:day.id,title:day.title,date,startedAt:now,updatedAt:now,status:'active',deload,exercises:[]};
 session.exercises=day.exercises.map(ex=>{
  const p=state.preferences[ex.id]||{},variant=ex.variants.find(v=>v.id===p.variantId)||ex.variants[0],meta=metaFor(ex,variant);
  const basis=p.basis||meta.basis,id=exerciseKey(variant.id,p.equipment,basis);
  const previous=lastExercise(state,id);
  // Normal-session targets do not inherit a reduced deload weight.
  const normal=state.sessions.filter(s=>s.status==='finished'&&!s.deload).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt)).flatMap(s=>s.exercises).find(e=>e.id===id&&!e.skipped&&e.sets.some(t=>t.done));
  const legacy=(p.equipment||(p.basis&&p.basis!==meta.basis)||(p.variantId&&p.variantId!==ex.variants[0].id))?null:state.legacy?.weights?.[ex.legacyKey];
  let weight=normal?nextLoad(normal).weight:previous?.sets.filter(t=>t.done).at(-1)?.weight??(Number.isFinite(legacy)?legacy:null);
  if(deload&&weight!==null)weight=Math.round(weight*0.6*4)/4;
  return {id,slotId:ex.id,name:variant.name+(p.equipment?' · '+p.equipment.trim():''),group:ex.group,...meta,basis,increment:p.increment||meta.increment,rest:ex.rest,note:p.note??state.legacy?.exNotes?.[ex.legacyKey]??'',skipped:false,partial:false,
   sets:Array.from({length:deload?Math.ceil(ex.sets/2):ex.sets},()=>({weight,reps:null,rir:null,done:false}))};
 });
 state.sessions.push(session);state.activeId=session.id;return session;
}
export function finishSession(state,id){
 const s=state.sessions.find(x=>x.id===id);if(!s)throw Error('Workout not found.');
 if(!s.exercises.some(e=>!e.skipped&&e.sets.some(t=>t.done)))throw Error('Log at least one completed set before finishing.');
 for(const e of s.exercises)for(const t of e.sets)if(!e.skipped&&t.done&&(t.reps===null||t.reps<=0||t.weight===null))throw Error('Enter a weight (0 for bodyweight) and a positive result for every completed set.');
 s.status='finished';s.updatedAt=new Date().toISOString();if(state.activeId===id)state.activeId=null;return s;
}
export const completedSets=s=>s.exercises.reduce((n,e)=>n+(e.skipped?0:e.sets.filter(t=>t.done).length),0);
export function allSessionDates(state){return [...state.sessions.filter(s=>s.status==='finished').map(s=>s.date),...(state.legacy?.history?.sessions||[]).map(s=>s.d).filter(validDate)];}
export function weeklySessions(state,today=localDate(),count=8){
 const map=new Map();allSessionDates(state).forEach(d=>{const w=weekStart(d);map.set(w,(map.get(w)||0)+1);});
 const current=weekStart(today);return Array.from({length:count},(_,i)=>{const date=addDays(current,(i-count+1)*7);return {date,count:map.get(date)||0};});
}
export function currentStreak(state,today=localDate()){
 const weeks=new Set(allSessionDates(state).filter(d=>d<=today).map(weekStart));let w=weekStart(today),n=0;
 if(!weeks.has(w))w=addDays(w,-7);
 while(weeks.has(w)){n++;w=addDays(w,-7);}return n;
}
export function weightTrend(entries,goal,today=localDate()){
 // Average per calendar day first so repeated weigh-ins do not overweight a day.
 const days=new Map();for(const e of entries){if(e.date>today)continue;const a=days.get(e.date)||[];a.push(e.v);days.set(e.date,a);}
 const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
 const window=(start,end)=>mean([...days].filter(([d])=>d>=start&&d<=end).map(([,v])=>mean(v)));
 const current=window(addDays(today,-6),today),previous=window(addDays(today,-13),addDays(today,-7));
 const delta=current!==null&&previous!==null?current-previous:null;
 const range=goal==='bulk'?[0.25,0.5]:goal==='cut'?[-1,-0.25]:[-0.25,0.25];
 return {current,previous,delta,onPace:delta!==null&&delta>=range[0]-1e-8&&delta<=range[1]+1e-8,range};
}
export function weeklyVolume(state,today=localDate()){
 const groups={};state.sessions.filter(s=>s.status==='finished'&&s.date>=weekStart(today)&&s.date<=today).forEach(s=>s.exercises.forEach(e=>{if(!e.skipped)groups[e.group]=(groups[e.group]||0)+e.sets.filter(t=>t.done).length;}));return groups;
}
