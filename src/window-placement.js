import { createWalkPlan, computeRoamX } from './roam-position.js';

function bottomPosition(workArea, bounds, relativeX) {
  const maxX = Math.max(0, workArea.width - bounds.width);
  const maxY = Math.max(0, workArea.height - bounds.height);
  return {
    x: workArea.x + Math.min(Math.max(0, relativeX), maxX),
    y: workArea.y + maxY
  };
}

export function createWindowPlacementController({ getWorkArea, onRoamingChanged = () => {}, windowSize } = {}) {
  let dragging = false;
  let manuallyDragged = false;

  function getPlacementBounds(window) {
    const bounds = window.getBounds();
    if (!Number.isFinite(windowSize)) return bounds;
    return { ...bounds, width: windowSize, height: windowSize };
  }

  function placeAtBottomRight(window) {
    const bounds = getPlacementBounds(window);
    const { x, y } = bottomPosition(getWorkArea(), bounds, Number.POSITIVE_INFINITY);
    window.setPosition(x, y);
  }

  return {
    beginDrag() {
      dragging = true;
    },
    endDrag() {
      dragging = false;
    },
    disableRoaming() {
      if (manuallyDragged) return;
      manuallyDragged = true;
      onRoamingChanged(false);
    },
    placeAtBottomRight,
    reset(window) {
      manuallyDragged = false;
      dragging = false;
      placeAtBottomRight(window);
      onRoamingChanged(true);
    },
    planRoam(window, delta) {
      if (dragging || manuallyDragged || !Number.isFinite(delta)) return undefined;
      const bounds = getPlacementBounds(window);
      const workArea = getWorkArea();
      const steps = createWalkPlan({
        currentX: bounds.x - workArea.x,
        delta: Math.round(delta),
        workAreaWidth: workArea.width,
        windowWidth: bounds.width
      });
      const { y } = bottomPosition(workArea, bounds, 0);
      return steps.map((step) => ({ x: workArea.x + step.x, y, at: step.at }));
    },
    moveRoamStep(window, step) {
      if (dragging || manuallyDragged || !step) return false;
      window.setPosition(step.x, step.y);
      return true;
    },
    roam(window, delta) {
      if (dragging || manuallyDragged || !Number.isFinite(delta)) return false;
      const bounds = getPlacementBounds(window);
      const workArea = getWorkArea();
      const relativeX = computeRoamX({
        currentX: bounds.x - workArea.x,
        delta: Math.round(delta),
        workAreaWidth: workArea.width,
        windowWidth: bounds.width
      });
      const { x, y } = bottomPosition(workArea, bounds, relativeX);
      window.setPosition(x, y);
      return true;
    }
  };
}
