---
title: 快速开始
description: 选择桌面整合包，或从当前仓库启动源码服务
---

# 快速开始

直接使用画布与导演台，先下载[本仓库 Releases](https://github.com/wenpengx/canvas-studio/releases) 的完整桌面包。开发者再选择源码运行；两者的配置和数据保存方式不同。

## 桌面整合包

1. 按系统与架构选择 Windows x64、macOS ARM64 或 macOS x64 ZIP，核对同名 SHA-256。
2. Windows 完整解压后打开 `画布工作台启动器.exe`；Mac 把 `画布工作台启动器.app` 放到 `/Applications` 或 `~/Applications` 后打开。
3. 在启动器“模型配置”中填写自己的渠道接口、密钥和模型，分别选择文字、图片、视频及白模导演的默认模型。
4. 首页选择已安装浏览器，点击“一键启动工作台”。

普通使用者不需安装 Node、Go 或 Docker；在线模型需要自己的服务与额度。macOS 包当前未使用 Developer ID 签名和 Apple 公证，打开方法、数据位置、备份、更新及常见问题见[桌面使用指南](desktop-guide.md)。某个平台 CI 构建成功不代表全部实机验收完成。

## 从源码开发 Web 版

```sh
git clone https://github.com/wenpengx/canvas-studio.git
cd canvas-studio
```

复制根目录 `.env.example` 为 `.env`，按实际环境填写配置；开发环境、后端端口和前端代理见[本地开发](../backend/local-development.md)。通常需要在两个终端运行：

```sh
# 仓库根目录：Go API
go run .

# 另一个终端，仓库根目录：Next.js
npm ci --prefix web
npm run dev --prefix web
```

前端默认访问 `http://localhost:3000`，开发 API 默认 `http://127.0.0.1:8080`。这里是 Web 开发入口，不等同于已经生成完整的桌面整合包；桌面和导演台随包产物的准备见[桌面发行构建](../desktop-build.md)。

## Docker 源码尝试入口

仓库保留 Docker 文件。需要尝试当前源码时，准备 `.env` 后使用本地构建配置：

```sh
docker compose -f docker-compose.local.yml up -d --build
```

默认 `docker-compose.yml` 配置会拉取 `ghcr.io/tigerowo/infinite-canvas:latest`，该上游镜像不是本仓库桌面版的构建结果。Docker 静态资源路径和完整生产部署仍待验证，不能把本页命令当成生产部署验收承诺。

## 保存方式

- 桌面整合包：启动器管理本机数据库、素材和浏览器资料；模型密钥由系统加密，经过本机网关调用。
- 源码 Web 版：未登录时画布和“我的素材”保存在浏览器本地；登录且账号同步可用时可保存到账号／云端。本地直连密钥保存在浏览器本地，由前端直接请求兼容接口。

继续查看[项目结构与当前状态](project-status.md)、[画布操作手册](../canvas/canvas-node-manual.md)和[待测试事项](../progress/pending-test.md)。
