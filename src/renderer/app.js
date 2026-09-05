import { createPetState } from './pet-state.js';

const CLICK_WINDOW_MS = 550;
const DRAG_THRESHOLD_PX = 6;
const MIN_RANDOM_DELAY_MS = 2000;
const RANDOM_DELAY_RANGE_MS = 2000;
const ROAM_DISTANCE_PX = 60;
const WALK_FRAME_MS = 140;
const WALK_CYCLE_DURATION_MS = 1200;

export const FRAME_ASSETS = Object.freeze({
  idle: Object.freeze([
    'assets/normalized/idle/idle-1.png',
    'assets/normalized/idle/idle-2.png',
    'assets/normalized/idle/idle-3.png',
    'assets/normalized/idle/idle-4.png'
  ]),
  walk: Object.freeze([
    'assets/normalized/walk/walk-1.png',
    'assets/normalized/walk/walk-2.png',
    'assets/normalized/walk/walk-3.png',
    'assets/normalized/walk/walk-4.png'
  ]),
  actions: Object.freeze({
    come: 'assets/normalized/actions/action-1.png',
    sit: 'assets/normalized/actions/action-2.png',
    down: 'assets/normalized/actions/action-3.png',
    spin: 'assets/normalized/actions/action-4.png',
    shake: 'assets/normalized/actions/action-5.png',
    jump: 'assets/normalized/actions/action-6.png',
    rest: 'assets/normalized/actions/rest.png'
  })
});

export const COMMAND_STATES = Object.freeze({
  come: 'walk',
  sit: 'sit',
  down: 'down',
  spin: 'spin',
  shake: 'shake',
  jump: 'jump',
  'find-toy': 'find-toy',
  rest: 'rest'
});

function pointerPosition(event) {
  return {
    x: Number.isFinite(event.screenX) ? event.screenX : event.clientX,
    y: Number.isFinite(event.screenY) ? event.screenY : event.clientY
  };
}

