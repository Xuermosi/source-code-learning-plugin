import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleFiles } from './bundle-files.mjs';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const portable = read('plugin.json');
const fallback = read('.codex-plugin/plugin.json');
const marketplace = read('.agents/plugins/marketplace.json');
const provenance = read('bundled-sources.json');

assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
for (const key of ['name', 'version', 'description', 'author', 'repository', 'homepage', 'license', 'keywords']) {
  assert.deepEqual(portable[key], fallback[key], `Inconsistent manifest field: ${key}`);
}
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
assert.equal(provenance.pluginVersion, portable.version);
assert.equal(provenance.schemaVersion, 1);
assert.deepEqual(provenance.sources.map((s) => s.name).sort(), ['archify', 'source-code-learning-coach']);

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
console.log(`Package checks passed: manifests agree, marketplace resolves locally, ${total} bundled file hashes match, licenses and README links exist.`);
