import { equipment, alerts } from './index.mjs';

export function mineMetrics(mineId, range) {
  const connected = mineId === 'yulong-mine';
  const fleet = equipment.filter(e => e.mineId === mineId);
  const asOf = '2026-09-12T09:00:00+08:00';
  const samples = range === '7d' ? 7 : range === '24h' ? 24 : 1;
  const step = range === '7d' ? 86400000 : 3600000;
  const series = connected ? Array.from({ length: samples }, (_, i) => ({
    time: new Date(Date.parse(asOf) - (samples - 1 - i) * step).toISOString(),
    dust: Number((0.32 + 0.04 * Math.sin((i - samples + 1) * 0.8)).toFixed(2)),
    workers: 126 + (((i - samples + 1) % 3 + 3) % 3) * 2,
  })) : [];
  return {
    mineId, range, asOf, mock: true, connected,
    period: { from: series[0]?.time ?? asOf, to: asOf }, series,
    groups: [
      { title: '设备与施工', items: [
        ['已接入设备', connected ? fleet.length : null, '台'],
        ['矿卡 / 挖掘机 / 装载机', connected ? '1 / 1 / 1' : null, '台'],
        ['施工单位', connected ? '玉龙工程一队（模拟）' : null, ''],
        ['施工状态', connected ? '作业中 · 日班' : null, ''],
        ['工况', connected ? '运输 / 挖装 / 装载' : null, ''],
      ] },
      { title: '环境与气候', items: [
        ['粉尘浓度', connected ? series.at(-1).dust : null, 'mg/m³'],
        ['噪声', connected ? 72 : null, 'dB'], ['传感器在线', connected ? '8 / 8' : null, ''],
        ['气温', connected ? 12 : null, '℃'], ['湿度', connected ? 46 : null, '%'],
        ['风速', connected ? 3.2 : null, 'm/s'], ['降水', connected ? 0 : null, 'mm/h'],
      ] },
      { title: '人员与故障', items: [
        [range === 'current' ? '当前在岗' : '区间平均在岗', connected ? Math.round(series.reduce((s,p)=>s+p.workers,0)/series.length) : null, '人'],
        ['班组', connected ? 6 : null, '组'],
        ['当前活跃告警', connected ? fleet.flatMap(e=>alerts(e.id)).length : null, '条'],
        ['受影响设备', connected ? fleet.filter(e=>alerts(e.id).length).length : null, '台'],
        ['故障事件', null, '未接入'],
      ] },
    ],
  };
}
