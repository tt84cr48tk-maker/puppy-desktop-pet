import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoamX } from '../src/roam-position.js';

test('computeRoamX clamps a leftward roam to the work area origin', () => {
  assert.equal(
    computeRoamX({ currentX: 12, delta: -40, workAreaWidth: 1920, windowWidth: 180 }),
    0
  );
});

test('computeRoamX clamps a rightward roam to the visible work area edge', () => {
  assert.equal(
    computeRoamX({ currentX: 1700, delta: 100, workAreaWidth: 1920, windowWidth: 180 }),
    1740
  );
});

test('computeRoamX preserves a small move that remains within work area bounds', () => {
  assert.equal(
    computeRoamX({ currentX: 700, delta: -35, workAreaWidth: 1920, windowWidth: 180 }),
    665
  );
});

test('computeRoamX keeps an oversized native window anchored at the work area origin', () => {
  assert.equal(
    computeRoamX({ currentX: 0, delta: 60, workAreaWidth: 180, windowWidth: 350 }),
    0
  );
});
