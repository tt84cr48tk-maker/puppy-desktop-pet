import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FRAME_ASSETS, initializePetApp } from '../src/renderer/app.js';

function eventTarget({ dataset = {} } = {}) {
  const listeners = new Map();
  const classes = new Set();
  return {
    dataset,
    hidden: true,
    classList: {
      contains(name) { return classes.has(name); },
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      }
    },
    contains(target) {
      return target === this;
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatch(name, event) {
      listeners.get(name)?.(event);
    }
  };
}

function setup({ random = () => 0.5, next = () => ({ name: 'look' }), emitWalkOnRoam = false } = {}) {
  const petElement = eventTarget();
  const commandMenu = eventTarget();
  const poseLayerA = eventTarget();
  const poseLayerB = eventTarget();
  const poseImageA = { src: 'assets/idle/idle-1.png' };
  const poseImageB = { src: 'assets/idle/idle-1.png' };
  const viewport = eventTarget();
  const body = { dataset: { state: 'idle' } };
  const elements = {
    '#pet': petElement,
    '#command-menu': commandMenu,
    '#pose-layer-a': poseLayerA,
    '#pose-layer-b': poseLayerB,
    '#pose-image-a': poseImageA,
    '#pose-image-b': poseImageB
  };
  const documentListeners = new Map();
  const document = {
    body,
    querySelector: (selector) => elements[selector] ?? null,
    addEventListener(name, listener) {
      documentListeners.set(name, listener);
    },
    dispatch(name, event) {
      documentListeners.get(name)?.(event);
    }
  };
  const timeouts = new Map();
  const cleared = [];
  let nextTimer = 1;
  const calls = { dragStart: 0, dragMove: [], dragEnd: 0, reactions: [], paused: [], resets: 0, roams: [], next: [] };
  let pausedListener;
  let roamingListener;
  let soundListener;
  let walkListener;
  const desktop = {
    dragStart: () => { calls.dragStart += 1; },
    dragMove: (delta) => { calls.dragMove.push(delta); },
    dragEnd: () => { calls.dragEnd += 1; },
    resetPosition: () => { calls.resets += 1; },
    roam: (delta) => {
      calls.roams.push(delta);
      if (emitWalkOnRoam) walkListener?.(Math.sign(delta));
    },
    onPaused: (listener) => { pausedListener = listener; },
    onRoamingChanged: (listener) => { roamingListener = listener; },
    onSoundChanged: (listener) => { soundListener = listener; },
    onWalk: (listener) => { walkListener = listener; }
  };
  const pet = {
    next: () => {
      const state = next();
      calls.next.push(state);
      return state;
    },
    reactToClick: (count) => {
      calls.reactions.push(count);
      return { name: count >= 3 ? 'roll' : 'happy' };
    },
    setPaused: (value) => { calls.paused.push(value); }
  };
  const app = initializePetApp({
    document,
    window: viewport,
    desktop,
    pet,
    random,
    setTimeout: (callback, delay) => {
      const id = nextTimer++;
      timeouts.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id) => { cleared.push(id); timeouts.delete(id); }
  });
  return { app, body, calls, cleared, desktop, document, window: viewport, petElement, commandMenu, poseImageA, poseImageB, paused: (value) => pausedListener(value), roaming: (value) => roamingListener?.(value), sound: (value) => soundListener(value), walk: (direction) => walkListener?.(direction), timeouts };
}

function pointer(x, y) {
  return { clientX: x, clientY: y, preventDefault() {} };
}

function screenPointer(clientX, clientY, screenX, screenY) {
  return { clientX, clientY, screenX, screenY, preventDefault() {} };
}

test('the pet control starts with the approved idle design raster', async () => {
  const markup = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');

  assert.match(
    markup,
    /<img\b[^>]*\bid="pose-image-a"[^>]*\bsrc="assets\/normalized\/idle\/idle-1\.png"[^>]*\balt="一只坐着的白色卷毛小狗"/
  );
});

