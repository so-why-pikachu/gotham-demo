import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Equipment, Document, List, MineMetricsSnapshot } from '../../shared/contracts';
import { useBusiness } from '../store/BusinessProvider';

function useResource<T>(path: string) {
  const [state, setState] = useState<{path:string;data?:T;error?:string}>({path});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({path});
    api<T>(path, {signal:controller.signal}).then(data => setState({path,data})).catch(e => {
      if (!controller.signal.aborted) setState({path,error:e.message});
    });
    return () => controller.abort();
  }, [path,retry]);
  return {...(state.path === path ? state : {path}), retry:()=>setRetry(n=>n+1)};
}
export function Trend({values, label}:{values:number[];label:string}) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), span = Math.max(...values)-lo || 1;
  return <svg className="scene-trend" viewBox="0 0 280 56" role="img" aria-label={label}><path d="M0 52H280" stroke="var(--border-strong)"/><polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={values.map((v,i)=>`${i*280/(values.length-1)},${48-(v-lo)/span*40}`).join(' ')}/><title>{label}: {values.join(', ')}</title></svg>;
}
export function MineMetrics({mineId,tab}:{mineId:string;tab:string}) {
  const [range,setRange] = useState('current');
  const {data,error,retry} = useResource<MineMetricsSnapshot>(`/mines/${mineId}/metrics?range=${range}`);
  return <div className="scene-metrics"><div className="scene-range" aria-label="指标时间范围">{[['current','当前'],['24h','近 24h'],['7d','近 7 天']].map(([id,label])=><button key={id} aria-pressed={range===id} onClick={()=>setRange(id)}>{label}</button>)}</div>
    {error ? <p role="alert">{error} <button onClick={retry}>重试</button></p> : !data ? <p role="status">正在读取矿区快照…</p> : <>
      <p className="scene-caption">模拟快照 · {new Date(data.asOf).toLocaleString('zh-CN',{hour12:false})}</p>
      {!data.connected && <p className="scene-caption">设备与监测数据未接入</p>}
      {data.groups.map((g,i)=><details key={g.title} open={tab==='data'||(tab==='ops'?i===0:i!==0)}><summary>{g.title}</summary><dl className="scene-facts">{g.items.map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value ?? '—'} <small>{unit}</small></dd></div>)}</dl></details>)}
      {range!=='current' && data.connected && <section className="scene-history"><h4>粉尘浓度 · mg/m³</h4><Trend values={data.series.map(p=>p.dust)} label="粉尘浓度 mg/m³"/><p className="scene-caption">{data.period.from.slice(0,10)} — {data.period.to.slice(0,10)} · {data.series.length} 个样本 · {Math.min(...data.series.map(p=>p.dust))}–{Math.max(...data.series.map(p=>p.dust))} mg/m³</p><h4>在岗人数 · 人</h4><Trend values={data.series.map(p=>p.workers)} label="在岗人数"/></section>}
      <p className="scene-caption">来源：矿区模拟样例。历史选择仅更新指标，不回放设备路线。未接入数据不计为零。</p>
    </>}
  </div>;
}
interface Telemetry {time:string;field:string;value:number;unit:string}
export function EquipmentInfoPanel({equipment,onClose,onDiagnose}:{equipment:Equipment;onClose:()=>void;onDiagnose:()=>void}) {
  const {data:business}=useBusiness();
  const mineName=business.mines.find(m=>m.id===equipment.mineId)?.name??equipment.mineId;
  const customerName=business.customers.find(c=>c.id===equipment.customerId)?.name??equipment.customerId;
  const report=business.reports.filter(r=>r.equipmentId===equipment.id&&r.type==='diagnosis').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.version-a.version)[0];
  const telemetry=useResource<List<Telemetry>>(`/equipment/${equipment.id}/telemetry`);
  const alerts=useResource<List<{id:string;title:string}>>(`/equipment/${equipment.id}/alerts`);
  const orders=useResource<List<Document>>(`/equipment/${equipment.id}/work-orders`);
  const latest=telemetry.data?.items.at(-1);
  return <aside className="equipment-info-panel" aria-label="设备档案"><header><span className="dossier-icon">▤</span><div><h2>{equipment.name}</h2><small>EQUIPMENT DOSSIER · 模拟档案</small></div><button aria-label="关闭设备档案" onClick={onClose}>×</button></header><div className="equipment-info-scroll">
    <p className="scene-caption">{equipment.id} <span className="equipment-status">{equipment.status}</span></p>
    <dl className="scene-facts">{[['型号',equipment.model],['类型',equipment.type],['矿区',equipment.mineId],['客户',equipment.customerId],['累计工时',`${equipment.hours} h`]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <h3>当前参数</h3>{telemetry.error?<p role="alert">{telemetry.error} <button onClick={telemetry.retry}>重试</button></p>:!telemetry.data?<p>读取参数…</p>:latest?<><div className="telemetry-value"><span>{latest.field}</span><strong>{latest.value}<small> {latest.unit}</small></strong></div><Trend values={telemetry.data.items.map(p=>p.value)} label={`${latest.field} ${latest.unit}`}/><p className="scene-caption">{new Date(latest.time).toLocaleString('zh-CN')} · 最近 {telemetry.data.items.length} 个样本</p></>:<p>暂无遥测</p>}
    <h3>关联档案</h3><div className="equipment-relations"><strong>{equipment.name}</strong><div><span>所属矿区<br/>{mineName}</span><span>所属客户<br/>{customerName}</span></div><div><span>最新诊断<br/>{report?`${report.id} · v${report.version}`:'未关联'}</span><span>最近工单<br/>{orders.data?.items.at(-1)?.id??'未关联'}</span></div></div>
    <h3>当前告警</h3>{alerts.error?<button onClick={alerts.retry}>告警加载失败 · 重试</button>:alerts.data?alerts.data.items.map(a=><p className="equipment-alert" key={a.id}>{a.title}</p>):<p>读取告警…</p>}
    <h3>最近维修记录</h3>{orders.error?<button onClick={orders.retry}>工单加载失败 · 重试</button>:orders.data?.items.length?orders.data.items.slice(0,3).map(d=><details key={d.id}><summary>{d.title}</summary><p className="scene-caption">{d.date}</p><p>{d.body}</p></details>):<p>暂无工单</p>}
  </div><footer><button className="action-btn" onClick={onDiagnose}>进入设备诊断 ↗</button><small>仅主动进入诊断时切换工作区</small></footer></aside>;
}
