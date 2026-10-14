import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function bundleFiles(directory, prefix = '') {
  const result = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (['__pycache__', '.DS_Store', 'node_modules', '.git'].includes(entry.name) || /\.py[co]$/.test(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in distribution: ${relative}`);
    if (entry.isDirectory()) Object.assign(result, bundleFiles(file, relative));
    else if (entry.isFile()) result[relative] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    else throw new Error(`Unexpected file type: ${relative}`);
  }
  return result;
}
