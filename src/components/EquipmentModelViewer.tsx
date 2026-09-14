import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {Equipment,EquipmentAlert} from '../../shared/contracts';
import {rememberAppearance,applyAppearance} from './equipment-appearance.mjs';

type Mode='实体'|'半透明'|'线框';
const partRules:[string,RegExp][]=[
  ['驾驶室',/Cabin|CabAccessories/],
  ['液压与连杆',/Cylinder|Piston|Rod_|Hoses|BucketLink|TiltRocker/],
  ['工作装置',/DumpBed|Bucket|LiftArms|Boom|Stick/],
  ['行走机构',/Wheel|Track/],
  ['动力舱外壳',/EngineHood|EngineHouse/],
  ['车架与配重',/Chassis|Frame|Carriage|carriage|Counterweight|Fender/],
];
function partName(name:string){return partRules.find(([,rule])=>rule.test(name))?.[0]??'附件';}
function disposeModel(root:T.Object3D){
  const geometry=new Set<T.BufferGeometry>(), materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  root.traverse(o=>{if(o instanceof T.Mesh || o instanceof T.Line){geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
export default function EquipmentModelViewer({equipment,alerts=[]}:{equipment:Equipment;alerts?:EquipmentAlert[]}){
  const currentAlerts=alerts.filter(a=>a.equipmentId===equipment.id);
  const faultParts=new Set(currentAlerts.flatMap(a=>a.visualization?[a.visualization.part]:[]));
  const faultRef=useRef(faultParts);faultRef.current=faultParts;
  const host=useRef<HTMLDivElement>(null);
  const runtime=useRef<{appearance:(mode:Mode,part:string)=>void;view:(name:string,part?:string)=>void}|null>(null);
  const [parts,setParts]=useState<string[]>([]),[part,setPart]=useState(''),[mode,setMode]=useState<Mode>('实体');
  const [status,setStatus]=useState('正在加载模型…'),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const el=host.current!;let disposed=false,frame=0,model:T.Group|undefined;
    let renderer:T.WebGLRenderer;
    setParts([]);setPart('');setMode('实体');setFailed(false);setStatus('正在加载模型…');
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setFailed(true);setStatus('WebGL 不可用，仍可通过右侧 Inspector 查看设备数据');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;el.append(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.01,500);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;
    scene.add(new T.HemisphereLight('#dcecf6','#233543',2.8));
    const key=new T.DirectionalLight('#f4f6fa',3);key.position.set(4,9,6);scene.add(key);
    const rim=new T.DirectionalLight('#80b9d9',2);rim.position.set(-5,5,-6);scene.add(rim);
    const grid=new T.GridHelper(16,32,'#324e63','#1b2a38');scene.add(grid);
    const groups=new Map<string,T.Mesh[]>();let radius=5;
    let inspection:{parts:Record<string,string[]>;views:Record<string,{direction:[number,number,number]}>;partViews?:Record<string,{direction:[number,number,number]}>}|undefined;
    const resolvePart=(name:string)=>Object.entries(inspection?.parts??{}).find(([,names])=>names.includes(name))?.[0]??partName(name);
    const fullBox=new T.Box3();
    const view=(name:string,selectedPart='')=>{
      const box=selectedPart?new T.Box3():fullBox.clone();
      if(selectedPart)groups.get(selectedPart)?.forEach(mesh=>box.expandByObject(mesh));
      if(box.isEmpty())return;
      const center=box.getCenter(new T.Vector3());
      const distance=Math.max(box.getSize(new T.Vector3()).length()*.6,.5)/Math.sin(T.MathUtils.degToRad(19))/Math.min(camera.aspect,1)*1.1;
      const preset=selectedPart&&name==='斜视'?inspection?.partViews?.[selectedPart]:inspection?.views[name];
      const direction=preset?new T.Vector3(...preset.direction):name==='俯视'?new T.Vector3(0,1,.001):name==='侧视'?new T.Vector3(1,.15,0):new T.Vector3(1,.65,1);
      if(Math.abs(direction.y)>.999)direction.z=.001;
      controls.target.copy(center);camera.position.copy(center).addScaledVector(direction.normalize(),distance);controls.update();
    };
    const appearance=(nextMode:Mode,selectedPart:string)=>{
      for(const [name,meshes] of groups)for(const mesh of meshes){
        const active=name===selectedPart;
        for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
          const m=material as T.MeshStandardMaterial;
          applyAppearance(m,nextMode,!!selectedPart,active,faultRef.current.has(name));
        }
      }
    };
    const resize=()=>{const {width,height}=el.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const tick=()=>{frame=requestAnimationFrame(tick);if(!document.hidden){controls.update();renderer.render(scene,camera);el.dataset.renderedTriangles=String(renderer.info.render.triangles);}};tick();
    const abort=new AbortController();
    fetch('/models/equipment-inspection.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Inspection metadata unavailable');return r.json();}).then(data=>{
      inspection=Object.values(data.models).find((m:any)=>m.uri===equipment.modelUri) as typeof inspection;
      if(disposed)return;
      return new GLTFLoader().loadAsync(equipment.modelUri);
    }).then(gltf=>{
      if(!gltf)return;
      if(disposed){disposeModel(gltf.scene);return;}
      model=gltf.scene;
      const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
      const scale=8/Math.max(size.x,size.y,size.z,.001);model.scale.multiplyScalar(scale);
      model.position.addScaledVector(center,-scale);model.position.y+=size.y*scale/2;
      scene.add(model);model.updateMatrixWorld(true);fullBox.setFromObject(model);radius=fullBox.getSize(new T.Vector3()).length();
      controls.minDistance=.4;controls.maxDistance=radius*5;
      const originals=new Set<T.Material>();
      model.traverse(o=>{if(o instanceof T.Mesh){
        const original=Array.isArray(o.material)?o.material:[o.material];original.forEach(m=>originals.add(m));
        const copies=original.map(m=>{const copy=m.clone();rememberAppearance(copy);return copy;});
        o.material=Array.isArray(o.material)?copies:copies[0];const name=resolvePart(o.name);groups.set(name,[...(groups.get(name)??[]),o]);
      }});originals.forEach(m=>m.dispose());
      runtime.current={appearance,view};appearance('实体','');setParts([...groups.keys()]);setStatus('');view('斜视');
    }).catch(()=>{if(!disposed){setStatus('模型加载失败，请重试');setFailed(true);}});
    const ray=new T.Raycaster();let down:{x:number;y:number}|null=null;
    const pointerDown=(e:PointerEvent)=>{if(e.button===0)down={x:e.clientX,y:e.clientY};};
    const pointerUp=(e:PointerEvent)=>{if(!down)return;const start=down;down=null;if(Math.hypot(start.x-e.clientX,start.y-e.clientY)>5||!model)return;
      const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
      const hit=ray.intersectObject(model,true)[0];if(hit){const name=resolvePart(hit.object.name);setPart(name);view('斜视',name);}
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
    return ()=>{disposed=true;abort.abort();runtime.current=null;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);disposeModel(scene);renderer.dispose();renderer.domElement.remove();};
  },[equipment.id,equipment.modelUri,retry]);
  useEffect(()=>{runtime.current?.appearance(mode,part);},[mode,part,alerts]);
  const choose=(name:string)=>{const next=part===name?'':name;setPart(next);runtime.current?.view('斜视',next);};
  return <div className="equipment-model-viewer">
    <header><div><small>EQUIPMENT MODEL</small><h3>{equipment.name}</h3></div><span>{part||'整机概览'}</span></header>
    <div className="equipment-model-host" ref={host} aria-label={`${equipment.name} 三维模型`}/>
    {status&&<div className="equipment-model-status" role="status">{status}{failed&&<button onClick={()=>setRetry(n=>n+1)}>重新加载</button>}</div>}
    <div className="equipment-model-toolbar">{(['实体','半透明','线框'] as Mode[]).map(v=><button key={v} disabled={!!status} aria-pressed={mode===v} onClick={()=>setMode(v)}>{v}</button>)}</div>
    <footer><div className="equipment-part-list">{parts.map(name=><button key={name} className={faultParts.has(name)?'has-fault':''} aria-pressed={part===name} onClick={()=>choose(name)}>{faultParts.has(name)&&<span aria-label="存在告警">● </span>}{name}</button>)}</div>
    {currentAlerts.map(a=><p className="equipment-fault-note" key={a.id}>{a.visualization&&parts.includes(a.visualization.part)?<button onClick={()=>choose(a.visualization!.part)}>{a.title} · {a.visualization.component}（{a.visualization.scope==='region'?'关联区域示意':'部件定位'}）</button>:<span>{a.title} · 暂无对应模型部件</span>}</p>)}
    <p>拖动旋转 · 滚轮缩放 · 点击部件查看局部{currentAlerts.length>0?' · 红色表示告警关联部件或区域（模拟）':''}</p><small>现有外部结构模型 · 半透明与线框用于观察结构，不代表真实内部剖视</small></footer>
  </div>;
}
