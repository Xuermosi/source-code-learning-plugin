# Source Code Learning Plugin Implementation Plan

**Goal:** Publish the reviewed two-Skill plugin to the approved GitHub repository and verify installation plus a consented diagram workflow.

**Architecture:** Portable root manifest, Codex compatibility manifest, and a one-entry marketplace expose two pinned Skill snapshots. The coach reads the sibling Archify instructions and executes the sibling renderer before registering the diagram in its source owner's active learning stage.

**Tech stack:** Codex plugin marketplace/app-server, Python 3, Node.js 18+, Chromium, JSON, Markdown.

## Chunk 1: Package and integration

- [x] Vendor reviewed coach and Archify snapshots; retain licenses and asset notices.
- [x] Create `plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, root MIT license, third-party notices, and `bundled-sources.json` with hashes and origins.
- [x] Update bundled `skills/source-code-learning-coach/SKILL.md` and add `references/diagram-handoff.md` for consent, sibling renderer resolution, portable artifact paths, successful delivery evidence, and source ownership.
- [x] Write mutually linked `README.md` and `README.zh-CN.md` covering prerequisites, marketplace add/install, invocation, learning layout, upstream pins, and license terms.

## Chunk 2: Verification and release

- [x] Add `scripts/check-package.mjs` for manifest consistency, local marketplace resolution, bundle hashes, portable files, and required licenses. Run `node scripts/check-package.mjs`.
- [x] Run the bundled coach's existing suite: `python3 -m unittest discover -s skills/source-code-learning-coach/tests -p 'test_manage_learning_workspace.py'`. Validate both Skill frontmatters with the installed skill-creator validator.
- [x] Install the local marketplace using a fresh isolated Codex config/cache, and inspect a fresh app-server's `skills/list` output to prove both Skills originate from the plugin cache.
- [x] In a separate test workspace, initialize a one-Day learning route for a tiny committed source fixture, register its source, run packaged Archify `finalize sequence ... --repo-root ... --quality showcase --json`, register its checked HTML and evidence before completing the checkpoint, then verify source and Day projections.
- [x] Preserve a sanitized verification report. Scan the package, check formatting and public Git identity, commit, create the approved public GitHub repo, and push `main`.
- [x] In another isolated config/cache directory, add the GitHub marketplace and install the plugin using the documented commands. Confirm discovery again, update the report with actual results, and push the report.

Stop only for a concrete unmet permission, license, runtime, or loader requirement. Report the exact incomplete gate; do not describe static directory checks as real host installation.
