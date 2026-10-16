#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedSkillNames = ['source-code-learning-coach', 'archify'];

function usage() {
  return `Usage: node scripts/verify-dsh-install.mjs [--dsh-bin <path>]\n\n`
    + 'Runs a temporary profile, isolated DSH bundle installation check.\n'
    + 'Uses isolated DSH homes and package-manager caches in a temporary directory.\n'
    + 'Use --dsh-bin <path> to select the DSH executable (default: dsh on PATH).\n';
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  if (argv.length === 0) return { dshBin: 'dsh' };
  if (argv.length === 2 && argv[0] === '--dsh-bin' && argv[1]) return { dshBin: argv[1] };
  throw new Error(`Unknown arguments.\n\n${usage()}`);
}

function executableState(candidate) {
  if (!existsSync(candidate)) return { kind: 'missing' };
  try {
    accessSync(candidate, 0o1);
    return { kind: 'ready', path: path.resolve(candidate) };
  } catch (error) {
    return { kind: 'unusable', error };
  }
}

function resolveExecutable(requested) {
  if (requested.includes(path.sep) || (path.sep === '\\' && requested.includes('/'))) {
    return executableState(requested);
  }
  let unusable;
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(directory || '.', requested);
    const state = executableState(candidate);
    if (state.kind === 'ready') return state;
    if (state.kind === 'unusable') unusable ??= state;
  }
  return unusable ?? { kind: 'missing' };
}

function snapshotPath(target) {
  if (!existsSync(target)) return { exists: false };
  const entries = [];
  const walk = (current, relative) => {
    const stat = lstatSync(current);
    if (stat.isDirectory()) {
      entries.push(`directory:${relative}`);
      for (const entry of readdirSync(current).sort()) walk(path.join(current, entry), path.join(relative, entry));
      return;
    }
    if (stat.isFile()) {
      const digest = createHash('sha256').update(readFileSync(current)).digest('hex');
      entries.push(`file:${relative}:${digest}`);
      return;
    }
    if (stat.isSymbolicLink()) {
      entries.push(`symlink:${relative}:${realpathSync(current)}`);
      return;
    }
    entries.push(`other:${relative}`);
  };
  walk(target, '.');
  return { exists: true, entries };
}

function snapshotDefaultDshHome() {
  return snapshotPath(path.join(os.homedir(), '.dsh'));
}

function runDsh(dshBin, arguments_, environment) {
  const result = spawnSync(dshBin, arguments_, {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`DSH command failed: ${dshBin} ${arguments_.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function findPackageDirectory(searchRoot, packageName) {
  const pending = [searchRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const child = path.join(current, entry.name);
      if (entry.name === 'node_modules') {
        const packageDirectory = path.join(child, packageName);
        if (existsSync(path.join(packageDirectory, 'package.json'))) return realpathSync(packageDirectory);
      }
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') pending.push(child);
    }
  }
  return undefined;
}

function findDshPackageDirectory(dshBin) {
  let current = path.dirname(realpathSync(dshBin));
  while (current !== path.dirname(current)) {
    const manifestPath = path.join(current, 'package.json');
    if (existsSync(manifestPath) && JSON.parse(readFileSync(manifestPath, 'utf8')).name === '@deepseek-ai/dsh') return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not locate @deepseek-ai/dsh package from executable: ${dshBin}`);
}

function assertInstalledSkillFrontmatter(packageDirectory) {
  for (const skillName of expectedSkillNames) {
    const skillPath = path.join(packageDirectory, 'skills', skillName, 'SKILL.md');
    assert.ok(existsSync(skillPath), `installed package is missing ${skillName}/SKILL.md`);
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(skillPath, 'utf8'))?.[1];
    assert.ok(frontmatter, `installed ${skillName}/SKILL.md must start with frontmatter`);
    assert.match(frontmatter, /^name:\s*[^\r\n]+$/m, `installed ${skillName}/SKILL.md frontmatter must declare name`);
    assert.match(frontmatter, /^description:\s*[^\r\n]+$/m, `installed ${skillName}/SKILL.md frontmatter must declare description`);
  }
}

export function providerConfigurationFromDump(dump, bundledSkillDir) {
  const start = dump.indexOf('id: source-code-learning-plugin-skill-filesystem');
  assert.notEqual(start, -1, 'DSH config dump is missing the isolated provider row');
  const remainingDump = dump.slice(start + 1);
  const nextProviderOffset = /\n\s*-\s*id:/.exec(remainingDump)?.index;
  const providerRow = dump.slice(start, nextProviderOffset === undefined ? undefined : start + 1 + nextProviderOffset);
  assert.match(providerRow, /^\s*name:\s*'@deepseek-ai\/dsh-skill-filesystem'$/m,
    'dumped isolated provider must use DSH filesystem Skills');
  assert.match(providerRow, /^\s*inject:\s*(?:\[skills\]|\n\s*-\s*skills)\s*$/m,
    'dumped isolated provider must inject the Skill registry');
  const providerName = /^\s*providerName:\s*([^\r\n]+)$/m.exec(providerRow)?.[1]?.trim();
  const includeDefaultRoots = /^\s*includeDefaultRoots:\s*(true|false)$/m.exec(providerRow)?.[1];
  const watch = /^\s*watch:\s*(true|false)$/m.exec(providerRow)?.[1];
  assert.equal(providerName, 'source-code-learning-plugin', 'dumped providerName must stay isolated');
  assert.equal(includeDefaultRoots, 'false', 'dumped provider must not scan default roots');
  assert.match(providerRow, /^\s*bundledSkillDir:\s*!!js/m,
    'dumped provider must retain a JavaScript bundledSkillDir expression');
  const bundledExpression = providerRow.replaceAll(/\s+/g, '');
  assert.ok(bundledExpression.includes(
    "process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')),'skills')",
  ), 'dumped bundledSkillDir must resolve the installed package skills directory');
  assert.equal(watch, 'false', 'dumped provider must not watch the host filesystem');
  return {
    providerName,
    includeDefaultRoots: includeDefaultRoots === 'true',
    bundledSkillDir,
    watch: watch === 'true',
  };
}

