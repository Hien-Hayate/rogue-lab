import {MAP,DIRECTIONS,initialState,step,bindDirectionInputs} from './core.js';
import {SaveStore} from './storage.js';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),buttons=[...document.querySelectorAll('[data-direction]')];
const store=new SaveStore(),hero=new Image(),T=48;let state=initialState(),ready=false,failed=false,saveID=0;
canvas.width=MAP[0].length*T;canvas.height=MAP.length*T;
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;fit();}
function enable(){for(const b of buttons)b.disabled=!ready||failed;$('reset').disabled=!ready||failed;$('confirmReset').disabled=!ready||failed;}
function fit(){const r=$('stage').getBoundingClientRect();const width=Math.max(1,Math.min(r.width-2,(r.height-2)*canvas.width/canvas.height));canvas.style.width=width+'px';canvas.style.height=(width*canvas.height/canvas.width)+'px';}
function tile(x,y,wall){
 const px=x*T,py=y*T;
 ctx.fillStyle=wall?'#303a4b':'#a99c83';ctx.fillRect(px,py,T,T);
 ctx.fillStyle=wall?'#586477':'#b9ac92';ctx.fillRect(px+3,py+3,T-6,T-6);
 for(let i=0;i<13;i++){
  const n=(x*91+y*137+i*47+19)>>>0,xx=4+n%35,yy=4+(n*13+i*7)%35;
  ctx.fillStyle=wall?['#626d80','#4c586c','#455065'][i%3]:['#b0a287','#978c78','#c0b398'][i%3];ctx.fillRect(px+xx,py+yy,4+i%4,3+i%3);
 }
 ctx.fillStyle=wall?'#8590a0':'#d0c2a7';ctx.fillRect(px+3,py+3,T-6,2);ctx.fillRect(px+3,py+3,2,T-6);
 ctx.fillStyle=wall?'#1c2533':'#786f61';ctx.fillRect(px,py+T-3,T,3);ctx.fillRect(px+T-3,py,3,T);
}
function render(){
 ctx.imageSmoothingEnabled=false;
 MAP.forEach((row,y)=>[...row].forEach((v,x)=>tile(x,y,v==='#')));
 const cx=(state.x+.5)*T,cy=(state.y+.5)*T;
 // Crop only the transparent padding during rendering. The approved PNG is
 // retained unchanged in the app package.
 if(hero.complete&&hero.naturalWidth){const h=T*.90,w=h*684/1050;ctx.drawImage(hero,286,104,684,1050,cx-w/2,cy-h/2,w,h);}
 const {dx,dy}=DIRECTIONS[state.facing],tip={x:cx+dx*T*.45,y:cy+dy*T*.45},base={x:cx+dx*T*.30,y:cy+dy*T*.30};
 ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(base.x-dy*4,base.y+dx*4);ctx.lineTo(base.x+dy*4,base.y-dx*4);ctx.closePath();ctx.fillStyle='#ffdb8e';ctx.fill();ctx.strokeStyle='#352c20';ctx.lineWidth=1;ctx.stroke();
 $('status').textContent=`向き：${DIRECTIONS[state.facing].label}　移動：${state.moves}`;
 canvas.setAttribute('aria-label',`固定ダンジョン。主人公は上から${state.y+1}行、左から${state.x+1}列。${DIRECTIONS[state.facing].label}向き。移動${state.moves}回。`);
}
function persist(){
 const id=++saveID;$('saved').textContent='端末に保存中…';
 const task=store.save(state);
 task.then(()=>{if(id===saveID){$('saved').textContent='端末に保存済み';$('saved').dataset.error='no';}}).catch(error=>{failed=true;enable();$('saved').textContent='端末保存に失敗';$('saved').dataset.error='yes';notice(error.message+' 保存済みの位置から再開するには、画面を閉じて開き直してください。');});
 return task;
}
function command(direction){
 if(!ready||failed||$('dialog').open)return;
 const result=step(state,direction);if(result.kind==='wall')return;
 state=result.state;render();persist();
}
bindDirectionInputs(buttons,command);
$('settings').onclick=()=>{$('resetConfirm').hidden=true;$('dialog').showModal();};
$('close').onclick=()=>$('dialog').close();
$('reset').onclick=()=>{$('resetConfirm').hidden=false;};$('cancelReset').onclick=()=>{$('resetConfirm').hidden=true;};
$('confirmReset').onclick=()=>{if(!ready||failed)return;state=initialState();render();persist();$('dialog').close();};
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.addEventListener('pageshow',fit);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(fit).observe($('stage'));
async function prepareOffline(){
 try{
  if(!window.isSecureContext||!navigator.serviceWorker)throw new Error('HTTPSのURLで初回準備が必要です');
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  const status=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('準備の確認がタイムアウトしました。オンラインで開き直してください')),12000);
   navigator.serviceWorker.ready.then(reg=>{
    const channel=new MessageChannel();channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data);};
    reg.active.postMessage('CHECK_SHELL',[channel.port2]);
   }).catch(e=>{clearTimeout(timeout);reject(e);});
  });
  if(!status.ready)throw new Error('必要ファイルの保存が未完了です。オンラインで開き直してください');
  $('offline').textContent='オフライン準備完了';$('offline').dataset.ready='yes';
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('offline').textContent='更新の準備ができました。すべての画面を閉じて開き直してください';});});
 }catch(error){$('offline').textContent='オフライン準備未完了：'+error.message;$('offline').dataset.ready='no';}
}
enable();fit();
async function boot(){
 try{
  const [saved]=await Promise.all([store.open(),new Promise((resolve,reject)=>{hero.onload=resolve;hero.onerror=()=>reject(new Error('勇者画像を読み込めません'));hero.src='./hero.png';})]);
  state=saved||initialState();render();await persist();ready=true;enable();
 }catch(error){failed=true;enable();notice(error.message);$('saved').textContent='起動・保存を停止';$('saved').dataset.error='yes';}
 await prepareOffline();
}
boot();
