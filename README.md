# Source Code Learning Plugin

[简体中文](README.zh-CN.md) | English

Install a source-code learning coach and **Archify** together. Learn any language or repository by tracing real code, preserve multi-day progress, and turn completed flows into interactive HTML diagrams with your consent.

## Included skills

| Skill | Purpose |
| --- | --- |
| `source-code-learning-coach` | Propose a dependency-ordered roadmap, materialize each Day's plan, trace small source segments, show progress, and save source guides, Q&A, summaries, and resume points. |
| `archify` | Generate and check architecture, workflow, sequence, data-flow, and lifecycle diagrams as standalone interactive HTML. |

The coach asks before generating a diagram, then uses **the Archify copy bundled in this plugin**. Archify can also be used independently. No separate Archify installation is needed.

## Requirements

- A Codex client with plugin marketplace support and local filesystem/shell access.
- Python 3.10+ for the learning workspace manager.
- The persistent workspace manager requires secure POSIX filesystem operations (macOS/Linux); unsupported operations fail closed.
- Node.js 18+ and a compatible Chromium browser for Archify's real-browser delivery checks. Installing the plugin does not install these runtimes.
- For the native DeepSeek Harness (DSH) path, a DSH runtime that provides the `dsh plugin` command and the profile you choose (for example, `web`).

The learning workflow needs access to a local source repository. Installing this bundle alone does not provide a browser-only ChatGPT session with a local filesystem or executable runtime.

## Install with Codex

Add the GitHub repository as a marketplace, then install its one plugin:

```bash
codex plugin marketplace add Xuermosi/source-code-learning-plugin --ref main
codex plugin add source-code-learning-plugin@source-code-learning
```

If your client does not expose `codex plugin add`, open the desktop app's Plugins Directory, select **Source Code Learning by Xuermosi**, and install **Source Code Learning**. Start a new conversation to discover the bundled skills; refresh or restart the client if needed.

For a local checkout:

```bash
git clone https://github.com/Xuermosi/source-code-learning-plugin.git
codex plugin marketplace add ./source-code-learning-plugin
codex plugin add source-code-learning-plugin@source-code-learning
```

These are repo/CLI marketplace installation paths, not a listing in the universal public plugin directory. See the [official packaging guide](https://developers.openai.com/plugins/build/plugins).

## Install with DeepSeek Harness (native bundle)

With DSH installed and a `web` profile available, add this repository as a native bundle:

```bash
dsh plugin --profile web add github:Xuermosi/source-code-learning-plugin
```

Then start that DSH profile normally. The bundle registers an isolated filesystem Skill provider: it mounts only this installed package's `skills/` directory, so it does not replace DSH's built-in Skill provider or scan your project and user Skill roots through this provider.

## Learn a project

Select the bundled **Source Code Learning Coach** skill and ask:

```text
Help me study this local repository from real source code over several days.
Propose the roadmap first, keep a visible progress bar, and preserve my progress.
For each Day: give the full plan, main call chain, then one small real source segment.
Explain caller, callee, the split, and returned value before syntax; ask questions only after a closed flow.
Ask me explicitly before drawing a diagram after each completed flow.
```

After roadmap approval, the coach creates a sibling learning directory:

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

Every `DayXX/学习单元.md` records the confirmed central question, one call-and-return flow, bounded source scope, pitfalls, completion check, and planned artifacts. The first lesson follows that plan → main call chain → one small source segment. Progress comes from completed weighted checkpoints; source-specific artifacts remain associated with their reading order and source owner, while Day-wide artifacts belong to the active stage. Resume from validated JSON state in a later conversation.

At daily close, the coach offers an integrated framework diagram and summary linking the day's flows. A one-off source explanation does not create a persistent learning workspace.

## Diagram handoff

After explicit diagram consent, the coach selects the appropriate type, supplies the traced source evidence, reads the sibling Archify skill, and runs its packaged renderer. It registers checked HTML with its source/stage owner before sealing that progress stage. Candidate JSON and delivery evidence stay beside the diagram.

If a diagram gate fails, the coach records it as pending and reports the actual failure. It never records a failed delivery as a completed diagram.

The learning handoff uses local files and disables Archify's upstream update check. Independent Archify use retains its upstream bounded release-notice check, which never installs an update automatically; set `ARCHIFY_UPDATE_CHECK_DISABLED=1` to disable that check too. Learning notes are not uploaded by default.

## Package and versions

```text
plugin.json                     Portable plugin identity and metadata
.codex-plugin/plugin.json       Codex compatibility manifest
.agents/plugins/marketplace.json
                                One-plugin marketplace
skills/source-code-learning-coach/
skills/archify/
bundled-sources.json             Pinned origins, modifications, and file hashes
scripts/                        Package and installation verification tools
docs/                           Design, plan, and verification report
LICENSE
THIRD_PARTY_NOTICES.md
```

Plugin version: **0.3.1**. Archify: **3.2.0** (`v3.2.0`, commit `208acba8d412335185b2056fedf54b3405df43fb`). The verified subtree tree and archive SHA-256 are recorded in `bundled-sources.json`. Coach baseline: commit `63e0587c2be1415566a8135863f099210a2ae205`, with plugin-local diagram handoff, MIT license, and the reviewed Day-plan/cadence additions recorded there. The standalone [coach repository](https://github.com/Xuermosi/source-code-learning-coach) remains available as the lightweight single-skill edition.

## Verify

```bash
node scripts/check-package.mjs
python3 -m unittest discover -s skills/source-code-learning-coach/tests -p 'test_manage_learning_workspace.py'
node scripts/verify-dsh-install.mjs
```

To use a particular DSH executable, pass it explicitly:

```bash
node scripts/verify-dsh-install.mjs --dsh-bin /path/to/dsh
```

The DSH verifier creates a temporary profile, homes, and package-manager caches; it installs the local candidate, dumps the composed configuration, and checks that the installed Skill catalog contains both bundled Skills. A successful run reports that isolated verification passed. If the requested `dsh` executable is absent, it reports `skipped` and exits successfully; installation, configuration, or catalog-discovery failures exit nonzero instead.

See [the verification report](docs/verification.md) for actual installation, discovery, and diagram delivery results. Upgrades require an explicit snapshot refresh and renewed validation; the plugin does not fetch executable dependencies at runtime.

The repository also includes `scripts/verify-install.mjs` (isolated marketplace installation and fresh app-server discovery) and `scripts/verify-flow.mjs` (a committed source fixture, checked diagram, and learning-state registration). These keep test state in a temporary directory.

## License

Original coach and integration: [MIT](LICENSE), © 2026 Xuermosi. Archify retains its original MIT license and authors. Fonts and optional brand marks retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).
