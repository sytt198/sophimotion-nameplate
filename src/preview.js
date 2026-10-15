import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export function createPreview(el){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;el.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,1,1500);camera.position.set(23,-55,220);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=85;controls.maxDistance=500;controls.maxPolarAngle=Math.PI*.85;
  scene.add(new THREE.HemisphereLight(0xffffff,0x707787,3));
  const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(-70,100,150);scene.add(light);const rim=new THREE.DirectionalLight(0xc8daff,2);rim.position.set(100,-30,100);scene.add(rim);
  const group=new THREE.Group();scene.add(group);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,1,64,64,64);grad.addColorStop(0,'rgba(0,0,0,.32)');grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(180,110),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.position.set(0,-7,-8);scene.add(shadow);
  const render=()=>renderer.render(scene,camera);controls.addEventListener('change',render);const obs=new ResizeObserver(()=>{const {width,height}=el.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render()});obs.observe(el);
  let revision=0;
  async function update(s,svg){
    const current=++revision;
    const image=await svgImage(svg);if(current!==revision)return;
    while(group.children.length){const obj=group.children[0];group.remove(obj);obj.geometry.dispose();for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]){mat.map?.dispose();mat.dispose()}}
    const w=s.width,h=s.height,r=Math.min(s.radius,w/2,h/2),x=-w/2,y=-h/2,shape=new THREE.Shape();
    shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
    if(s.holes)for(const hx of [-w/2+5,w/2-5]){const hole=new THREE.Path();hole.absarc(hx,0,2,0,Math.PI*2,true);shape.holes.push(hole)}
    const bodyGeom=new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.15,bevelThickness:.1,curveSegments:18});
    const body=new THREE.Mesh(bodyGeom,new THREE.MeshStandardMaterial({color:s.material==='black'?0x4c5056:s.material==='silver'?0xbac1cb:0xe8e8e8,metalness:s.material==='white'?.1:.7,roughness:.4}));group.add(body);
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(2048*h/w);const c=canvas.getContext('2d');c.drawImage(image,0,0,canvas.width,canvas.height);
    // Subtle physical brushed texture is confined to the 3D preview.
    if(s.material!=='white'){c.globalAlpha=.035;for(let iy=0;iy<canvas.height;iy+=2){c.fillStyle=iy%4?'#fff':'#000';c.fillRect(0,iy,canvas.width,1)}c.globalAlpha=1}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    const frontGeom=new THREE.ShapeGeometry(shape,18),positions=frontGeom.getAttribute('position'),uv=frontGeom.getAttribute('uv');for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+w/2)/w,(positions.getY(i)+h/2)/h);
    const front=new THREE.Mesh(frontGeom,new THREE.MeshBasicMaterial({map:texture}));front.position.z=1.1;group.add(front);shadow.scale.set(w/120,h/70,1);render();
  }
  function reset(w=120){camera.position.set(w*.18,-w*.28,w*1.95);controls.target.set(0,0,0);controls.update();render()}
  return {update,reset,render};
}
export function svgImage(svg){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('图像生成失败'))};img.src=url})}
