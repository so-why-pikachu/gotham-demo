# Gotham 独立化与 Mock 后端实施方案

> 执行状态：独立化与第 2–6 阶段的 Mock API、业务接入及本地回归已完成。本文保留最初计划描述；当前运行方式与边界以 [后端接入记录](backend-integration.md) 和根 README 为准。

## 1. 目标与不可变约束

目标：以 Gotham 为独立项目，新增本地 HTTP Mock 后端，实现“选择设备 → 查看告警 → 诊断复核 → 生成报告 → 派生商机 → 需求报告 → 来源追溯”的可重复演示。

**界面、交互、模型、导航与布局发生冲突时，一律以 Gotham 现有实现为准。**

- 保留 TopBar、四类工作区及标签切换机制，不导入 master 或 datarocks2 的 App、全局 CSS、导航及整页布局。
- 保留 Cesium 地图、相机操作、三车模型与错峰路线：矿卡 0 秒到 P6、挖掘机延后 12 秒到 P5、铲车延后 24 秒到 P4。
- 保留商业报告金属档案场景、抽取和回收动画、详情与 360° 查看器。只适配其数据与必要操作。
- 新增信息优先放入现有 Inspector、概览抽屉、详情页、资料库；仅在诊断输入确有需要时增加符合 Gotham 样式的局部弹层。
- 面向本机单人 Demo，不建设生产权限体系、真实 IoT、真实 CRM 推送或大模型平台。

## 2. 已核对的现状

master 没有可移植的服务端。可复用内容是 demoData.js 中的场景、指标、证据来源及 App.jsx 中的预设展示；其“生成报告”目前只有状态提示。

datarocks2 的 model.ts 有诊断、版本、商机派生及金额规则，可迁入新项目的服务端并做适配；不能复制其设备身份和硬编码编号后直接覆盖 Gotham。

Gotham 目前有四类工作区：global、mine、report、archive。报告为同源 iframe；Operations 和 Archive 仍有本地占位数组。工作区 params 已存在，但复用已打开标签时未更新参数，需要小范围补齐，才能跳到指定设备或报告。

## 3. 独立化方案与交付位置

目标目录：`D:/datarocks/gotham-demo`。本轮先复制现有项目并建立独立 package.json、package-lock.json 与本地依赖，不删除原副本，不创建指向父项目 node_modules 的链接。

保持当前已锁定的依赖版本范围与锁文件解析结果，避免借独立化升级 React、Three 或 Vite。启动脚本改为本目录 vite/tsc，保留 Vite 双 HTML 构建入口。本机环境配置随副本保留并继续忽略提交。

后续后端实现只修改独立目录。运行时源码、模型、字体、许可必须在项目内；如需持续编辑 Blender 资产，再将相应 .blend、构建脚本和说明按模型复制到 art/，不把整个原仓库带入。

独立性验收：本目录 npm ci/build 成功；依赖解析均落到本目录；不启动 datarocks2 或 RhineLabUI 也能运行；主页面、报告子页面、三车和装配模型都从本项目加载。旧副本保留用于回退。

## 4. 后端形态

采用 **Node.js 本地 HTTP 服务 + JSON 种子数据 + 本地 JSON 持久化**。使用 Node 内置 HTTP、文件和测试模块即可，不引入数据库、容器和消息队列。

开发时前端 5180，API 5182，Vite 将 `/api` 代理到本机 API；前端只使用相对路径 `/api/v1`。实现一个启动脚本，同时管理两个子进程，退出时一并关闭。提供 dev:web、dev:api 和统一 dev 命令。

构建预览时 API 服务同时提供 dist 静态文件，保留 `/report-archive/index.html` 的直接访问。API 404 必须返回 JSON，不能回落成首页 HTML。

建议目录：

```text
gotham-demo/
  server/
    index.mjs              # HTTP 入口、静态页面、错误处理
    routes.mjs             # 接口分发与输入验证
    domain/                # 诊断、报告、商机规则
    seed/                  # 矿区、客户、设备、案例、文档
    storage.mjs            # 加载、串行写入、原子替换
    tests/                 # 业务与 HTTP 集成测试
  shared/contracts.ts      # 请求响应和业务类型
  data/demo-state.json     # 本机演示进度，忽略提交
  src/api/client.ts        # fetch、错误、取消请求
  src/store/BusinessProvider.tsx
  src/report-archive/      # 保留当前三维报告界面
  scripts/dev.mjs
```

