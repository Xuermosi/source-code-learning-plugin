# 源码学习插件（Source Code Learning Plugin）

简体中文 | [English](README.md)

一次安装，同时获得源码学习教练与 **Archify**。适用于任何语言、任何仓库：沿真实源码逐段学习，保存跨天进度，并在你同意后把已闭环的流程画成可交互 HTML 图。

## 包含哪些能力

| Skill | 职责 |
| --- | --- |
| `source-code-learning-coach` | 规划学习路线、逐段读真实源码、显示进度条，保存源码导读、问答、总结和续学位置。 |
| `archify` | 生成并校验架构图、流程图、时序图、数据流图和生命周期图，交付独立可交互 HTML。 |

学习教练先问你是否需要画图，同意后使用**插件内置的 Archify**；Archify 也可以独立使用。无需再单独安装 Archify。

## 运行条件

- 支持插件市场的 Codex 客户端，并具有本地文件和命令行访问能力。
- Python 3.10+：用于学习工作区管理。
- 持久化学习工具依赖 POSIX（macOS/Linux）的安全文件操作；运行环境不支持时会停止写入。
- Node.js 18+ 与兼容的 Chromium 浏览器：用于 Archify 的真实浏览器交付校验。安装插件不会自动安装这些运行环境。

源码学习需要访问本地仓库。仅安装插件不会让纯浏览器 ChatGPT 会话自动获得本地文件系统和执行环境。

## 安装

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

## 开始学习

选择插件中的 **Source Code Learning Coach** Skill，然后这样提问：

```text
带我分几天学习这个本地仓库，从真实源码开始。
先给出学习路线，全程显示进度条，并保存学习进度。
每学完一个完整流程，先问我是否需要画图。
```

确认路线后，教练会在仓库旁建立学习目录：

```text
my-project/
my-project-3天学习路线/
├── 学习状态.json
├── 学习状态.md
├── Day01/
│   └── 进度条0-30%/
│       ├── 01-entry-source/
│       │   ├── 源码导读.md
│       │   └── 产物/
│       ├── 当日总结.md
│       └── 问题与解答.md
├── Day02/
└── Day03/
```

源码目录内的具体名称以管理工具生成为准。进度由完成的加权检查点计算；源码对应的产物按阅读顺序归档到对应源码目录，全局产物归属于当前进度阶段。下次对话从经校验的 JSON 状态继续。

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

初始插件版本为 **0.1.0**。Archify 为 **3.0.1**（`v3.0.1`）。学习教练以提交 `63e0587c2be1415566a8135863f099210a2ae205` 为基线，在插件副本中加入图表交接规则和 MIT 许可。轻量单 Skill 版仍可在[原教练仓库](https://github.com/Xuermosi/source-code-learning-coach)使用。

## 验证

```bash
node scripts/check-package.mjs
python3 -m unittest discover -s skills/source-code-learning-coach/tests -p 'test_manage_learning_workspace.py'
```

安装、Skill 发现与图表交付的实际结果见[验收报告](docs/verification.md)。升级需要显式更新快照并重新验证；插件运行时不会自动下载可执行依赖。

仓库还提供 `scripts/verify-install.mjs`（隔离安装及新 app-server 会话发现）和 `scripts/verify-flow.mjs`（已提交的源码样例、图表校验与学习状态登记），测试状态保存在临时目录。

## 许可证

原创教练与插件集成：[MIT](LICENSE)，© 2026 Xuermosi。Archify 保留原有 MIT 许可及作者署名。字体与可选品牌图标保留各自条款，见[第三方声明](THIRD_PARTY_NOTICES.md)。
