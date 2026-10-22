// Deterministic integration fixture: consent is explicitly granted by this test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { updateReasonFromFinalizeReceipt } from './finalizer-update-receipt.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installedRoot = fs.realpathSync(process.argv[2] || packageRoot);
const chrome = process.argv[3];
const testRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'source-learning-flow-')));
const repo = path.join(testRoot, 'study-fixture');
fs.mkdirSync(repo);
fs.copyFileSync(path.join(packageRoot, 'tests/fixtures/request.py'), path.join(repo, 'request.py'));
const run = (binary, args, options = {}) => execFileSync(binary, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024, ...options });
for (const args of [['init', '-b', 'main'], ['config', 'user.name', 'Plugin Test'], ['config', 'user.email', 'plugin-test@example.invalid'], ['add', 'request.py'], ['commit', '-m', 'Add study fixture'], ['remote', 'add', 'origin', 'https://github.com/Xuermosi/source-code-learning-plugin.git']]) run('git', args, { cwd: repo });
assert.equal(run('python3', ['request.py'], { cwd: repo }).trim(), 'math-agent');
const revision = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).trim();
const manager = path.join(installedRoot, 'skills/source-code-learning-coach/scripts/manage_learning_workspace.py');
const manage = (args) => run('python3', [manager, ...args], { cwd: repo }).trim();
const learningRoot = manage(['init', '--repo', repo, '--roadmap', path.join(packageRoot, 'tests/fixtures/roadmap.json')]);
manage(['start-day', '--learning-root', learningRoot, '--day', '1']);
const state = JSON.parse(fs.readFileSync(path.join(learningRoot, '学习状态.json'), 'utf8'));
const stage = path.join(learningRoot, state.current.stage.path);
const owner = manage(['add-source', '--stage', stage, '--source', path.join(repo, 'request.py'), '--label', 'request.py']);
const outputDir = path.join(owner, '产物', 'sequence-request-route');
fs.mkdirSync(outputDir);
const candidate = JSON.parse(fs.readFileSync(path.join(packageRoot, 'tests/fixtures/request.sequence.json'), 'utf8'));
candidate.meta.repository = { url: 'https://github.com/Xuermosi/source-code-learning-plugin.git', revision, link_mode: 'local-only' };
fs.writeFileSync(path.join(outputDir, 'candidate.json'), JSON.stringify(candidate, null, 2));
const env = { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1', ...(chrome ? { ARCHIFY_CHROME: chrome } : {}) };
const renderer = path.join(installedRoot, 'skills/archify/bin/archify.mjs');
const output = path.join(outputDir, 'request-route.html');
const finalizeArgs = [renderer, 'finalize', 'sequence', 'candidate.json', 'request-route.html', '--repo-root', repo, '--quality', 'showcase', '--json'];
let receipt = JSON.parse(run(process.execPath, finalizeArgs, { cwd: outputDir, env }));
if (receipt.layoutReviewRecommendation?.action === 'inspect-sequence-width' && !candidate.meta.column_fit) {
  // Upstream's bounded review changes only column fit and preserves prior evidence.
  candidate.meta.column_fit = 'spread';
  fs.writeFileSync(path.join(outputDir, 'candidate.json'), JSON.stringify(candidate, null, 2));
  try {
    receipt = JSON.parse(run(process.execPath, [...finalizeArgs, '--out-dir', 'width-review'], { cwd: outputDir, env }));
  } catch {
    delete candidate.meta.column_fit;
    fs.writeFileSync(path.join(outputDir, 'candidate.json'), JSON.stringify(candidate, null, 2));
    receipt = JSON.parse(run(process.execPath, [...finalizeArgs, '--out-dir', 'width-restore'], { cwd: outputDir, env }));
  }
}
assert.equal(receipt.ok, true);
assert.equal(receipt.gates['browser-check'], 'pass');
assert.equal(
  updateReasonFromFinalizeReceipt(receipt, (file) => JSON.parse(fs.readFileSync(file, 'utf8'))),
  'disabled',
);
fs.writeFileSync(path.join(testRoot, 'finalize-stdout.json'), JSON.stringify(receipt, null, 2));
manage(['register-artifact', '--learning-root', learningRoot, '--owner-kind', 'source', '--owner-dir', owner, '--artifact', output]);
const before = JSON.parse(fs.readFileSync(path.join(learningRoot, '学习状态.json'), 'utf8'));
assert.equal(before.artifacts.length, 1);
assert.ok(fs.readFileSync(path.join(owner, '源码导读.md'), 'utf8').includes('request-route.html'));
manage(['complete-checkpoint', '--learning-root', learningRoot, '--checkpoint', 'request-route']);
const after = JSON.parse(fs.readFileSync(path.join(learningRoot, '学习状态.json'), 'utf8'));
assert.equal(after.current.progress, 100);
assert.equal(after.artifacts.length, 1);
manage(['sync-state', '--learning-root', learningRoot]);
console.log(JSON.stringify({ status: 'passed', consent: 'explicitly-granted-test-fixture', installedRoot, renderer, testRoot, output, learningRoot, artifacts: after.artifacts.length, progress: after.current.progress, finalizer: receipt }, null, 2));
