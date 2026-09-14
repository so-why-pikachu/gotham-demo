# Gotham Demo

独立的矿区可视化演示项目。包含 Gotham 工作区、Cesium 矿区地图、三车错峰路线、金属档案库及模型查看器，并通过本地 HTTP Mock API 完成设备诊断与商业报告闭环。

## 启动

使用 Node.js 22.12 或以上版本，在本目录执行：

```sh
npm ci
npm run dev
```

统一命令同时启动前端 `http://127.0.0.1:5180` 和 Mock API（5182），退出时一起关闭。需要其他端口时，在 PowerShell 中执行 `$env:WEB_PORT='5181'; npm run dev`。`API_PORT` 可覆盖后端端口，Vite 自动匹配代理地址。

`npm run build` 检查类型并构建两个页面。随后 `npm run preview` 用一个 Node 服务同时提供 API 和构建页面，地址 `http://127.0.0.1:5182`。不要同时运行占用相同 API 端口的 dev 与 preview。

可分别用 `npm run dev:web`、`npm run dev:api` 启动。业务进度保存在 `data/demo-state.json`，重启保留；`DEMO_STATE_FILE` 可指定独立测试文件。

地图需要 `.env.local` 中的 `VITE_CESIUM_ION_TOKEN`，格式见 `.env.example`。本次独立化已在本机保留原有配置；配置文件不提交。Cesium CDN、在线影像和地形仍需要网络连接。

## 项目边界

- 本目录有独立的 package.json、锁文件、node_modules、源码及静态资源，不再解析 datarocks2 的依赖。
- 原始副本仍保留在 datarocks2/.playground/gotham-demo，便于核对；后续修改以本目录为准。
- 历史 docs 中的旧目录与端口是迁移记录，不是运行依赖。
- 已实现本地 Mock 后端，设备参数、诊断、置信度、金额和推送均为演示数据。API 不连接真实设备、AI、CRM 或外部销售系统。实现记录见 [后端接入说明](docs/backend-integration.md)。
- 模型与字体许可沿用 public 下现有说明；报告运行所需共享代码已在 src/report-archive 内。

## 验证

`npm test` 检查 HTTP 业务闭环和持久化故障；`npm run typecheck`、`npm run build` 检查编译。路线专项测试为 `npm run test:fleet`，需按 `docs/fleet-route.md` 提供同版本 Cesium 测试脚本。

`npm run test:reports` 需先构建，并开启 CDP 端口 9341 的 Edge（可用 `CDP_PORT` 覆盖）。脚本自行启动临时端口的 API 和独立状态文件，不重置实际演示进度，结果写入 `docs/business-verification/`。已移除固定 40 档案时期的旧迁移测试脚本，当前业务验收使用此命令。

浏览器测试配置目录 `.browser-*/` 和验证截图均为可清理的辅助产物，运行演示不需要它们；验证截图会在下次浏览器测试时重新生成。`node_modules/` 是本地开发依赖，`dist/` 是构建产物，打包源码交付时可排除。保留 `scripts/` 中的启动和现行测试脚本，以及 `server/tests/`（Docker 构建会运行服务端测试）。

## 演示流程

场景一已接入宏观指标、预制地图导航和设备档案浮层，使用与验证说明见 [场景一实施记录](docs/scene-one-delivery.md)。

Operations 中央支持现有设备模型与部件查看，Blender 工程和使用说明见 [设备模型查看器](docs/operations-model-viewer.md)。

1. 点击 Operations，选 XE215C，展开遥测与维修证据。
2. 发起诊断或补充维修史复核，自动进入商业报告；可切换 v1/v2。
3. 报告中“返回来源设备”，选择数量、交期及融资选项，生成需求报告。
4. 在金属档案库查看金额、依据链、导出 Markdown，或确认模拟推送。
5. 文档标签打开关联资料库；资料中可返回同一设备。
6. 总览通过顶部矿区选择定位；info1 的 Ops 按型号收纳施工机械，展开后点击个体实例，靠近其当前位置并打开档案，相机不会跟随设备移动。底部概览收纳条与设备按钮已移除。
