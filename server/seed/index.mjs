import {enrichEquipment,buildDocuments,buildTelemetry} from './scenario.mjs';
export const mines = [
  { id: "yulong-mine", name: "玉龙矿区",region:'西藏',mineral:'铜矿',operator:'玉龙工程一队（虚构）',connected:true },
  { id: "haerwusu-mine", name: "哈尔乌素露天煤矿",region:'内蒙古',mineral:'煤矿',operator:'待登记',connected:false },
  { id: "antaibao-mine", name: "平朔安太堡露天煤矿",region:'山西',mineral:'煤矿',operator:'待登记',connected:false },
  { id: "zhujia-baobao-mine", name: "攀枝花朱家包包铁矿",region:'四川',mineral:'铁矿',operator:'待登记',connected:false },
];
export const customers = [
  { id: "yulong", name: "玉龙项目采购组（虚构）", category: "战略客户" },
];
export const equipment = [
  {
    id: "truck-01",
    name: "XDE240 矿卡",
    model: "XDE240",
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
].flatMap(e=>[e,{...e,id:e.id.replace('-01','-02'),name:e.name+' · 02',hours:Math.round(e.hours*.6),status:'active'}])
 .map((e,i) => enrichEquipment({ ...e, mineId: "yulong-mine", customerId: "yulong" },i));
export const documents = buildDocuments(equipment);
export function evidenceSources(id) {
  return documents.filter(d=>d.equipmentId===id||(!d.equipmentId&&d.mineId==='yulong-mine')).map(d=>({...d,status:'mock'}));
}
export function telemetry(id) {
  const e=equipment.find(e=>e.id===id);
  return e?buildTelemetry(e):[];
}
export function alerts(id) {
  if (id.endsWith('-02')) return [];
  return [
    {
      id: `AL-${id}`,
      equipmentId: id,
      severity: "warning",
      visualization: id === "truck-01"
        ? { part: "车架与配重", scope: "region", component: "冷却系统" }
        : id === "excavator-01"
          ? { part: "动力舱外壳", scope: "region", component: "滤清器" }
          : { part: "液压与连杆", scope: "region", component: "液压主泵" },
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
