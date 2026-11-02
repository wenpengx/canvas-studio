# 桌面发行构建

桌面版使用同一份仓库源码，分别在 Windows x64、Apple Silicon Mac（ARM64）和 Intel Mac（x64）上构建。普通使用者直接下载 [Releases](https://github.com/wenpengx/canvas-studio/releases) 的完整整合包，安装与数据说明见[桌面使用指南](overview/desktop-guide.md)。源码 ZIP 不能代替可运行包。

## 组成与平台

| 目标 | 构建环境 | 发行文件 |
| --- | --- | --- |
| Windows x64 | 原生 Windows x64 | `CanvasStudio-Windows-x64-<version>.zip` |
| macOS ARM64 | 原生 ARM64 macOS | `CanvasStudio-macOS-arm64-<version>.zip` |
| macOS x64 | 原生 Intel macOS | `CanvasStudio-macOS-x64-<version>.zip` |
| 对应源码 | 已提交的同一 Git HEAD | `CanvasStudio-Source-<version>.zip` |

每个 ZIP 同时生成 `.sha256`。桌面包内还附有 `对应源码.zip`、使用说明、文件清单和第三方许可。源码归档来自已提交、受 Git 跟踪的源文件，排除 `.git`、本地依赖、构建缓存、输出和用户数据。准备发行时先提交该版本的全部改动，避免构建产物与公开源码不一致。

不承诺在一个系统上交叉打包所有平台，也不提供 Linux 桌面发行包。macOS 构建执行 ad-hoc 签名和完整性校验，当前未配置 Developer ID 签名与 Apple 公证；本机首次打开、钥匙串权限和 GPU／视频编码须实机确认。

## 运行结构

- `launcher/`：Electron 中文启动器、渠道配置、系统加密、浏览器启动、本机网关、进程管理、更新、MCP 及目录授权。
- Go 服务：通过本机模式保存项目、素材、任务和 Skill，使用数据目录内的 SQLite。
- `web/`：画布前端与浏览器工作区，桌面模式复用启动器模型配置。
- `integrations/cozyclay/`：固定的导演台源码与画布适配，完整项目保存场景、动作、镜头、模型和参考图。
- `runtime/`：随包提供的 Node、Go 服务和视频解码组件，普通使用者不需另外安装开发环境。

本机网关监听 `127.0.0.1`。浏览器不接收桌面配置中真实模型 API Key，由网关读取系统加密配置后转发。Windows 使用系统加密；macOS 使用系统钥匙串，不使用明文回退。CozyClay 的 HTTP 和 WebSocket 经 `/cozy/` 路由，默认禁用上游自更新、遥测和额外动作模型下载。

## 本地构建

开发机需准备 Node.js、npm、Go 和 Git。发行工作流固定 Node.js `24.22.1`、Go `1.27.3`；依赖按各目录的 `package-lock.json` 安装，Electron 版本由 `launcher/package.json` 固定。构建时需要网络下载依赖和经过校验的运行时。

在对应系统与架构的仓库根目录执行：

```sh
npm ci --prefix web
npm ci --prefix integrations/cozyclay
npm ci --prefix integrations/cozyclay/mcp
npm ci --prefix launcher
```

选择与宿主一致的一条打包命令：

```sh
# Windows x64
node launcher/scripts/package.mjs --platform=win32 --arch=x64

# Apple Silicon Mac
node launcher/scripts/package.mjs --platform=darwin --arch=arm64

# Intel Mac
node launcher/scripts/package.mjs --platform=darwin --arch=x64
```

省略平台和架构参数时使用宿主默认值。`--skip-build` 只适用于当前源码的前端与 CozyClay 已构建完成时，不能用于跳过必要产物。打包脚本和资源准备脚本将缓存、中间文件放入仓库 `work/`，成品写入 `outputs/`。可用 `GO_BINARY` 指定 Go 程序；不需要 Bun 来执行桌面打包入口。

脚本构建前端、导演台和 Go 服务，收集目标系统的原生依赖，下载并核对 Node／FFmpeg，生成 Electron 应用、文件清单、源码归档和摘要。不能把其他平台的 `node_modules` 或已编译运行时直接混入目标包。

## 数据位置

| 平台 | 默认数据目录 | 位置文件 |
| --- | --- | --- |
| Windows | 解压目录的 `data/` | 解压目录的 `portable.json` |
| macOS | `~/Library/Application Support/Canvas Studio/data/` | `~/Library/Application Support/Canvas Studio/portable.json` |

项目、数据库、素材、输出、日志、专用浏览器资料和配置都属于数据目录。发行包不携带这些用户数据。切换数据目录是切换工作区，不自动复制原数据；备份时先保存并停止服务，再复制完整数据目录和位置文件。跨设备或系统用户后，原密钥可能无法解密，需要重新输入。

浏览器发现支持 Windows 安装位置，以及 macOS `/Applications`、`~/Applications` 下的 Chrome、Edge、Firefox；macOS 自选浏览器可选择 `.app`。专用资料、缓存和下载放在数据目录，下载输出默认位于 `outputs/`。

## GitHub 发布

`.github/workflows/release-windows.yml` 的显示名称为 `Build desktop releases`，分别使用 Windows x64、macOS ARM64 和 macOS Intel runner。文件名保留不代表仅构建 Windows。

1. 同步根目录 `VERSION`、`launcher/package.json` 及锁文件中的版本，整理 `CHANGELOG.md`，保留空的 `Unreleased`。
2. 提交这一版全部改动，再打 `v<version>` 标签。
3. 推送标签触发工作流，或在 Actions 手动运行该工作流。
4. 等待各平台的独立任务完成，核对 Release 附件、源码、SHA-256 和 CI 结果。
5. 在对应系统下载、解压并实机验证后，再将相关待测试项认定为通过。

发行版本使用 `v<launcher/package.json 的 version>`。本仓库更新源由 `launcher/update-source.json` 指向 `wenpengx/canvas-studio`，读取本整合项目的正式 Release，不会拉取无限画布或 CozyClay 的上游新代码。重新分发旧仓库的现成二进制不会自动改变其内置更新源，应以当前源码构建的本仓库发行包为准。

Windows 在线更新读取全部正式版本，保存升级／重装／回退意图，校验 ZIP、摘要和完整文件清单，再重启替换程序。也可导入完整的 Windows 发行 ZIP；Source code ZIP 不是更新包。更新保留 `data/` 和 `portable.json`，不会把新版数据转换成旧版格式，回退前应备份。

macOS 当前采用手动更新：保存并退出后替换 `.app`，外部数据目录保留；没有实现 Mac 原位自动安装更新。当前不配置 Developer ID 签名、Apple 公证和应用商店发布。

## 开发验证入口

以下是仓库现有的验证入口，供开发者在相应改动和环境下选择执行；列出命令不表示本次都已运行，也不把固定测试服务视为真实 AI 结果。

```sh
npm test --prefix launcher
go test ./config ./middleware ./router ./service ./handler ./repository
node launcher/test/launcher-models.cjs
node launcher/test/browser-launcher.cjs
node launcher/test/update-launcher.cjs
node integrations/cozyclay/test/motion3/verify-motion3-core.mjs
node integrations/cozyclay/test/verify-project.mjs
node integrations/cozyclay/test/verify-scene-assets.mjs
```

完整浏览器／MCP 联调可使用 `launcher/headless.cjs` 配合 `launcher/test/browser-smoke.cjs`、`agent-transport.cjs`、`multi-channel.cjs`、`workspace-smoke.cjs` 等脚本。相关脚本可能需要准备构建产物、系统浏览器、测试目录或视频样例，应先阅读脚本的输入要求，使用独立测试数据。

现有文档记录的 Linux 联调不能替代 Windows 与 macOS 的真实启动、密钥加密、系统代理、GPU、视频输出和更新体验。当前结果及未覆盖范围写入 [待测试](progress/pending-test.md)，后续事项维护在 [TODO](progress/todo.md)。

## MCP、Skill 与视频运行组件

桌面画布 MCP 为 `/mcp/canvas`，导演台 MCP 为 `/mcp/director`，都要求本整合包的本机凭据。stdio 桥读取 `data/config/mcp-connection.json`，启动时更新端口。多个页面须明确目标工作区；目录授权通过原生对话框获取不透明编号，不把任意路径当作已授权输入。

Skill 复用本机数据库和用户 Skill API。Markdown 内容作为模型指令，不执行代码。文件夹循环每次推进先保存项目，任务状态未确认时停止自动提交；重新打开不会自动重发付费生成。

FFmpeg 由 `launcher/scripts/media-runtime.mjs` 按目标平台下载并校验，随包保留原发行者许可、构建说明和对应源码位置。视频在本机临时目录解码，完成后清理；模型只在用户发送时接收抽帧图。最终许可材料见 `resources/bundle/runtime/ffmpeg-notices`。
