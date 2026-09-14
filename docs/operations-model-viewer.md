# Operations 设备模型查看器

Operations 中央占位区已替换为现有 GLB 模型；左侧选择 XDE240、XE215C 或 XC958U，中央模型与右侧 Inspector 同步切换。既有遥测、工单、诊断与报告流程保留。

## 已实现

- 鼠标旋转和缩放；工具栏仅保留实体、半透明、线框，不展示预设视角或复位按钮。
- 点击模型或下方部件按钮，高亮并聚焦部件组，淡化其他结构；再次点击选中的部件按钮取消选择。
- 实体、半透明和线框模式。
- 按工程部件划分驾驶室、车架与配重、行走机构、工作装置、液压与连杆、动力舱外壳及附件；每台设备只显示实际存在的部件组。
- 加载失败可重试；切换设备释放 WebGL、材质、几何体和事件监听。

半透明与线框用于观察已有外部结构，不代表真实内部剖面。源工程没有完整发动机、泵体、传动内部模型；后续若需要内部诊断示意，应独立补建并标注示意依据。

## Blender MCP 处理结果

读取原工程：`D:/dataset/mine_trunk.blend`、`XE215C.blend`、`XC958U.blend`。

工程副本保存到 `art/operations/equipment-inspection.blend`，内含三个独立检查场景、原整机检查相机及 17 个新增局部相机。原工程未修改。矿卡沿用已有矿卡几何，XDE240 是当前应用的展示名称。

`public/models/equipment-inspection.json` 保存部件与 GLB 节点映射，以及工程检查相机方向。网页读取此文件，按视口重新计算观察距离，复用方向与部件分组。Blender Z-up 到 GLB Y-up 的方向转换在导出时完成。

后续在检查工程中调整部件或相机后，运行 `art/operations/export_inspection.py` 重新导出元数据。网页运行不需要 Blender 或 D:/dataset；Docker 继续只使用 public 中的运行资产。

## 告警部件标红

Operations 从 `/equipment/:id/alerts` 读取 `visualization: {part, scope, component}`，按实例 ID 隔离告警；`part` 对应模型元数据中的部件组。红色优先于选择高亮，在实体、半透明和线框模式下保留；点击红色部件或告警说明可聚焦，告警移除后恢复原材质。

当前模拟映射：XDE240 冷却系统 → 车架与配重；XE215C 滤清器 → 动力舱外壳；XC958U 液压主泵 → 液压与连杆。由于缺少内部零件，均为 `scope: region` 的关联区域示意，不代表精确故障位置。后续补齐独立网格后可使用 `scope: part`。缺少映射的告警仍显示文字，不会将整机任意染红。

`npm test` 验证告警与真实 GLB 节点的映射、各模式的红色优先级、原材质恢复以及共享源材质不受影响。

## 验证

`npm run build` 检查类型与打包。

启动 dev 和 CDP 9346 的独立浏览器后运行 `node scripts/check-models.mjs`（可用 CDP_PORT / DEMO_URL 覆盖）。检查每个 GLB mesh 都有 Blender 部件映射、三台设备的实际三角形渲染、局部选择、半透明、线框、视角、复位和设备切换；截图写入系统临时目录。外部 Cesium 网络被隔离，模型自身通过本地 GLB 正常绘制。
