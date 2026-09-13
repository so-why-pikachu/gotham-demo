import { useEffect, useState } from "react";
import type { WorkspaceManagerAPI } from "../App";
import CesiumViewer from "./CesiumViewer";
import { useBusiness } from "../store/BusinessProvider";
import MineInfoPanel from './MineInfoPanel';
import { EquipmentInfoPanel } from './ScenePanels';
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
          onMine={selectMine} onEquipment={selectEquipment}
        />
      </div>
      <nav className="scene-navigation" aria-label="地图预设导航"><select aria-label="选择矿区" value={mineId??''} onChange={e=>selectMine(e.target.value||null)}><option value="">全国俯瞰</option>{MINE_LOCATIONS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{mine&&<><button onClick={()=>selectMine(null)}>返回全国</button><button onClick={()=>setCameraReset(n=>n+1)}>复位视角</button><button onClick={()=>setInfoOpen(v=>!v)}>矿区指标</button></>}</nav>
      {mine&&infoOpen&&<MineInfoPanel mine={mine} equipment={data.equipment.filter(e=>e.mineId===mineId)} selectedEquipmentId={equipmentId} onEquipment={selectEquipment} onClose={()=>setInfoOpen(false)} onBack={()=>selectMine(null)}/>}
      {equipment&&<EquipmentInfoPanel key={equipment.id} equipment={equipment} onClose={()=>setEquipmentId(null)} onDiagnose={()=>manager.openWorkspace('mine',mine?.name??'矿区',{equipmentId:equipment.id,mineId:equipment.mineId})}/>}

    </div>
  );
}
