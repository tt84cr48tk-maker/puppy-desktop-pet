import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetState } from '../src/renderer/pet-state.js';

test('chooses a calm or playful state after idle', () => {
  const pet = createPetState({ random: () => 0, clock: () => 1000 });
  assert.equal(pet.next().name, 'sleep');
});

test('random state waits for its cooldown before advancing', () => {
  let now = 1000;
  let randomCalls = 0;
  const pet = createPetState({
    random: () => {
      randomCalls += 1;
      return randomCalls === 1 ? 0 : 0.2;
    },
    clock: () => now
  });

  const first = pet.next();
  now = 3999;
  assert.equal(pet.next(), first);
  assert.equal(randomCalls, 1);

  now = 4000;
  assert.equal(pet.next().name, 'look');
  assert.equal(randomCalls, 2);
});

test('click reactions override random behavior', () => {
  const pet = createPetState({ random: () => 0.9, clock: () => 1000 });
  assert.equal(pet.reactToClick(1).name, 'happy');
  assert.equal(pet.reactToClick(3).name, 'roll');
});

test('paused pet does not advance state', () => {
  const pet = createPetState({ random: () => 0, clock: () => 1000 });
  pet.setPaused(true);
  assert.equal(pet.next().name, 'idle');
});
