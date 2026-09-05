import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { petApi } = require('../src/preload.cjs');

test('preload API exposes only pet window controls', () => {
  assert.deepEqual(Object.keys(petApi).sort(), [
    'dragEnd', 'dragMove', 'dragStart', 'onPaused', 'onRoamingChanged', 'onSoundChanged', 'onWalk', 'resetPosition', 'roam'
  ].sort());
});
