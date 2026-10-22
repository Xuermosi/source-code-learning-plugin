# 源码学习插件（Source Code Learning Plugin）

简体中文 | [English](README.md)

一次安装，同时获得源码学习教练与 **Archify**。适用于任何语言、任何仓库：沿真实源码逐段学习，保存跨天进度，并在你同意后把已闭环的流程画成可交互 HTML 图。

## 包含哪些能力

| Skill | 职责 |
| --- | --- |
| `source-code-learning-coach` | 规划有依赖顺序的学习路线、写入每日学习单元、逐段读真实源码、显示进度条，保存源码导读、问答、总结和续学位置。 |
| `archify` | 生成并校验架构图、流程图、时序图、数据流图和生命周期图，交付独立可交互 HTML。 |

学习教练先问你是否需要画图，同意后使用**插件内置的 Archify**；Archify 也可以独立使用。无需再单独安装 Archify。

## 运行条件

- 支持插件市场的 Codex 客户端，并具有本地文件和命令行访问能力。
- Python 3.10+：用于学习工作区管理。
- 持久化学习工具依赖 POSIX（macOS/Linux）的安全文件操作；运行环境不支持时会停止写入。
- Node.js 18+ 与兼容的 Chromium 浏览器：用于 Archify 的真实浏览器交付校验。安装插件不会自动安装这些运行环境。
- 原生 DeepSeek Harness（DSH）安装路径需要已安装的 DSH、可用的 `dsh plugin` 命令，以及你选择的 Profile（例如 `web`）。

源码学习需要访问本地仓库。仅安装插件不会让纯浏览器 ChatGPT 会话自动获得本地文件系统和执行环境。

## 用 Codex 安装

先添加 GitHub 仓库为插件市场，再安装其中的插件：

```bash
codex plugin marketplace add Xuermosi/source-code-learning-plugin --ref main
codex plugin add source-code-learning-plugin@source-code-learning
```

如果客户端没有 `codex plugin add` 命令，在桌面应用的插件目录中选择 **Source Code Learning by Xuermosi** 来源，再安装 **Source Code Learning**。安装后开启新对话；如未显示，刷新或重启客户端。

也可以从本地克隆安装：

```bash
git clone https://github.com/Xuermosi/source-code-learning-plugin.git
codex plugin marketplace add ./source-code-learning-plugin
codex plugin add source-code-learning-plugin@source-code-learning
```

