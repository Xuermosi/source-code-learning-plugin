import assert from 'node:assert/strict';
import test from 'node:test';
import { selectPluginSkills } from '../scripts/installed-skill-selection.mjs';

test('selects the enabled bundled skills even when user skills share their basenames', () => {
  const cacheRoot = '/isolated/plugins/cache/source-code-learning/source-code-learning-plugin/0.3.0';
  const skills = [
    {
      name: 'source-code-learning-coach',
      path: '/external-skill-root/source-code-learning-coach/SKILL.md',
      enabled: true,
    },
    {
      name: 'source-code-learning-plugin:source-code-learning-coach',
      path: `${cacheRoot}/skills/source-code-learning-coach/SKILL.md`,
      enabled: true,
    },
    {
      name: 'source-code-learning-plugin:archify',
      path: `${cacheRoot}/skills/archify/SKILL.md`,
      enabled: true,
    },
  ];

  assert.deepEqual(
    selectPluginSkills(skills, cacheRoot).map((skill) => skill.name),
    ['source-code-learning-plugin:source-code-learning-coach', 'source-code-learning-plugin:archify'],
  );
});
