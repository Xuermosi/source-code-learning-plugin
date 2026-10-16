# DSH Native Bundle Support

## Goal

Allow the existing `source-code-learning-plugin` repository to be installed as a native DeepSeek Harness (DSH) bundle while preserving the current Codex marketplace package without duplicating the two bundled Skills.

## Scope

- Keep `skills/source-code-learning-coach` and `skills/archify` as the single source of bundled Skill content.
- Add a root Node package manifest that declares a DSH bundle.
- Add one Cordis patch row that mounts the package's own `skills/` directory through DSH's filesystem Skill provider.
- Document Codex and DSH installation, supported runtime assumptions, and how users verify discovery.
- Update package validation to check the DSH manifest and patch shape without requiring a DSH installation.
- Add an isolated DSH integration check when the `dsh` executable is present; otherwise report that the runtime check is skipped rather than claiming it passed.

## Non-goals

- Do not add tools, MCP servers, client UI, network access, telemetry, or runtime downloads.
- Do not alter source-learning workflow semantics, Archify behavior, or the existing Codex manifests.
- Do not replace DSH's default project or user Skill providers.

## Architecture

The root `package.json` becomes the DSH package manifest. It declares the same package identity and release version as the portable and Codex manifests, uses ESM, ships only the files required by the current plugin plus the DSH patch, and exposes:

```json
{
  "dsh": { "bundle": { "patch": "./dsh/cordis.patch.yml" } }
}
```

`dsh/cordis.patch.yml` inserts one new, uniquely named `@deepseek-ai/dsh-skill-filesystem` row. Its configuration uses:

- a package-specific provider name, avoiding conflict with DSH's existing provider;
- `includeDefaultRoots: false`, so this provider cannot re-scan project or user Skill locations;
- an explicit `bundledSkillDir`, resolved package-relatively from the installed package's `package.json`, not from the launch CWD;
- `watch: false`, because installed package assets are immutable for a running profile and no live-edit feature is promised.

The base DSH profile already supplies the shared `ctx.skills` registry and model-facing Skill tool. The new provider contributes only the two packaged Skill directories at DSH's bundled-Skill rank. No existing DSH config row is replaced.

## User experience

Codex remains unchanged:

```bash
codex plugin marketplace add Xuermosi/source-code-learning-plugin --ref main
codex plugin add source-code-learning-plugin@source-code-learning
```

DSH gains this path:

```bash
dsh plugin --profile web add github:Xuermosi/source-code-learning-plugin
```

After installation, the DSH Skill catalog should list `source-code-learning-coach` and `archify`. The README will state that a DSH profile containing the normal base Skill registry/provider/tool is required; the bundle supplies content, not a separate agent runtime.

## Compatibility and safety

The package name is used for package-relative path resolution so Git, local-path, and registry installations behave the same. The DSH bundle is deliberately content-only: it mounts no executable plugin entry and requests no new permissions. Existing Python and Node/Chromium requirements remain tied to the two Skills' actual work, not installation.

## Verification

1. Extend the existing Node package check to validate root package identity/version alignment, `dsh.bundle.patch`, the DSH patch's unique provider row, isolated roots, and package-relative bundled Skill path.
2. Run the current coach regression suite, Skill validator, package integrity check, Markdown link check, diff check, and export scan.
3. If `dsh` is available, install into a temporary profile from a local candidate, inspect the composed configuration, and assert both Skill names are discoverable. If it is unavailable, retain the static checks and record the missing runtime verification plainly.
4. Before publication, rebuild source hashes, re-run the sanitized export scan, and ask for explicit confirmation of the exact Git targets and pushes.

## Release

This is an additive compatibility feature, so the plugin version moves from `0.1.0` to `0.2.0`. The standalone coach repository remains a Skill-only distribution and receives no DSH bundle changes.
