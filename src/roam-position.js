export function computeRoamX({ currentX, delta, workAreaWidth, windowWidth }) {
  const maximumX = Math.max(0, workAreaWidth - windowWidth);
  return Math.min(
    Math.max(0, currentX + delta),
    maximumX
  );
}

export function createWalkPlan({ currentX, delta, workAreaWidth, windowWidth }) {
  const stepCount = 12;
  const durationMs = 1200;
  const targetX = computeRoamX({ currentX, delta, workAreaWidth, windowWidth });

  return Array.from({ length: stepCount }, (_step, index) => {
    const progress = (index + 1) / stepCount;
    return {
      x: Math.round(currentX + (targetX - currentX) * progress),
      at: Math.round(durationMs * progress)
    };
  });
}
