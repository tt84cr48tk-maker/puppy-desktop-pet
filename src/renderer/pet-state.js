export function createPetState({ random = Math.random, clock = Date.now } = {}) {
  let paused = false;
  let state = { name: 'idle', endsAt: clock() + 2500 };
  const actions = ['sleep', 'look', 'walk', 'jump', 'toy'];
  return {
    getState: () => state,
    isPaused: () => paused,
    setPaused(value) { paused = Boolean(value); },
    next() {
      if (!paused) {
        const now = clock();
        if (state.name === 'idle' || now >= state.endsAt) {
          state = { name: actions[Math.floor(random() * actions.length)], endsAt: now + 3000 };
        }
      }
      return state;
    },
    reactToClick(count) {
      if (!paused) state = { name: count >= 3 ? 'roll' : 'happy', endsAt: clock() + 1200 };
      return state;
    }
  };
}
