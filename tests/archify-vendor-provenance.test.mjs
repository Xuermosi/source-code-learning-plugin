import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// This tuple is intentionally independent from bundled-sources.json.  Updating
// the bundle requires reviewing a new upstream release, not merely making its
// mutable metadata self-consistent.
const expectedArchifyV320 = {
  repository: 'https://github.com/tt-a1i/archify',
  tag: 'v3.2.0',
  version: '3.2.0',
  commit: '208acba8d412335185b2056fedf54b3405df43fb',
  tree: '39069dd190f574064fe410aa3af1b6dfd98a522c',
};

test('pins the reviewed Archify v3.2.0 release to its peeled tag and subtree tree', () => {
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'bundled-sources.json'), 'utf8'));
  const archify = provenance.sources.find((source) => source.name === 'archify');

  assert.ok(archify, 'bundled provenance must name Archify');
  assert.deepEqual(
    {
      repository: archify.repository,
      tag: archify.tag,
      version: archify.version,
      commit: archify.commit,
      tree: archify.tree,
    },
    expectedArchifyV320,
  );
  assert.match(archify.archive_sha256, /^[0-9a-f]{64}$/);
  assert.equal(archify.archive_format, 'git-archive-tar');
  assert.equal(archify.directory, 'skills/archify');
});
