# Stack Overflow 课程应用

[English](README.md) | 简体中文

基于 TypeScript、React、Vite、Express 和 SQLite（`better-sqlite3`）的全栈应用。需要 Node.js 22.12+ 和 npm。

## 目录结构

```text
frontend/                 React 界面；构建输出到 frontend/dist/
backend/
  src/
    server.ts             服务入口与数据库初始化
    app.ts                Express 应用、API 路由和前端资源服务
    api/                  业务 API 注册
    db/                   SQLite 连接、初始化与建表 SQL
  scripts/                构建与后端测试辅助脚本
  dist/                   后端构建产物（自动生成）
package.json              npm 工作区配置与公共命令
deploy.sh                 依赖检查、构建与启动（不安装依赖）
```

## 启动应用

在本应用根目录，先在自己的机器上安装依赖：

```sh
npm ci --include=dev --include=optional
```

Windows 命令提示符执行 `start.bat`，PowerShell 执行 `.\start.bat`。
Linux / macOS 执行 `sh start.sh`（或 `sh deploy.sh`）。

启动器检查依赖，构建前后端，然后在前台运行服务，不安装依赖、不运行业务测试。启动失败会中断并打印手动恢复命令。

服务初始化数据库，在同一个端口提供构建后的前端及 `/api/` 路由，并提供 `/api/health` 健康检查。

可选环境变量示例（Linux / macOS）：

```sh
DATABASE_URL=/absolute/path/app.db sh start.sh --port-range 4100-4199
```

- `PORT`：固定 HTTP 端口或 `auto`。启动器默认从 3000–3999 自动选择空闲端口，请打开终端打印的实际地址。
- `PORT_RANGE`：自动搜索范围，可用 `--port-range` 覆盖。
- `HOST`：监听地址；启动器默认为 `127.0.0.1`。
- `DATABASE_URL`：虽然名为 URL，实际是 SQLite 文件路径；默认为 `backend/data/app.db`。相对路径从进程工作目录解析，使用启动器时为应用根目录。可使用绝对路径指定固定位置，或使用 `:memory:` 临时存储数据。

当前 ARC-Bench Runner 会检测应用根目录的 `deploy.sh` 并自动调用。单独复制应用时，请保留该入口。

## 开发

```sh
npm install --include=dev --include=optional
npm run dev:backend
# 在另一个终端中：
npm run dev:frontend
```

Vite 开发服务器会将 `/api` 请求代理至后端端口 `3000`。如果开发时更改后端端口，请相应修改 `frontend/vite.config.ts`。
