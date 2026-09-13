import { equipment, customers, evidenceSources } from "../seed/index.mjs";
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export const latest = (reports) => [
  ...new Map(reports.map((r) => [r.id, r])).values(),
];
export function opportunities(state) {
  return latest(state.reports)
    .filter((r) => r.type === "diagnosis")
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
  const excavator = e.id === "excavator-01";
  const conclusion = excavator
    ? reviewed
      ? "历史磨损与维修成本需综合评估"
      : "滤清器堵塞风险"
    : e.id === "truck-01"
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
    decision: excavator && reviewed ? "置换评估" : "维护评估",
    amountCents: excavator
      ? reviewed
        ? 260000000
        : 128000
      : e.id === "truck-01"
        ? 18000000
        : 38000000,
  };
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
    old.finance === body.finance
  )
    return old;
  const report = {
    ...source,
    id: `BR-${source.equipmentId}`,
    version: (old?.version ?? 0) + 1,
    type: "business",
    title: `${source.decision} · 需求报告`,
    sourceId: source.id,
    sourceVersion: source.version,
    units: body.units,
    delivery: body.delivery,
    finance: body.finance,
    amountCents: source.amountCents * body.units,
    sent: false,
    createdAt: new Date().toISOString(),
  };
  state.reports.push(report);
  return report;
}
export function seedState(preset = "seeded") {
  const state = {
    schema: 1,
    reports: [],
    customers: structuredClone(customers),
    requests: {},
  };
  if (preset === "seeded")
    for (const e of equipment)
      diagnose(state, {
        equipmentId: e.id,
        evidenceIds: [`IOT-${e.id}`, `WO-${e.id}`],
      });
  return state;
}
