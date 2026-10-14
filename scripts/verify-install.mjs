// Requires a Codex binary with plugin and app-server support. Does not call a model.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const [source, binary = 'codex', suppliedCwd] = process.argv.slice(2);
if (!source) throw new Error('Usage: node scripts/verify-install.mjs <marketplace-root-or-github-repo> [codex-binary] [working-directory]');
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'source-learning-install-'));
const sourceRef = fs.existsSync(source) ? path.resolve(source) : source;
const cwd = suppliedCwd ? path.resolve(suppliedCwd) : path.join(testRoot, 'workspace');
if (!suppliedCwd) fs.mkdirSync(cwd);
const env = { ...process.env, CODEX_HOME: path.join(testRoot, 'codex-state') };
fs.mkdirSync(env.CODEX_HOME);
const run = (args) => execFileSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });

run(['plugin', 'marketplace', 'add', sourceRef]);
const install = JSON.parse(run(['plugin', 'add', 'source-code-learning-plugin@source-code-learning', '--json']));
fs.writeFileSync(path.join(testRoot, 'install.json'), JSON.stringify(install, null, 2));
const child = spawn(binary, ['app-server', '--stdio'], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (data) => { stderr += data; });
const pending = new Map();
createInterface({ input: child.stdout }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  clearTimeout(waiter.timer);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
let requestId = 0;
const request = (method, params) => new Promise((resolve, reject) => {
  const id = ++requestId;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out: ${stderr.slice(-1500)}`)); }, 30000);
  pending.set(id, { resolve, reject, timer });
  child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
});

try {
  await request('initialize', { clientInfo: { name: 'source-learning-verifier', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  child.stdin.write(`${JSON.stringify({ method: 'initialized' })}\n`);
  const response = await request('skills/list', { cwds: [cwd], forceReload: true });
  fs.writeFileSync(path.join(testRoot, 'skills.json'), JSON.stringify(response, null, 2));
  const skills = response.data.flatMap((entry) => entry.skills);
  const cacheRoot = fs.realpathSync(path.join(env.CODEX_HOME, 'plugins', 'cache', 'source-code-learning', 'source-code-learning-plugin'));
  const found = [];
  for (const name of ['source-code-learning-coach', 'archify']) {
    const entries = skills.filter((skill) => path.basename(path.dirname(skill.path)) === name);
    assert.equal(entries.length, 1, `Expected exactly one ${name}; found ${JSON.stringify(entries.map((s) => s.path))}`);
    const skill = entries[0];
    const relative = path.relative(cacheRoot, fs.realpathSync(skill.path));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Not from isolated plugin cache: ${skill.path}`);
    found.push({ name: skill.name, path: skill.path, enabled: skill.enabled });
    assert.notEqual(skill.enabled, false, `Skill disabled: ${name}`);
  }
  console.log(JSON.stringify({ status: 'passed', source, testRoot, installedSkillPaths: found }, null, 2));
} finally {
  child.stdin.end();
  child.kill('SIGTERM');
  for (const waiter of pending.values()) clearTimeout(waiter.timer);
}
