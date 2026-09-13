import { useState } from 'react';
import { ChevronRight, X } from './Icons';
import { MineMetrics } from './ScenePanels';
import type { Equipment } from '../../shared/contracts';

export interface MineLocationSummary {
  id: string; name: string; region: string; mineType: string;
  longitude: number; latitude: number; markerColor: string;
}
interface Props {
  mine: MineLocationSummary;
  equipment: Equipment[];
  selectedEquipmentId: string | null;
  onEquipment: (id: string) => void;
  onClose: () => void;
  onBack: () => void;
}
function EquipmentGroups({ equipment, selectedEquipmentId, onEquipment }: Pick<Props, 'equipment' | 'selectedEquipmentId' | 'onEquipment'>) {
  const groups = new Map<string, Equipment[]>();
  for (const item of equipment) {
    const model = item.model || '未登记型号';
    groups.set(model, [...(groups.get(model) ?? []), item]);
  }
  return <section className="ops-equipment" aria-label="施工机械">
    <div className="ops-equipment-heading"><h3>施工机械</h3><span>{groups.size} 种型号 · {equipment.length} 台</span></div>
    {groups.size === 0 && <p className="scene-caption">设备分布未接入</p>}
    {[...groups].map(([model, instances]) => <details className="ops-model-group" key={model} open={instances.some(e => e.id === selectedEquipmentId)}>
      <summary><span>{model}</span><small>{instances.length} 台</small></summary>
      <div className="ops-instance-list">{instances.map(item => <button
        key={item.id} data-equipment-id={item.id} aria-pressed={item.id === selectedEquipmentId}
        onClick={() => onEquipment(item.id)}
      ><span><strong>{item.name}</strong><small>{item.id} · {item.hours.toLocaleString()} h</small></span><span className="ops-instance-status">{({alert:'告警', warning:'关注', active:'运行', normal:'正常'} as Record<string,string>)[item.status] ?? item.status}<ChevronRight size={13}/></span></button>)}</div>
    </details>)}
  </section>;
}
export default function MineInfoPanel({mine,equipment,selectedEquipmentId,onEquipment,onClose,onBack}: Props) {
  const [tab,setTab]=useState('situations');
  return <aside className="mine-info-panel" aria-label={`${mine.name} 信息面板`}>
    <div className="mine-info-tabs">{[['situations','●','Situations'],['ops','✓','Ops'],['data','▱','Data']].map(([id,icon,label])=><button key={id} className={`mine-info-tab ${tab===id?'active':''}`} onClick={()=>setTab(id)} aria-pressed={tab===id}><span className="info-tab-icon">{icon}</span>{label}</button>)}</div>
    <div className="mine-info-body">
      <div className="mine-info-heading-row"><button className="mine-info-back" onClick={onBack}><ChevronRight size={15} className="mine-info-back-icon"/><span>返回全国</span></button><button className="mine-info-close" onClick={onClose} aria-label="关闭信息面板"><X size={15}/></button></div>
      <div className="mine-info-title-block"><h2>{mine.name}</h2><p>{mine.region} · {mine.mineType}</p></div>
      {tab==='ops' && <EquipmentGroups equipment={equipment} selectedEquipmentId={selectedEquipmentId} onEquipment={onEquipment}/>}
      {tab!=='ops' && <MineMetrics key={mine.id} mineId={mine.id} tab={tab}/>}
    </div>
  </aside>;
}
