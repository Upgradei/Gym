const LEGACY_DAYS = [
 {id:"ua", chip:"Upper A", sub:"Back + Delts", title:"Upper A", subtitle:"Back & shoulder emphasis", ex:[
   {n:"Chest-Supported Row", s:[4,5], r:"8–12", note:"Squeeze shoulder blades, 2-sec hold. Pain-free pulling priority."},
   {n:"Neutral-Grip Lat Pulldown", s:[3,4], r:"10–12", note:"<b>Stop if burning appears</b> — swap to single-arm kneeling pulldown."},
   {n:"Seated DB Shoulder Press", s:[3,3], r:"8–10", note:"Pressing is pain-free for you — train normally."},
   {n:"DB Lateral Raise", s:[4,5], r:"12–15", note:"Priority movement. Strict and controlled."},
   {n:"Face Pull", s:[3,4], r:"15", note:"Rope, high cable. Every upper day, forever."},
   {n:"Incline DB Curl", s:[3,3], r:"10–12", note:"Now a growth focus — you asked for arms. Slow negatives, full stretch."}]},
 {id:"la", chip:"Lower A", sub:"Strength", title:"Lower A", subtitle:"Strength emphasis", ex:[
   {n:"Back Squat / Hack Squat", s:[4,4], r:"5–8", inc:10, note:"Rebuilding toward 305+. Start ~185."},
   {n:"Romanian Deadlift", s:[3,3], r:"8–10", inc:10, note:"Hamstrings + glutes; kind to your back."},
   {n:"Walking Lunge", s:[2,2], r:"10/leg", note:""},
   {n:"Standing Calf Raise", s:[4,4], r:"10–12", note:"Full stretch, 2-sec pause at bottom."},
   {n:"CORE · Ab Wheel / Long-Lever Plank", s:[3,3], r:"8–12", note:"Anti-extension. Ribs down, squeeze glutes — do NOT let your lower back arch. Plank: 20–40s holds if no wheel."},
   {n:"CORE · Pallof Press", s:[3,3], r:"10/side", note:"Anti-rotation. Add a 2-sec hold at full extension; progress load over time. Protects the back, powers the swing."}]},
 {id:"ub", chip:"Upper B", sub:"Chest + Width", title:"Upper B", subtitle:"Chest & width emphasis", ex:[
   {n:"Incline Press (30°)", s:[4,4], r:"6–10", note:"Barbell or DB. #1 chest priority — upper pec."},
   {n:"Weighted Dip / Flat DB Press", s:[3,3], r:"8–12", note:""},
   {n:"Single-Arm Cable Row", s:[3,4], r:"10–12/side", note:"Watch for right/left differences — report them."},
   {n:"Cable Lateral Raise", s:[3,4], r:"12–15", note:"Second weekly lateral hit."},
   {n:"Reverse Pec-Deck", s:[3,4], r:"15", note:"Rear delts."},
   {n:"Overhead Rope Triceps Ext.", s:[3,3], r:"12", note:"Growth focus now. Long head = arm size. Full overhead stretch."}]},
 {id:"lb", chip:"Lower B", sub:"+ Athletic", title:"Lower B", subtitle:"Legs + athletic work", ex:[
   {n:"Trap-Bar Deadlift", s:[4,4], r:"5–6", inc:10, note:"Safest heavy pull for your back. Toward 305+."},
   {n:"Bulgarian Split Squat", s:[3,3], r:"8–10/leg", note:""},
   {n:"Med-Ball Rotational Throw", s:[3,3], r:"5/side", note:"Explosive intent — this is swing speed. Core-essential, not optional."},
   {n:"Kettlebell Swing", s:[3,3], r:"8–10", note:"Explosive hip snap — hinge, don't squat it. Golf-swing power. Let the hips do the work, arms just guide."},
   {n:"Seated Calf Raise", s:[3,3], r:"12–15", note:""},
   {n:"CORE · Suitcase Carry", s:[3,3], r:"20m/side", note:"Anti-lateral-flexion. Heavy DB one side, walk tall and level — don't lean. Elite trunk + posture work."},
   {n:"CORE · Hanging / Lying Leg Raise", s:[2,2], r:"10–15", note:"Your one bit of controlled flexion. Slow, no swing. Shoulder cranky? → lying version."}]},
 {id:"d5", chip:"Day 5", sub:"Arms + weak pts", title:"Day 5", subtitle:"Arms, rear delts & weak-point work. The lean-bulk bonus day — drop it on a busy week with no guilt.", ex:[
   {n:"Neutral-Grip Pull-Up", s:[3,4], r:"AMRAP", note:"Pain-free range only. Assisted is fine. Back width first, before the arm pump."},
   {n:"Incline DB Curl", s:[3,3], r:"10–12", note:"Stretch-biased — arms grow from the long head here. Slow negatives."},
   {n:"Overhead Rope Triceps Ext.", s:[3,3], r:"12–15", note:"Long-head triceps = most of your arm size. Full stretch overhead."},
   {n:"Cable/EZ Bar Curl", s:[3,3], r:"10–12", note:"Second curl angle. Strict, no swinging."},
   {n:"Rope Pushdown", s:[3,3], r:"12–15", note:"Spread the rope at the bottom."},
   {n:"Reverse Pec-Deck or Face Pull", s:[3,3], r:"15–20", note:"Rear delts — keeps the taper ahead of the arms."},
   {n:"Lateral Raise (drop set)", s:[2,2], r:"12 + drop", note:"One more delt hit for width."}],
   cardio:"Optional conditioning · 8–10 rounds 30s hard / 60s easy · only if recovery is good"},
 {id:"s1", chip:"Survival 1", sub:"30 min", title:"Survival 1", subtitle:"Exam-block upper · 30 min. Downshift, don't quit.", ex:[
   {n:"Chest-Supported Row", s:[3,3], r:"10", note:""},
   {n:"Incline DB Press", s:[3,3], r:"10", note:""},
   {n:"DB Lateral Raise", s:[2,2], r:"15", note:""},
   {n:"Face Pull", s:[2,2], r:"15", note:""}]},
 {id:"s2", chip:"Survival 2", sub:"30 min", title:"Survival 2", subtitle:"Exam-block lower · 30 min. Two of these per week maintains everything.", ex:[
   {n:"Hack Squat / Trap-Bar DL", s:[3,3], r:"8", note:""},
   {n:"Romanian Deadlift", s:[2,2], r:"10", note:""},
   {n:"Calf Raise", s:[3,3], r:"12", note:""},
   {n:"Pallof Press", s:[2,2], r:"10/side", note:""}]}
];

