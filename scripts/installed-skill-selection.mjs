import path from 'node:path';

const expectedDirectories = ['source-code-learning-coach', 'archify'];

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function selectPluginSkills(skills, cacheRoot) {
  return expectedDirectories.map((directory) => {
    const entries = skills.filter((skill) => (
      path.basename(path.dirname(skill.path)) === directory
      && isInside(skill.path, cacheRoot)
    ));
    if (entries.length !== 1) {
      throw new Error(`Expected exactly one bundled ${directory} under ${cacheRoot}; found ${JSON.stringify(entries.map((skill) => skill.path))}`);
    }
    return entries[0];
  });
}
