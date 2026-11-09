import {VERSION,MAP,DIRECTIONS,ENEMY_NAME,initialState,step,useItem,itemLabel,renameItem,bindDirectionInputs} from './core.js';
import {SaveStore} from './storage.js';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),buttons=[...document.querySelectorAll('[data-direction]')];
const store=new SaveStore(),hero=new Image(),T=48;let state=initialState(),ready=false,failed=false,saveID=0,selectedKind=null,choosingIdentity=false;
canvas.width=MAP[0].length*T;canvas.height=MAP.length*T;
$('version').textContent=`v${VERSION}`;
$('dialogVersion').textContent=`v${VERSION} 暫定版`;
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;fit();}
function enable(){for(const b of buttons)b.disabled=!ready||failed||state.hp===0;$('use').disabled=!ready||failed||state.hp===0||state.inventory.heal+state.inventory.poison+state.inventory.identify===0;$('reset').disabled=!ready||failed;$('confirmReset').disabled=!ready||failed;}
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
function drawSlime(enemy){
 const x=enemy.x*T,y=enemy.y*T;
 // A temporary, code-drawn pixel slime; no extra images or network requests.
 const pixels=[
  '     ooooo     ',
  '   oobbbbboo   ',
  '  obbccccbbbo  ',
  ' obbcccccbbbbo ',
  ' obbwkbbbwkbbo ',
  'obbbwkbbbwkbbbo',
  'obbbbbbbbbbbbbo',
  'obbbbbbdbbbbbbo',
  ' obbbbbdbbbbbo ',
  '  ooooooooooo  '
 ];
 const colors={o:'#142b45',b:'#448cd1',c:'#8cd8ff',w:'#fff8e5',k:'#182333',d:'#1b4b78'};
 pixels.forEach((row,py)=>[...row].forEach((v,px)=>{if(colors[v]){ctx.fillStyle=colors[v];ctx.fillRect(x+1.5+px*3,y+10+py*3,3,3);}}));
 ctx.fillStyle='#172331';ctx.fillRect(x+7,y+3,34,4);
 ctx.fillStyle='#69c6ff';ctx.fillRect(x+8,y+4,32*enemy.hp/enemy.maxHp,2);
}
function drawPotion(item){
 const x=(item.x+.5)*T,y=(item.y+.5)*T;
 if(item.kind==='identify'){ctx.fillStyle='#433823';ctx.fillRect(x-10,y-10,20,21);ctx.fillStyle='#f3deb1';ctx.fillRect(x-8,y-8,16,17);ctx.fillStyle='#9b7750';ctx.fillRect(x-11,y-11,22,4);ctx.fillRect(x-11,y+8,22,4);ctx.fillStyle='#73604b';ctx.fillRect(x-4,y-3,8,2);ctx.fillRect(x-4,y+1,8,2);return;}
 ctx.fillStyle='#233041';ctx.fillRect(x-7,y-8,14,20);
 ctx.fillStyle=state.colors[item.kind]==='赤色'?'#f0788b':'#66bdff';ctx.fillRect(x-5,y-6,10,16);
 ctx.fillStyle='#e5dcc3';ctx.fillRect(x-4,y-12,8,5);
 ctx.fillStyle='#fff5df';ctx.fillRect(x-3,y-4,2,7);
}
function colorKind(color){return ['heal','poison'].find(k=>state.colors[k]===color);}
function inventoryText(kind){return `${itemLabel(state,kind)}${state.identified[kind]?`（${kind==='identify'?state.mineral:state.colors[kind]}）`:''} ×${state.inventory[kind]}`;}
function renderItems(){
 for(const [id,kind] of [['potionRed',colorKind('赤色')],['potionBlue',colorKind('青色')],['scrollItem','identify']]){
  $(id).textContent=inventoryText(kind);$(id).disabled=!ready||failed||state.hp===0||state.inventory[kind]===0;
 }
 $('weaponStatus').textContent=`武器：${state.coating?itemLabel(state,state.coating)+'を塗布済み（次の攻撃1回）':'薬なし'} ／ 自然回復：${state.recovery>0?'可能':'空腹で停止'}`;
 $('targetPanel').hidden=selectedKind===null||choosingIdentity;
 $('identifyPanel').hidden=!choosingIdentity;
 if(selectedKind){
  $('selectedItem').textContent=itemLabel(state,selectedKind);
  $('useSelf').disabled=!ready||failed||state.hp===0||state.inventory[selectedKind]===0;
  $('useSelf').textContent=selectedKind==='identify'?'自分（見分ける）':'自分';
  $('useWeapon').hidden=selectedKind==='identify';
  $('useWeapon').disabled=$('useSelf').disabled||state.coating!==null;
  $('useWeapon').textContent=state.coating?'武器（塗布済み）':'武器';
  $('namePanel').hidden=state.identified[selectedKind]||choosingIdentity;
  $('nameInput').value=state.notes[selectedKind];
 }
 if(choosingIdentity)for(const [id,kind] of [['identifyRed',colorKind('赤色')],['identifyBlue',colorKind('青色')],['identifyScroll','identify']]){
  $(id).textContent=inventoryText(kind);$(id).hidden=state.identified[kind]||state.inventory[kind]===0;
  $(id).disabled=!ready||failed||state.hp===0;
 }
}
function render(){
 ctx.imageSmoothingEnabled=false;
 MAP.forEach((row,y)=>[...row].forEach((v,x)=>tile(x,y,v==='#')));
 for(const item of state.floorItems)drawPotion(item);
 for(const enemy of state.enemies)if(enemy.hp>0)drawSlime(enemy);
 const cx=(state.x+.5)*T,cy=(state.y+.5)*T;
 // Crop only the transparent padding during rendering. The approved PNG is
 // retained unchanged in the app package.
 if(hero.complete&&hero.naturalWidth){const h=T*.90,w=h*684/1050;ctx.drawImage(hero,286,104,684,1050,cx-w/2,cy-h/2,w,h);}
 const {dx,dy}=DIRECTIONS[state.facing],tip={x:cx+dx*T*.47,y:cy+dy*T*.47},base={x:cx+dx*T*.17,y:cy+dy*T*.17};
 ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(base.x-dy*9,base.y+dx*9);ctx.lineTo(base.x+dy*9,base.y-dx*9);ctx.closePath();ctx.fillStyle='#ffe16c';ctx.fill();ctx.strokeStyle='#332c1b';ctx.lineWidth=2;ctx.stroke();
 $('status').textContent=`向き：${DIRECTIONS[state.facing].label}　移動：${state.moves}`;
 $('heroHp').textContent=`勇者 HP ${state.hp}/${state.maxHp}`;
 $('heroHp').dataset.low=state.hp<=6?'yes':'no';
 $('enemyHp').textContent=state.enemies.some(e=>e.hp>0)?`敵 ${state.enemies.map(e=>`${e.hp}/${e.maxHp}`).join('・')}`:'敵 全撃破';
 $('turns').textContent=`ターン ${state.turns}`;
 const messages=state.messages.join('\n');
 if($('log').textContent!==messages){$('log').textContent=messages;$('log').scrollTop=0;}
 $('battleInfo').textContent=`勇者 HP ${state.hp}/${state.maxHp} ／ ${state.enemies.map(e=>`スライム${e.id} HP ${e.hp}/${e.maxHp}`).join(' ／ ')} ／ ${state.turns}ターン ／ 自然回復：${state.recovery>0?'可能':'空腹で停止'}`;
 $('battleHistory').textContent=state.log.join('\n');
 canvas.setAttribute('aria-label',`固定ダンジョン。主人公は上から${state.y+1}行、左から${state.x+1}列。${DIRECTIONS[state.facing].label}向き。HP${state.hp}。${state.enemies.filter(e=>e.hp>0).map(e=>`スライム${e.id}は上から${e.y+1}行、左から${e.x+1}列、HP${e.hp}。`).join('')||'敵は全て撃破済み。'}`);
 enable();renderItems();
}
function persist(){
 const id=++saveID;$('saved').textContent='端末に保存中…';
 const task=store.save(state);
 task.then(()=>{if(id===saveID){$('saved').textContent='端末に保存済み';$('saved').dataset.error='no';}}).catch(error=>{failed=true;enable();$('saved').textContent='端末保存に失敗';$('saved').dataset.error='yes';$('itemNotice').textContent=error.message;notice(error.message+' 保存済みの位置から再開するには、画面を閉じて開き直してください。');});
 return task;
}
function command(direction){
 if(!ready||failed||$('dialog').open||$('itemDialog').open)return;
 try{
  const result=step(state,direction);if(result.kind==='wall'||result.kind==='ended')return;
  state=result.state;render();persist();
 }catch(error){failed=true;enable();notice(error.message);}
}
bindDirectionInputs(buttons,command);
$('settings').onclick=()=>{if($('itemDialog').open)return;$('resetConfirm').hidden=true;$('dialog').showModal();};
$('use').onclick=()=>{if(!ready||failed||state.hp===0||$('dialog').open)return;selectedKind=null;choosingIdentity=false;$('itemNotice').textContent='道具を選び、使う対象を選んでください。選択・名付け・キャンセルではターンは進みません。';renderItems();$('itemDialog').showModal();};
$('closeItems').onclick=()=>$('itemDialog').close();
function selectItem(kind){selectedKind=kind;choosingIdentity=false;renderItems();}
$('potionRed').onclick=()=>selectItem(colorKind('赤色'));$('potionBlue').onclick=()=>selectItem(colorKind('青色'));$('scrollItem').onclick=()=>selectItem('identify');
function commitItem(result){
 if(result.kind!=='use'){
  const messages={empty:'その道具はありません。',coated:'武器にはすでに薬が塗ってあります。','no-targets':'所持品に、まだ見分けていない物がありません。','invalid-target':'その品は識別の対象にできません。',unsupported:'その対象には使えません。'};
  $('itemNotice').textContent=messages[result.kind]||'今は使えません。';return;
 }
 state=result.state;selectedKind=null;choosingIdentity=false;$('itemDialog').close();render();persist();
}
function applyItem(target){
 if(!ready||failed||state.hp===0||!$('itemDialog').open||!selectedKind)return;
 try{
  const result=useItem(state,selectedKind,target);
  if(result.kind==='choose'){choosingIdentity=true;$('itemNotice').textContent='未識別の所持品を選んでください。巻物自身も選べます。';renderItems();return;}
  commitItem(result);
 }catch(error){failed=true;enable();notice(error.message);}
}
function identifySelection(kind){
 if(!ready||failed||state.hp===0||!$('itemDialog').open||!choosingIdentity)return;
 try{commitItem(useItem(state,'identify','self',{identifyTarget:kind}));}catch(error){failed=true;enable();notice(error.message);}
}
$('useSelf').onclick=()=>applyItem('self');$('useWeapon').onclick=()=>applyItem('weapon');
$('identifyRed').onclick=()=>identifySelection(colorKind('赤色'));$('identifyBlue').onclick=()=>identifySelection(colorKind('青色'));$('identifyScroll').onclick=()=>identifySelection('identify');
$('identifyBack').onclick=()=>{choosingIdentity=false;renderItems();$('itemNotice').textContent='対象を選ばず戻りました。道具とターンは消費していません。';};
$('saveName').onclick=()=>{
 if(!ready||failed||state.hp===0||!$('itemDialog').open||!selectedKind||choosingIdentity)return;
 try{const result=renameItem(state,selectedKind,$('nameInput').value);if(result.kind!=='rename')return;state=result.state;render();persist();$('itemNotice').textContent='メモを保存しました。正式な識別ではありません。';}
 catch(error){$('itemNotice').textContent=error.message;}
};
$('close').onclick=()=>$('dialog').close();
$('reset').onclick=()=>{$('resetConfirm').hidden=false;};$('cancelReset').onclick=()=>{$('resetConfirm').hidden=true;};
$('confirmReset').onclick=()=>{if(!ready||failed)return;state=initialState();render();persist();$('dialog').close();};
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.addEventListener('pageshow',fit);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(fit).observe($('stage'));
async function prepareOffline(){
 try{
  if(!window.isSecureContext||!navigator.serviceWorker)throw new Error('HTTPSのURLで初回準備が必要です');
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  const watchUpdate=()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('offline').textContent='更新の準備ができました。すべての画面を閉じて開き直してください';});};
  registration.addEventListener('updatefound',watchUpdate);watchUpdate();
  const status=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('準備の確認がタイムアウトしました。オンラインで開き直してください')),12000);
   navigator.serviceWorker.ready.then(reg=>{
    const channel=new MessageChannel();channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data);};
    reg.active.postMessage('CHECK_SHELL',[channel.port2]);
   }).catch(e=>{clearTimeout(timeout);reject(e);});
  });
  if(!status.ready)throw new Error('必要ファイルの保存が未完了です。オンラインで開き直してください');
  $('offline').textContent='オフライン準備完了';$('offline').dataset.ready='yes';
  if(registration.waiting)$('offline').textContent='更新の準備ができました。すべての画面を閉じて開き直してください';
 }catch(error){$('offline').textContent='オフライン準備未完了：'+error.message;$('offline').dataset.ready='no';}
}
enable();fit();
async function boot(){
 try{
  const [saved]=await Promise.all([store.open(),new Promise((resolve,reject)=>{hero.onload=resolve;hero.onerror=()=>reject(new Error('勇者画像を読み込めません'));hero.src='./hero.png';})]);
  state=saved||initialState();render();await persist();ready=true;enable();renderItems();
 }catch(error){failed=true;enable();notice(error.message);$('saved').textContent='起動・保存を停止';$('saved').dataset.error='yes';}
 await prepareOffline();
}
boot();