test('the walking and action designs are raster assets, including the bunny in the image', async () => {
  const markup = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');

  assert.match(markup, /pose-image-b/);
  assert.match(await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8'), /assets\/normalized\/walk\/walk-1\.png/);
  assert.match(await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8'), /assets\/normalized\/actions\/action-3\.png/);
});

test('the renderer is wired to the design pose layers and command menu', async () => {
  const markup = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');

  assert.match(markup, /id="pose-image-a"/);
  assert.match(markup, /id="pose-image-b"/);
  assert.match(markup, /id="command-menu"/);
  for (const label of ['来我这', '坐下', '趴下', '转圈', '握手', '跳一跳', '去找玩具', '休息']) {
    assert.match(markup, new RegExp(`data-command="[^"]+"[^>]*>${label}<`));
  }
  assert.match(markup, /assets\/normalized\/idle\/idle-1\.png/);
  assert.doesNotMatch(markup, /id="walk-tail"/);
});

test('the renderer uses raster walk frames instead of drawing paws or a tail in CSS', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.pose-layer\s*\{/);
  assert.match(styles, /\.pose-layer\.is-active\s*\{/);
  assert.match(styles, /#pet\.walk-cycle\s+\.pose-layer/);
  assert.doesNotMatch(styles, /#walk-tail/);
  assert.doesNotMatch(styles, /#pet\.walk-cycle::before/);
  assert.doesNotMatch(styles, /#pet\.walk-cycle::after/);
});

test('the walk direction can mirror the approved side-profile raster', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');

  assert.match(styles, /#pet\.walk-reverse\s+\.pose-layer\s+img\s*\{[^}]*scaleX\(-1\)/);
  assert.match(app, /onWalk\(\(direction\)/);
});

test('the idle rotation uses the four front/side/standing poses and omits the rear pose', () => {
  assert.deepEqual(FRAME_ASSETS.idle, [
    'assets/normalized/idle/idle-1.png',
    'assets/normalized/idle/idle-2.png',
    'assets/normalized/idle/idle-3.png',
    'assets/normalized/idle/idle-4.png'
  ]);
});

test('walk and tail details come from the approved walk raster', async () => {
  const markup = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');

  assert.match(markup, /id="pose-layer-a"/);
  assert.match(styles, /\.pose-layer\.is-active\s*\{[^}]*opacity:\s*1;/);
  assert.doesNotMatch(styles, /#walk-tail/);
});

test('the compact renderer stage keeps a 150px pet target', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /html,\s*\nbody,\s*\n#stage\s*\{[^}]*width:\s*150px;[^}]*height:\s*150px;/);
  assert.match(styles, /#pet\s*\{[^}]*width:\s*150px;[^}]*height:\s*150px;/);
  assert.match(styles, /\.pose-layer\s*\{[^}]*inset:\s*7px;/);
  assert.match(styles, /\.pose-layer\s+img\s*\{[^}]*object-fit:\s*contain;/);
  assert.match(styles, /\.pose-layer\s*\{[^}]*overflow:\s*hidden;/);
  assert.match(styles, /\.pose-layer\s+img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/);
  assert.match(styles, /#stage\s*\{[^}]*overflow:\s*hidden;/);
  assert.match(styles, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.001\)/);
});

test('all raster poses are preloaded before a walk can crossfade', async () => {
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');

  assert.match(app, /preloadFrames/);
  assert.match(app, /new Image/);
});

test('the native pet window is capped to the compact content size', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(main, /maxWidth:\s*WINDOW_SIZE/);
  assert.match(main, /maxHeight:\s*WINDOW_SIZE/);
  assert.match(main, /setContentSize\(WINDOW_SIZE, WINDOW_SIZE(?:,\s*false)?\)/);
  assert.match(main, /setShape\?\.\(\[\{\s*x:\s*0,\s*y:\s*0,\s*width:\s*WINDOW_SIZE,\s*height:\s*WINDOW_SIZE/);
  assert.match(main, /lockPetWindow\(window\)/);
});

test('the command panel keeps its bounds reserved so opening it cannot grow the hitbox', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');

  assert.match(styles, /\.command-menu\[hidden\]\s*\{\s*display:\s*grid;/);
  assert.match(styles, /\.command-menu\.is-open\s*\{[^}]*pointer-events:\s*auto;/);
  assert.match(app, /addEventListener\('blur'/);
});

test('the explicit walk cycle advances through four raster frames', async () => {
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');

  assert.match(app, /FRAME_ASSETS\s*=\s*Object\.freeze/);
  assert.match(app, /walkFrameIndex\s*=\s*\(walkFrameIndex\s*\+\s*1\)\s*%\s*FRAME_ASSETS\.walk\.length/);
  assert.match(app, /WALK_FRAME_MS\s*=\s*140/);
  assert.match(styles, /#pet\.walk-cycle\s+\.pose-layer\s*\{[^}]*transition-duration:\s*140ms/);
  assert.doesNotMatch(styles, /#pet\.walk-cycle::before/);
  assert.doesNotMatch(styles, /#pet\.walk-cycle::after/);
});

test('the bunny-in-mouth and bunny-on-floor moments are supplied by design action images', async () => {
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');

  assert.match(app, /actions:\s*Object\.freeze/);
  assert.match(app, /down:\s*'assets\/normalized\/actions\/action-3\.png'/);
  assert.doesNotMatch(app, /clip-path/);
});

test('the rest command has its own sleepy design raster instead of reusing down', async () => {
  const app = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');

  assert.match(app, /rest:\s*'assets\/normalized\/actions\/rest\.png'/);
  assert.match(app, /name === 'rest'[^\n]*FRAME_ASSETS\.actions\.rest/);
  assert.doesNotMatch(app, /name === 'down' \|\| name === 'sleep' \|\| name === 'rest'/);
});

test('down and handshake rasters have side padding so edge details are not clipped', async () => {
  const readPngWidth = async (relativePath) => {
    const data = await readFile(new URL(relativePath, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    return data.readUInt32BE(16);
  };

  assert.ok(await readPngWidth('../src/renderer/assets/actions/action-3.png') >= 434);
  assert.ok(await readPngWidth('../src/renderer/assets/actions/action-5.png') >= 434);
});

test('a pet click applies the happy state', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));

  assert.equal(fixture.body.dataset.state, 'happy');
  assert.deepEqual(fixture.calls.reactions, [1]);
});

test('a pet click opens the pink command menu', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));

  assert.equal(fixture.commandMenu.hidden, false);
});

test('clicking outside the command menu closes it without triggering a command', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));
  assert.equal(fixture.commandMenu.hidden, false);

  fixture.document.dispatch('pointerdown', { target: fixture.document.body });

  assert.equal(fixture.commandMenu.hidden, true);
  assert.equal(fixture.body.dataset.state, 'happy');
});

test('clicking blank space inside the pet window also dismisses the command menu', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));
  assert.equal(fixture.commandMenu.hidden, false);

  fixture.document.dispatch('pointerdown', { target: fixture.petElement });

  assert.equal(fixture.commandMenu.hidden, true);
});

test('the command menu closes when the transparent pet window loses focus', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));
  assert.equal(fixture.commandMenu.hidden, false);

  fixture.window.dispatch('blur', {});

  assert.equal(fixture.commandMenu.hidden, true);
});

test('selecting a command closes the menu and applies its design state', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));

  fixture.commandMenu.dispatch('click', {
    target: { dataset: { command: 'sit' } },
    stopPropagation() {}
  });

  assert.equal(fixture.commandMenu.hidden, true);
  assert.equal(fixture.body.dataset.state, 'sit');
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/actions/action-2.png') || fixture.poseImageB.src.includes('assets/normalized/actions/action-2.png'), true);
});

