# Raster visual correction report

## Scope

Replaced the CSS-drawn dog anatomy and pink CSS toy with these approved local RGBA assets:

- `src/renderer/assets/puppy-reference-v2.png` (1132 × 1389 RGBA)
- `src/renderer/assets/pink-bunny-toy-v2.png` (1024 × 1536 RGBA; `opaque: false`)

`#pet` remains the interactive button. Its dog image is non-draggable and has `pointer-events: none`, so pointer interactions continue to reach the button. `#toy` remains the existing toy-state hook; in toy state it is centered over the dog's muzzle/chest area rather than beside it.

## TDD evidence

### RED — dog asset contract

Added `the pet control contains a labeled puppy reference image` before changing the markup. The focused run failed against old markup as expected:

```text
not ok 1 - the pet control contains a labeled puppy reference image
failureType: 'testCodeFailure'
error: The input did not match the regular expression ...
Input: ... <button id="pet" aria-label="和小狗互动"><span class="face"></span><span id="toy"></span></button> ...
# tests 7
# pass 6
# fail 1
```

### RED — bunny asset contract

Added `the toy layer contains the pink bunny toy image` before changing toy markup. The focused run then failed on both absent assets as expected:

```text
not ok 1 - the pet control contains a labeled puppy reference image
not ok 2 - the toy layer contains the pink bunny toy image
# tests 8
# pass 6
# fail 2
```

### GREEN — focused renderer test output

```text
> node --test test/renderer-app.test.js
TAP version 13
# Subtest: the pet control contains a labeled puppy reference image
ok 1 - the pet control contains a labeled puppy reference image
# Subtest: the toy layer contains the pink bunny toy image
ok 2 - the toy layer contains the pink bunny toy image
# Subtest: a pet click applies the happy state
ok 3 - a pet click applies the happy state
# Subtest: three pet clicks within 550ms apply the roll state
ok 4 - three pet clicks within 550ms apply the roll state
# Subtest: a pointer drag sends drag IPC without a click reaction
ok 5 - a pointer drag sends drag IPC without a click reaction
# Subtest: random behavior schedules only from 2600ms through 5800ms
ok 6 - random behavior schedules only from 2600ms through 5800ms
# Subtest: pause clears the random timer and resume schedules a replacement
ok 7 - pause clears the random timer and resume schedules a replacement
# Subtest: sound menu changes UI state without pausing animation
ok 8 - sound menu changes UI state without pausing animation
1..8
# tests 8
# pass 8
# fail 0
# duration_ms 105.902733
```

## Full test output

```text
> node --test
TAP version 13
# Subtest: chooses a calm or playful state after idle
ok 1 - chooses a calm or playful state after idle
# Subtest: random state waits for its cooldown before advancing
ok 2 - random state waits for its cooldown before advancing
# Subtest: click reactions override random behavior
ok 3 - click reactions override random behavior
# Subtest: paused pet does not advance state
ok 4 - paused pet does not advance state
# Subtest: preload API exposes only pet window controls
ok 5 - preload API exposes only pet window controls
# Subtest: the pet control contains a labeled puppy reference image
ok 6 - the pet control contains a labeled puppy reference image
# Subtest: the toy layer contains the pink bunny toy image
ok 7 - the toy layer contains the pink bunny toy image
# Subtest: a pet click applies the happy state
ok 8 - a pet click applies the happy state
# Subtest: three pet clicks within 550ms apply the roll state
ok 9 - three pet clicks within 550ms apply the roll state
# Subtest: a pointer drag sends drag IPC without a click reaction
ok 10 - a pointer drag sends drag IPC without a click reaction
# Subtest: random behavior schedules only from 2600ms through 5800ms
ok 11 - random behavior schedules only from 2600ms through 5800ms
# Subtest: pause clears the random timer and resume schedules a replacement
ok 12 - pause clears the random timer and resume schedules a replacement
# Subtest: sound menu changes UI state without pausing animation
ok 13 - sound menu changes UI state without pausing animation
1..13
# tests 13
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 133.63208
```

## Native visual evidence

Launched the current Electron runtime with `npm start -- --remote-debugging-port=9229` and captured the desktop at `work/puppy-raster-native.png`. The 230 × 230 desktop-pet window visibly contains a centered, full-body white curly dog rendered from the raster asset on a transparent window, with no CSS-generated ear or side protrusions. The pink bunny is visible at the dog's mouth rather than beside it.

The CDP endpoint did not answer: `curl --max-time 3 http://127.0.0.1:9229/json/version` timed out. Therefore agent-browser could not capture a state-specific toy animation through DevTools. The Electron process ran and the native root-window capture supplied visual inspection evidence.

## Files changed

- `src/renderer/index.html` — asset-backed dog and bunny markup, Chinese alt text, and `draggable="false"`.
- `src/renderer/styles.css` — responsive image composition and toy-at-muzzle animation; removed all dog and CSS-toy anatomy rules.
- `test/renderer-app.test.js` — asset/semantic renderer contracts.
- `src/renderer/assets/puppy-reference-v2.png` — approved dog asset.
- `src/renderer/assets/pink-bunny-toy-v2.png` — approved bunny asset.

## Self-review

- `#pet` remains the pointer target; both child images cannot intercept pointer events.
- The dog has no pseudo-element anatomy, gradients, or drop shadows; CSS only sizes and animates the transparent raster asset.
- `#toy` retains its ID, opacity gate, and `body[data-state="toy"]` animation interface, now placing the bunny over the dog’s mouth/chest.
- The renderer tests verify both asset paths and Chinese labels; the full suite confirms interaction, timer, state, and preload behavior.
- Remaining concern: CDP was unavailable, so toy-state placement was validated from CSS composition and ordinary native capture, not a DevTools-forced animation frame.
