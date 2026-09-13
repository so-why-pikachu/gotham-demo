import type { Report } from "../../shared/contracts";
export const categories = [
  "DIAGNOSIS",
  "REVIEWS",
  "DEMAND",
  "FOLLOW-UP",
  "ARCHIVE",
];
export const wrap = (n: number, count: number) =>
  count ? ((n % count) + count) % count : 0;
export const key = (lane: number, row: number) => `${lane}:${row}`;
export function adapt(r: Report, index = 0) {
  const column = r.type === "diagnosis" ? (r.reviewed ? 1 : 0) : r.sent ? 3 : 2;
  return {
    id: r.id,
    code: r.id,
    title: r.title,
    category: categories[column],
    column,
    index,
    subtitle: `${r.equipmentId} · v${r.version} · 演示模拟数据`,
    date: r.createdAt.slice(0, 10),
    summary: r.conclusion,
    findings: r.evidence,
    report: r,
  };
}
export type ArchiveRecord = ReturnType<typeof adapt>;
export let records: ArchiveRecord[] = [];
export function setReports(reports: Report[]) {
  const counts = [0, 0, 0, 0, 0];
  records = reports.map((r) => {
    const item = adapt(r);
    item.index = counts[item.column]++;
    return item;
  });
}
export const columnCount = (lane: number) =>
  records.filter((r) => r.column === wrap(lane, 5)).length;
const empty = {
  id: "",
  code: "—",
  title: "暂无报告",
  category: "ARCHIVE",
  column: 0,
  index: 0,
  subtitle: "从设备 Inspector 发起模拟诊断",
  date: "—",
  summary: "",
  findings: [],
  report: undefined as unknown as Report,
};
export function recordAt(lane: number, row: number): ArchiveRecord {
  const col = wrap(lane, 5),
    items = records.filter((r) => r.column === col);
  return (
    items[wrap(row, items.length)] ?? {
      ...empty,
      column: col,
      category: categories[col],
    }
  );
}