以上是仓库/命令行插件市场的安装方式，尚未上架公共插件目录。可参考[官方打包说明](https://developers.openai.com/plugins/build/plugins)。

## 用 DeepSeek Harness 安装（原生 Bundle）

已安装 DSH 且存在 `web` Profile 时，可将本仓库作为原生 Bundle 加入：

```bash
dsh plugin --profile web add github:Xuermosi/source-code-learning-plugin
```

随后按平常方式启动该 DSH Profile。这个 Bundle 会注册独立的文件系统 Skill Provider：它只挂载已安装包内的 `skills/` 目录，不会替换 DSH 内置的 Skill Provider，也不会通过此 Provider 扫描你的项目或用户 Skill 根目录。

## 开始学习

选择插件中的 **Source Code Learning Coach** Skill，然后这样提问：

```text
带我分几天学习这个本地仓库，从真实源码开始。
先给出学习路线，全程显示进度条，并保存学习进度。
每天先给出完整计划和主调用链，再读一小段真实源码。
先讲清调用者、被调用者、为什么这么拆、返回什么；完成小闭环后再提问。
每学完一个完整流程，明确问我是否需要画图。
```

确认路线后，教练会在仓库旁建立学习目录：

```text
my-project/
my-project-3天学习路线/
├── 学习状态.json
├── 学习状态.md
├── Day01/
│   ├── 学习单元.md
│   └── 进度条0-30%/
│       ├── 01-entry-source/
│       │   ├── 源码导读.md
│       │   └── 产物/
│       ├── 当日总结.md
│       └── 问题与解答.md
├── Day02/
└── Day03/
```

每个 `DayXX/学习单元.md` 会记录已确认的中心问题、一条调用—返回流程、限定源码范围、误区、验收和计划产出。当天首次学习固定按“完整计划 → 主调用链 → 一小段真实源码”展开。进度由完成的加权检查点计算；源码对应的产物按阅读顺序归档到对应源码目录，全局产物归属于当前进度阶段。下次对话从经校验的 JSON 状态继续。

每天结束时，教练会询问你是否需要将当天各个流程连接成整合框架图和总结。一次性源码答疑不会自动创建持久化学习目录。

## 学习与画图如何衔接

你明确同意画图后，教练选择合适的图类型，提供已追踪的源码证据，读取同一插件内 Archify 的指令，并运行内置渲染器。HTML 通过校验后，先登记到对应源码/阶段，再封存该进度阶段。候选 JSON 和交付证据保存在图旁边。

校验失败时，教练记录待补图并说明实际失败原因，不会把失败交付登记为已完成。

学习教练交接画图时读写本地文件，并禁用 Archify 的上游版本检查。独立使用 Archify 时保留上游默认的限时版本提示检查，它不会自动安装更新；也可以设置 `ARCHIFY_UPDATE_CHECK_DISABLED=1` 禁用该检查。学习笔记默认不会上传。

## 插件结构与版本

```text
plugin.json                     可移植插件标识与元数据
.codex-plugin/plugin.json       Codex 兼容清单
.agents/plugins/marketplace.json
                                单插件市场入口
skills/source-code-learning-coach/
skills/archify/
bundled-sources.json             固定来源、修改说明和文件校验值
scripts/                        打包和安装验收工具
docs/                           设计、计划和验收报告
LICENSE
THIRD_PARTY_NOTICES.md
```

插件版本为 **0.3.1**。Archify 为 **3.2.0**（`v3.2.0`，提交 `208acba8d412335185b2056fedf54b3405df43fb`）；已核验的子树 tree 与归档 SHA-256 记录在 `bundled-sources.json`。学习教练以提交 `63e0587c2be1415566a8135863f099210a2ae205` 为基线；图表交接、MIT 许可，以及每日学习单元/固定节奏的审查修改也记录在其中。轻量单 Skill 版仍可在[原教练仓库](https://github.com/Xuermosi/source-code-learning-coach)使用。

## 验证

```bash
node scripts/check-package.mjs
python3 -m unittest discover -s skills/source-code-learning-coach/tests -p 'test_manage_learning_workspace.py'
node scripts/verify-dsh-install.mjs
```

如需指定 DSH 可执行文件，显式传入路径：

```bash
node scripts/verify-dsh-install.mjs --dsh-bin /path/to/dsh
```

DSH 验证器会创建临时 Profile、临时 Home 与包管理器缓存；它安装本地候选包、输出组合后的配置，并检查已安装的 Skill 目录中是否发现两个内置 Skill。成功时会报告隔离验证通过。找不到请求的 `dsh` 可执行文件时，会明确报告 `skipped` 并以成功状态结束；安装、配置或 Skill 发现失败则会以非零状态结束。

安装、Skill 发现与图表交付的实际结果见[验收报告](docs/verification.md)。升级需要显式更新快照并重新验证；插件运行时不会自动下载可执行依赖。

仓库还提供 `scripts/verify-install.mjs`（隔离安装及新 app-server 会话发现）和 `scripts/verify-flow.mjs`（已提交的源码样例、图表校验与学习状态登记），测试状态保存在临时目录。

## 许可证

原创教练与插件集成：[MIT](LICENSE)，© 2026 Xuermosi。Archify 保留原有 MIT 许可及作者署名。字体与可选品牌图标保留各自条款，见[第三方声明](THIRD_PARTY_NOTICES.md)。
