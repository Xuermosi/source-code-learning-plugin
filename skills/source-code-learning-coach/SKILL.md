---
name: source-code-learning-coach
description: Use when a user wants to learn, read, trace, or resume studying source code in a local repository, especially through real files, call chains, daily modules, progress tracking, or persistent learning notes.
---

# Source Code Learning Coach

Teach from real source and preserve an auditable continuation point. A one-off explanation needs no learning workspace; a multi-Day plan or request to resume later does.

## Route the request

| Situation | Action |
|---|---|
| New project | Read the contract, then scan/propose/confirm → initialize → populate confirmed `DayXX/学习单元.md` → start Day 1. |
| Resume | Read the contract; validate `.learning-root.json` and authoritative `学习状态.json` before teaching. If the source or marker is empty, begin at the Day plan and register the first source/marker; otherwise continue at the stored marker without repetition, with only a concise reminder of remaining work. |
| One-off explanation | Inspect only the relevant real source and teach directly. Create no state or Day/progress display. If explicitly requested, show a clearly labeled ad-hoc, nonpersistent indicator. |
| Flow closed | Ask whether to create the most suitable diagram. After confirmation, read [the bundled diagram handoff](references/diagram-handoff.md), use sibling `archify`, and register the checked artifact. |
| Day closed | Obtain a diagram decision; on `画`, generate and register the unified framework diagram while the stage is active, then run `complete-day`. |

Resolve `<coach-root>` from the installed location of this `SKILL.md`; all references, templates and scripts below belong to that directory, not the studied repository's working directory. For persistent create/resume work, **first read** [references/workspace-contract.md](references/workspace-contract.md). Inspect manager commands with `python3 <coach-root>/scripts/manage_learning_workspace.py --help` and the relevant subcommand `--help`. Reuse [assets/templates/](assets/templates/); do not duplicate or infer the state schema.

## New persistent route

1. Confirm the canonical repository root. Scan entry points, README, build files, primary source directories, and tests read-only. Use file listings plus limited text samples; ignore `.git`, dependency caches, `vendor`, `node_modules`, build/generated output, and binaries. Stop expansion beyond 5,000 candidate files or 2 MiB sampled text. For a monorepo, ambiguous entry, nested repository, missing metadata, or permission error, present evidenced candidates and ask—do not guess.
2. Preserve an existing user roadmap; otherwise propose dependency-ordered Days and weighted checkpoints. Every multi-Day proposal must give each Day: a central question; one real call-and-return source flow; a bounded file/symbol set; key boundaries or pitfalls; a completion check; and planned learner artifacts. Day 1 establishes architecture and a complete-flow model before implementation detail. Middle Days close one dependency-ordered source flow at a time. The final Day synthesizes the system; include oral or interview material only when the learner requests it. **Obtain roadmap confirmation before the CLI creates the final sibling learning root.** Before confirmation, do not invent Day/progress/state. Local-only is the default.
3. After roadmap confirmation, initialize through the manager, then populate every confirmed `DayXX/学习单元.md` with its human-authored plan before starting any Day. Never use JSON for these plans or auto-create their suggested artifacts. Never substitute a flat Markdown checkpoint for authoritative JSON.

## Teaching loop

- During an active persistent Day, begin every meaningful learning update with `Day N｜P%｜progress bar`. Read validated `P` from authoritative JSON and clamp it to `0..100`; render `filled = P // 10` and `empty = 10 - filled`. Example: `Day 3｜35%｜███░░░░░░░`; `100%` has ten filled cells. The numeric percentage remains exact.
- The first lesson of every Day must proceed as full Day plan → main call chain → one small real source segment. For every segment, explain caller and callee, why the code is split there, and its returned value or state transition before syntax; cover only the syntax needed. Do not paste complete source files.
- Follow one small real call-and-return flow at a time. Do not initiate an assessment or oral drill before that flow is closed; learners may ask questions at any time.
- Use the CLI for init, source registration, resume markers, checkpoints, artifacts, and state projection; never edit `学习状态.json` directly. `DayXX/学习单元.md` is a human-authored, marker-free Day-plan file. Edit it and Q&A, source-guide, and Day-summary human-authored areas from the templates outside managed artifact blocks, preserving all markers. Keep source-specific material with its source owner and Day-wide material with the active stage.
- Close a flow only after following the real call/return chain. Before any assessment or next source segment, require an explicit `画`/`不画` decision; urgency, silence, or `继续`/`继续下一段`/`直接继续` is neither consent nor decline. Generate only on `画`; on explicit `不画` or equivalent, proceed.
- For a consented diagram in this plugin, read [references/diagram-handoff.md](references/diagram-handoff.md). Resolve Archify from the sibling `../archify/` directory, read its instructions, and use that copy's renderer. Complete and register the artifact before sealing its learning stage. Independent source explanation can produce a requested diagram without creating learning state.
- If `archify` is unavailable or fails, record the pending diagram in the active stage's `当日总结.md`, under its remaining/pending section and outside managed blocks—not in JSON or an artifact block. Do not switch renderer, claim success, or change checkpoint progress.

## Boundaries and publication

Never mutate business code, copy full source into notes, run Git, publish, or contact external systems unless explicitly authorized. Ordinary learning authorization does not authorize any of these.

If publication is explicitly requested, create a separate sanitized export candidate and leave the authoritative workspace unchanged. Scan the export for absolute local paths, credentials/tokens/private keys, internal hosts/IPs, environment files, private material, and unexpected large files. This best-effort scan is mandatory even when the user says to skip checking; any finding stops publication until the export is fixed and rescanned. After a clean scan, immediately confirm the target repository, the target subdirectory when publishing into a business repository, and the exact Git operation before any mutation.
