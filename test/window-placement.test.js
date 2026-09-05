import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindowPlacementController } from '../src/window-placement.js';

function windowWithBounds(bounds) {
  const positions = [];
  return {
    getBounds: () => ({ ...bounds }),
    setPosition: (x, y) => positions.push({ x, y }),
    positions
  };
}

const workArea = { x: 1920, y: 0, width: 1920, height: 1020 };

test('bottom-right placement uses actual native bounds rather than the requested CSS size', () => {
  const window = windowWithBounds({ x: 3548, y: 695, width: 350, height: 325 });
  const controller = createWindowPlacementController({ getWorkArea: () => workArea });

  controller.reset(window);

  assert.deepEqual(window.positions, [{ x: 3490, y: 695 }]);
});

test('roaming stays gated through a drag and is restored only by reset', () => {
  const window = windowWithBounds({ x: 3490, y: 695, width: 350, height: 325 });
  const roamingChanges = [];
  const controller = createWindowPlacementController({
    getWorkArea: () => workArea,
    onRoamingChanged: (enabled) => roamingChanges.push(enabled)
  });

  controller.beginDrag();
  assert.equal(controller.roam(window, -60), false);

  controller.disableRoaming();
  controller.endDrag();
  assert.equal(controller.roam(window, -60), false);

  controller.reset(window);
  assert.equal(controller.roam(window, -60), true);
  assert.deepEqual(window.positions, [
    { x: 3490, y: 695 },
    { x: 3430, y: 695 }
  ]);
  assert.deepEqual(roamingChanges, [false, true]);
});

test('a roaming plan follows twelve closely spaced native steps until a drag starts', () => {
  const window = windowWithBounds({ x: 2175, y: 695, width: 150, height: 150 });
  const controller = createWindowPlacementController({ getWorkArea: () => workArea });

  assert.equal(typeof controller.planRoam, 'function', 'the placement controller must expose a multi-step plan');
  const plan = controller.planRoam(window, 60);
  assert.equal(plan.length, 12);
  assert.deepEqual(plan[0], { x: 2180, y: 870, at: 100 });
  assert.deepEqual(plan.at(-1), { x: 2235, y: 870, at: 1200 });

  assert.equal(controller.moveRoamStep(window, plan[0]), true);
  controller.beginDrag();
  assert.equal(controller.moveRoamStep(window, plan[1]), false);
  assert.deepEqual(window.positions, [{ x: 2180, y: 870 }]);
});

test('the renderer-sized shape keeps roaming bounded even if the transparent native shell grows', () => {
  const window = windowWithBounds({ x: 2175, y: 695, width: 620, height: 590 });
  const controller = createWindowPlacementController({ getWorkArea: () => workArea, windowSize: 150 });

  const plan = controller.planRoam(window, 60);

  assert.deepEqual(plan[0], { x: 2180, y: 870, at: 100 });
  assert.deepEqual(plan.at(-1), { x: 2235, y: 870, at: 1200 });
});
