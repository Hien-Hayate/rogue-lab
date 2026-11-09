export const VERSION='0.3.0';
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
const kinds=['heal','poison'];
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
export const initialState=({random=Math.random}={})=>addSupplies(addCombat({map:MAP_ID,x:3,y:2,facing:'down',moves:0}),random);
export function validState(s){
 if(!validCombat(s,3,6)||!counter(s.recovery)||!counter(s.regenUnits)||s.regenUnits>=REGEN_DENOMINATOR)return false;
 if(!s.colors||!['赤色','青色'].includes(s.colors.heal)||!['赤色','青色'].includes(s.colors.poison)||s.colors.heal===s.colors.poison)return false;
 if(!s.identified||!s.inventory||!kinds.every(k=>typeof s.identified[k]==='boolean'&&counter(s.inventory[k])))return false;
 if(s.coating!==null&&!isKind(s.coating))return false;
 return Array.isArray(s.floorItems)&&s.floorItems.length<=4&&s.floorItems.every(p=>p&&typeof p.id==='string'&&p.id.length<=20&&walkable(p.x,p.y)&&isKind(p.kind))&&
  new Set(s.floorItems.map(p=>p.id)).size===s.floorItems.length&&new Set(s.floorItems.map(p=>`${p.x},${p.y}`)).size===s.floorItems.length;
}
export function restoreState(s,{random=Math.random}={}){
 if(s?.schema===1&&validPosition(s))return addSupplies(addCombat(s),random);
 if(validCombat(s,2,3))return addSupplies(structuredClone(s),random);
 if(validState(s))return structuredClone(s);
 throw new Error('保存データを安全に読み込めません。初期化はしていません');
}
export const potionLabel=(s,kind)=>s.identified[kind]?POTIONS[kind].name:`${s.colors[kind]}の薬`;
function log(s,message){s.log=[...s.log,message].slice(-6);}
function identify(s,kind){
 if(!s.identified[kind]){s.identified[kind]=true;log(s,`${s.colors[kind]}の薬は「${POTIONS[kind].name}」だった。`);}
}
function defeated(s){log(s,'勇者は倒れた。「設定」から、もう一度試せます。');}
function enemyAction(s){
 const e=s.enemy;if(e.hp===0||s.hp===0)return;
 if(Math.abs(e.x-s.x)+Math.abs(e.y-s.y)===1){
  s.hp=Math.max(0,s.hp-ENEMY_ATTACK);log(s,`${ENEMY_NAME}の攻撃！ 勇者に${ENEMY_ATTACK}ダメージ。`);
  if(s.hp===0)defeated(s);return;
 }
 const queue=[{x:e.x,y:e.y,first:null}],seen=new Set([`${e.x},${e.y}`]);
 for(let i=0;i<queue.length;i++)for(const {dx,dy} of Object.values(DIRECTIONS)){
  const current=queue[i],x=current.x+dx,y=current.y+dy,key=`${x},${y}`;
  if(!walkable(x,y)||seen.has(key))continue;
  const first=current.first||{x,y};
  if(x===s.x&&y===s.y){e.x=first.x;e.y=first.y;return;}
  seen.add(key);queue.push({x,y,first});
 }
}
function finishTurn(s){
 enemyAction(s);
 const canRecover=s.recovery>0;
 if(canRecover)s.recovery--;
 if(s.hp>0&&canRecover&&s.hp<s.maxHp){
  s.regenUnits+=s.maxHp;
  s.hp=Math.min(s.maxHp,s.hp+Math.floor(s.regenUnits/REGEN_DENOMINATOR));
  s.regenUnits%=REGEN_DENOMINATOR;
  if(s.hp===s.maxHp)s.regenUnits=0;
 }else s.regenUnits=0;
 if(s.hp>0&&canRecover){
  if(s.recovery===50)log(s,'腹が減ってきた。');
  if(s.recovery===20)log(s,'かなり空腹だ。');
  if(s.recovery===0)log(s,'空腹になった。次のターンから自然回復できない。');
 }
}
function actionState(s){
 if(!validState(s))throw new Error('行動状態が不正です');
 if(s.turns===Number.MAX_SAFE_INTEGER)throw new Error('ターン数の上限です');
 const next=structuredClone(s);next.turns++;return next;
}
function hitEnemy(s){
 const e=s.enemy;
 e.hp=Math.max(0,e.hp-PLAYER_ATTACK);log(s,`勇者の攻撃！ ${ENEMY_NAME}に${PLAYER_ATTACK}ダメージ。`);
 const coating=s.coating;s.coating=null;
 if(coating&&e.hp>0){
  if(coating==='heal'){
   const old=e.hp;e.hp=Math.min(e.maxHp,e.hp+Math.ceil(e.maxHp*.5));
   log(s,`塗った薬で${ENEMY_NAME}のHPが${e.hp-old}回復した。`);
  }else{
   const old=e.hp;e.hp=Math.max(0,e.hp-POISON_WEAPON_DAMAGE);
   log(s,`塗った毒で${ENEMY_NAME}に${old-e.hp}追加ダメージ。`);
  }
  identify(s,coating);
 }else if(coating)log(s,'薬の効果が出る前に敵を倒した。塗った薬はなくなった。');
 if(e.hp===0)log(s,`${ENEMY_NAME}を倒した！「設定」から再挑戦できます。`);
}
export function step(s,direction){
 if(!validState(s)||!Object.hasOwn(DIRECTIONS,direction))throw new Error('移動状態が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.facing!==direction)return {state:{...s,facing:direction},kind:'turn'};
 const {dx,dy}=DIRECTIONS[direction],x=s.x+dx,y=s.y+dy;
 if(!walkable(x,y))return {state:s,kind:'wall'};
 const next=actionState(s),attack=next.enemy.hp>0&&next.enemy.x===x&&next.enemy.y===y;
 if(attack)hitEnemy(next);
 else{
  if(s.moves===Number.MAX_SAFE_INTEGER)throw new Error('移動回数の上限です');
  next.x=x;next.y=y;next.moves++;
  const picked=next.floorItems.filter(p=>p.x===x&&p.y===y);
  for(const p of picked){
   if(next.inventory[p.kind]===Number.MAX_SAFE_INTEGER)throw new Error('薬の所持数の上限です');
   next.inventory[p.kind]++;log(next,`${potionLabel(next,p.kind)}を拾った。`);
  }
  next.floorItems=next.floorItems.filter(p=>!(p.x===x&&p.y===y));
 }
 finishTurn(next);return {state:next,kind:attack?'attack':'move'};
}
export function useItem(s,kind,target){
 if(!validState(s)||!isKind(kind)||!['self','weapon'].includes(target))throw new Error('薬の使い方が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.inventory[kind]===0)return {state:s,kind:'empty'};
 if(target==='weapon'&&s.coating!==null)return {state:s,kind:'coated'};
 const next=actionState(s);next.inventory[kind]--;
 if(target==='weapon'){
  next.coating=kind;log(next,`武器に${potionLabel(next,kind)}を塗った。次の攻撃1回に作用する。`);
 }else{
  if(kind==='heal'){
   const old=next.hp;next.hp=Math.min(next.maxHp,next.hp+Math.ceil(next.maxHp*.5));
   log(next,`薬を使い、勇者のHPが${next.hp-old}回復した。`);
  }else{
   const old=next.hp;next.hp=Math.max(0,next.hp-Math.ceil(next.maxHp*.25));
   log(next,`薬を使い、勇者に${old-next.hp}ダメージ。`);
  }
  identify(next,kind);if(next.hp===0)defeated(next);
 }
 finishTurn(next);return {state:next,kind:'use'};
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
