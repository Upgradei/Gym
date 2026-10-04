import {freshState,migrate,validate,clone} from './core.js';
export const KEY='gym-card-state-v2';
export const LEGACY_KEY='gym-card-state';
export class Store {
 constructor({local,remote=globalThis.window?.storage,onStatus=()=>{}}={}){if(!local){try{local=globalThis.localStorage;}catch{local={getItem(){throw Error('Storage access denied');},setItem(){throw Error('Storage access denied');}};}}this.local=local;this.remote=remote;this.onStatus=onStatus;this.queue=Promise.resolve();this.mode='local';this.blocked=false;this.lastRaw=null;}
 async read(key){return this.mode==='remote'?(await this.remote.get(key))?.value:this.local.getItem(key);}
 async load(){
  try{
   // Never treat a storage read error as an empty save and overwrite it.
   let raw;
   if(this.remote?.get&&this.remote?.set){
    this.mode='remote';
    const readOptional=async key=>{try{return await this.read(key);}catch(e){if(/not found|does not exist|no value/i.test(e.message||''))return null;throw e;}};
    raw=await readOptional(KEY);
    if(!raw)raw=await readOptional(LEGACY_KEY);
    if(!raw&&this.local)raw=this.local.getItem(KEY)||this.local.getItem(LEGACY_KEY);
   }else{
    raw=this.local.getItem(KEY)||this.local.getItem(LEGACY_KEY);
   }
   this.lastRaw=raw||null;
   const state=raw?migrate(JSON.parse(raw)):freshState();
   if(state.legacy)this.onStatus('Original data preserved. Older history is shown as unverified; new sessions use accurate set records.');
   return state;
  }catch(error){this.blocked=true;this.onStatus('Saved data could not be read. Automatic saving is paused to protect it. Export recovery data or import a valid backup.',true);return freshState();}
 }
 save(state){
  if(this.blocked)return Promise.resolve(false);
  const raw=JSON.stringify(state);
  if(this.mode==='local'){
   try{this.local.setItem(KEY,raw);this.lastRaw=raw;this.onStatus('Saved on this device');return Promise.resolve(true);}
   catch{this.onStatus('Not saved: device storage is unavailable or full. Export a backup before closing.',true);return Promise.resolve(false);}
  }
  this.onStatus('Saving…');
  this.queue=this.queue.then(async()=>{try{await this.remote.set(KEY,raw);this.lastRaw=raw;this.onStatus('Saved');return true;}catch{this.onStatus('Not saved: storage is unavailable. Export a backup before closing.',true);return false;}});return this.queue;
 }
 async replace(state){
  validate(state);
  await this.queue;
  const old=await this.read(KEY);
  if(old){if(this.mode==='remote')await this.remote.set(KEY+'-before-import',old);else this.local.setItem(KEY+'-before-import',old);}
  this.blocked=false;return this.save(clone(state));
 }
}
export function parseBackup(text){if(text.length>10*1024*1024)throw Error('Backup is larger than 10 MB.');const raw=JSON.parse(text);const state=migrate(raw.state||raw);validate(state);return state;}
export function backupText(state){return JSON.stringify({app:'Training Card',exportedAt:new Date().toISOString(),state},null,2);}
