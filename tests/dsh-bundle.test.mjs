import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { providerConfigurationFromDump } from '../scripts/verify-dsh-install.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(root, 'package.json');
const patchPath = path.join(root, 'dsh', 'cordis.patch.yml');
const dshVerifierPath = path.join(root, 'scripts', 'verify-dsh-install.mjs');
const resolver = "process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')), 'skills')";
const validPatch = `- insert:\n    - id: source-code-learning-plugin-skill-filesystem\n      name: '@deepseek-ai/dsh-skill-filesystem'\n      inject: [skills]\n      config:\n        providerName: source-code-learning-plugin\n        includeDefaultRoots: false\n        bundledSkillDir: !!js ${resolver}\n        watch: false\n`;

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function assertPatchContract(patch) {
  assert.equal(patch, validPatch, 'patch must contain exactly one insert operation and its one isolated filesystem provider row');
}

function withFixture(change, run) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'source-code-learning-plugin-dsh-'));
  try {
    cpSync(root, fixture, {
      recursive: true,
      filter: (source) => (
        !source.endsWith(`${path.sep}.git`)
        && !source.includes(`${path.sep}.git${path.sep}`)
        && !source.endsWith(`${path.sep}docs${path.sep}superpowers`)
        && !source.includes(`${path.sep}docs${path.sep}superpowers${path.sep}`)
      ),
    });
    change(fixture);
    return run(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

function checkFixture(fixture) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'check-package.mjs'), fixture], {
    encoding: 'utf8',
  });
}