async function composeCatalogFromInstalledDsh(dshPackageDirectory, providerConfiguration) {
  const requireFromDsh = createRequire(path.join(dshPackageDirectory, 'package.json'));
  const cordis = await import(pathToFileURL(requireFromDsh.resolve('@deepseek-ai/cordis')).href);
  const skill = await import(pathToFileURL(requireFromDsh.resolve('@deepseek-ai/dsh-skill')).href);
  const filesystem = await import(pathToFileURL(requireFromDsh.resolve('@deepseek-ai/dsh-skill-filesystem')).href);
  const context = new cordis.Context();
  try {
    await context.plugin(skill.SkillRegistry);
    await context.plugin(Object.assign(filesystem.apply, { inject: filesystem.inject }), providerConfiguration);
    const catalog = await context.skills.list({ cwd: root });
    const names = catalog.map((entry) => entry.name);
    for (const skillName of expectedSkillNames) assert.ok(names.includes(skillName), `DSH Skill catalog is missing ${skillName}`);
    return names;
  } finally {
    await context.fiber.dispose();
  }
}

function isolatedChildEnvironment(temporaryRoot) {
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => {
    const normalized = name.toLowerCase();
    return !normalized.startsWith('pnpm_config_') && !normalized.startsWith('npm_config_');
  }));
  const npmCache = path.join(temporaryRoot, 'npm-cache');
  const npmUserconfig = path.join(temporaryRoot, 'npmrc');
  const pnpmStore = path.join(temporaryRoot, 'pnpm-store');
  const pnpmCache = path.join(temporaryRoot, 'pnpm-cache');
  const pnpmState = path.join(temporaryRoot, 'pnpm-state');
  return {
    ...environment,
    HOME: path.join(temporaryRoot, 'home'),
    DSH_HOME: path.join(temporaryRoot, 'dsh-home'),
    DSH_AGENTS_HOME: path.join(temporaryRoot, 'agents-home'),
    XDG_CACHE_HOME: path.join(temporaryRoot, 'xdg-cache'),
    XDG_CONFIG_HOME: path.join(temporaryRoot, 'xdg-config'),
    XDG_STATE_HOME: path.join(temporaryRoot, 'xdg-state'),
    COREPACK_HOME: path.join(temporaryRoot, 'corepack-home'),
    PNPM_HOME: path.join(temporaryRoot, 'pnpm-home'),
    PNPM_STORE_DIR: pnpmStore,
    PNPM_CONFIG_STORE_DIR: pnpmStore,
    pnpm_config_store_dir: pnpmStore,
    PNPM_CONFIG_CACHE_DIR: pnpmCache,
    pnpm_config_cache_dir: pnpmCache,
    PNPM_CONFIG_STATE_DIR: pnpmState,
    pnpm_config_state_dir: pnpmState,
    NPM_CONFIG_CACHE: npmCache,
    npm_config_cache: npmCache,
    NPM_CONFIG_USERCONFIG: npmUserconfig,
    npm_config_userconfig: npmUserconfig,
    NPM_CONFIG_GLOBALCONFIG: path.join(temporaryRoot, 'npm-globalrc'),
    npm_config_globalconfig: path.join(temporaryRoot, 'npm-globalrc'),
  };
}

async function main() {
  let temporaryRoot;
  let initialDefaultHome;
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const executable = resolveExecutable(options.dshBin);
  if (executable.kind === 'missing') {
    process.stdout.write(`DSH verification skipped: requested executable not found or unavailable: ${options.dshBin}\n`);
    return;
  }
  if (executable.kind === 'unusable') throw new Error(`Requested DSH executable exists but cannot be executed: ${options.dshBin}`);
  const dshBin = executable.path;

  try {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'source-code-learning-plugin-dsh-'));
    const profile = `source-code-learning-plugin-${Date.now()}`;
    const environment = isolatedChildEnvironment(temporaryRoot);
    const candidate = realpathSync(root);
    initialDefaultHome = snapshotDefaultDshHome();
    runDsh(dshBin, ['plugin', '--profile', profile, 'add', candidate], environment);
    const dump = runDsh(dshBin, ['--profile', profile, '--dump-config'], environment);

    const installedPackage = findPackageDirectory(path.join(temporaryRoot, 'dsh-home'), 'source-code-learning-plugin');
    assert.ok(installedPackage, 'DSH profile did not contain the installed candidate package');
    assertInstalledSkillFrontmatter(installedPackage);
    const providerConfiguration = providerConfigurationFromDump(dump, path.join(installedPackage, 'skills'));
    const catalog = await composeCatalogFromInstalledDsh(findDshPackageDirectory(dshBin), providerConfiguration);
    process.stdout.write(`DSH verification passed: isolated profile installed the bundle and discovered ${catalog.join(', ')}.\n`);
  } finally {
    try {
      if (initialDefaultHome !== undefined) {
        const finalDefaultHome = snapshotDefaultDshHome();
        assert.deepEqual(finalDefaultHome, initialDefaultHome, 'DSH verification modified the default user DSH home');
      }
    } finally {
      if (temporaryRoot !== undefined) rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`DSH verification failed: ${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
