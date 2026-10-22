# Bundled Archify handoff

Read this only after the learner explicitly consents to a diagram or directly requests one. A Skill is an instruction package: compose its workflow in the current agent; a handoff does not itself create a subagent or send a message to another chat.

## Resolve the bundled capability

Resolve paths relative to this coach's installed Skill directory, never to a guessed user directory or global skill name:

- Archify instructions: `../archify/SKILL.md`
- Renderer: `../archify/bin/archify.mjs`
- Release identity: `../archify/skill-release.json`

Check those files exist in the same installed plugin. Read Archify's full instructions and the references required by the chosen mode before authoring. Follow the schema and complete `finalize` gates from that copy. Preserve its repair limits, update-notice reporting, and truthful browser/perceptual-review distinctions. If the sibling package is missing, report it; do not silently switch to a separately installed Archify.

## Prepare the diagram slice

Carry forward these facts from the closed flow:

- The learner's diagram consent and requested scope.
- The canonical repository, current source revision and relevant dirty paths where applicable.
- The actual call/return chain, branches and unresolved facts, with repository-relative file/line evidence.
- The diagram type: `sequence` for calls/returns, `workflow` for decisions/process, `architecture` for components, `dataflow` for movement/transformation, or `lifecycle` for status/recovery.
- For persistent study: a validated active stage, its source owner (or `day-overview` owner for a Day-wide diagram), and that owner's directory. Read state through the coach manager's contract rather than inferring paths from a chat label.

Stay inside the consented source slice; choosing a diagram is not permission to expand the study scope.

## Generate within the learning owner

Persistent study: for a source owner, create a new `产物/<type>-<slug>-<timestamp>/` child beneath its validated source directory. For a Day-wide owner, create the child directly in the validated `当日总览产物` directory. Run Archify with this diagram directory as the working directory. Place `candidate.json` and `<slug>.html` there; set `meta.output` to the portable basename `<slug>.html`. Pass the traced repository using `--repo-root` when the candidate includes repository-backed evidence. This reconciles Archify's CWD-relative output contract with the coach's sibling learning workspace.

Use the sibling renderer's absolute path and disable background update traffic for learning generation:

```text
ARCHIFY_UPDATE_CHECK_DISABLED=1 node <bundled-archify>/bin/archify.mjs finalize <type> candidate.json <slug>.html --repo-root <traced-repository> --quality showcase --json
```

For a non-repository-backed diagram, omit `--repo-root` and make that evidence limitation explicit. For a one-off explanation with no learning state, use Archify's normal output-folder rules; create no Day state or artifact registry just to draw a requested diagram.

## Verify, review, and register before advancing progress

Treat delivery as three distinct gates, in this order:

1. `finalize` must exit 0 with a passing receipt. Its validation, delivery/strict checks, and actual `browser-check` must all pass. Keep the candidate, HTML, delivery metadata, and finalizer evidence together. Follow a required sequence-width review if the receipt recommends it. A missing browser is an incomplete gate, not success.
2. Run `visual-check` for the final HTML with an artifact-local output directory. It produces the visual receipt, contact sheet, and viewport/theme screenshots; retain them with the artifact.
3. Manually inspect the relevant generated screenshots and/or contact sheet before approving the diagram. Check at least the intended reading viewport and all source-specific labels, arrows, branches, and whitespace/layout balance. Record the review outcome and what was inspected in a small adjacent human-authored note such as `人工视觉复核.md`; link or name the reviewed visual-check evidence and final HTML hash. Do not call an automated browser result a human visual review.

For example, run the capture gate after `finalize`:

```text
ARCHIFY_UPDATE_CHECK_DISABLED=1 node <bundled-archify>/bin/archify.mjs visual-check <slug>.html --out-dir visual-check --json
```

If the visual inspection finds a defect, make only Archify's bounded repair, rerun all three gates against the repaired final HTML, and repeat the manual review. Do not register the earlier artifact as approved.

Then register the HTML with the coach's manager:

```text
python3 <coach>/scripts/manage_learning_workspace.py register-artifact --learning-root <validated-root> --owner-kind <source-or-day-overview> --owner-dir <validated-owner> --artifact <checked-html>
```

Register only after the manual review passes, and before completing a checkpoint that seals this stage. Register extra evidence files only if they are useful learning artifacts; do not invent JSON state fields or rewrite managed Markdown blocks. If a checkpoint was already sealed when a defect is found, do not add the repaired artifact to that sealed stage: reopen the checkpoint with the manager, work in the new revision stage, generate and register the repaired artifact there, then complete the checkpoint again. Return the HTML link, diagram type, automated validation/browser evidence, manual visual-review result, and the corresponding source/stage link to the learner.

## Incomplete delivery

On a missing sibling Skill, failed automated gate, or failed manual review, follow Archify's bounded repairs. Do not register the diagram or advance progress because of a diagram failure. For a validated active persistent Day, record the pending diagram in the active stage's `当日总结.md`, under its pending/remaining human-authored section. If no active persistent state exists, report the pending diagram in chat without creating a summary in a guessed location. Resume ordinary teaching only when the learner's diagram choice has been resolved.
