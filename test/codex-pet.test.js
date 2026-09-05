import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('the repository contains an installable Codex v2 custom pet', async () => {
  const manifest = JSON.parse(await readFile(new URL('../custom-pet/puppy/pet.json', import.meta.url), 'utf8'));
  const sprite = await stat(new URL('../custom-pet/puppy/spritesheet.webp', import.meta.url));

  assert.equal(manifest.id, 'puppy');
  assert.equal(manifest.spriteVersionNumber, 2);
  assert.equal(manifest.spritesheetPath, 'spritesheet.webp');
  assert.ok(sprite.size > 100_000);
});