test('the find-toy command starts with the bunny-on-floor search pose before walking', () => {
  const fixture = setup();
  fixture.app.runCommand('find-toy');

  assert.equal(fixture.body.dataset.state, 'find-toy');
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/actions/action-3.png') || fixture.poseImageB.src.includes('assets/normalized/actions/action-3.png'), true);
  const searchTimer = [...fixture.timeouts.values()].find(({ delay }) => delay === 650);
  assert.ok(searchTimer, 'find-toy must show the search pose before walking');
  searchTimer.callback();
  assert.equal(fixture.petElement.classList.contains('walk-cycle'), true);
});

test('a pet click restarts autonomous roaming from a 2 to 4 second delay', () => {
  const fixture = setup({ random: () => 0 });
  const initialTimer = [...fixture.timeouts.keys()][0];

  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointerup', pointer(10, 12));

  assert.ok(fixture.cleared.includes(initialTimer));
  assert.equal([...fixture.timeouts.values()][0].delay, 2000);
});

test('three pet clicks within 550ms apply the roll state', () => {
  const fixture = setup();
  for (let index = 0; index < 3; index += 1) {
    fixture.petElement.dispatch('pointerdown', pointer(10, 12));
    fixture.petElement.dispatch('pointerup', pointer(10, 12));
  }

  assert.equal(fixture.body.dataset.state, 'roll');
  assert.deepEqual(fixture.calls.reactions, [1, 1, 3]);
});

