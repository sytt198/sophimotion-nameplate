import {defaults,validate,buildPlate,esc,qrContent,makeQR} from './layout.js';
import {createPreview,svgImage} from './preview.js';
const $=id=>document.getElementById(id),storageKey='sophimotion-nameplate-v1';
let state=defaults(),result,preview,saveTimer,toastTimer,dragId,updateVersion=0,view='3d';
const invalidNumbers=new Set();
try{const raw=localStorage.getItem(storageKey);if(raw)state=validate(JSON.parse(raw))}catch{toast('本地草稿无法读取，已载入示例')}
const measureCanvas=document.createElement('canvas'),ctx=measureCanvas.getContext('2d');
const measure=(text,size,bold)=>{ctx.font=`${bold?'700':'400'} ${size*10}px Arial,"Microsoft YaHei",sans-serif`;return ctx.measureText(text).width/10};
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000)}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));$('saved').textContent='✓ 已保存到本地'}catch{$('saved').textContent='草稿未保存';toast('浏览器存储不可用，请下载配置保存')}},400)}
function fields(){
  $('fields').innerHTML=state.fields.map((f,i)=>`<div class="field-row" draggable="true" data-id="${esc(f.id)}"><button class="drag" title="拖动排序；按上、下方向键移动" aria-label="移动第 ${i+1} 个字段">⠿</button><input aria-label="第 ${i+1} 个字段名称" data-key="label" maxlength="40" value="${esc(f.label)}"><textarea aria-label="${esc(f.label||'字段')}内容" data-key="value" maxlength="500" rows="1">${esc(f.value)}</textarea><button class="remove" title="删除字段" aria-label="删除${esc(f.label||'字段')}">×</button></div>`).join('');
}
function sync(){invalidNumbers.clear();for(const id of ['title','width','height','margin','radius','fontSize','qrSize','qrMode','qrText']){$(id).value=state[id];$(id).setCustomValidity('')}for(const id of ['holes','qrEnabled'])$(id).checked=state[id];$('customWrap').hidden=state.qrMode!=='custom';$('preset').value=['120,70','100,60','150,90'].includes(`${state.width},${state.height}`)?`${state.width},${state.height}`:'custom';document.querySelectorAll('[data-material]').forEach(b=>b.classList.toggle('selected',b.dataset.material===state.material));fields();update()}
function update(){
  const version=++updateVersion;result=buildPlate(state,measure);$('flatViewport').innerHTML=result.svg;$('printArea').innerHTML=result.svg;
  const errors=result.errors;if(invalidNumbers.size)errors.push('尺寸或字号输入无效，请在标注范围内填写');$('layoutStatus').textContent=errors.length?errors.join('；'):`排版就绪 · ${state.fields.length} 个字段`;$('layoutStatus').classList.toggle('error',!!errors.length);
  for(const id of ['exportSvg','exportPng','print'])$(id).disabled=!!errors.length;
  $('dimensionLabel').textContent=`${state.width} × ${state.height} mm`;$('materialLabel').textContent={black:'BLACK ANODIZED ALUMINUM',silver:'MATTE SILVER ALUMINUM',white:'WHITE PET LABEL'}[state.material];
  $('qrPreview').innerHTML=result.qr?.svg||'<span class="hint">尚未生成二维码</span>';$('downloadQR').disabled=!result.qr;
  if(preview)preview.update(state,result.svg).catch(()=>{if(version===updateVersion)toast('三维纹理更新失败，平面稿仍可使用')});save();
}
$('fields').addEventListener('input',e=>{const row=e.target.closest('[data-id]');if(!row||!e.target.dataset.key)return;state.fields.find(f=>f.id===row.dataset.id)[e.target.dataset.key]=e.target.value;update()});
$('fields').addEventListener('click',e=>{if(!e.target.closest('.remove'))return;state.fields=state.fields.filter(f=>f.id!==e.target.closest('[data-id]').dataset.id);fields();update()});
$('fields').addEventListener('keydown',e=>{if(!e.target.matches('.drag')||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const id=e.target.closest('[data-id]').dataset.id,i=state.fields.findIndex(f=>f.id===id),j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=state.fields.length)return;[state.fields[i],state.fields[j]]=[state.fields[j],state.fields[i]];fields();update();$('fields').querySelectorAll('.drag')[j].focus()});
$('fields').addEventListener('dragstart',e=>{if(e.target.matches('input,textarea')){e.preventDefault();return}dragId=e.target.closest('[data-id]')?.dataset.id;e.dataTransfer.effectAllowed='move'});
$('fields').addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move'});
$('fields').addEventListener('drop',e=>{e.preventDefault();const target=e.target.closest('[data-id]')?.dataset.id;if(!dragId||!target||dragId===target)return;const from=state.fields.findIndex(f=>f.id===dragId),to=state.fields.findIndex(f=>f.id===target);state.fields.splice(to,0,state.fields.splice(from,1)[0]);fields();update()});
$('addField').onclick=()=>{if(state.fields.length>=40)return toast('最多添加 40 个字段');state.fields.push({id:crypto.randomUUID(),label:'自定义字段',value:''});fields();update();$('fields').lastElementChild.querySelector('input').focus()};
for(const id of ['title','qrText'])$(id).addEventListener('input',()=>{state[id]=$(id).value;update()});
for(const id of ['width','height','margin','radius','fontSize','qrSize'])$(id).addEventListener('input',()=>{const el=$(id),n=Number(el.value);if(!el.value||!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max)){el.setCustomValidity(`请输入 ${el.min} 至 ${el.max} 之间的数值`);invalidNumbers.add(id);update();return}el.setCustomValidity('');invalidNumbers.delete(id);state[id]=n;if(id==='width'||id==='height')$('preset').value='custom';update()});
for(const id of ['holes','qrEnabled'])$(id).onchange=()=>{state[id]=$(id).checked;update()};
$('qrMode').onchange=()=>{state.qrMode=$('qrMode').value;$('customWrap').hidden=state.qrMode!=='custom';update()};
$('preset').onchange=()=>{if($('preset').value==='custom')return;[state.width,state.height]=$('preset').value.split(',').map(Number);sync();preview?.reset(state.width)};
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{state.material=b.dataset.material;sync()});
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(t=>{t.setAttribute('aria-selected',String(t===b));$(t.dataset.panel).hidden=t!==b})});
function setView(v){view=v;$('threeViewport').hidden=v!=='3d';$('flatViewport').hidden=v!=='2d';$('view3d').classList.toggle('active',v==='3d');$('view2d').classList.toggle('active',v==='2d');$('viewHint').textContent=v==='3d'?'拖动旋转 · 滚轮缩放':'正面生产稿 · 导出内容与此一致';$('resetView').hidden=v==='2d';if(v==='3d')preview?.render()}
$('view3d').onclick=()=>{if(!preview)return toast('此浏览器未提供 WebGL，使用平面生产稿');setView('3d')};$('view2d').onclick=()=>setView('2d');$('resetView').onclick=()=>preview?.reset(state.width);
function download(data,type,name){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
const filename=()=>((state.title||'nameplate').replace(/[\\/:*?"<>|]/g,'_').slice(0,40));
$('exportSvg').onclick=()=>{if(result.errors.length)return;download(result.svg,'image/svg+xml;charset=utf-8',`${filename()}-${state.width}x${state.height}mm.svg`);toast('SVG 矢量稿已导出')};
function setDpi(blob,dpi){return blob.arrayBuffer().then(buf=>{const bytes=new Uint8Array(buf);const chunk=new Uint8Array(21),v=new DataView(chunk.buffer);v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,Math.round(dpi/0.0254));v.setUint32(12,Math.round(dpi/0.0254));chunk[16]=1;let crc=0xffffffff;for(let i=4;i<17;i++){crc^=chunk[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}v.setUint32(17,(crc^0xffffffff)>>>0);return new Blob([bytes.slice(0,33),chunk,bytes.slice(33)],{type:'image/png'})})}
$('exportPng').onclick=async()=>{if(result.errors.length)return;try{const snapshot={...state},svg=result.svg;const image=await svgImage(svg),canvas=document.createElement('canvas');canvas.width=Math.round(snapshot.width/25.4*300);canvas.height=Math.round(snapshot.height/25.4*300);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();download(await setDpi(blob,300),'image/png',`${filename()}-300dpi.png`);toast('300 DPI PNG 已导出')}catch{toast('PNG 导出失败，请尝试 SVG 格式')}};
$('print').onclick=()=>{if(result.errors.length)return;let style=$('printPageSize');if(!style){style=document.createElement('style');style.id='printPageSize';document.head.append(style)}style.textContent=`@media print{@page{size:${state.width+20}mm ${state.height+20}mm;margin:10mm}}`;window.print()};
$('downloadQR').onclick=()=>{try{const qr=makeQR(qrContent(state));if(qr)download(qr.svg,'image/svg+xml;charset=utf-8',`${filename()}-qrcode.svg`)}catch{toast('二维码内容过长')}};
$('saveConfig').onclick=()=>download(JSON.stringify(state,null,2),'application/json',`${filename()}-config.json`);
$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async()=>{try{const file=$('importFile').files[0];if(!file)return;if(file.size>100000)throw Error('配置文件过大');const next=validate(JSON.parse(await file.text()));state=next;sync();preview?.reset(state.width);toast('配置已导入')}catch(e){toast('导入失败：'+e.message)}finally{$('importFile').value=''}};
$('reset').onclick=()=>{if(!confirm('恢复示例将替换当前草稿，是否继续？'))return;state=defaults();sync();preview?.reset(state.width);toast('已恢复示例')};
function theme(value){document.body.dataset.theme=value;document.querySelector('.brand img').src=value==='dark'?'./assets/logo-light.svg':'./assets/logo.svg';try{localStorage.setItem('sophimotion-theme',value)}catch{}}
try{theme(localStorage.getItem('sophimotion-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))}catch{theme('light')}
$('theme').onclick=()=>theme(document.body.dataset.theme==='dark'?'light':'dark');
sync();try{preview=createPreview($('threeViewport'));preview.reset(state.width);preview.update(state,result.svg).catch(()=>{setView('2d');$('threeFallback').hidden=false})}catch{setView('2d');$('threeFallback').hidden=false}
// A compact read-only inspection surface for QA, with no user data transmitted.
window.nameplateQA={snapshot:()=>({state:structuredClone(state),errors:[...result.errors],qr:result.qr?.content,view}),svg:()=>result.svg};
