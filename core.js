export const VERSION='0.4.0';
export const MAP_ID='fixed-three-rooms-v1';
export const MAP=Object.freeze([
 '#########',
 '#.....###',
 '#.....###',
 '#.....###',
 '###.#####',
 '###.#####',
 '###.....#',
 '###.....#',
 '###.....#',
 '#####.###',
 '#####.###',
 '#.....###',
 '#.....###',
 '#.....###',
 '#########'
]);
export const DIRECTIONS=Object.freeze({up:{dx:0,dy:-1,label:'上'},right:{dx:1,dy:0,label:'右'},down:{dx:0,dy:1,label:'下'},left:{dx:-1,dy:0,label:'左'}});
export const walkable=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&MAP[y]?.[x]==='.';
export const PLAYER_MAX_HP=20, PLAYER_ATTACK=3, ENEMY_MAX_HP=8, ENEMY_ATTACK=2;
export const ENEMY_NAME='テストスライム';
export const INITIAL_RECOVERY=200, REGEN_DENOMINATOR=20, POISON_WEAPON_DAMAGE=5;
export const POTIONS=Object.freeze({heal:{name:'回復の薬'},poison:{name:'毒の薬'}});
export const ITEMS=Object.freeze({...POTIONS,identify:{name:'識別の書'}});
export const MINERALS=Object.freeze(['ダイヤ','ルビー','サファイア','エメラルド','石英','黒曜石']);
const kinds=['heal','poison'];
const allKinds=['heal','poison','identify'];
const counter=n=>Number.isSafeInteger(n)&&n>=0;
const isKind=k=>kinds.includes(k);
function validPosition(s){return !!s&&s.map===MAP_ID&&walkable(s.x,s.y)&&Object.hasOwn(DIRECTIONS,s.facing)&&counter(s.moves);}
function validCombat(s,schema,logLimit){
 if(!validPosition(s)||s.schema!==schema||s.maxHp!==PLAYER_MAX_HP||!counter(s.hp)||s.hp>s.maxHp||!counter(s.turns)||s.turns<s.moves)return false;
 const e=s.enemy;
 return !!e&&walkable(e.x,e.y)&&e.maxHp===ENEMY_MAX_HP&&counter(e.hp)&&e.hp<=e.maxHp&&
  !(e.hp>0&&e.x===s.x&&e.y===s.y)&&Array.isArray(s.log)&&s.log.length<=logLimit&&s.log.every(v=>typeof v==='string'&&v.length<=160);
}
function spawnEnemy(player){
 const positions=[{x:6,y:7},...MAP.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='.'?[{x,y}]:[]))];
 return {...positions.find(p=>Math.abs(p.x-player.x)+Math.abs(p.y-player.y)>1),hp:ENEMY_MAX_HP,maxHp:ENEMY_MAX_HP};
}
function addCombat(s){return {...s,schema:2,hp:PLAYER_MAX_HP,maxHp:PLAYER_MAX_HP,turns:s.moves,enemy:spawnEnemy(s),log:[]};}
function addSupplies(s,random){
 const swap=random()<.5;
 const colors=swap?{heal:'赤色',poison:'青色'}:{heal:'青色',poison:'赤色'};
 const floorItems=[{id:'p1',x:2,y:2,kind:'heal'},{id:'p2',x:4,y:2,kind:'poison'},{id:'p3',x:4,y:7,kind:'heal'},{id:'p4',x:5,y:12,kind:'poison'}]
  .filter(p=>!(p.x===s.x&&p.y===s.y));
 return {...s,schema:3,recovery:INITIAL_RECOVERY,regenUnits:0,colors,identified:{heal:false,poison:false},inventory:{heal:2,poison:2},coating:null,floorItems,
  log:[...s.log,'薬を各2本持っています。「使う」から自分か武器を選べます。'].slice(-6)};
}
const legacyInitialState=({random=Math.random}={})=>addSupplies(addCombat({map:MAP_ID,x:3,y:2,facing:'down',moves:0}),random);
function validLegacySupplies(s){
 if(!validCombat(s,3,6)||!counter(s.recovery)||!counter(s.regenUnits)||s.regenUnits>=REGEN_DENOMINATOR)return false;
 if(!s.colors||!['赤色','青色'].includes(s.colors.heal)||!['赤色','青色'].includes(s.colors.poison)||s.colors.heal===s.colors.poison)return false;
 if(!s.identified||!s.inventory||!kinds.every(k=>typeof s.identified[k]==='boolean'&&counter(s.inventory[k])))return false;
 if(s.coating!==null&&!isKind(s.coating))return false;
 return Array.isArray(s.floorItems)&&s.floorItems.length<=4&&s.floorItems.every(p=>p&&typeof p.id==='string'&&p.id.length<=20&&walkable(p.x,p.y)&&isKind(p.kind))&&
  new Set(s.floorItems.map(p=>p.id)).size===s.floorItems.length&&new Set(s.floorItems.map(p=>`${p.x},${p.y}`)).size===s.floorItems.length;
}
function addIdentification(s,random){
 const {enemy,...rest}=s;
 const first={...enemy,id:1};
 const options=[{x:3,y:12},...MAP.flatMap((r,y)=>[...r].flatMap((v,x)=>v==='.'?[{x,y}]:[]))];
 const p=options.find(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)>1&&!(p.x===first.x&&p.y===first.y));
 const mineral=MINERALS[Math.min(MINERALS.length-1,Math.floor(random()*MINERALS.length))];
 const floorItems=structuredClone(s.floorItems);
 if(!(s.x===6&&s.y===8)&&!floorItems.some(p=>p.x===6&&p.y===8)){
  let id='book1';while(floorItems.some(p=>p.id===id))id+='x';
  floorItems.push({id,x:6,y:8,kind:'identify'});
 }
 const message='巻物を3枚持っています。自分に使い、見分けたい未識別の品を選べます。';
 return {...rest,schema:4,enemies:[first,{id:2,...p,hp:ENEMY_MAX_HP,maxHp:ENEMY_MAX_HP}],mineral,
  inventory:{...s.inventory,identify:3},identified:{...s.identified,identify:false},notes:{heal:'',poison:'',identify:''},floorItems,
  log:[...s.log,message].slice(-12),messages:[message]};
}
export const initialState=({random=Math.random}={})=>addIdentification(legacyInitialState({random}),random);
const validNote=n=>typeof n==='string'&&Array.from(n).length<=20&&!/[\u0000-\u001f\u007f]/.test(n);
const validMessages=(a,n)=>Array.isArray(a)&&a.length<=n&&a.every(v=>typeof v==='string'&&v.length<=160);
export function validState(s){
 if(!validPosition(s)||s.schema!==4||s.maxHp!==PLAYER_MAX_HP||!counter(s.hp)||s.hp>s.maxHp||!counter(s.turns)||s.turns<s.moves)return false;
 if(!Array.isArray(s.enemies)||s.enemies.length!==2||!s.enemies.every((e,i)=>e&&e.id===i+1&&walkable(e.x,e.y)&&e.maxHp===ENEMY_MAX_HP&&counter(e.hp)&&e.hp<=e.maxHp&&!(e.hp>0&&e.x===s.x&&e.y===s.y)))return false;
 const living=s.enemies.filter(e=>e.hp>0);if(new Set(living.map(e=>`${e.x},${e.y}`)).size!==living.length)return false;
 if(!counter(s.recovery)||!counter(s.regenUnits)||s.regenUnits>=REGEN_DENOMINATOR)return false;
 if(!s.colors||!['赤色','青色'].includes(s.colors.heal)||!['赤色','青色'].includes(s.colors.poison)||s.colors.heal===s.colors.poison||!MINERALS.includes(s.mineral))return false;
 if(!s.identified||!s.inventory||!s.notes||!allKinds.every(k=>typeof s.identified[k]==='boolean'&&counter(s.inventory[k])&&validNote(s.notes[k])))return false;
 if(s.coating!==null&&!isKind(s.coating))return false;
 return validMessages(s.log,12)&&validMessages(s.messages,8)&&Array.isArray(s.floorItems)&&s.floorItems.length<=5&&s.floorItems.every(p=>p&&typeof p.id==='string'&&p.id.length<=20&&walkable(p.x,p.y)&&allKinds.includes(p.kind))&&
  new Set(s.floorItems.map(p=>p.id)).size===s.floorItems.length&&new Set(s.floorItems.map(p=>`${p.x},${p.y}`)).size===s.floorItems.length;
}
export function restoreState(s,{random=Math.random}={}){
 if(s?.schema===1&&validPosition(s))return addIdentification(addSupplies(addCombat(s),random),random);
 if(validCombat(s,2,3))return addIdentification(addSupplies(structuredClone(s),random),random);
 if(validLegacySupplies(s))return addIdentification(structuredClone(s),random);
 if(validState(s))return structuredClone(s);
 throw new Error('保存データを安全に読み込めません。初期化はしていません');
}
export const appearanceName=(s,kind)=>kind==='identify'?`${s.mineral}の巻物`:`${s.colors[kind]}の薬`;
export const itemLabel=(s,kind)=>s.identified[kind]?ITEMS[kind].name:appearanceName(s,kind)+(s.notes[kind]?`〈${s.notes[kind]}〉`:'');
export const potionLabel=itemLabel;
export const unidentifiedItems=s=>allKinds.filter(k=>s.inventory[k]>0&&!s.identified[k]);
function log(s,message){s.log=[...s.log,message].slice(-12);s.messages=[...s.messages,message].slice(-8);}
function identify(s,kind){
 if(!s.identified[kind]){s.identified[kind]=true;log(s,`${appearanceName(s,kind)}は${ITEMS[kind].name}だった。`);}
}
function defeated(s){log(s,'勇者は倒れた。「設定」から、もう一度試せます。');}
function enemyAction(s,e){
 if(e.hp===0||s.hp===0)return;
 const name=`スライム${e.id}`;
 if(Math.abs(e.x-s.x)+Math.abs(e.y-s.y)===1){
  s.hp=Math.max(0,s.hp-ENEMY_ATTACK);log(s,`${name}の攻撃！ 勇者に${ENEMY_ATTACK}ダメージ。`);
  if(s.hp===0)defeated(s);return;
 }
 const blocked=new Set(s.enemies.filter(o=>o!==e&&o.hp>0).map(o=>`${o.x},${o.y}`));
 const queue=[{x:e.x,y:e.y,first:null}],seen=new Set([`${e.x},${e.y}`]);
 for(let i=0;i<queue.length;i++)for(const {dx,dy} of Object.values(DIRECTIONS)){
  const current=queue[i],x=current.x+dx,y=current.y+dy,key=`${x},${y}`;
  if(!walkable(x,y)||seen.has(key)||blocked.has(key))continue;
  const first=current.first||{x,y};
  if(x===s.x&&y===s.y){e.x=first.x;e.y=first.y;return;}
  seen.add(key);queue.push({x,y,first});
 }
}
function finishTurn(s,previous){
 for(const e of s.enemies)enemyAction(s,e);
 const canRecover=s.recovery>0;if(canRecover)s.recovery--;
 if(s.hp>0&&canRecover&&s.hp<s.maxHp){
  s.regenUnits+=s.maxHp;s.hp=Math.min(s.maxHp,s.hp+Math.floor(s.regenUnits/REGEN_DENOMINATOR));s.regenUnits%=REGEN_DENOMINATOR;
  if(s.hp===s.maxHp)s.regenUnits=0;
 }else s.regenUnits=0;
 if(s.hp>0&&canRecover){
  if(s.recovery===50)log(s,'腹が減ってきた。');
  if(s.recovery===20)log(s,'かなり空腹だ。');
  if(s.recovery===0)log(s,'空腹になった。次のターンから自然回復できない。');
 }
 if(s.messages.length===0)s.messages=[...previous.messages];
}
function actionState(s){
 if(!validState(s))throw new Error('行動状態が不正です');
 if(s.turns===Number.MAX_SAFE_INTEGER)throw new Error('ターン数の上限です');
 const next=structuredClone(s);next.turns++;next.messages=[];return next;
}
function hitEnemy(s,e){
 const name=`スライム${e.id}`;
 e.hp=Math.max(0,e.hp-PLAYER_ATTACK);log(s,`勇者の攻撃！ ${name}に${PLAYER_ATTACK}ダメージ。`);
 const coating=s.coating;s.coating=null;
 if(coating&&e.hp>0){
  if(coating==='heal'){
   const old=e.hp;e.hp=Math.min(e.maxHp,e.hp+Math.ceil(e.maxHp*.5));log(s,`塗った薬で${name}のHPが${e.hp-old}回復した。`);
  }else{
   const old=e.hp;e.hp=Math.max(0,e.hp-POISON_WEAPON_DAMAGE);log(s,`塗った薬で${name}に${old-e.hp}追加ダメージ。`);
  }
 }else if(coating)log(s,'薬の効果が出る前に敵を倒した。塗った薬はなくなった。');
 if(e.hp===0)log(s,`${name}を倒した！`);
}
export function step(s,direction){
 if(!validState(s)||!Object.hasOwn(DIRECTIONS,direction))throw new Error('移動状態が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.facing!==direction)return {state:{...s,facing:direction},kind:'turn'};
 const {dx,dy}=DIRECTIONS[direction],x=s.x+dx,y=s.y+dy;
 if(!walkable(x,y))return {state:s,kind:'wall'};
 const next=actionState(s),enemy=next.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);
 if(enemy)hitEnemy(next,enemy);
 else{
  if(s.moves===Number.MAX_SAFE_INTEGER)throw new Error('移動回数の上限です');
  next.x=x;next.y=y;next.moves++;
  for(const p of next.floorItems.filter(p=>p.x===x&&p.y===y)){
   if(next.inventory[p.kind]===Number.MAX_SAFE_INTEGER)throw new Error('道具の所持数の上限です');
   next.inventory[p.kind]++;log(next,`${itemLabel(next,p.kind)}を拾った。`);
  }
  next.floorItems=next.floorItems.filter(p=>!(p.x===x&&p.y===y));
 }
 finishTurn(next,s);return {state:next,kind:enemy?'attack':'move'};
}
export function useItem(s,kind,target,{identifyTarget=null}={}){
 if(!validState(s)||!allKinds.includes(kind)||!['self','weapon'].includes(target))throw new Error('道具の使い方が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.inventory[kind]===0)return {state:s,kind:'empty'};
 if(kind==='identify'){
  if(target!=='self')return {state:s,kind:'unsupported'};
  const options=unidentifiedItems(s);
  if(options.length===0)return {state:s,kind:'no-targets'};
  if(identifyTarget===null)return {state:s,kind:'choose'};
  if(!options.includes(identifyTarget))return {state:s,kind:'invalid-target'};
 }else if(target==='weapon'&&s.coating!==null)return {state:s,kind:'coated'};
 const next=actionState(s);next.inventory[kind]--;
 if(kind==='identify'){
  log(next,`${itemLabel(s,kind)}を使った。`);identify(next,identifyTarget);
 }else if(target==='weapon'){
  next.coating=kind;log(next,`武器に${itemLabel(next,kind)}を塗った。次の攻撃1回に作用する。`);
 }else{
  if(kind==='heal'){
   const old=next.hp;next.hp=Math.min(next.maxHp,next.hp+Math.ceil(next.maxHp*.5));
   log(next,next.hp===old?'特に変化を感じなかった。':`勇者のHPが${next.hp-old}回復した。`);
  }else{
   const old=next.hp;next.hp=Math.max(0,next.hp-Math.ceil(next.maxHp*.25));log(next,`勇者に${old-next.hp}ダメージ。`);
  }
  if(next.hp===0)defeated(next);
 }
 finishTurn(next,s);return {state:next,kind:'use'};
}
export function renameItem(s,kind,name){
 if(!validState(s)||!allKinds.includes(kind)||typeof name!=='string')throw new Error('名前が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.inventory[kind]===0)return {state:s,kind:'empty'};
 if(s.identified[kind])return {state:s,kind:'known'};
 const note=name.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
 if(!validNote(note))throw new Error('名前は20文字以内で入力してください');
 const next=structuredClone(s);next.notes[kind]=note;next.messages=[];
 log(next,note?`${appearanceName(next,kind)}に〈${note}〉と名付けた。`:`${appearanceName(next,kind)}のメモを消した。`);
 return {state:next,kind:'rename'};
}
// One gesture gives one command; no timer or pointer-move repeat.
export function bindDirectionInputs(buttons,send,{window:win=window,document:doc=document}={}){
 let active=null;const held=new Set(),released=()=>{active=null;held.clear();};
 for(const button of buttons){
  button.addEventListener('pointerdown',event=>{
   if(event.isPrimary===false||event.button!==0||active!==null)return;
   event.preventDefault();active=event.pointerId;button.focus({preventScroll:true});
   try{button.setPointerCapture(event.pointerId);}catch{}
   send(button.dataset.direction);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>{if(event.pointerId===active)active=null;});
  // Pointer-generated clicks must not duplicate pointerdown. detail 0 permits
  // keyboard activation and assistive technology activation.
  button.addEventListener('click',event=>{event.preventDefault();if(event.detail===0)send(button.dataset.direction);});
 }
 const keys={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',w:'up',d:'right',s:'down',a:'left'};
 win.addEventListener('keydown',event=>{
  if(doc.querySelector('dialog[open]')||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName))return;
  const direction=keys[event.key];
  if(direction){event.preventDefault();if(event.repeat||held.has(event.key))return;held.add(event.key);send(direction);}
  // Space/Enter on a focused direction button follow the same no-repeat rule.
  else if((event.key===' '||event.key==='Enter')&&event.target?.dataset?.direction){event.preventDefault();if(event.repeat||held.has(event.key))return;held.add(event.key);send(event.target.dataset.direction);}
 });
 win.addEventListener('keyup',event=>held.delete(event.key));win.addEventListener('blur',released);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)released();});
}
