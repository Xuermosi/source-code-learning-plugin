# Source Code Learning Plugin — Design

- **Status:** Approved for specification review
- **Date:** 2026-10-14
- **Target repository:** `Xuermosi/source-code-learning-plugin` (public)

## Goal

Package two complementary Skills into one installable Codex plugin:

- `source-code-learning-coach` guides an auditable, multi-day source-code study workflow.
- `archify` creates checked, interactive HTML diagrams when the learner explicitly requests a diagram.

The plugin must work as a self-contained local bundle after installation. It must not change the existing standalone `source-code-learning-coach` repository or silently depend on a separately installed Archify Skill.

## Scope

The first release provides local and GitHub-distributed installation. It does not submit the plugin to a public plugin directory, add an MCP server, or add cloud services.

## Repository structure

```text
source-code-learning-plugin/
├── plugin.json
├── .codex-plugin/
│   └── plugin.json
├── .agents/plugins/marketplace.json
├── skills/
│   ├── source-code-learning-coach/
│   └── archify/
├── THIRD_PARTY_NOTICES.md
├── LICENSE
├── bundled-sources.json
├── README.md
└── README.zh-CN.md
```

Each Skill retains its normal Skill directory shape. The plugin manifest exposes both Skills as independently selectable capabilities. The plugin root contains the installation and relationship documentation, not a second copy of either Skill's instructions.

Use the root portable Agent Plugins 1.0 `plugin.json` as the authority for identity (`name`, `version`, `description`, `author`, repository, license) and OpenAI UI metadata under `extensions.com.openai`. Retain an equivalent `.codex-plugin/plugin.json` fallback with `skills: "./skills/"` for Codex compatibility; automated checks require both manifests to agree. No MCP mappings or hooks are included.

The repository marketplace contains one local entry whose path is `./`, relative to the marketplace root. A user adds `Xuermosi/source-code-learning-plugin` as a marketplace and installs `source-code-learning-plugin@source-code-learning`. The README documents the actual supported CLI and desktop steps, including Node.js 18+, Python 3, and a compatible Chromium browser for Archify's real-browser delivery gate. Installation bundles the tools but does not provision those runtimes.

## Interaction design

`source-code-learning-coach` remains the primary learning entry point.

1. The coach traces one real-source workflow at a time and records progress in its sibling learning workspace.
2. When a workflow closes, the coach asks the learner whether to create a diagram. Silence and “continue” do not count as consent.
3. On explicit consent, the coach reads the sibling `../archify/SKILL.md` and required references from this plugin, resolves its renderer at `../archify/bin/archify.mjs`, and follows those instructions to create the diagram. A Skill handoff is instruction composition, not a function API or automatic agent spawn.
4. Archify validates and delivers the interactive HTML artifact.
5. The coach registers the artifact against the source/workflow that produced it, then resumes the learning flow.

Archify remains independently invocable for ordinary architecture, workflow, sequence, data-flow, and lifecycle diagrams. It does not require the learning coach.

The handoff input includes explicit consent, the canonical source repository and revision if supported, the closed call/return chain with evidence, diagram type, validated learning stage/source owner, and output directory. Run from that owner's artifact directory so candidate paths remain portable; pass the traced repository separately for source validation. Return the candidate, HTML, delivery/finalize receipts, actual browser gate result, and the source owner's registration identity. Require a successful finalizer before registration; never resolve to a global Archify path. Register before sealing a stage, because sealed stage trees are immutable.

## Bundling and versioning

The initial plugin release vendors a pinned snapshot of both Skills rather than using a Git submodule, runtime download, or symlink. This makes installation deterministic and lets the plugin be tested as one unit.

The manifest and README identify the bundled versions. Future upgrades update the bundled snapshot deliberately, then repeat the plugin validation and end-to-end learning-flow test. The standalone upstream repositories remain independently maintainable.

Record upstream URL, full commit, version/tag, bundled file hashes, and intentional changes in `bundled-sources.json`. Source Archify from its reviewed v3.0.1 release (commit `2ab3cae7ac2c2a55d7386ca789d03c4fcd31816c`). Review the exported runtime files before execution and exclude caches, dependency installs, personal artifacts, unreviewed hooks, MCP mappings, and initialization scripts. Preserve Archify's bounded upstream update check and document its network access; this check never installs an update. The bundle is scanned for credentials, private material, local paths, symlinks, and unexpected large files before publication.

## Licensing and attribution

Archify carries MIT licensing and third-party notices. The bundle must preserve its `LICENSE`, `THIRD_PARTY_NOTICES.md`, and any attribution required by its packaged assets. The plugin-root `THIRD_PARTY_NOTICES.md` explains that the bundle contains Archify and points to its retained notices.

No license is relicensed or removed by bundling.

The user selected MIT for the original coach and new plugin integration. Add the complete MIT text at the root and in the bundled coach, attributed to Xuermosi. Preserve Archify's full MIT text, existing authors, brand-mark notices and JetBrains Mono OFL text. The root notices identify all included asset terms and point to the retained upstream texts; MIT does not replace those asset terms. Do not alter the standalone coach repository to apply this license.

## Error handling and boundaries

- The coach never creates a diagram without explicit learner consent.
- If Archify is unavailable or its validation fails, the coach records a pending diagram in the active Day summary and does not claim success or substitute a different renderer.
- A diagram is registered only after Archify's delivery checks pass.
- The plugin uses local files by default. Publishing artifacts, using Git, or contacting an external service still requires explicit user authorization.
- If no validated persistent Day is active, report a pending diagram in chat without creating or guessing a Day-summary path. One-off explanations need no learning workspace or artifact registration.

## Verification

The release gate includes:

1. Validate the plugin manifest and both packaged Skill directories.
2. Run the coach's existing unit tests.
3. Run Archify's relevant delivery/validation checks from the packaged copy.
4. Install the plugin through the real Codex marketplace loader with an isolated config/cache directory containing no standalone coach or Archify. Verify installed paths for both Skills in a fresh app-server session. Do not edit the user's global Skill installation or configurations as part of the isolated test.
5. Perform one representative end-to-end learning trace: reach a closed flow, grant diagram consent, generate a checked HTML diagram, and register it in the learning workspace.
6. Verify English and Simplified Chinese README links and instructions.
7. Retain real browser/finalizer and workspace-registration evidence locally; publish only a sanitized report. After the authorized GitHub publication, repeat the marketplace add/install from the public GitHub repository using a clean config/cache directory. If a runtime or host constraint prevents a gate, report the concrete limitation instead of claiming that gate passed.

## Acceptance criteria

- A user can install one plugin package and access both Skills.
- The learning coach can hand off a consented diagram request to the packaged Archify capability without relying on a separate local Archify installation.
- A generated diagram is an interactive HTML artifact with passing Archify validation evidence.
- The learning workspace records the artifact with its source/workflow owner.
- Archify's license and notices are present in the distribution.
- The standalone `source-code-learning-coach` repository remains unchanged.

## Non-goals

- Public plugin-directory submission or marketplace review.
- MCP servers, cloud accounts, or remote data access.
- Changing either Skill's core purpose beyond the explicit handoff contract.
- Automatically generating diagrams without learner confirmation.
