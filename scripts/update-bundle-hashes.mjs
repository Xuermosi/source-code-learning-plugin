// Run only after explicitly reviewing a vendored snapshot or integration edit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleFiles } from './bundle-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestFile = path.join(root, 'bundled-sources.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
for (const source of manifest.sources) {
  if (source.directory !== `skills/${source.name}`) throw new Error('Unexpected bundle directory');
  source.files = bundleFiles(path.join(root, source.directory));
}
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Recorded reviewed bundle SHA-256 values.');
