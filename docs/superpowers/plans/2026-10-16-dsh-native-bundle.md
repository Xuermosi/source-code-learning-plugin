# DSH Native Bundle Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `source-code-learning-plugin` install as an isolated native DeepSeek Harness bundle while keeping its existing Codex marketplace behavior unchanged.

**Architecture:** Add a root ESM package manifest that advertises `dsh.bundle`, and an isolated Cordis filesystem-Skill provider whose bundle directory is resolved from its installed package. Extend the package verifier and add a DSH integration runner that uses a temporary profile when `dsh` is available; keep the existing skills as the single content source.

**Tech Stack:** Node.js ESM, DSH `@deepseek-ai/dsh-skill-filesystem`, Cordis patch YAML, Python unittest, existing package-verification scripts.

---

## Chunk 1: Native DSH bundle and verification

### Task 1: Capture the DSH bundle contract in a failing test

**Files:**
- Create: `tests/dsh-bundle.test.mjs`
- Create: `package.json`
- Create: `dsh/cordis.patch.yml`
- Modify: `plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `bundled-sources.json`
- Test: `tests/dsh-bundle.test.mjs`

- [ ] **Step 1: Write the failing test**

Assert that the repository root contains `package.json`; that its identity/version agree with `plugin.json`, `.codex-plugin/plugin.json`, and `bundled-sources.json`; and that it declares `dsh.bundle.patch` as `./dsh/cordis.patch.yml`. Assert that the patch uses an insert operation for exactly one uniquely named `@deepseek-ai/dsh-skill-filesystem` row, injects `skills`, uses `providerName: source-code-learning-plugin`, `includeDefaultRoots: false`, `watch: false`, and resolves exactly the installed package's `skills/` directory through `package.json`. Assert that it uses `bundledSkillDir` (DSH's rank-600 bundled source), not `customSkillDirs`; include a negative fixture using `customSkillDirs`. The test must reject an id matching DSH's default `skill-filesystem` row.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/dsh-bundle.test.mjs`

Expected: FAIL because `package.json` and the DSH patch do not exist.

- [ ] **Step 3: Create the minimal DSH bundle**

Create root `package.json` with package identity `source-code-learning-plugin`, release `0.2.0`, ESM mode, restricted distribution `files`, and `dsh.bundle.patch`. It must contain no `scripts`, `bin`, `main`, `exports`, `dependencies`, `optionalDependencies`, `peerDependencies`, `devDependencies`, or other executable-entry/lifecycle fields. In the same atomic metadata change, update the portable/Codex manifests and `bundled-sources.json` from `0.1.0` to `0.2.0`. Create `dsh/cordis.patch.yml` that inserts a new Skill filesystem provider rather than editing DSH's existing provider row. Resolve its rank-600 `bundledSkillDir` from the installed package's `package.json`; do not depend on the launch directory.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/dsh-bundle.test.mjs`

Expected: PASS.

### Task 2: Make package checks enforce the DSH contract

**Files:**
- Modify: `scripts/check-package.mjs`
- Modify: `scripts/scan-export.mjs` only if the new package files need an explicit scan rule
- Test: `tests/dsh-bundle.test.mjs`

- [ ] **Step 1: Extend the failing test**

Make the test execute `node scripts/check-package.mjs <temporary-fixture-root>` against a copied temporary fixture whose DSH patch is deliberately changed to use default roots. Assert that the command fails with an isolation-related diagnostic. In a second fixture case, create `fixture-marker.txt`, add it only to that fixture's npm `files` allowlist, and assert the checker rejects the resulting tarball by naming `fixture-marker.txt`; this proves both `npm pack` and its parsed contents came from the supplied fixture rather than the real repository.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/dsh-bundle.test.mjs`

Expected: FAIL because `check-package.mjs` has no DSH manifest/patch validation.

- [ ] **Step 3: Add minimal package validation**

