import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MineMetricsSnapshot } from '../../shared/contracts';

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
      <p className="scene-caption">运行快照 · {new Date(data.asOf).toLocaleString('zh-CN',{hour12:false})}</p>
      {!data.connected && <p className="scene-caption">设备与监测数据未接入</p>}
      {data.groups.map((g,i)=><details key={g.title} open={tab==='data'||(tab==='ops'?i===0:i!==0)}><summary>{g.title}</summary><dl className="scene-facts">{g.items.map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value ?? '—'} <small>{unit}</small></dd></div>)}</dl></details>)}
      {range!=='current' && data.connected && <section className="scene-history"><h4>粉尘浓度 · mg/m³</h4><Trend values={data.series.map(p=>p.dust)} label="粉尘浓度 mg/m³"/><p className="scene-caption">{data.period.from.slice(0,10)} — {data.period.to.slice(0,10)} · {data.series.length} 个样本 · {Math.min(...data.series.map(p=>p.dust))}–{Math.max(...data.series.map(p=>p.dust))} mg/m³</p><h4>在岗人数 · 人</h4><Trend values={data.series.map(p=>p.workers)} label="在岗人数"/></section>}
      <p className="scene-caption">来源：矿区运行记录。历史选择仅更新指标，不回放设备路线。未接入数据不计为零。</p>
    </>}
  </div>;
}
