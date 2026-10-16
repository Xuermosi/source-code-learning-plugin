import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleFiles } from './bundle-files.mjs';
import { scanExport } from './scan-export.mjs';

const scriptRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv[2] || scriptRoot);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const packageRelativeResolver = "process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('source-code-learning-plugin/package.json')), 'skills')";
const expectedDshPatch = `- insert:\n    - id: source-code-learning-plugin-skill-filesystem\n      name: '@deepseek-ai/dsh-skill-filesystem'\n      inject: [skills]\n      config:\n        providerName: source-code-learning-plugin\n        includeDefaultRoots: false\n        bundledSkillDir: !!js ${packageRelativeResolver}\n        watch: false\n`;
const packageFields = ['dsh', 'files', 'name', 'type', 'version'];
const packageFiles = [
  'dsh/**',
  'skills/**',
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
];

function assertDshPatch() {
  const patch = fs.readFileSync(path.join(root, 'dsh/cordis.patch.yml'), 'utf8');
  assert.equal(
    patch,
    expectedDshPatch,
    'DSH patch must be exactly one insert operation containing one isolated rank-600 bundled Skill provider row.',
  );
}

function assertPackedFiles() {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' }));
  assert.equal(packed.length, 1, 'npm pack must describe one package.');
  const files = packed[0].files.map(({ path: member }) => `package/${member}`).sort();
  const allowed = (member) => (
    member === 'package/package.json'
    || member === 'package/dsh/cordis.patch.yml'
    || member === 'package/README.md'
    || member === 'package/README.zh-CN.md'
    || member === 'package/LICENSE'
    || member === 'package/THIRD_PARTY_NOTICES.md'
    || member.startsWith('package/skills/')
  );
  const unexpected = files.filter((member) => !allowed(member));
  assert.deepEqual(unexpected, [], `Package tarball contains unapproved member(s): ${unexpected.join(', ')}`);
  return files.length;
}

assert.ok(fs.statSync(root).isDirectory(), `Package root is not a directory: ${root}`);
const packageJson = read('package.json');
assert.deepEqual(Object.keys(packageJson).sort(), packageFields, 'package.json must use the static content-only manifest allowlist.');
assert.equal(packageJson.name, 'source-code-learning-plugin');
assert.equal(packageJson.type, 'module');
assert.deepEqual(packageJson.files, packageFiles, 'package.json files must be the explicit publication allowlist.');
assert.deepEqual(packageJson.dsh, { bundle: { patch: './dsh/cordis.patch.yml' } }, 'package.json must declare the DSH bundle patch.');

const portable = read('plugin.json');
const fallback = read('.codex-plugin/plugin.json');
const marketplace = read('.agents/plugins/marketplace.json');
const provenance = read('bundled-sources.json');

assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
for (const key of ['name', 'version', 'description', 'author', 'repository', 'homepage', 'license', 'keywords']) {
  assert.deepEqual(portable[key], fallback[key], `Inconsistent manifest field: ${key}`);
}
assert.equal(portable.name, packageJson.name);
assert.equal(portable.version, packageJson.version, 'Root package version must match plugin.json.');
assert.equal(fallback.version, packageJson.version, 'Root package version must match .codex-plugin/plugin.json.');
assert.equal(portable.name, 'source-code-learning-plugin');
assert.match(portable.version, /^\d+\.\d+\.\d+$/);
assert.equal(portable.license, 'MIT');
assert.deepEqual(portable.extensions['com.openai'].interface, fallback.interface);
assert.equal(fallback.skills, './skills/');
assert.equal(marketplace.name, 'source-code-learning');
assert.equal(marketplace.plugins.length, 1);
assert.equal(marketplace.plugins[0].name, portable.name);
assert.deepEqual(marketplace.plugins[0].source, { source: 'local', path: './' });
assert.equal(marketplace.plugins[0].policy.installation, 'AVAILABLE');
assert.equal(provenance.pluginVersion, packageJson.version, 'Root package version must match bundle provenance.');
assert.equal(provenance.schemaVersion, 1);
assert.deepEqual(provenance.sources.map((s) => s.name).sort(), ['archify', 'source-code-learning-coach']);
assertDshPatch();

let total = 0;
for (const source of provenance.sources) {
  assert.match(source.commit, /^[0-9a-f]{40}$/);
  assert.equal(source.directory, `skills/${source.name}`);
  const actual = bundleFiles(path.join(root, source.directory));
  assert.ok(Object.keys(source.files).length > 0, `Unrecorded bundle: ${source.name}`);
  assert.deepEqual(actual, source.files, `Changed bundle bytes: ${source.name}`);
  total += Object.keys(actual).length;
  const skill = fs.readFileSync(path.join(root, source.directory, 'SKILL.md'), 'utf8');
  assert.match(skill, new RegExp(`^---\\nname: ${source.name}\\n`));
}
const release = read('skills/archify/skill-release.json');
assert.equal(release.version, provenance.sources.find((s) => s.name === 'archify').version);

for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'skills/archify/LICENSE', 'skills/archify/THIRD_PARTY_NOTICES.md', 'skills/archify/assets/JetBrainsMono-OFL.txt', 'skills/source-code-learning-coach/LICENSE']) {
  assert.ok(fs.statSync(path.join(root, file)).size > 0, `Missing license: ${file}`);
}
for (const file of ['hooks/hooks.json', '.mcp.json', 'mcp.json', '.app.json']) {
  assert.ok(!fs.existsSync(path.join(root, file)), `Unexpected executable capability: ${file}`);
}
for (const file of ['README.md', 'README.zh-CN.md']) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
    if (!/^[a-z]+:/.test(match[1])) assert.ok(fs.existsSync(path.resolve(root, match[1])), `Broken link: ${file} → ${match[1]}`);
  }
}
const packedFiles = assertPackedFiles();
const scan = scanExport(root);
assert.deepEqual(scan.findings, [], 'Resolve export findings before publication.');
console.log(`Package checks passed: manifests and DSH bundle agree, ${total} bundled file hashes match, ${packedFiles} tarball files are allowlisted, licenses and README links exist; ${scan.files} exported files scanned without findings.`);
