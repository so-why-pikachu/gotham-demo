import { equipment, customers, evidenceSources, documents } from "../seed/index.mjs";
import {DATASET_VERSION,buildScenarioReports,profiles} from '../seed/scenario.mjs';
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export const latest = (reports) => [
  ...new Map(reports.map((r) => [r.id, r])).values(),
];
export function opportunities(state) {
  const diagnoses=latest(state.reports).filter(r=>r.type==='diagnosis'&&r.collection!=='archive')
    .sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.version-b.version);
  return [...new Map(diagnoses.map(r=>[r.equipmentId,r])).values()]
    .filter(r=>r.amountCents>0)
    .map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      customerId: r.customerId,
      mineId: r.mineId,
      title: r.decision,
      amountCents: r.amountCents,
      sourceVersion: r.version,
    }));
}
export function diagnose(state, body, previous) {
  const e = equipment.find(
    (e) => e.id === (previous?.equipmentId ?? body.equipmentId),
  );
  if (!e) fail(404, "设备不存在");
  if (
    !Array.isArray(body.evidenceIds) ||
    !body.evidenceIds.length ||
    body.evidenceIds.some(
      (id) => !evidenceSources(e.id).some((s) => s.id === id),
    )
  )
    fail(400, "请选择属于当前设备的有效证据");
  const ids = [
    ...new Set([...(previous?.evidenceIds ?? []), ...body.evidenceIds]),
  ].sort();
  const id = previous?.id ?? `DR-${e.id}`;
  const old = latest(state.reports).find((r) => r.id === id);
  if (previous && body.baseVersion !== old.version)
    fail(409, "报告版本已更新，请重新加载");
  if (old && JSON.stringify(old.evidenceIds) === JSON.stringify(ids))
    return old;
  if (!previous && old) return old;
  const reviewed = !!previous;
  const excavator = e.model === "XE215C";
  const conclusion = excavator
    ? reviewed
      ? "历史磨损与维修成本需综合评估"
      : "滤清器堵塞风险"
    : e.model === "XDE240"
      ? "散热系统维护需求"
      : "液压系统维护需求";
  const report = {
    id,
    version: (old?.version ?? 0) + 1,
    type: "diagnosis",
    equipmentId: e.id,
    customerId: e.customerId,
    mineId: e.mineId,
    title: `${e.name} · ${reviewed ? "复核" : "诊断"}报告`,
    conclusion,
    evidenceIds: ids,
    evidence: ids.map(
      (id) => evidenceSources(e.id).find((s) => s.id === id).body,
    ),
    createdAt: new Date().toISOString(),
    confidence: reviewed ? 68 : 44,
    reviewed,
    collection: reviewed ? 'reviews' : 'diagnosis',
    evidenceSnapshot: ids.map(id=>{const d=evidenceSources(e.id).find(s=>s.id===id);return {id,title:d.title,body:d.body};}),
    sections: [{title:'处置建议',body:e.status==='active'?`运行稳定，按${e.nextServiceAt}完成计划保养。`:profiles[e.model].action}, {title:'评估边界',body:'费用为演示预算，技术范围和正式报价待确认；不代表已发生采购。'}],
    decision: excavator && reviewed ? "置换评估" : "维护评估",
    amountCents: excavator
      ? reviewed
        ? 260000000
        : 128000
      : e.model === "XDE240"
        ? 18000000
        : 38000000,
  };
  if(e.status==='active') {report.conclusion='当前无活跃告警，继续计划保养';report.decision='计划保养';report.amountCents=0;}
  report.costItems=[{label:report.decision+'预算',amountCents:report.amountCents}];
  state.reports.push(report);
  return report;
}
export function business(state, body) {
  const source = state.reports.find(
    (r) =>
      r.id === body.sourceId &&
      r.version === body.sourceVersion &&
      r.type === "diagnosis",
  );
  if (!source) fail(404, "诊断来源版本不存在");
  if (body.documentIds !== undefined && (!Array.isArray(body.documentIds) || body.documentIds.some(id => typeof id !== 'string')))
    fail(400, '输入资料列表无效');
  const documentIds = [...new Set(body.documentIds ?? [])].sort();
  const inputs = documentIds.map(id => {
    const doc = documents.find(d => d.id === id && (d.equipmentId === source.equipmentId || (!d.equipmentId && d.mineId === source.mineId)));
    if (!doc) fail(400, '请选择属于当前设备或矿区的有效输入资料');
    return doc;
  });
  if (
    !Number.isInteger(body.units) ||
    body.units < 1 ||
    body.units > 2 ||
    !["2026Q4", "2027Q1"].includes(body.delivery) ||
    typeof body.finance !== "boolean"
  )
    fail(400, "数量、交期或商务模式无效");
  const old = latest(state.reports).find(
    (r) => r.type === "business" && r.sourceId === source.id,
  );
  if (
    old &&
    old.sourceVersion === source.version &&
    old.units === body.units &&
    old.delivery === body.delivery &&
    old.finance === body.finance &&
    JSON.stringify(old.documentIds ?? []) === JSON.stringify(documentIds)
  )
    return old;
  const report = {
    ...source,
    id: `BR-${source.equipmentId}`,
    version: Math.max(0, ...state.reports.filter(r => r.id === `BR-${source.equipmentId}`).map(r => r.version)) + 1,
    type: "business",
    collection: 'demand',
    title: `${source.decision} · 需求报告`,
    sourceId: source.id,
    sourceVersion: source.version,
    documentIds,
    evidenceIds: [...new Set([...source.evidenceIds, ...documentIds])],
    evidence: [...source.evidence, ...inputs.map(d => d.body)],
    evidenceSnapshot: [
      { id: source.id, title: `${source.title} · v${source.version}`, body: source.conclusion },
      ...inputs.map(d => ({ id: d.id, title: d.title, body: d.body })),
    ],
    units: body.units,
    delivery: body.delivery,
    finance: body.finance,
    amountCents: source.amountCents * body.units,
    costItems: (source.costItems??[{label:'方案预算',amountCents:source.amountCents}]).map(c=>({...c,amountCents:c.amountCents*body.units})),
    sections: [{title:'需求依据',body:source.conclusion}, ...inputs.map(d => ({title:`编排输入 · ${d.title}`,body:d.body})), {title:'采购安排',body:`${body.units} 台／套，交付窗口 ${body.delivery}。${body.finance ? '需进一步确认融资条件。' : '采用标准商务方案。'}技术范围、预算审批和供应商报价待确认，尚未形成订单。`},{title:'编排说明',body:'本报告按所选依据组装，方案预算沿用诊断评估金额乘以数量。未选择的外部资料不作为新增输入；客户预算及正式报价仍待核实。'}],
    sent: false,
    createdAt: new Date().toISOString(),
  };
  state.reports.push(report);
  return report;
}
export function seedState(preset = "seeded") {
  const state = {
    schema: 1,
    datasetVersion: DATASET_VERSION,
    reports: [],
    customers: structuredClone(customers),
    requests: {},
  };
  if (preset === "seeded") state.reports=buildScenarioReports(equipment,documents);
  return state;
}
export function migrateScenario(state) {
  if((state.datasetVersion??0)>=DATASET_VERSION)return false;
  const existing=new Set(state.reports.map(r=>r.id));
  state.reports.push(...buildScenarioReports(equipment,documents).filter(r=>!existing.has(r.id)));
  state.datasetVersion=DATASET_VERSION;
  return true;
}