// Stable exercise identities stay independent of array position and display labels.
export const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const alternatives = {
 'Back Squat / Hack Squat':['Back Squat','Hack Squat'],
 'Incline Press (30°)':['Incline Barbell Press','Incline DB Press'],
 'Weighted Dip / Flat DB Press':['Weighted Dip','Flat DB Press'],
 'CORE · Ab Wheel / Long-Lever Plank':['Ab Wheel','Long-Lever Plank'],
 'CORE · Hanging / Lying Leg Raise':['Hanging Leg Raise','Lying Leg Raise'],
 'Reverse Pec-Deck or Face Pull':['Reverse Pec-Deck','Face Pull'],
 'Hack Squat / Trap-Bar DL':['Hack Squat','Trap-Bar Deadlift']
};
const groups = {
 ua:['Back','Back','Shoulders','Shoulders','Rear delts','Biceps'],
 la:['Quads','Hamstrings / glutes','Quads','Calves','Core','Core'],
 ub:['Chest','Chest','Back','Shoulders','Rear delts','Triceps'],
 lb:['Hamstrings / glutes','Quads','Power','Power','Calves','Core','Core'],
 d5:['Back','Biceps','Triceps','Biceps','Triceps','Rear delts','Shoulders'],
 s1:['Back','Chest','Shoulders','Rear delts'],s2:['Legs','Hamstrings / glutes','Calves','Core']
};
export const DAYS = LEGACY_DAYS.map(day => ({
 id:day.id, title:day.title, sub:day.sub,
 subtitle:day.id.startsWith('s')?'Short-session option for busy days.':day.subtitle,
 exercises:day.ex.map((e,index)=>({
 id:day.id+'-'+slug(e.n), legacyKey:day.id+'-'+index, name:e.n.replace('CORE · ',''),
 sets:e.s[0], target:e.r, group:groups[day.id][index], increment:e.inc||5,
 variants:(alternatives[e.n]||[e.n.replace('CORE · ','')]).map(name=>({id:slug(name),name})),
 note:'', rest: /AMRAP/.test(e.r)?120:parseInt(e.r)<=6?180:parseInt(e.r)<=8?150:parseInt(e.r)<=10?120:parseInt(e.r)<=12?90:60
 }))
}));
export function variantMeta(ex, variant) {
 const name=variant.name;
 const unit=/Plank/.test(name)?'seconds':/Carry/.test(name)?'meters':'reps';
 const target=unit==='seconds'?'20–40':unit==='meters'?'20':ex.target;
 const bodyweight=/Pull-Up|Leg Raise|Ab Wheel|Plank/.test(name);
 return {unit,target,basis:/Weighted Dip/.test(name)||bodyweight?'added lb':/DB|Dumbbell|Lunge|Split Squat/.test(name)?'lb per dumbbell':'total lb',
 progression:unit!=='reps'||/AMRAP|drop|Throw|Swing/.test(target+' '+name)?'manual':'double',
 increment:ex.increment};
}