所有业务响应统一包含可识别的模拟标记。列表返回 `{items,total}`，错误返回 `{error:{code,message}}`。缺参返回 400、目标不存在返回 404、版本冲突返回 409；不能失败后伪造成功提示。

不设置假的登录页。服务默认仅监听 127.0.0.1；真实密钥不进入模拟数据。原 Cesium 浏览器 token 继续使用现有 Vite 配置。

## 5. 数据归属和身份映射

后端是报告、诊断、客户标注和模拟推送记录的唯一事实来源。浏览器只缓存响应，并保存折叠状态、当前选择、镜头与显示偏好。不要同时保留两套独立的 localStorage 报告库。

使用 Gotham 已有 `truck-01`、`excavator-01`、`loader-01` 为第一批设备 ID，关联矿区 `yulong-mine`。车型分别对应当前 GLB；不能把旧 XE690DK 的身份和参数当作新 XE215C 的真实资料。旧案例可作为明确标注的演示模板重新适配到三车。

实体至少包括 Customer、Mine、Equipment、TelemetrySample、Alert、WorkOrder、EvidenceSource、Diagnosis、Opportunity、BusinessReport、Document。所有来源通过 ID 关联，不靠展示名称匹配。

报告使用稳定 ID + version，需求报告引用诊断的确切版本。商机从最新诊断派生；重复相同操作不重复累计。金额统一使用整数“分”，旧规则中的“万元”在适配入口显式转换。置信度统一 0–100。

首次提供固定种子案例和少量预生成报告，让金属档案库可以直接展示；另提供“空报告开局”重置模式，验证从零生成流程。用户手动重置才切换种子模式，不在刷新或服务重启时清空。

状态写入采用串行队列和临时文件原子替换，避免多标签请求覆盖。写入失败返回错误，坏文件保留并提示恢复，不静默丢弃用户的演示进度。

## 6. 第一版接口契约（待实现）

统一前缀 `/api/v1`；以下不是当前已存在的接口。

| 方法与路径 | 输入或筛选 | 结果 / 规则 |
| --- | --- | --- |
| GET /health | — | 服务状态、数据版本、mock 标记 |
| GET /overview | mineId 可选 | 同源计算矿区、设备、告警、商机汇总 |
| GET /mines | — | 沿用 Gotham 地图矿区 ID |
| GET /customers | — | 客户列表 |
| PATCH /customers/:id | category | 更新客户分类 |
| GET /equipment | mineId、status、q | 设备列表 |
| GET /equipment/:id | — | 设备、型号、模型 URI、客户及矿区关系 |
| GET /equipment/:id/telemetry | from、to | 固定时间序列和单位 |
| GET /equipment/:id/alerts | — | 模拟告警 |
| GET /equipment/:id/work-orders | — | 模拟工单及维修史 |
| GET /evidence-sources | equipmentId | Data Fabric 证据来源及明确模拟的状态 |
| POST /diagnoses | equipmentId、evidenceIds、requestId | 服务端规则生成诊断 v1 |
| POST /diagnoses/:id/reviews | baseVersion、evidenceIds、requestId | 验证新增证据后生成新版本 |
| GET /opportunities | mineId、customerId | 从最新诊断派生商机 |
| POST /business-reports | sourceId、sourceVersion、units、delivery、finance、requestId | 服务端校验和计算，不信任前端金额 |
| GET /reports | type、customerId、q、offset、limit | 最新版本列表、真实 total |
| GET /reports/:id | — | 最新版本详情 |
| GET /reports/:id/versions | — | 版本列表 |
| GET /reports/:id/versions/:version | — | 精确版本及来源引用 |
| GET /reports/:id/export | version、format=markdown | 模拟报告下载 |
| POST /business-reports/:id/push | version、requestId | 只记录模拟推送，不发送外部消息 |
| GET /documents | equipmentId、category、q | 资料库列表 |
| GET /documents/:id | — | 文档正文和关联对象 |
| POST /demo/reset | preset、confirm=true | 明确重置预置 / 空报告模式 |

第一版诊断同步返回，前端用请求状态展示等待，不伪装真实 AI 推理。遥测可按需轮询和手动刷新，组件卸载取消请求；第一版不引入 WebSocket。

## 7. 前端接入范围