Extend `scripts/check-package.mjs` to load `package.json`, align identity and version with the current manifests, reject every executable/lifecycle/dependency field outside the explicit static manifest allowlist, assert the DSH bundle patch path, and validate the insert-only, unique isolated provider row, its injected `skills` dependency, and its exact rank-600 package-relative `bundledSkillDir` resolver. The manifest must use an explicit `files` allowlist limited to `dsh/**`, `skills/**`, both READMEs, and license notices. Run `npm pack --dry-run --json` through `execFileSync` with `cwd` set to the script's requested `<root>` argument. Parse the tarball file list and require only this explicit member allowlist: generated `package/package.json`; `package/dsh/cordis.patch.yml`; `package/skills/**`; `package/README.md`; `package/README.zh-CN.md`; `package/LICENSE`; and `package/THIRD_PARTY_NOTICES.md`. Reject all other members, including tests, source docs, scripts, `.git`, and executable capability manifests. Keep the export scan recursive so new JSON/YAML/JS files are scanned automatically.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/dsh-bundle.test.mjs && node scripts/check-package.mjs`

Expected: PASS; the package verifier continues to report matching bundled hashes and a clean export scan.

### Task 3: Add a conditional real DSH install check

**Files:**
- Create: `scripts/verify-dsh-install.mjs`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/verification.md`
- Test: `tests/dsh-bundle.test.mjs`

- [ ] **Step 1: Extend the failing test**

Assert three runner behaviors: `--help` documents a temporary profile, isolated homes, and `--dsh-bin <path>`; a supplied nonexistent `--dsh-bin` returns a clear skipped status; and a supplied executable that exits nonzero causes a nonzero result. Also assert the runner's source contains the two expected Skill names and does not rely on the user's default DSH home.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/dsh-bundle.test.mjs`

Expected: FAIL because the DSH verifier does not exist.

- [ ] **Step 3: Implement the smallest integration runner**

Create a Node ESM runner with `--dsh-bin <path>` (defaulting to `dsh`) that makes a freshly created temporary state directory and uses it for `DSH_HOME`, `DSH_AGENTS_HOME`, `XDG_CACHE_HOME`, and the package-manager cache. Snapshot the user's default DSH home before execution and assert it remains unchanged. Install the absolute local candidate path with `dsh plugin --profile <temporary-profile> add <candidate-path>`, then run `dsh --profile <temporary-profile> --dump-config`. Use DSH's installed `@deepseek-ai/cordis`, `@deepseek-ai/dsh-skill`, and `@deepseek-ai/dsh-skill-filesystem` packages to compose an in-process `ctx.skills` registry with the dumped provider configuration and list its catalog. Assert both `source-code-learning-coach` and `archify` are returned. The runner also asserts the installed package contains both expected `SKILL.md` frontmatters. Clean up in `finally`. The runner may report `skipped` only when the requested executable cannot be found; every execution/configuration/discovery failure must return nonzero.

- [ ] **Step 4: Run the focused and real checks**

Run: `node --test tests/dsh-bundle.test.mjs && node scripts/verify-dsh-install.mjs`

Expected: static tests PASS; with the current host's DSH 0.2.0-rc.2, isolated installation, composed-provider catalog discovery, and mounted packaged Skill checks PASS.

- [ ] **Step 5: Document both install paths**

Update both READMEs with distinct Codex and DSH installation blocks, the profile/runtime requirement, and the verification command. Document the two possible DSH verification outcomes: a real isolated install-and-composition result, or an explicit skipped result when `dsh` is absent. Update `docs/verification.md` only with facts produced by this run, then regenerate reviewed source hashes.

### Task 4: Release-quality validation

**Files:**
- Modify: `bundled-sources.json`
- Modify: `plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `package.json`
- Test: all above

- [ ] **Step 1: Run complete verification**

Run:

```bash
node --test tests/dsh-bundle.test.mjs
node scripts/verify-dsh-install.mjs
python3 -m unittest discover -s skills/source-code-learning-coach/tests -p 'test_manage_learning_workspace.py' -v
uv run --with pyyaml python <codex-skill-root>/.system/skill-creator/scripts/quick_validate.py skills/source-code-learning-coach
node scripts/update-bundle-hashes.mjs
node scripts/check-package.mjs
git diff --check
```

Expected: every check exits zero; DSH verification demonstrates a temporary-profile install and an in-process catalog containing both bundled Skill names, or reports a documented executable-absent skip; the Python suite reports 97 passing tests.

- [ ] **Step 2: Review the resulting diff and export scan**

Run: `git diff --stat && node scripts/scan-export.mjs`

Expected: only DSH support, version/provenance, test, and documentation changes; no unresolved export findings.

- [ ] **Step 3: Obtain final publication confirmation**

After clean validation, present the exact plugin repository, root subdirectory, commit operation, and `git push origin main` for explicit user approval. Do not commit or push before that approval.
