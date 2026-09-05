import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FRAME_ASSETS } from '../src/renderer/app.js';

const rendererRoot = new URL('../src/renderer/', import.meta.url);

function allAssetPaths() {
  return [
    ...FRAME_ASSETS.idle,
    ...FRAME_ASSETS.walk,
    ...Object.values(FRAME_ASSETS.actions)
  ];
}

test('all runtime pose assets use one 150x150 canvas', async () => {
  for (const assetPath of allAssetPaths()) {
    assert.match(assetPath, /^assets\/normalized\//, `${assetPath} must use the normalized asset set`);
    const data = await readFile(new URL(assetPath, rendererRoot));
    assert.deepEqual(
      { width: data.readUInt32BE(16), height: data.readUInt32BE(20) },
      { width: 150, height: 150 },
      `${assetPath} must be a 150x150 PNG`
    );
  }
});

test('the wide down, handshake, and rest poses use the same normalized asset pipeline', () => {
  for (const name of ['down', 'shake', 'rest']) {
    assert.match(FRAME_ASSETS.actions[name], /^assets\/normalized\//);
  }
});