| 当前文件 / 区域 | 允许修改 | 必须保持 |
| --- | --- | --- |
| App.tsx | 包装共享业务 Provider；传递工作区 params | 主布局和路由类别 |
| useWorkspaceManager.ts | 已有标签激活时合并目标 params | 标签打开、关闭与排序行为 |
| CesiumViewer.tsx | 拾取车辆后打开设备 Inspector / Operations | 地图、相机、模型与路线控制 |
| GlobalOverview.tsx | 用 API 替换统计与对象数据 | 原有底部概览抽屉 |
| MineWorkspace.tsx | 替换占位对象；接参数、告警、工单和诊断按钮 | 左列表、中间场景、右 Inspector 主体 |
| ReportWorkspace.tsx | 同源消息桥、业务快照与动作回执 | 当前 iframe 容器 |
| report-archive/data.ts、main.ts | 动态报告、版本、依据链及必要操作 | 场景视觉、详情布局、动画 |
| ArchiveWorkspace.tsx | API 文档及来源跳转 | 现有分类和列表布局 |
| App.css | 仅追加必要局部控件样式 | 现有配色、字体、间距体系 |

报告桥协议：子页面发 READY，父页面发 SNAPSHOT；子页面发 SELECT_REPORT、OPEN_EQUIPMENT、EXPORT_REPORT、SIMULATE_PUSH；父页面回 RESULT / ERROR 并更新快照。校验 event.origin、event.source、消息类型、协议版本和 requestId。请求进行时禁用重复提交，重新加载 iframe 后先握手再发数据。

报告业务通过父页面 API 层执行；iframe 不另建一套业务状态。展示选择使用 reportId + version，不使用数组索引作为收藏或来源标识。

档案库必须支持 0、1、少量和多页数据。不能把 288 个背景实例当成 288 份报告，也不能继续硬编码每列 8 份或总数 40。背景重复模型只用于视觉，命中选择必须映射到实际报告或非交互装饰。分类沿用现有列式布局，按类型／状态适配，空列不得生成假报告。

## 8. 实施顺序与每阶段交付

1. **独立工程（本轮）**：复制项目、独立依赖与命令、文档、类型与构建验证。原项目保留。
2. **数据契约与 Mock API**：三车种子、关系映射、文件持久化、接口和业务测试。前端画面不变。
3. **地图 / Operations 接入**：点击车辆打开对应设备，告警与工单能关联；新增局部诊断入口。
4. **诊断与商机闭环**：复核生成版本、商机派生、需求报告金额及模拟推送。服务重启后数据保留。
5. **金属档案库与资料库接入**：动态数据、消息桥、版本查看、导出及来源跳转。
6. **联调与视觉回归**：固定视口截图对照、完整演示脚本、启动说明和测试结果。

不把新增后端与独立化混成一次大改。每阶段完成后保持 npm run build 可通过；业务模块按区域接入，避免整页替换。

## 9. 验收标准

- 独立运行：不依赖原仓库源码或父目录 node_modules；npm ci/build 可复现；统一 dev 能启动并关闭前后端。
- 外观优先：总览、Operations、商业报告、资料库在 1600×900 和 1280×800 对照原截图；顶部只有 Gotham 导航，原操作位置及金属动画保持。
- 设备闭环：点击三辆不同车辆打开正确设备；已有 Operations 标签切换目标参数生效，不残留上一辆信息。
- 诊断版本：相同请求不重复出报告；新证据产生新版本；商机只按最新诊断统计；旧商业报告仍指向旧依据版本。
- 报告一致性：零报告、单报告、分页与筛选无假计数；详情、收藏、导出指向正确 ID；关闭重开标签仍能恢复选择。
- 演示可靠性：API 延迟、断开、写入失败、404、409 有局部错误和重试入口；不得清空已显示的其他工作区。
- 三车回归：0/12/24 秒出发，P6/P5/P4 驻留，方向和转向行为保持；在线地形视觉验收与合成地形测试分别记录。
- 不对外执行：模拟推送只写本地记录；无真实客户消息、CRM 写入或真实诊断调用。

## 10. 本轮与后续边界

本轮交付本方案及独立项目，不宣称上述 API 已实现。后续执行从第 2 阶段开始，优先让三车和现有金属报告库形成最短闭环，再补齐证据细节。

本轮执行结果：独立依赖已安装，核心库解析到本目录且版本与来源锁文件一致；类型检查、双入口生产构建、三车专项测试通过。独立 Vite 已在 5181 启动，主页面、报告子页面及模型 URL 可访问。没有进行本轮全页面浏览器视觉回归，后续按第 9 节执行。
