import QRCode from 'qrcode';

export const defaults = () => ({version:1,title:'SophiRobot',width:120,height:70,margin:6,radius:4,fontSize:9,holes:true,material:'black',qrEnabled:true,qrMode:'auto',qrText:'',qrSize:26,fields:[['产品名称','SophiRobot'],['产品型号','SMR01-010'],['产品编号','SN20261015001'],['生产日期','2026-10-15'],['额定电压','220 V'],['额定功率','500 W'],['制造商','请填写制造商全称'],['制造地址','请填写实际生产地址']].map(([label,value],i)=>({id:'f'+i,label,value}))});
export const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function validate(s){
  if(!s||typeof s!=='object'||!Array.isArray(s.fields)||s.fields.length>40)throw Error('配置格式不正确，字段上限为 40。');
  const n=defaults();
  for(const [key,min,max] of [['width',40,300],['height',25,200],['margin',3,15],['radius',0,15],['fontSize',5,18],['qrSize',12,60]]){if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`${key} 超出有效范围 ${min}–${max}`);n[key]=s[key]}
  for(const key of ['title','qrText']){if(typeof s[key]!=='string'||s[key].length>(key==='title'?80:1600))throw Error('标题或二维码文本长度超限');n[key]=s[key]}
  for(const key of ['holes','qrEnabled']){if(typeof s[key]!=='boolean')throw Error('配置开关格式不正确');n[key]=s[key]}
  if(!['black','silver','white'].includes(s.material)||!['auto','custom'].includes(s.qrMode))throw Error('材质或编码模式无效');
  n.material=s.material;n.qrMode=s.qrMode;
  n.fields=s.fields.map((f,i)=>{if(!f||typeof f.label!=='string'||typeof f.value!=='string'||f.label.length>40||f.value.length>500)throw Error('字段格式不正确（名称最多 40 字，内容最多 500 字）');return {id:'f'+i,label:f.label,value:f.value}});
  return n;
}
export const qrContent = s => s.qrMode==='custom'?s.qrText:[s.title,...s.fields.filter(f=>f.label.trim()||f.value.trim()).map(f=>`${f.label}：${f.value}`)].join('\n');
export function makeQR(content){
  if(!content.trim())return null;
  const qr=QRCode.create(content,{errorCorrectionLevel:'M'}),n=qr.modules.size;
  let path='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.modules.get(y,x))path+=`M${x+4} ${y+4}h1v1h-1z`;
  return {size:n+8,path,content,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+8} ${n+8}" width="${n+8}" height="${n+8}"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`};
}
export function wrapText(text,max,measure){
  const lines=[];for(const paragraph of text.split('\n')){let line='';for(const c of Array.from(paragraph)){if(line&&measure(line+c)>max){lines.push(line);line=c}else line+=c}lines.push(line)}return lines;
}
export function buildPlate(s,measure){
  const errors=[];const w=s.width,h=s.height,m=Math.max(s.margin,s.holes?9:0),right=Math.max(s.margin,s.holes?9:0);
  const font=s.fontSize*25.4/72,lineHeight=font*1.48;
  let qr=null;try{if(s.qrEnabled)qr=makeQR(qrContent(s));if(s.qrEnabled&&!qr)errors.push('二维码内容为空')}catch{errors.push('二维码内容过长，请缩短文本')}
  if(qr&&s.qrSize/qr.size<0.25)errors.push('二维码过密：请增大二维码或减少编码内容（建议模块 ≥ 0.25 mm）');
  const titleY=s.margin+6.5,titleSize=6.5,titleMax=w-m-right;
  let ts=titleSize;while(ts>3&&measure(s.title,ts,true)>titleMax)ts-=.25;
  if(measure(s.title,ts,true)>titleMax)errors.push('铭牌标题过长');
  const startY=titleY+7.5,qrX=w-right-s.qrSize,qrY=startY-2;
  const textW=w-m-right-(qr?s.qrSize+5:0);
  if(textW<12)errors.push('文字区域过窄，请增大铭牌或缩小二维码');
  if(qr&&(qrY+s.qrSize>h-s.margin||qrX<m))errors.push('二维码超出安全区域');
  const text=[];let y=startY;
  const labelMax=Math.min(Math.max(0,...s.fields.map(f=>measure(f.label+'：',font,false))),Math.max(0,textW*.42));
  for(const f of s.fields){
    const labelLines=wrapText(f.label+(f.label?'：':''),Math.max(1,labelMax),t=>measure(t,font,false));
    const valueLines=wrapText(f.value,Math.max(1,textW-labelMax-1),t=>measure(t,font,false));
    const rows=Math.max(labelLines.length,valueLines.length);
    labelLines.forEach((t,i)=>text.push({x:m,y:y+i*lineHeight,t}));
    valueLines.forEach((t,i)=>text.push({x:m+labelMax+1,y:y+i*lineHeight,t}));
    y+=rows*lineHeight+.55;
  }
  if(y-lineHeight*.3>h-s.margin)errors.push('内容超出铭牌：请加大尺寸、缩小字号或删除字段');
  const bg={black:'#24272b',silver:'#d9dce0',white:'#ffffff'}[s.material],fg=s.material==='black'?'#f2f3f4':'#18202b';
  const holeMarkup=s.holes?`<circle cx="5" cy="${h/2}" r="2" fill="black"/><circle cx="${w-5}" cy="${h/2}" r="2" fill="black"/>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><defs><mask id="plateMask"><rect width="${w}" height="${h}" rx="${Math.min(s.radius,w/2,h/2)}" fill="white"/>${holeMarkup}</mask></defs><g mask="url(#plateMask)"><rect width="${w}" height="${h}" fill="${bg}"/><rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" rx="${Math.max(0,s.radius-.5)}" fill="none" stroke="${s.material==='black'?'#6b7078':'#a7adb5'}" stroke-width="0.2"/><g fill="${fg}" font-family="Arial,Microsoft YaHei,sans-serif"><text x="${m}" y="${titleY}" font-size="${ts}" font-weight="700">${esc(s.title)}</text><g font-size="${font}">${text.map(t=>`<text x="${t.x}" y="${t.y}">${esc(t.t)}</text>`).join('')}</g></g>${qr?`<svg x="${qrX}" y="${qrY}" width="${s.qrSize}" height="${s.qrSize}" viewBox="0 0 ${qr.size} ${qr.size}"><rect width="100%" height="100%" fill="white"/><path d="${qr.path}" fill="black"/></svg>`:''}</g></svg>`;
  return {svg,errors,qr,usedHeight:y,fontMm:font};
}
