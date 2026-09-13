# 商业报告迁移

`Reports → 商业报告` 已接入 archive-metal-demo。删除了原有 ARCHIVE LAB 顶部导航、全局搜索框和用户入口，只保留 Gotham 导航；档案索引、收藏、历史和显示设置保留在档案内容区。

## 运行与结构

在 gotham-demo 中运行 `npm.cmd run dev`。本次预览使用 `http://127.0.0.1:5178`，默认脚本端口仍为 5180。无需启动 RhineLabUI，也没有安装新依赖。

- `src/components/ReportWorkspace.tsx`：商业报告标签入口，加载同源 iframe。
- `report-archive/index.html`：Vite 多页面入口，和 Gotham 一起开发、构建及部署。
- `src/report-archive/`：档案界面、Three.js 场景、模型查看器与演示数据。
- `public/report-archive/assets/`：主模型、六组装配模型及 manifest，保持无图片贴图方案；编号由 Canvas 动态生成。
- `public/report-archive/brand/`：加载标志。

iframe 用于隔离原演示的全局样式、快捷键及 WebGL 生命周期。切换工作区时移除 iframe，重新进入后通过 sessionStorage 恢复所选档案、列位置、详情和信息标签。收藏与显示偏好使用独立的 localStorage 键。视口去掉原顶部 73px，按剩余内容等比缩放。

Three.js 使用 datarocks2 已有版本；滚动数字组件以本地 vendor 文件保留原版 0.4.1。其许可及 RhineLabUI 许可放在 `public/report-archive/licenses/`，字体继续使用 Gotham 已有 MiSans。Blender 编辑源仍保存在原 archive-metal-demo 的 `art/`，运行时不引用原项目路径。

地图模块的颜色常量改为在实际创建标记时读取，避免 Cesium CDN 加载失败导致所有标签页白屏；没有改动地图定位和路线逻辑。当前环境无法访问该 CDN，地图联网功能未纳入此次验证。

## 验证

- TypeScript 检查：`node ../../node_modules/typescript/bin/tsc -p tsconfig.json`
- 生产构建：`npm.cmd run build`，同时生成 Gotham 与报告入口。
- 浏览器回归：当时使用的固定档案迁移脚本已移除；当前验收使用根目录 README 中的 `npm run test:reports`。
- 回归覆盖：唯一顶部导航、288 个实例、方向键浏览与列记忆、资料库切换、详情恢复、六部分拆解与重组、搜索、显示设置、1280×800 布局、关闭并重开报告标签。

开发模式与生产预览均通过上述 8 组检查，最终 `checks.json` 来自生产预览（5179）。报告资源请求和运行时异常均为零；测试单独记录原站点可选 favicon 的 404，不把它计为报告资源失败。历史验证截图已清理，保留此记录与 `checks.json`。当时报告内容使用原演示数据；后续 Mock 后端接入情况见 `../backend-integration.md`。
