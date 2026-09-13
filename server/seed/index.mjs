export const mines = [
  { id: "yulong-mine", name: "玉龙矿区" },
  { id: "haerwusu-mine", name: "哈尔乌素露天煤矿" },
  { id: "antaibao-mine", name: "平朔安太堡露天煤矿" },
  { id: "zhujia-baobao-mine", name: "攀枝花朱家包包铁矿" },
];
export const customers = [
  { id: "yulong", name: "玉龙铜业（演示）", category: "战略客户" },
];
export const equipment = [
  {
    id: "truck-01",
    name: "Truck-01 矿卡",
    model: "CAT797 示意模型",
    type: "矿卡",
    status: "warning",
    modelUri: "/models/mine_truck.glb",
    hours: 8100,
  },
  {
    id: "excavator-01",
    name: "XE215C 挖掘机",
    model: "XE215C",
    type: "挖掘机",
    status: "alert",
    modelUri: "/models/XE215C.glb",
    hours: 9400,
  },
  {
    id: "loader-01",
    name: "XC958U 铲车",
    model: "XC958U",
    type: "装载机",
    status: "warning",
    modelUri: "/models/XC958U.glb",
    hours: 4600,
  },
].map((e) => ({ ...e, mineId: "yulong-mine", customerId: "yulong" }));
export const documents = equipment.flatMap((e) => [
  {
    id: `WO-${e.id}`,
    equipmentId: e.id,
    title: `${e.name} · 维修记录`,
    category: "维修工单",
    date: "2026-09-10",
    body: `模拟工单：${e.name} 已完成例行保养，需关联历史维修成本与当前工况。此记录不代表真实设备维修史。`,
  },
  {
    id: `HISTORY-${e.id}`,
    equipmentId: e.id,
    title: `${e.name} · 历史复核依据`,
    category: "维修工单",
    date: "2026-09-11",
    body: "模拟复核证据：历史中修记录、停机成本与部件磨损记录已补充。用于演示诊断版本变化，不是实际维修建议。",
  },
  {
    id: `KB-${e.id}`,
    equipmentId: e.id,
    title: `${e.name} · 维护案例`,
    category: "知识案例",
    date: "2026-09-09",
    body: "模拟知识库案例：关联设备告警与维护方案，现场复核后再作处置。所有数值为演示假设。",
  },
]);
export function evidenceSources(id) {
  return [
    {
      id: `IOT-${id}`,
      equipmentId: id,
      title: "汉云 IoT · 模拟遥测",
      body: "运行数据为固定样例，不接收真实设备消息。",
    },
    ...documents.filter((d) => d.equipmentId === id),
  ].map((d) => ({ ...d, status: "mock" }));
}
export function telemetry(id) {
  const field =
    id === "truck-01"
      ? "冷却液温度"
      : id === "excavator-01"
        ? "滤清器压差"
        : "主泵压力";
  const unit = id === "truck-01" ? "℃" : "MPa";
  const value = id === "truck-01" ? 103 : id === "excavator-01" ? 0.85 : 28.5;
  return Array.from({ length: 12 }, (_, i) => ({
    equipmentId: id,
    time: new Date(Date.UTC(2026, 8, 12, 8, i * 5)).toISOString(),
    field,
    unit,
    value: Number((value * (0.96 + i / 275)).toFixed(2)),
  }));
}
export function alerts(id) {
  return [
    {
      id: `AL-${id}`,
      equipmentId: id,
      severity: "warning",
      title:
        id === "truck-01"
          ? "冷却液温度偏高"
          : id === "excavator-01"
            ? "滤清器压差超标"
            : "液压压力波动",
      mock: true,
    },
  ];
}