test('a pointer drag sends drag IPC without a click reaction', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', pointer(10, 12));
  fixture.petElement.dispatch('pointermove', pointer(17, 12));
  fixture.petElement.dispatch('pointerup', pointer(17, 12));

  assert.equal(fixture.calls.dragStart, 1);
  assert.deepEqual(fixture.calls.dragMove, [{ x: 7, y: 0 }]);
  assert.equal(fixture.calls.dragEnd, 1);
  assert.deepEqual(fixture.calls.reactions, []);
  assert.equal(fixture.body.dataset.state, 'idle');
});

test('a drag keeps cumulative screen-coordinate deltas when the window moves between events', () => {
  const fixture = setup();
  fixture.petElement.dispatch('pointerdown', screenPointer(10, 12, 1010, 512));
  fixture.petElement.dispatch('pointermove', screenPointer(20, 12, 1020, 512));
  // The native window moves by the first delta, so the client coordinate stays
  // fixed while the pointer continues moving right on the physical screen.
  fixture.petElement.dispatch('pointermove', screenPointer(20, 12, 1030, 512));
  fixture.petElement.dispatch('pointerup', screenPointer(20, 12, 1030, 512));

  assert.deepEqual(fixture.calls.dragMove, [{ x: 10, y: 0 }, { x: 20, y: 0 }]);
  assert.deepEqual(fixture.calls.reactions, []);
});

test('random behavior schedules only from 2000ms through 4000ms', () => {
  const fixture = setup({ random: () => 0.5 });
  const firstTimer = [...fixture.timeouts.values()][0];

  assert.equal(firstTimer.delay, 3000);
});

test('a default autonomous interval applies its selected non-walk state while roaming remains enabled', () => {
  const fixture = setup({ random: () => 0.5 });
  const firstTimer = [...fixture.timeouts.values()][0];

  firstTimer.callback();

  assert.deepEqual(fixture.calls.next, [{ name: 'look' }]);
  assert.deepEqual(fixture.calls.roams, []);
  assert.equal(fixture.body.dataset.state, 'look');
});

