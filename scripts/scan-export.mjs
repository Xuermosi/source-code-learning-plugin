// Best-effort publication scan; it cannot prove the absence of all private material.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function scanExport(root) {
  const findings = [];
  const reviewedFindings = [];
  let files = 0;
  const patterns = [
    ['personal-absolute-path', /\/(?:Users|home)\/[A-Za-z0-9._-]+/],
    ['github-token', /\bgh[pousr]_[A-Za-z0-9]{24,}/],
    ['api-token', /\bsk-[A-Za-z0-9_-]{12,}/],
    ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['credential-assignment', /(?:password|api[_-]?key|secret)\s*[:=]\s*["'][^"']+["']/i]
  ];
  function walk(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === '__pycache__' || /\.py[co]$/.test(entry.name)) continue;
      const label = relative ? `${relative}/${entry.name}` : entry.name;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { findings.push({ file: label, kind: 'symlink' }); continue; }
      if (entry.isDirectory()) { walk(file, label); continue; }
      if (!entry.isFile()) { findings.push({ file: label, kind: 'unexpected-file-type' }); continue; }
      files++;
      if (/^\.env(?:\.|$)/.test(entry.name) || /\.(?:pem|p12|pfx|key)$/.test(entry.name)) findings.push({ file: label, kind: 'sensitive-file-type' });
      if (fs.statSync(file).size > 5 * 1024 * 1024) findings.push({ file: label, kind: 'unexpected-large-file' });
      const content = fs.readFileSync(file, 'utf8');
      for (const [kind, pattern] of patterns) if (pattern.test(content)) findings.push({ file: label, kind });
      // Require four valid octets, so SVG decimal coordinates are not treated as IPs.
      const octet = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])';
      const privateIp = new RegExp(`\\b(?:10\\.${octet}\\.${octet}\\.${octet}|192\\.168\\.${octet}\\.${octet}|172\\.(?:1[6-9]|2[0-9]|3[01])\\.${octet}\\.${octet})\\b`, 'g');
      for (const match of content.matchAll(privateIp)) {
        const pinnedTest = label === 'skills/archify/test/brand-marks.test.mjs'
          && match[0] === [192, 168, 1, 1].join('.')
          && createHash('sha256').update(content).digest('hex') === '85d04f02ee625bd498fb760db21f176ddf356b670aa6e4778e9f3c2fee8bbd86';
        (pinnedTest ? reviewedFindings : findings).push({ file: label, kind: pinnedTest ? 'reviewed-public-upstream-security-test-fixture' : 'private-ip' });
      }
    }
  }
  walk(root);
  return { files, findings, reviewedFindings };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const result = scanExport(root);
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.findings.length, 0, 'Resolve export findings before publication.');
}
