import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package metadata defines a Linux deb build', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts['dist:dir'], 'electron-builder --dir --linux');
  assert.equal(packageJson.scripts.dist, 'npm run dist:dir && sh tools/build-deb.sh');
  assert.equal(packageJson.build.linux.target[0].target, 'deb');
  assert.equal(packageJson.build.linux.category, 'Utility');
});