test('an autonomous interval selects walk before requesting native roaming', () => {
  const randomValues = [0.5, 1, 0.5];
  const fixture = setup({
    random: () => randomValues.shift() ?? 0.5,
    next: () => ({ name: 'walk' }),
    emitWalkOnRoam: true
  });
  const firstTimer = [...fixture.timeouts.values()][0];

  firstTimer.callback();

  assert.deepEqual(fixture.calls.next, [{ name: 'walk' }]);
  assert.deepEqual(fixture.calls.roams, [60]);
  assert.equal(fixture.body.dataset.state, 'walk');
  assert.equal(fixture.petElement.classList.contains('walk-cycle'), true);
});

test('the come command makes a leftward walk face left instead of walking backward', () => {
  const fixture = setup({ emitWalkOnRoam: true });

  fixture.app.runCommand('come');

  assert.deepEqual(fixture.calls.roams, [-60]);
  assert.equal(fixture.petElement.classList.contains('walk-reverse'), true);
});

test('the come command still shows a left-facing walk when native roaming is unavailable', () => {
  const fixture = setup();

  fixture.app.runCommand('come');

  assert.deepEqual(fixture.calls.roams, [-60]);
  assert.equal(fixture.petElement.classList.contains('walk-cycle'), true);
  assert.equal(fixture.petElement.classList.contains('walk-reverse'), true);
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/walk/walk-1.png') || fixture.poseImageB.src.includes('assets/normalized/walk/walk-1.png'), true);
});

test('the rest command shows the sleepy design raster', () => {
  const fixture = setup();

  fixture.app.runCommand('rest');

  assert.equal(fixture.body.dataset.state, 'rest');
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/actions/rest.png') || fixture.poseImageB.src.includes('assets/normalized/actions/rest.png'), true);
});

test('the walk-cycle hook clears when its finite body animation ends', () => {
  const fixture = setup();

  fixture.walk();
  fixture.petElement.dispatch('animationend', { animationName: 'pup-walk-body' });

  assert.equal(fixture.petElement.classList.contains('walk-cycle'), false);
});

test('the walk-cycle hook clears after a finite timer when reduced motion emits no animationend', () => {
  const fixture = setup();

  fixture.walk();
  const cleanupTimer = [...fixture.timeouts.values()].find(({ delay }) => delay === 1200);
  assert.ok(cleanupTimer, 'walk must schedule cleanup even without CSS animation events');
  cleanupTimer.callback();

  assert.equal(fixture.petElement.classList.contains('walk-cycle'), false);
  assert.equal(fixture.body.dataset.state, 'idle');
});

test('walking advances to the next approved raster frame instead of drawing anatomy', () => {
  const fixture = setup();
  fixture.walk();

  assert.equal(fixture.body.dataset.state, 'walk');
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/walk/walk-1.png') || fixture.poseImageB.src.includes('assets/normalized/walk/walk-1.png'), true);
  const frameTimer = [...fixture.timeouts.values()].find(({ delay }) => delay === 140);
  assert.ok(frameTimer, 'walk must schedule a raster frame transition');
  frameTimer.callback();
  assert.equal(fixture.poseImageA.src.includes('assets/normalized/walk/walk-2.png') || fixture.poseImageB.src.includes('assets/normalized/walk/walk-2.png'), true);
});

test('pause clears the random timer and resume schedules a replacement', () => {
  const fixture = setup();
  const initialTimer = [...fixture.timeouts.keys()][0];
  fixture.paused(true);

  assert.deepEqual(fixture.calls.paused, [true]);
  assert.ok(fixture.cleared.includes(initialTimer));
  assert.equal(fixture.timeouts.size, 0);

  fixture.paused(false);
  assert.deepEqual(fixture.calls.paused, [true, false]);
  assert.equal(fixture.timeouts.size, 1);
});

test('sound menu changes UI state without pausing animation', () => {
  const fixture = setup();
  fixture.sound(false);

  assert.equal(fixture.body.dataset.soundEnabled, 'false');
  assert.deepEqual(fixture.calls.paused, []);
  assert.equal(fixture.timeouts.size, 1);
});
