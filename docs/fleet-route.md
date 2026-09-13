# 三车错峰路线

在 Gotham 的 Cesium 总览地图中加入两份本地模型，来源为 `D:/datarocks/artifacts/XE215C/XE215C.glb` 和 `D:/datarocks/artifacts/XC958U/XC958U.glb`。模型复制到 `public/models/`，保留米制尺寸及现有道路朝向补偿。

| 车辆 | 出发时间（路线开始后） | 路径 | 停车点 |
| --- | --- | --- | --- |
| 矿卡 | 0 秒 | P1 → P6 | P6 |
| XE215C 挖掘机 | 12 秒 | P1 → P5 | P5 |
| XC958U 铲车 | 24 秒 | P1 → P4 | P4 |

三车沿用现有演示速度 10 m/s、节点原地转向 1 秒。待发车辆在出发时间才进入场景，避免起点重叠。车辆到达终点后保持位置，不循环、不消失。共用一次 World Terrain 采样，只截取各车需要的前半段路线。所有车辆使用同一 Cesium 时钟。

调整车辆、出发间隔和终点：`src/cesium/route/fleet.js`。调试数据：`window.__TRUCK_ROUTE_DEBUG__.fleet`。

## 验证

`node scripts/check-fleet.mjs` 使用与页面相同的 Cesium 1.124，默认读取系统临时目录中的 `gotham-fleet-cesium.js`，也可用 `CESIUM_TEST_SCRIPT` 指向同版本 Cesium.js。无需安装依赖。

已验证真实 P1–P6 经纬度上的错峰可见性、转弯期间位置不变、到达后持续驻留、朝向基准和 GLB 尺寸／接地原点。以每 0.1 秒采样的合成坡度测试，三车最小原点间距约 92.91 米。挖掘机约 58.66 秒到 P5，铲车约 59.49 秒到 P4，矿卡约 68.20 秒到 P6。

TypeScript 检查和生产构建通过。本次运动测试使用合成地形高度，不等同于在线 World Terrain 视觉验收；实际地图仍需原有 Cesium ion 配置及联网条件。车轮／履带及工作装置动画不在此次路线接入范围。
