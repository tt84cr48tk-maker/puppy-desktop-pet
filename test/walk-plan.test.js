import test from 'node:test';
import assert from 'node:assert/strict';

test('createWalkPlan emits twelve closely spaced positions across a finite walk', async () => {
  const { createWalkPlan } = await import('../src/roam-position.js');

  assert.equal(typeof createWalkPlan, 'function', 'walking needs a pure planner');
  const plan = createWalkPlan({ currentX: 100, delta: 45, workAreaWidth: 320, windowWidth: 50 });
  assert.equal(plan.length, 12);
  assert.deepEqual(plan[0], { x: 104, at: 100 });
  assert.deepEqual(plan.at(-1), { x: 145, at: 1200 });
});

test('createWalkPlan clamps every closely spaced step at the native work-area edge', async () => {
  const { createWalkPlan } = await import('../src/roam-position.js');

  assert.equal(typeof createWalkPlan, 'function', 'walking needs a pure planner');
  const plan = createWalkPlan({ currentX: 255, delta: 60, workAreaWidth: 320, windowWidth: 50 });
  assert.equal(plan.length, 12);
  assert.deepEqual(plan[0], { x: 256, at: 100 });
  assert.deepEqual(plan.at(-1), { x: 270, at: 1200 });
});
