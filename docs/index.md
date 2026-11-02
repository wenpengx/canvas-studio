# Canvas Studio 文档索引

## 桌面整合版

- [桌面版使用指南：Windows／macOS](overview/desktop-guide.md)
- [项目结构与当前状态](overview/project-status.md)
- [桌面发行构建与源码包](desktop-build.md)
- [可下载发行版](https://github.com/wenpengx/canvas-studio/releases)

## 项目介绍

- [界面截图与来源](overview/screenshots.md)
- [快速开始](overview/quick-start.md)
- [功能介绍](overview/features.md)
- [Docker 部署](overview/docker.md)
- [第三方 GitHub 提示词仓库](overview/third-party-prompt-repositories.md)

## 操作手册

- [画布节点操作手册](canvas/canvas-node-manual.md)
- [画布快捷键](canvas/canvas-shortcuts.md)

## 开发文档

- [本地开发](backend/local-development.md)
- [接口响应约定](backend/api-response.md)
- [系统配置数据结构](backend/system-settings.md)
- [后端数据库说明](backend/backend-database.md)
- [画布数据结构](backend/canvas-data-structure.md)

## 商务合作

- [开源协议](business/license.md)
- [商务合作](business/business.md)

## 赞助支持

- [打赏支持](support/donate.md)

## 项目进度

- [待测试](progress/pending-test.md)
- [TODO](progress/todo.md)

## 说明

- 桌面整合版由启动器管理本机数据库、素材和系统加密的模型密钥；详见桌面指南。
- 源码 Web 版未登录时，画布项目和“我的素材”保存在浏览器本地；登录且账号同步可用时，可同步保存到账号／云端。
- Web 本地直连模式的 AI API Key 保存在浏览器本地，并由前端直接请求 OpenAI 兼容接口。
