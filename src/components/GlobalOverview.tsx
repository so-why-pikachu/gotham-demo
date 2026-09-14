import { useEffect, useState } from "react";
import type { WorkspaceManagerAPI } from "../App";
import CesiumViewer from "./CesiumViewer";
import { useBusiness } from "../store/BusinessProvider";
import MineInfoPanel from './MineInfoPanel';
import type { MotionReading } from './EquipmentCloseup/MotionGauges';
import EquipmentCloseup from './EquipmentCloseup';
import { MINE_LOCATIONS } from '../cesium/locations.js';
function readSceneSelection():{mineId:string|null;equipmentId:string|null} {
  try { const s=JSON.parse(sessionStorage.getItem('gotham-scene-selection')??'null');
    return MINE_LOCATIONS.some(m=>m.id===s?.mineId)?s:{mineId:null,equipmentId:null};
  } catch {return {mineId:null,equipmentId:null};}
}
export default function GlobalOverview({
  manager,
}: {
  manager: WorkspaceManagerAPI;
}) {
  const { data } = useBusiness();
  const [mineId,setMineId]=useState<string|null>(()=>readSceneSelection().mineId);
  const [equipmentId,setEquipmentId]=useState<string|null>(()=>readSceneSelection().equipmentId);
  useEffect(()=>{try{sessionStorage.setItem('gotham-scene-selection',JSON.stringify({mineId,equipmentId}));}catch{}},[mineId,equipmentId]);
  const [motion,setMotion]=useState<MotionReading|null>(null);
  const [parked,setParked]=useState(false);
  const [phase,setPhase]=useState('national');
  const [infoOpen,setInfoOpen]=useState(true);
  const [cameraReset,setCameraReset]=useState(0);
  const [focusRequest,setFocusRequest]=useState(0);
  const selectEquipment=(id:string|null)=>{setEquipmentId(id);if(id)setFocusRequest(n=>n+1);};
  const mine=MINE_LOCATIONS.find(m=>m.id===mineId);
  const equipment=data.equipment.find(e=>e.id===equipmentId && e.mineId===mineId);
  const selectMine=(id:string|null)=>{setMineId(id);setEquipmentId(null);setInfoOpen(true);setCameraReset(n=>n+1);};
  return (
    <div className={`workspace global-overview ${equipment?'has-equipment-info':''}`}>
      <div className="map-placeholder cesium-map-placeholder">
        <CesiumViewer
          mineId={mineId} equipmentId={equipmentId} reset={cameraReset} focusRequest={focusRequest}
          onMine={selectMine} onEquipment={selectEquipment} onPhase={setPhase} onParked={setParked} onMotion={setMotion}
        />
      </div>
      {mine&&!equipment&&<nav className="scene-navigation" aria-label="地图预设导航"><select aria-label="选择矿区" value={mineId??''} onChange={e=>selectMine(e.target.value||null)}><option value="">全国俯瞰</option>{MINE_LOCATIONS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{mine&&<><button onClick={()=>selectMine(null)}>返回全国</button><button onClick={()=>setCameraReset(n=>n+1)}>复位视角</button><button onClick={()=>{setEquipmentId(null);setInfoOpen(true);setCameraReset(n=>n+1);}}>矿区指标</button></>}</nav>}
      {mine&&infoOpen&&!equipment&&<MineInfoPanel mine={mine} equipment={data.equipment.filter(e=>e.mineId===mineId)} selectedEquipmentId={equipmentId} onEquipment={selectEquipment} onClose={()=>setInfoOpen(false)} onBack={()=>selectMine(null)}/>}
      {!mine&&<aside className="mine-info-panel" aria-label="全国项目总览"><div className="mine-info-tabs"><button className="mine-info-tab active">项目总览</button></div><div className="mine-info-body"><h2>全国项目分布</h2><p className="scene-caption">演示场景 · 2026-09-12 09:00</p><dl className="scene-facts"><div><dt>已登记矿区</dt><dd>{data.mines.length}</dd></div><div><dt>已接入设备</dt><dd>{data.equipment.length} 台</dd></div><div><dt>关注 / 告警设备</dt><dd>{data.equipment.filter(e=>['warning','alert'].includes(e.status)).length} 台</dd></div><div><dt>资料 / 报告</dt><dd>{data.documents.length} / {data.reports.length}</dd></div></dl>{data.mines.map(m=><details key={m.id} open={m.connected}><summary>{m.name} · {m.connected?'已接入':'基础登记'}</summary><p className="scene-caption">{m.region} · {m.mineral} · {m.operator}</p><p>{m.connected?`${data.equipment.filter(e=>e.mineId===m.id).length} 台设备，三条作业路线`:'尚未接入运行与监测数据'}</p><button className="action-btn" onClick={()=>selectMine(m.id)}>进入矿区 ↗</button></details>)}</div></aside>}
      {equipment&&<EquipmentCloseup motion={motion?.equipmentId===equipment?.id?motion:undefined} parked={parked} phase={phase} onSelect={selectEquipment} onLocate={()=>setFocusRequest(n=>n+1)} key={equipment.id} equipment={equipment} onClose={()=>{setEquipmentId(null);setInfoOpen(true);setCameraReset(n=>n+1);}} onDiagnose={()=>manager.openWorkspace('mine',mine?.name??'矿区',{equipmentId:equipment.id,mineId:equipment.mineId})}/>}

    </div>
  );
}