test('DSH bundle metadata is aligned and isolated', () => {
  assert.ok(existsSync(packagePath), 'root package.json must exist');
  assert.ok(existsSync(patchPath), 'DSH Cordis patch must exist');

  const packageJson = readJson('package.json');
  const plugin = readJson('plugin.json');
  const codexPlugin = readJson('.codex-plugin/plugin.json');
  const bundledSources = readJson('bundled-sources.json');

  assert.equal(packageJson.name, 'source-code-learning-plugin');
  assert.equal(packageJson.name, plugin.name);
  assert.equal(packageJson.name, codexPlugin.name);
  assert.equal(packageJson.version, '0.2.0');
  assert.equal(packageJson.version, plugin.version);
  assert.equal(packageJson.version, codexPlugin.version);
  assert.equal(packageJson.version, bundledSources.pluginVersion);
  assert.equal(packageJson.type, 'module');
  assert.deepEqual(packageJson.files, [
    'dsh/**',
    'skills/**',
    'README.md',
    'README.zh-CN.md',
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
  ]);
  for (const field of ['scripts', 'bin', 'main', 'exports', 'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.equal(Object.hasOwn(packageJson, field), false, `package.json must not declare ${field}`);
  }
  assert.equal(packageJson.dsh?.bundle?.patch, './dsh/cordis.patch.yml');

  assertPatchContract(readFileSync(patchPath, 'utf8'));
});

test('DSH bundle contract rejects custom Skill roots', () => {
  assert.doesNotThrow(() => assertPatchContract(validPatch));
  assert.throws(
    () => assertPatchContract(validPatch.replace('bundledSkillDir:', 'customSkillDirs:')),
    /bundledSkillDir|customSkillDirs/,
  );
});

test('DSH bundle contract rejects weakened provider isolation settings', () => {
  assert.throws(
    () => assertPatchContract(validPatch.replace('providerName: source-code-learning-plugin', 'providerName: another-provider')),
    /exactly one insert operation/,
  );
  assert.throws(
    () => assertPatchContract(validPatch.replace('includeDefaultRoots: false', 'includeDefaultRoots: true')),
    /exactly one insert operation/,
  );
  assert.throws(
    () => assertPatchContract(validPatch.replace('watch: false', 'watch: true')),
    /exactly one insert operation/,
  );
  assert.throws(
    () => assertPatchContract(validPatch.replace('inject: [skills]', 'inject: [not-skills]')),
    /exactly one insert operation/,
  );
});

test('DSH bundle contract rejects extra operations, providers, and dispersed fields', () => {
  for (const patch of [
    `${validPatch}- append: []\n`,
    validPatch.replace('        watch: false\n', "        watch: false\n    - id: another-provider\n      name: '@deepseek-ai/another-provider'\n"),
    validPatch.replace('        watch: false\n', '      extra:\n        watch: false\n'),
  ]) {
    assert.throws(() => assertPatchContract(patch), /exactly one insert operation/);
  }
});

test('package checker rejects a fixture whose DSH provider scans default roots', () => {
  const result = withFixture((fixture) => {
    const fixturePatch = path.join(fixture, 'dsh', 'cordis.patch.yml');
    writeFileSync(
      fixturePatch,
      readFileSync(fixturePatch, 'utf8').replace('includeDefaultRoots: false', 'includeDefaultRoots: true'),
    );
  }, checkFixture);

  assert.notEqual(result.status, 0, 'checker must reject DSH providers that scan default roots');
  assert.match(`${result.stdout}\n${result.stderr}`, /default roots|includeDefaultRoots|isolation/i);
});

test('package checker packs the supplied fixture root and rejects an unapproved tarball member', () => {
  const result = withFixture((fixture) => {
    writeFileSync(path.join(fixture, 'dsh', 'fixture-marker.txt'), 'This must only appear in the fixture tarball.\n');
  }, checkFixture);

  assert.notEqual(result.status, 0, 'checker must reject files added only to the supplied fixture package');
  assert.match(result.stderr, /Package tarball contains unapproved member\(s\): package\/dsh\/fixture-marker\.txt/);
});

test('package checker binds every DSH field to its sole inserted provider row', () => {
  const fixtures = [
    `${validPatch}- append: []\n`,
    validPatch.replace('        watch: false\n', "        watch: false\n    - id: another-provider\n      name: '@deepseek-ai/another-provider'\n"),
    validPatch.replace('        watch: false\n', '      extra:\n        watch: false\n'),
  ];

  for (const patch of fixtures) {
    const result = withFixture((fixture) => {
      writeFileSync(path.join(fixture, 'dsh', 'cordis.patch.yml'), patch);
    }, checkFixture);
    assert.notEqual(result.status, 0, 'checker must reject a patch that is not exactly its one isolated provider row');
  }
});

test('DSH install verifier documents isolated temporary execution', () => {
  assert.ok(existsSync(dshVerifierPath), 'DSH install verifier must exist');
  const result = spawnSync(process.execPath, [dshVerifierPath, '--help'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /temporary profile/i);
  assert.match(result.stdout, /isolated (?:DSH )?homes/i);
  assert.match(result.stdout, /--dsh-bin <path>/);
});

test('DSH install verifier explicitly skips only a missing requested executable', () => {
  const result = spawnSync(process.execPath, [dshVerifierPath, '--dsh-bin', path.join(os.tmpdir(), 'missing-dsh-binary')], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /skipped/i);
  assert.match(result.stdout, /not found|unavailable/i);
});

test('DSH install verifier fails when a requested executable runs unsuccessfully', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'source-code-learning-plugin-bad-dsh-'));
  const fakeDsh = path.join(temporary, 'dsh');
  try {
    writeFileSync(fakeDsh, '#!/bin/sh\nexit 23\n');
    chmodSync(fakeDsh, 0o755);
    const result = spawnSync(process.execPath, [dshVerifierPath, '--dsh-bin', fakeDsh], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /^DSH verification skipped/m);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('DSH install verifier does not skip an existing non-executable path', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'source-code-learning-plugin-non-executable-dsh-'));
  const fakeDsh = path.join(temporary, 'dsh');
  try {
    writeFileSync(fakeDsh, '#!/bin/sh\nexit 0\n');
    chmodSync(fakeDsh, 0o644);
    const result = spawnSync(process.execPath, [dshVerifierPath, '--dsh-bin', fakeDsh], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /^DSH verification skipped/m);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('DSH install verifier isolates package-manager homes and cleans temporary state after a DSH failure', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'source-code-learning-plugin-env-dsh-'));
  const fakeDsh = path.join(temporary, 'dsh');
  const recordPath = path.join(temporary, 'environment.txt');
  const inheritedStore = path.join(temporary, 'inherited-pnpm-store');
  const inheritedUserconfig = path.join(temporary, 'inherited-npmrc');
  const priorStore = process.env.pnpm_config_store_dir;
  const priorUserconfig = process.env.npm_config_userconfig;
  try {
    writeFileSync(fakeDsh, `#!/bin/sh
{
  printf 'DSH_HOME=%s\\n' "$DSH_HOME"
  printf 'DSH_AGENTS_HOME=%s\\n' "$DSH_AGENTS_HOME"
  printf 'XDG_CACHE_HOME=%s\\n' "$XDG_CACHE_HOME"
  printf 'HOME=%s\\n' "$HOME"
  printf 'PNPM_HOME=%s\\n' "$PNPM_HOME"
  printf 'PNPM_STORE_DIR=%s\\n' "$PNPM_STORE_DIR"
  printf 'pnpm_config_store_dir=%s\\n' "$pnpm_config_store_dir"
  printf 'PNPM_CONFIG_CACHE_DIR=%s\\n' "$PNPM_CONFIG_CACHE_DIR"
  printf 'PNPM_CONFIG_STATE_DIR=%s\\n' "$PNPM_CONFIG_STATE_DIR"
  printf 'npm_config_cache=%s\\n' "$npm_config_cache"
  printf 'NPM_CONFIG_CACHE=%s\\n' "$NPM_CONFIG_CACHE"
  printf 'npm_config_userconfig=%s\\n' "$npm_config_userconfig"
  printf 'NPM_CONFIG_USERCONFIG=%s\\n' "$NPM_CONFIG_USERCONFIG"
} > "$DSH_TEST_ENV_RECORD"
exit 23
`);
    chmodSync(fakeDsh, 0o755);
    process.env.pnpm_config_store_dir = inheritedStore;
    process.env.npm_config_userconfig = inheritedUserconfig;
    const result = spawnSync(process.execPath, [dshVerifierPath, '--dsh-bin', fakeDsh], {
      encoding: 'utf8',
      env: { ...process.env, DSH_TEST_ENV_RECORD: recordPath },
    });
    assert.notEqual(result.status, 0);
    const received = Object.fromEntries(readFileSync(recordPath, 'utf8').trim().split('\n').map((line) => line.split('=')));
    const temporaryRoot = path.dirname(received.DSH_HOME);
    for (const [name, value] of Object.entries(received)) {
      assert.ok(value.startsWith(`${temporaryRoot}${path.sep}`), `${name} must be inside the temporary root`);
    }
    assert.notEqual(received.pnpm_config_store_dir, inheritedStore);
    assert.notEqual(received.npm_config_userconfig, inheritedUserconfig);
    assert.equal(existsSync(temporaryRoot), false, 'runner must remove temporary state after the failed DSH command');
  } finally {
    if (priorStore === undefined) delete process.env.pnpm_config_store_dir;
    else process.env.pnpm_config_store_dir = priorStore;
    if (priorUserconfig === undefined) delete process.env.npm_config_userconfig;
    else process.env.npm_config_userconfig = priorUserconfig;
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('DSH install verifier targets both bundled Skills without using a default DSH home', () => {
  const source = readFileSync(dshVerifierPath, 'utf8');
  assert.match(source, /source-code-learning-coach/);
  assert.match(source, /archify/);
  assert.match(source, /DSH_HOME/);
  assert.match(source, /DSH_AGENTS_HOME/);
  assert.match(source, /snapshotDefaultDshHome/);
  assert.doesNotMatch(source, /DSH_HOME\s*\?\?/);
});

test('DSH install verifier always removes its temporary root when the home snapshot assertion fails', () => {
  const source = readFileSync(dshVerifierPath, 'utf8');
  assert.match(source,
    /finally\s*{\s*try\s*{[\s\S]*?snapshotDefaultDshHome\(\);[\s\S]*?assert\.deepEqual\(finalDefaultHome, initialDefaultHome,[\s\S]*?\);[\s\S]*?}\s*finally\s*{\s*if \(temporaryRoot !== undefined\) rmSync\(temporaryRoot, \{ recursive: true, force: true \}\);\s*}/,
    'temporary state cleanup must be in an inner finally after the default-home assertion');
});

test('DSH install verifier does not snapshot the default home for help or missing-executable exits', () => {
  const source = readFileSync(dshVerifierPath, 'utf8');
  const parsedArguments = source.indexOf('const options = parseArguments(process.argv.slice(2));');
  const resolvedExecutable = source.indexOf('const executable = resolveExecutable(options.dshBin);');
  const initialSnapshot = source.indexOf('initialDefaultHome = snapshotDefaultDshHome();');
  assert.ok(parsedArguments !== -1 && resolvedExecutable !== -1 && initialSnapshot !== -1);
  assert.ok(parsedArguments < initialSnapshot, 'help must return before observing the default DSH home');
  assert.ok(resolvedExecutable < initialSnapshot, 'missing executable must skip before observing the default DSH home');
});

test('DSH install verifier binds every provider configuration field to the dumped provider row', () => {
  const bundledSkillDir = '/temporary/profile/node_modules/source-code-learning-plugin/skills';
  const validDump = `- insert:\n    - id: source-code-learning-plugin-skill-filesystem\n      name: '@deepseek-ai/dsh-skill-filesystem'\n      inject: [skills]\n      config:\n        providerName: source-code-learning-plugin\n        includeDefaultRoots: false\n        bundledSkillDir: !!js process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')), 'skills')\n        watch: false\n`;
  assert.deepEqual(providerConfigurationFromDump(validDump, bundledSkillDir), {
    providerName: 'source-code-learning-plugin',
    includeDefaultRoots: false,
    bundledSkillDir,
    watch: false,
  });

  const renderedDump = `# == source-code-learning-plugin\n- id: source-code-learning-plugin-skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n  inject:\n    - skills\n  config:\n    providerName: source-code-learning-plugin\n    includeDefaultRoots: false\n    bundledSkillDir: !!js >-\n      process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')),\n      'skills')\n    watch: false\n`;
  assert.deepEqual(providerConfigurationFromDump(renderedDump, bundledSkillDir), {
    providerName: 'source-code-learning-plugin',
    includeDefaultRoots: false,
    bundledSkillDir,
    watch: false,
  });

  const displacedBundleDirectory = validDump.replace(
    "bundledSkillDir: !!js process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')), 'skills')",
    'bundledSkillDir: /untrusted/skills',
  );
  assert.throws(
    () => providerConfigurationFromDump(displacedBundleDirectory, bundledSkillDir),
    /bundledSkillDir|installed package/i,
  );
});