export function initializePetApp({
  document = globalThis.document,
  window = globalThis.window,
  desktop = window?.petDesktop,
  pet = createPetState(),
  random = Math.random,
  now = Date.now,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout
} = {}) {
  const petElement = document?.querySelector('#pet');
  if (!petElement) return undefined;
  const commandMenu = document?.querySelector('#command-menu');
  const poseLayers = [
    document?.querySelector('#pose-layer-a'),
    document?.querySelector('#pose-layer-b')
  ].filter(Boolean);
  const poseImages = [
    document?.querySelector('#pose-image-a'),
    document?.querySelector('#pose-image-b')
  ].filter(Boolean);
  const preloadedImages = [];

  let timer;
  let walkFrameTimer;
  let walkFinishTimer;
  let commandTimer;
  let paused = false;
  let roamingEnabled = true;
  let soundEnabled = true;
  let pointerStart;
  let dragging = false;
  let clickTimes = [];
  let activeLayer = 0;
  let walkFrameIndex = 0;
  let commandBusy = false;
  let dismissMenuOnPointerUp = false;

  function preloadFrames() {
    if (typeof globalThis.Image !== 'function') return;
    const sources = [
      ...FRAME_ASSETS.idle,
      ...FRAME_ASSETS.walk,
      ...Object.values(FRAME_ASSETS.actions)
    ];
    for (const src of sources) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      preloadedImages.push(image);
    }
  }

  function contains(root, target) {
    return root === target || root?.contains?.(target) === true;
  }

  function setMenuOpen(open) {
    if (!commandMenu) return;
    commandMenu.hidden = !open;
    commandMenu.classList?.toggle('is-open', open);
  }

  function showFrame(src) {
    if (!src || poseImages.length === 0) return;
    if (poseImages.length === 1) {
      poseImages[0].src = src;
      return;
    }
    const nextLayer = (activeLayer + 1) % poseLayers.length;
    poseImages[nextLayer].src = src;
    poseLayers[nextLayer].classList?.toggle('is-active', true);
    poseLayers[activeLayer].classList?.toggle('is-active', false);
    activeLayer = nextLayer;
  }

  function clearWalkCycle() {
    petElement.classList?.toggle('walk-cycle', false);
    petElement.classList?.toggle('walk-reverse', false);
    if (walkFrameTimer !== undefined) clearTimeout(walkFrameTimer);
    if (walkFinishTimer !== undefined) clearTimeout(walkFinishTimer);
    walkFrameTimer = undefined;
    walkFinishTimer = undefined;
  }

  function clearCommandSequence() {
    if (commandTimer !== undefined) clearTimeout(commandTimer);
    commandTimer = undefined;
    commandBusy = false;
  }

  function scheduleWalkFrame() {
    walkFrameTimer = setTimeout(() => {
      walkFrameTimer = undefined;
      if (!petElement.classList?.contains('walk-cycle')) return;
      walkFrameIndex = (walkFrameIndex + 1) % FRAME_ASSETS.walk.length;
      showFrame(FRAME_ASSETS.walk[walkFrameIndex]);
      scheduleWalkFrame();
    }, WALK_FRAME_MS);
  }

  function startWalkCycle(onFinish, direction = 1) {
    clearWalkCycle();
    walkFrameIndex = 0;
    showFrame(FRAME_ASSETS.walk[walkFrameIndex]);
    petElement.classList?.toggle('walk-reverse', Number.isFinite(direction) && direction < 0);
    petElement.classList?.toggle('walk-cycle', true);
    scheduleWalkFrame();
    walkFinishTimer = setTimeout(() => {
      clearWalkCycle();
      if (onFinish) onFinish();
      else {
        document.body.dataset.state = 'idle';
        showFrame(FRAME_ASSETS.idle[0]);
      }
    }, WALK_CYCLE_DURATION_MS);
  }

  function idleFrameFor(name) {
    if (name === 'look') return FRAME_ASSETS.idle[Math.floor(random() * FRAME_ASSETS.idle.length)];
    return FRAME_ASSETS.idle[0];
  }

  function showStateFrame(name) {
    if (name === 'look' || name === 'idle') showFrame(idleFrameFor(name));
    else if (name === 'sit') showFrame(FRAME_ASSETS.actions.sit);
    else if (name === 'down' || name === 'sleep' || name === 'toy' || name === 'find-toy') {
      showFrame(FRAME_ASSETS.actions.down);
    } else if (name === 'rest') showFrame(FRAME_ASSETS.actions.rest);
    else if (name === 'spin' || name === 'roll') showFrame(FRAME_ASSETS.actions.spin);
    else if (name === 'shake') showFrame(FRAME_ASSETS.actions.shake);
    else if (name === 'jump' || name === 'happy') showFrame(FRAME_ASSETS.actions.jump);
    else if (name === 'come') showFrame(FRAME_ASSETS.actions.come);
  }

  function apply(next) {
    if (!next?.name) return;
    clearCommandSequence();
    document.body.dataset.state = next.name;
    if (next.name === 'walk') startWalkCycle(undefined, next.direction);
    else {
      clearWalkCycle();
      showStateFrame(next.name);
    }
  }

  function stopScheduling() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function scheduleNext() {
    stopScheduling();
    if (paused || commandBusy) return;
    const delay = MIN_RANDOM_DELAY_MS + random() * RANDOM_DELAY_RANGE_MS;
    timer = setTimeout(() => {
      timer = undefined;
      if (paused) return;
      const next = pet.next();
      if (next.name === 'walk' && roamingEnabled) {
        desktop?.roam(Math.round((random() * 2 - 1) * ROAM_DISTANCE_PX));
      } else {
        apply(next);
      }
      scheduleNext();
    }, delay);
  }

  function playFindToy() {
    commandBusy = true;
    clearWalkCycle();
    showFrame(FRAME_ASSETS.actions.down);
    if (commandTimer !== undefined) clearTimeout(commandTimer);
    commandTimer = setTimeout(() => {
      commandTimer = undefined;
      startWalkCycle(() => {
        showFrame(FRAME_ASSETS.actions.come);
        commandTimer = setTimeout(() => {
          commandTimer = undefined;
          showFrame(FRAME_ASSETS.actions.down);
          commandTimer = setTimeout(() => {
            commandTimer = undefined;
            commandBusy = false;
            apply({ name: 'idle' });
            scheduleNext();
          }, 900);
        }, 850);
      });
    }, 650);
  }

  function runCommand(command) {
    const state = COMMAND_STATES[command];
    if (!state) return;
    clearCommandSequence();
    if (command === 'come') {
      // Start the visual response immediately. Native roaming can be gated
      // after a manual drag, and its IPC notification is asynchronous.
      apply({ name: 'walk', direction: -1 });
      desktop?.roam(-ROAM_DISTANCE_PX);
    } else if (command === 'find-toy') {
      apply({ name: 'find-toy' });
      playFindToy();
    } else {
      apply({ name: state });
    }
    scheduleNext();
  }

  function recordClick() {
    const time = now();
    clickTimes = clickTimes.filter((previous) => time - previous <= CLICK_WINDOW_MS);
    clickTimes.push(time);
    apply(pet.reactToClick(clickTimes.length >= 3 ? 3 : 1));
    if (clickTimes.length >= 3) clickTimes = [];
    setMenuOpen(true);
    scheduleNext();
  }

  petElement.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    pointerStart = pointerPosition(event);
    dragging = false;
    petElement.setPointerCapture?.(event.pointerId);
    desktop?.dragStart();
  });

  petElement.addEventListener('pointermove', (event) => {
    if (!pointerStart) return;
    const position = pointerPosition(event);
    const delta = { x: position.x - pointerStart.x, y: position.y - pointerStart.y };
    if (Math.hypot(delta.x, delta.y) > DRAG_THRESHOLD_PX) dragging = true;
    if (dragging) {
      setMenuOpen(false);
      desktop?.dragMove(delta);
    }
  });

  petElement.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    petElement.releasePointerCapture?.(event.pointerId);
    desktop?.dragEnd();
    if (!dragging && !dismissMenuOnPointerUp) recordClick();
    pointerStart = undefined;
    dragging = false;
    dismissMenuOnPointerUp = false;
  });

  petElement.addEventListener('pointercancel', () => {
    if (!pointerStart) return;
    desktop?.dragEnd();
    pointerStart = undefined;
    dragging = false;
    dismissMenuOnPointerUp = false;
  });

  commandMenu?.addEventListener('click', (event) => {
    const command = event.target?.dataset?.command;
    if (!command) return;
    event.stopPropagation?.();
    setMenuOpen(false);
    runCommand(command);
  });

  document?.addEventListener?.('pointerdown', (event) => {
    if (!commandMenu || commandMenu.hidden) return;
    if (!contains(commandMenu, event?.target)) {
      setMenuOpen(false);
      dismissMenuOnPointerUp = true;
    }
  }, true);
  document?.addEventListener?.('pointerup', () => {
    dismissMenuOnPointerUp = false;
  });
  // Clicks outside the native shape do not reach this document. The window
  // blur event is the renderer-side signal that focus moved elsewhere, so
  // dismiss any open command menu there as well.
  if (window?.addEventListener) {
    window.addEventListener('blur', () => {
      dismissMenuOnPointerUp = false;
      setMenuOpen(false);
    });
  }

  petElement.addEventListener('animationend', (event) => {
    if (event.animationName === 'pup-walk-body') clearWalkCycle();
  });

  desktop?.onPaused((value) => {
    paused = Boolean(value);
    pet.setPaused(paused);
    if (paused) {
      stopScheduling();
      clearWalkCycle();
      clearCommandSequence();
    }
    else scheduleNext();
  });

  desktop?.onRoamingChanged((value) => {
    roamingEnabled = Boolean(value);
  });

  desktop?.onSoundChanged((value) => {
    soundEnabled = Boolean(value);
    document.body.dataset.soundEnabled = String(soundEnabled);
  });

  desktop?.onWalk((direction) => {
    if (petElement.classList?.contains('walk-cycle')) {
      petElement.classList?.toggle('walk-reverse', Number.isFinite(direction) && direction < 0);
    } else {
      apply({ name: 'walk', direction });
    }
  });

  preloadFrames();
  document.body.dataset.soundEnabled = String(soundEnabled);
  scheduleNext();

  return { apply, runCommand, scheduleNext, stopScheduling, setMenuOpen };
}

if (globalThis.document?.querySelector('#pet')) initializePetApp();
