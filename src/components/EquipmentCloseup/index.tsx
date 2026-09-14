import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useBusiness } from '../../store/BusinessProvider';
import type { Equipment, EquipmentAlert, Document, List } from '../../../shared/contracts';
import './equipment-closeup.css';
import MotionGauges, {type MotionReading} from './MotionGauges';
type Sample={time:string;field:string;value:number;unit:string};
const status=(s:string)=>({active:'正常',warning:'关注',alert:'告警'}[s]??s);
function Plot({samples,bars=false}:{samples:Sample[];bars?:boolean}) {
  if(!samples.length)return <p>暂无遥测 / NO DATA</p>;
  const grouped=bars?Object.values(samples.reduce<Record<string,Sample[]>>((a,p)=>{(a[p.time.slice(0,13)]??=[]).push(p);return a;},{})).map(a=>({...a[0],value:a.reduce((s,p)=>s+p.value,0)/a.length})):samples;
  const lo=bars?0:Math.floor(Math.min(...grouped.map(p=>p.value))*.95),hi=Math.max(...grouped.map(p=>p.value))*1.03,span=hi-lo||1;
  return <><div className="ec-plot"><svg viewBox="0 0 300 110" role="img" aria-label={`${samples[0].field}，近24小时，${samples[0].unit}`}>
    {[0,1,2,3].map(i=><g key={i}><path d={`M30 ${8+i*28}H298`} className="ec-grid"/><text x="0" y={11+i*28}>{(hi-i*span/3).toFixed(1)}</text></g>)}
    {[0,1,2,3,4].map(i=><path key={i} d={`M${30+i*67} 8V92`} className="ec-grid"/>)}
    {bars?grouped.map((p,i)=><rect key={p.time} x={31+i*266/grouped.length} y={92-(p.value-lo)/span*84} width={Math.max(1,266/grouped.length-3)} height={(p.value-lo)/span*84} fill="var(--ec-green)"/>):<polyline fill="none" stroke="var(--ec-green)" strokeWidth="1.5" points={grouped.map((p,i)=>`${30+i*268/Math.max(1,grouped.length-1)},${92-(p.value-lo)/span*84}`).join(' ')}/>}
    <text x="30" y="107">{new Date(samples[0].time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</text><text x="248" y="107">{new Date(samples.at(-1)!.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</text>
  </svg></div></>;
}
const Heading=({cn,en}:{cn:string;en:string})=><h3 className="ec-heading"><span>{cn}</span><small>{en}</small></h3>;
export default function EquipmentCloseup({equipment,phase,parked,motion,onSelect,onClose,onLocate,onDiagnose}:{equipment:Equipment;motion?:MotionReading;phase:string;parked:boolean;onSelect:(id:string)=>void;onClose:()=>void;onLocate:()=>void;onDiagnose:()=>void}) {
  const {data}=useBusiness();
  const [result,setResult]=useState<{telemetry:Sample[];alerts:EquipmentAlert[];orders:Document[]}>();
  const [error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const c=new AbortController();setResult(undefined);setError('');Promise.all([api<List<Sample>>(`/equipment/${equipment.id}/telemetry`,{signal:c.signal}),api<List<EquipmentAlert>>(`/equipment/${equipment.id}/alerts`,{signal:c.signal}),api<List<Document>>(`/equipment/${equipment.id}/work-orders`,{signal:c.signal})]).then(([t,a,o])=>{if(!c.signal.aborted)setResult({telemetry:t.items,alerts:a.items,orders:o.items});}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort();},[equipment.id,retry]);
  const series=(field:string)=>result?.telemetry.filter(p=>p.field===field)??[];
  const fields=[...new Set(result?.telemetry.map(p=>p.field)??[])];
  const primary=series(fields[0]),load=series(fields.find(f=>f.includes('负载'))??''),fuel=series(fields.find(f=>f.includes('燃油'))??'');
  const report=data.reports.filter(r=>r.equipmentId===equipment.id&&r.type==='diagnosis').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  const metric=(s:Sample[])=><div className="ec-number">{s.at(-1)?.value??'—'}<small>{s.at(-1)?.unit}</small></div>;
  return <div className="equipment-closeup" data-phase={phase}>
    <nav className="ec-nav"><button onClick={onClose}>← 返回矿区 <small>MINE OVERVIEW</small></button><span>{data.mines.find(m=>m.id===equipment.mineId)?.name}</span><button onClick={onLocate}>⌖ 重新定位 <small>LOCATE</small></button></nav>
    <div className="ec-snapshot">{equipment.asOf?.replace('T',' ').slice(0,16)} <span>演示数据 / DEMO</span></div>
    <div className="ec-left">
      <section><Heading cn="机械运行" en="FLEET / OPERATIONS"/><div className="ec-table-head"><span>实例 / 型号</span><span>状态</span><span>工时 / h</span></div>{data.equipment.filter(e=>e.mineId===equipment.mineId).map(e=><button className="ec-fleet-row" data-equipment-id={e.id} aria-pressed={equipment.id===e.id} key={e.id} onClick={()=>onSelect(e.id)}><span>{e.model}<small>{e.id.toUpperCase()}</small></span><span className={e.status}>{status(e.status)}</span><span>{e.hours.toLocaleString()}</span></button>)}</section>
      <section><Heading cn="负载分析" en="ENGINE LOAD / 24H"/><MotionGauges motion={motion} load={load.at(-1)?.value}/><Plot samples={load} bars/></section>
      <section><Heading cn="燃油消耗" en="FUEL / 24H"/>{metric(fuel)}<Plot samples={fuel}/></section>
    </div>
    <div className="ec-right">
      <section className="ec-identity"><div className="ec-kicker">EQUIPMENT / 机械实例</div><h2>{equipment.id.toUpperCase()}</h2><div className="ec-model">{equipment.name}</div><div className="ec-stats"><div><small>状态 / STATE</small><strong className={equipment.status}>{status(equipment.status)}</strong></div><div><small>累计工时 / H</small><strong>{equipment.hours.toLocaleString()}</strong></div><div><small>告警 / ALERTS</small><strong>{result?.alerts.length??'—'}</strong></div></div><details className="ec-details"><summary>档案信息 / IDENTITY ＋</summary><p>{equipment.serialNumber}</p><p>投用 {equipment.commissionedAt}</p><p>{data.customers.find(c=>c.id===equipment.customerId)?.name}</p><p>{equipment.task} · {equipment.shift}</p></details></section>
      <section><Heading cn="维护事件" en="MAINTENANCE"/>{result?.orders.length?result.orders.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(o=><details className="ec-event" key={o.id}><summary><time>{o.date.slice(5)}</time><span>{o.title}</span><b>＋</b></summary><p>{o.body}</p></details>):<p className="ec-muted">{result?'暂无维护事件':'正在读取…'}</p>}</section>
      <section><Heading cn={fields[0]??'主要参数'} en="TELEMETRY / 24H"/>{metric(primary)}<Plot samples={primary}/>{result?.alerts.map(a=><p className="ec-alert" key={a.id}>△ {a.title}</p>)}</section>
      <section className="ec-service"><Heading cn="保养与诊断" en="SERVICE"/><div className="ec-service-date"><span>下次保养</span><strong>{equipment.nextServiceAt??'—'}</strong></div><p className="ec-report" title={report?.conclusion}>{report?.conclusion??'暂无诊断'}</p><button className="ec-diagnose" onClick={onDiagnose}>进入设备诊断 <small>DIAGNOSTICS</small><span>↗</span></button></section>
    </div>
    {error&&<div className="ec-error" role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重试</button></div>}
  </div>;
}
