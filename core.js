export const VERSION='0.2.1';
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
const counter=n=>Number.isSafeInteger(n)&&n>=0;
function validPosition(s){return !!s&&s.map===MAP_ID&&walkable(s.x,s.y)&&Object.hasOwn(DIRECTIONS,s.facing)&&counter(s.moves);}
function spawnEnemy(player){
 // An old save may have the hero standing at the default enemy location.
 const positions=[{x:6,y:7},...MAP.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='.'?[{x,y}]:[]))];
 const p=positions.find(p=>Math.abs(p.x-player.x)+Math.abs(p.y-player.y)>1);
 return {...p,hp:ENEMY_MAX_HP,maxHp:ENEMY_MAX_HP};
}
function addCombat(s){return {...s,schema:2,hp:PLAYER_MAX_HP,maxHp:PLAYER_MAX_HP,turns:s.moves,enemy:spawnEnemy(s),log:['テストスライムに向かって進むと攻撃。方向転換はターンを使いません。']};}
export const initialState=()=>addCombat({map:MAP_ID,x:3,y:2,facing:'down',moves:0});
export function validState(s){
 if(!validPosition(s)||s.schema!==2||s.maxHp!==PLAYER_MAX_HP||!counter(s.hp)||s.hp>s.maxHp||!counter(s.turns)||s.turns<s.moves)return false;
 const e=s.enemy;
 return !!e&&walkable(e.x,e.y)&&e.maxHp===ENEMY_MAX_HP&&counter(e.hp)&&e.hp<=e.maxHp&&
  !(e.hp>0&&e.x===s.x&&e.y===s.y)&&Array.isArray(s.log)&&s.log.length<=3&&s.log.every(v=>typeof v==='string'&&v.length<=160);
}
export function restoreState(s){
 if(s?.schema===1&&validPosition(s))return addCombat(s);
 if(validState(s))return structuredClone(s);
 throw new Error('保存データを安全に読み込めません。初期化はしていません');
}
function log(s,message){s.log=[...s.log,message].slice(-3);}
function enemyAction(s){
 const e=s.enemy;if(e.hp===0)return;
 if(Math.abs(e.x-s.x)+Math.abs(e.y-s.y)===1){
  s.hp=Math.max(0,s.hp-ENEMY_ATTACK);log(s,`${ENEMY_NAME}の攻撃！ 勇者に${ENEMY_ATTACK}ダメージ。`);
  if(s.hp===0)log(s,'勇者は倒れた。「設定」から、もう一度試せます。');
  return;
 }
 // Breadth-first search follows connected floor tiles, including room exits.
 const queue=[{x:e.x,y:e.y,first:null}],seen=new Set([`${e.x},${e.y}`]);
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  for(const {dx,dy} of Object.values(DIRECTIONS)){
   const x=current.x+dx,y=current.y+dy,key=`${x},${y}`;
   if(!walkable(x,y)||seen.has(key))continue;
   const first=current.first||{x,y};
   if(x===s.x&&y===s.y){e.x=first.x;e.y=first.y;return;}
   seen.add(key);queue.push({x,y,first});
  }
 }
}
export function step(s,direction){
 if(!validState(s)||!Object.hasOwn(DIRECTIONS,direction))throw new Error('移動状態が不正です');
 if(s.hp===0)return {state:s,kind:'ended'};
 if(s.facing!==direction)return {state:{...s,facing:direction},kind:'turn'};
 const {dx,dy}=DIRECTIONS[direction],x=s.x+dx,y=s.y+dy;
 if(!walkable(x,y))return {state:s,kind:'wall'};
 if(s.turns===Number.MAX_SAFE_INTEGER)throw new Error('ターン数の上限です');
 const next=structuredClone(s);next.turns++;
 const attack=next.enemy.hp>0&&next.enemy.x===x&&next.enemy.y===y;
 if(attack){
  next.enemy.hp=Math.max(0,next.enemy.hp-PLAYER_ATTACK);
  log(next,`勇者の攻撃！ ${ENEMY_NAME}に${PLAYER_ATTACK}ダメージ。`);
  if(next.enemy.hp===0)log(next,`${ENEMY_NAME}を倒した！「設定」から再挑戦できます。`);
 }else{
  if(s.moves===Number.MAX_SAFE_INTEGER)throw new Error('移動回数の上限です');
  next.x=x;next.y=y;next.moves++;
 }
 enemyAction(next);
 return {state:next,kind:attack?'attack':'move'};
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
