export const VERSION='0.1.0';
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
export const initialState=()=>({schema:1,map:MAP_ID,x:3,y:2,facing:'down',moves:0});
export function validState(s){return !!s&&s.schema===1&&s.map===MAP_ID&&walkable(s.x,s.y)&&Object.hasOwn(DIRECTIONS,s.facing)&&Number.isSafeInteger(s.moves)&&s.moves>=0;}
export function step(s,direction){
 if(!validState(s)||!Object.hasOwn(DIRECTIONS,direction))throw new Error('移動状態が不正です');
 if(s.facing!==direction)return {state:{...s,facing:direction},kind:'turn'};
 const {dx,dy}=DIRECTIONS[direction],x=s.x+dx,y=s.y+dy;
 if(!walkable(x,y))return {state:s,kind:'wall'};
 if(s.moves===Number.MAX_SAFE_INTEGER)throw new Error('移動回数の上限です');
 return {state:{...s,x,y,moves:s.moves+1},kind:'move'};
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
