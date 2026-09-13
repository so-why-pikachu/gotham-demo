# Docker Compose 部署

## 结构

一个 `gotham` 容器同时提供构建后的 Gotham 页面、报告 iframe、模型／字体和 `/api/v1` Mock API。容器内监听 5182，宿主机默认映射到 `127.0.0.1:8080`。不运行 Vite 开发服务器，不需要额外 Nginx 或数据库容器。

镜像分两阶段：Node 22 构建阶段安装锁文件依赖、运行服务端测试与前端构建；运行阶段仅保留 `dist/` 和 `server/`。后端只使用 Node 内置模块，无需运行时 node_modules。

## 首次启动

准备 Docker Engine / Docker Desktop（Linux containers）及 Compose V2。在本项目目录执行：

```powershell
Copy-Item deploy/compose.env.example .env.docker
```

编辑 `.env.docker`，将 `VITE_CESIUM_ION_TOKEN` 改为现有 `.env.local` 中使用的浏览器 token。不要把 `.env.local` 整体复制进镜像。

```sh
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=100 gotham
```

访问 `http://localhost:8080`，健康接口为 `http://localhost:8080/api/v1/health`。第一次启动写入预置演示数据。

Cesium token 属于 Vite **构建时**变量：修改后必须重新 build，仅 restart 或设置容器运行时变量不会改变已生成的页面。它会进入浏览器 bundle，不是可保密的服务端密钥。

地图仍由访问者的浏览器连接 Cesium CDN、ion、地形与影像；容器打包并不意味着离线地图。金属档案与三个车辆模型都在镜像内。

## 放到另一台服务器

将项目源码、锁文件、Dockerfile、compose.yaml 和所需静态资产传到目标机器，在那里准备 `.env.docker` 并执行上述命令。不要传 Windows 的 node_modules、浏览器测试缓存或本机数据目录。

默认只开放到服务器回环地址。远程演示可以用 SSH 转发：

```sh
ssh -L 8080:127.0.0.1:8080 user@server
```

随后在自己的电脑打开 `http://localhost:8080`。如需多人通过域名访问，在服务器前接现有 HTTPS 反向代理，将整个站点代理到 `127.0.0.1:8080`，以域名根路径提供服务。

当前前端使用 `crypto.randomUUID()`，远程访问应使用 HTTPS；`http://服务器IP:8080` 不属于安全上下文，会影响诊断和报告操作。localhost 访问不受此限制。若改为 `GOTHAM_BIND_ADDRESS=0.0.0.0`，要按上述方式解决 HTTPS，且当前 Demo 没有登录权限控制。

## 数据持久化、更新与停止

命名卷 `gotham-data` 挂载到 `/app/data`，保存 `demo-state.json`。重新构建和替换容器不会清空它；初次挂载会使用镜像内已设置好的 node 用户目录权限。只运行一个服务实例：当前 JSON 存储不支持多个 Node 进程同时写同一数据文件。

```sh
# 更新镜像并重建容器，保留演示数据
docker compose --env-file .env.docker up -d --build
# 停止并移除容器，保留命名卷
docker compose --env-file .env.docker down
```

不要在需要保留进度时添加 `down -v`，它会删除命名卷。

## 备份与导入原演示进度

先停服务，避免备份或导入时发生写入：

```sh
docker compose --env-file .env.docker stop gotham
docker compose --env-file .env.docker cp gotham:/app/data/demo-state.json ./demo-state.backup.json
docker compose --env-file .env.docker start gotham
```

首次从当前本机 Demo 导入：先正常启动容器以创建数据卷，然后 stop，执行以下命令，再 start。此操作会替换容器内现有进度，先备份。

```sh
docker compose --env-file .env.docker cp ./data/demo-state.json gotham:/app/data/demo-state.json
docker compose --env-file .env.docker run --rm --no-deps --user root gotham chown node:node /app/data/demo-state.json
docker compose --env-file .env.docker start gotham
```

前端收藏和显示偏好仍属于浏览器 origin。换到 localhost:8080 后不会自动继承 localhost:5181 的浏览器偏好；报告业务进度由数据卷决定。

## 验收

检查 compose 服务 healthy；主页面、Reports、三车模型与 API 可访问；完成诊断后重建容器并确认报告仍存在。在线地图另检查客户端网络和 ion token 的域名限制。

Docker Compose 的端口、数据卷、健康检查配置参见 https://docs.docker.com/reference/compose-file/services/ ，构建变量参见 https://docs.docker.com/build/building/variables/ 。
