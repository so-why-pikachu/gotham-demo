import { useEffect, useId, useState } from 'react';
import type { WorkspaceManagerAPI } from '../App';
import type { Report } from '../../shared/contracts';
import { useBusiness } from '../store/BusinessProvider';
import { Compose, FileText } from './Icons';
import './compose-workspace.css';
import ComposeNeonBorder from './ComposeNeonBorder';

const groups = [
  { name: '诊断报告', en: 'DIAGNOSIS', categories: [] },
  { name: '招投标资料', en: 'TENDER INTELLIGENCE', categories: ['招投标'] },
  { name: '历史商务与报价', en: 'COMMERCIAL RECORDS', categories: ['商务资料', '结案资料'] },
  { name: '维修与复核记录', en: 'MAINTENANCE', categories: ['维修工单'] },
  { name: '运行观察报告', en: 'OPERATING RECORDS', categories: ['运行记录'] },
  { name: '设备与技术资料', en: 'TECHNICAL CONTEXT', categories: ['设备档案', '技术资料', '矿区资料'] },
];

export default function ComposeWorkspace({ manager, params }: { manager: WorkspaceManagerAPI; params?: Record<string, unknown> }) {
  const { data } = useBusiness();
  const [equipmentId, setEquipmentId] = useState(String(params?.equipmentId ?? ''));
  useEffect(() => { if (params?.equipmentId) setEquipmentId(String(params.equipmentId)); }, [params?.equipmentId]);
  const selectedId = equipmentId || data.equipment[0]?.id || '';
  return <div className="workspace compose-workspace">
    <header className="compose-header"><div><span className="compose-eyebrow"><Compose /> COMPOSE / REPORT PIPELINE</span><h1>报告编排</h1><p>浏览依据，选择输入，汇集为一份需求方案。</p></div>
      <label>当前设备 / EQUIPMENT<select aria-label="编排设备" value={selectedId} onChange={e => setEquipmentId(e.target.value)}>{data.equipment.map(e => <option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}</select></label>
    </header>
    {selectedId && <Composition key={`${selectedId}:${params?.sourceId ?? ''}:${params?.sourceVersion ?? ''}`} equipmentId={selectedId} manager={manager} params={params?.equipmentId === selectedId ? params : undefined} />}
  </div>;
}

function Composition({ equipmentId, manager, params }: { equipmentId: string; manager: WorkspaceManagerAPI; params?: Record<string, unknown> }) {
  const { data, mutate } = useBusiness();
  const equipment = data.equipment.find(e => e.id === equipmentId)!;
  const diagnoses = data.reports.filter(r => r.equipmentId === equipmentId && r.type === 'diagnosis');
  const defaultSource = diagnoses.find(r => r.id === params?.sourceId) ?? diagnoses.find(r => r.collection === 'reviews') ?? diagnoses[0];
  const storageKey = `gotham-compose:${equipmentId}`;
  const [draft] = useState(() => { try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; } });
  const [sourceId, setSourceId] = useState(String(params?.sourceId ?? draft.sourceId ?? defaultSource?.id ?? ''));
  const source = diagnoses.find(r => r.id === sourceId);
  const docs = data.documents.filter(d => d.equipmentId === equipmentId || (!d.equipmentId && d.mineId === equipment.mineId));
  const [documentIds, setDocumentIds] = useState<string[]>(Array.isArray(draft.documentIds) ? draft.documentIds : []);
  const [diagnosisEnabled, setDiagnosisEnabled] = useState(draft.diagnosisEnabled !== false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [units, setUnits] = useState(Number(params?.units ?? draft.units ?? 1));
  const [delivery, setDelivery] = useState(String(params?.delivery ?? draft.delivery ?? '2026Q4'));
  const [finance, setFinance] = useState(Boolean(params?.finance ?? draft.finance ?? false));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const arrowId = useId().replace(/:/g, '');
  const selectedDocs = docs.filter(d => documentIds.includes(d.id));
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify({ sourceId, documentIds, diagnosisEnabled, units, delivery, finance })); } catch { /* Storage may be unavailable. */ } }, [storageKey, sourceId, documentIds, diagnosisEnabled, units, delivery, finance]);
  const groupDocs = (index: number) => docs.filter(d => (groups[index].categories as string[]).includes(d.category));
  const isSelected = (index: number) => index === 0 ? diagnosisEnabled && !!source : groupDocs(index).some(d => documentIds.includes(d.id));
  function toggleGroup(index: number) {
    setActiveGroup(index);
    if (index === 0) { if (source) setDiagnosisEnabled(!diagnosisEnabled); return; }
    const ids = groupDocs(index).map(d => d.id);
    setDocumentIds(old => isSelected(index) ? old.filter(id => !ids.includes(id)) : [...new Set([...old, ...ids])]);
  }
  async function generate() {
    if (!source || !diagnosisEnabled || busy) return;
    setBusy(true); setError('');
    try {
      const report = await mutate<Report>('/business-reports', { sourceId: source.id, sourceVersion: source.version, documentIds: selectedDocs.map(d => d.id), units, delivery, finance, requestId: crypto.randomUUID() });
      manager.openWorkspace('report', '报告', { reportId: report.id, version: report.version });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="compose-body"><section className="compose-flow" aria-label="报告输入关系图">
    <div className="compose-flow-caption"><span>01 / INPUT SOURCES</span><span>02 / DEMAND OUTPUT</span></div>
    <div className="compose-graph-scroll"><div className="compose-graph">
      <svg className="compose-links" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={arrowId} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9" fill="#4ca5ff" /></marker></defs>
        {groups.map((_, i) => isSelected(i) && <path key={i} d={`M300 ${50 + i * 100} C470 ${50 + i * 100}, 480 300, 620 300`} fill="none" stroke="#4ca5ff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" markerEnd={`url(#${arrowId})`} />)}
      </svg>
      {groups.map((group, index) => { const selected = isSelected(index); const count = index === 0 ? diagnoses.length : groupDocs(index).length; return <button key={group.en} aria-pressed={selected} className={`compose-node ${selected ? 'selected' : ''}`} style={{ top: `${(index * 100 + 10) / 6}%` }} onClick={() => toggleGroup(index)} disabled={busy}>
        {selected && <ComposeNeonBorder />}
        <span className="compose-node-number">0{index + 1}</span><span><small>{group.en}</small><strong>{group.name}</strong><em>{count ? `${index === 0 ? (selected ? 1 : 0) : groupDocs(index).filter(d => documentIds.includes(d.id)).length} / ${count} 份已输入` : '暂无资料 · 待补充'}</em></span><span className="compose-node-port" />
      </button>; })}
      <div className="compose-output"><span className="compose-eyebrow"><FileText /> BUSINESS REPORT</span><h2>商业报告</h2><p>需求方案 / DEMAND PROPOSAL</p><div className="compose-input-count"><strong>{selectedDocs.length + Number(!!source && diagnosisEnabled)}</strong> 份输入依据</div>
        <label>需求数量<select aria-label="编排需求数量" disabled={busy} value={units} onChange={e => setUnits(Number(e.target.value))}><option value={1}>1 台／套</option><option value={2}>2 台／套</option></select></label>
        <label>目标交期<select aria-label="编排交期" disabled={busy} value={delivery} onChange={e => setDelivery(e.target.value)}><option>2026Q4</option><option>2027Q1</option></select></label>
        <label><span>融资方案（模拟）</span><input type="checkbox" disabled={busy} checked={finance} onChange={e => setFinance(e.target.checked)} /></label>
        <button className="compose-generate" disabled={busy || !source || !diagnosisEnabled} onClick={() => void generate()}>{busy ? '正在生成…' : '确认输入并生成 →'}</button>
        {(!source || !diagnosisEnabled) && <small>请选择一份诊断报告作为需求依据。</small>}
        {error && <p role="alert">{error}</p>}
      </div>
    </div></div>
    <footer className="compose-flow-footer">蓝色边框与连线表示已选输入 · 点击类型切换，右侧可逐份浏览与调整</footer>
  </section><aside className="compose-inspector"><span className="compose-eyebrow">SOURCE INSPECTOR</span><h2>{groups[activeGroup].name}</h2>
    {activeGroup === 0 ? <>{source ? <><label>诊断版本<select aria-label="输入诊断报告" value={sourceId} disabled={busy} onChange={e => { setSourceId(e.target.value); setDiagnosisEnabled(true); }}>{diagnoses.map(r => <option key={r.id} value={r.id}>{r.title} · v{r.version}</option>)}</select></label><p className="compose-source-id">{source.id} · v{source.version}</p><h3>{source.title}</h3><p>{source.conclusion}</p>{source.sections?.map((s, i) => <div key={i}><h4>{s.title}</h4><p>{s.body}</p></div>)}</> : <p>此设备暂无诊断报告。请先在 Operations 中发起诊断。</p>}</> : <>{!groupDocs(activeGroup).length && <p>当前矿区尚无此类资料，暂不作为输入。已有采购纪要与预算底稿可在“历史商务与报价”中浏览。</p>}{groupDocs(activeGroup).map(d => <article key={d.id}><label className="compose-document-toggle"><input type="checkbox" disabled={busy} checked={documentIds.includes(d.id)} onChange={e => setDocumentIds(old => e.target.checked ? [...new Set([...old, d.id])] : old.filter(id => id !== d.id))} />{d.title}</label><small>{d.id} · {d.date}</small><p>{d.summary}</p><details><summary>浏览全文</summary><p className="compose-document-body">{d.body}</p></details></article>)}</>}
  </aside></div>;
}
