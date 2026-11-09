import {validState,restoreState} from './core.js';
export const DB_NAME='rogue-walk-v1';
export class SaveStore{
 constructor(){this.revision=0;this.tail=Promise.resolve();this.failed=false;}
 async open(){
  this.db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別の画面を閉じてください'));});
  this.db.onversionchange=()=>{this.failed=true;this.db.close();};
  const record=await new Promise((resolve,reject)=>{const req=this.db.transaction('state').objectStore('state').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  if(record&&(!Number.isSafeInteger(record.revision)||record.revision<1))throw new Error('保存データを安全に読み込めません。初期化はしていません');
  const state=record?restoreState(record.state):null;
  this.revision=record?.revision||0;return state;
 }
 save(state){
  if(!validState(state))return Promise.reject(new Error('保存する位置が不正です'));
  const snapshot=structuredClone(state);
  const write=async()=>{
   if(this.failed)throw new Error('端末保存が停止しています');
   const expected=this.revision;
   if(!Number.isSafeInteger(expected)||expected===Number.MAX_SAFE_INTEGER)throw new Error('保存回数の上限です');
   await new Promise((resolve,reject)=>{
    const tx=this.db.transaction('state','readwrite'),store=tx.objectStore('state'),req=store.get('current');let conflict=false;
    req.onsuccess=()=>{if((req.result?.revision||0)!==expected){conflict=true;tx.abort();return;}store.put({state:snapshot,revision:expected+1},'current');};
    tx.oncomplete=resolve;tx.onabort=()=>reject(conflict?new Error('別の画面で位置が更新されました。画面を閉じて開き直してください'):tx.error||new Error('端末保存を中断しました'));tx.onerror=()=>reject(tx.error||new Error('端末保存に失敗しました'));
   });this.revision=expected+1;
  };
  const result=this.tail.then(write);this.tail=result.catch(error=>{this.failed=true;throw error;});this.tail.catch(()=>{});return result;
 }
}
