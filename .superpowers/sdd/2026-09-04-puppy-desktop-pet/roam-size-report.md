# Roam and size follow-up report

## Scope completed

- Changed the transparent Electron window and renderer stage from 230×230 to 180×180 CSS pixels.
- Kept the existing `#pet` button target at 160×160 and sized the unchanged puppy raster to 140px high.
- Kept the existing pink bunny raster unchanged and visually confirmed it at the puppy's mouth in `toy` state.
- Added the pure `computeRoamX` utility with left, right, and in-range tests.
- Added renderer-to-main roam IPC. Renderer requests a randomized horizontal step (at the existing randomized 2.6–5.8s behavior cadence); main clamps it to the primary display work area and pins the window bottom edge to that work area.
- A real drag disables roaming. Reset Position uses the same `resetWindowPosition` function for both the existing context-menu command and renderer IPC; it restores bottom-right and re-enables roaming.
- Corrected an existing runtime-only preload failure discovered during live verification. Electron loads preloads as CommonJS in this runtime, so the ESM `preload.js` never ran. The now-tested `preload.cjs` is selected by `main.js` and exposes the same restricted bridge plus the new roam methods.

## RED evidence

1. `rtk npm test -- test/roam-position.test.js`

   ```text
   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/roam-position.js'
   # tests 1
   # pass 0
   # fail 1
   ```

2. `rtk npm test -- test/renderer-app.test.js`

   ```text
   not ok 3 - the compact renderer stage keeps a 140px puppy target
   Expected ... width: 180px; ... height: 180px;
   Actual CSS contained width: 230px; height: 230px;
   # tests 9
   # pass 8
   # fail 1
   ```

3. `rtk npm test -- test/preload-api.test.js test/renderer-app.test.js`

   ```text
   not ok 1 - preload API exposes only pet window controls
   missing: onRoamingChanged, roam
   not ok 4 - the compact renderer stage keeps a 140px puppy target
   not ok 9 - an enabled random behavior interval requests a small horizontal roam
   Expected [60], actual []
   # tests 11
   # pass 8
   # fail 3
   ```

4. Live Electron diagnostics reproducibly reported:

   ```text
   Unable to load preload script: .../src/preload.js
   SyntaxError: Cannot use import statement outside a module
   ```

   The focused bridge test was then deliberately redirected to the required CommonJS runtime artefact and failed before implementation:

   ```text
   Error: Cannot find module '../src/preload.cjs'
   # tests 1
   # pass 0
   # fail 1
   ```

## GREEN evidence

Focused suite after the feature and bridge implementations:

```text
rtk npm test -- test/preload-api.test.js test/renderer-app.test.js test/roam-position.test.js
# tests 14
# pass 14
# fail 0
```

Final full suite after all runtime corrections:

```text
rtk npm test
# tests 18
# pass 18
# fail 0
# cancelled 0
# skipped 0
```

`rtk git diff --check` also exited cleanly.

## Live visual and window verification

- A normal (non-debug) Electron launch remained running at the end of verification.
- `wmctrl` reported `白色小狗桌面宠物` at 228×225 physical pixels; the display is at 1.25 scaling, matching a 180×180 CSS-pixel window. CDP computed-style inspection during the transient debug launch reported `stage: "180px"`, `pet: "160px"`, and `dog: "140px"`.
- [Idle-window capture](../../../work/roam-size-window.png) shows the smaller recognizable white puppy. The black field is how the screen-capture tool composites the transparent window, not a renderer background.
- [Toy-state capture](../../../work/roam-size-toy-window.png) shows the unmodified pink bunny raster centered at the puppy's mouth.
- The local-only remote-debugging port was used transiently solely for live IPC verification, then the app was relaunched normally without remote debugging.
- A manual roam request moved the live window from X=3547 to X=3471 (a 60 CSS-pixel request becomes ~75 physical pixels at the active scale).
- After the live drag path (`dragStart` → `dragMove` → `dragEnd`), a subsequent roam request left X unchanged at 3630, confirming suppression.
- Reset restored X=3615 at the work-area bottom; the next roam request moved it to X=3540, confirming reset re-enabled roaming.

## Files changed

- `src/main.js`
- `src/preload.cjs` (new; replaces the runtime-incompatible `src/preload.js`)
- `src/roam-position.js` (new)
- `src/renderer/app.js`
- `src/renderer/styles.css`
- `test/preload-api.test.js`
- `test/renderer-app.test.js`
- `test/roam-position.test.js` (new)

The puppy and bunny raster assets were not modified.

## Self-review

- `computeRoamX` clamps both ends of the primary work area and is tested with literal boundary values.
- Main-process roaming only runs when no pointer drag is active and after no manual drag has occurred; it uses the primary display work area and forces the Y coordinate to `workArea.y + workArea.height - 180`.
- The context menu's Reset Position item and the renderer reset IPC both call the same reset implementation, avoiding divergent reset behavior.
- No network or screen-content access was added to production code; remote debugging was not retained in application code.
- Existing click, triple-click, pause, sound, and drag tests remain green. The only concern is inherent to transparent-window screenshots: the capture compositor displays transparent pixels as black, while the live Electron window itself remains transparent.

## Native-bounds correction (post-review)

### Root cause

The reviewed live process was stale: X11 reported that process at 369×342 physical pixels with `WM_NORMAL_HINTS` minimum and maximum both fixed to 369×342, at X=3577 (right edge 3946) on the primary display ending at X=3840. The source already requested a 180×180 DIP window, but reset and roam still subtracted the `WINDOW_SIZE` constant. They therefore positioned that larger fixed native window as if it were 180×180.

This is not an X11/WM hard minimum. A fresh, isolated Electron 180×180 transparent frameless window on this host reports a 1.25 scale factor and fixed X11 hints of 228×225 physical pixels (Electron `getBounds()` reports 184×180 DIP after it is shown). The old 369×342 hint was retained by the already-running old app process, not imposed on a fresh app. The code-side correction is to derive every reset/roam position from `window.getBounds()` at the time of placement, so any native rounding or a fixed window manager size is bounded correctly.

### RED evidence

1. Before the placement controller existed:

   ```text
   rtk npm test -- test/window-placement.test.js
   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/window-placement.js'
   # pass 0
   # fail 1
   ```

   The new test uses a 350×325 live-native-bounds fixture and expects reset to place its right and bottom edges at the work-area edge, rather than subtracting 180.

2. Before the oversized-window guard:

   ```text
   rtk npm test -- test/roam-position.test.js
   computeRoamX keeps an oversized native window anchored at the work area origin
   Expected: 0
   Actual: -170
   ```

### GREEN evidence

```text
rtk npm test -- test/window-placement.test.js test/roam-position.test.js
# tests 6
# pass 6
# fail 0

rtk npm test
# tests 21
# pass 21
# fail 0
```

`rtk git diff --check` exited cleanly.

### Implementation and live normal-launch evidence

- Added `src/window-placement.js`. Its controller reads `window.getBounds()` separately for every reset and roam, clamps X using that actual width, and computes the bottom Y from that actual height.
- `src/main.js` uses that controller for initial placement, Reset Position, and roaming. It gates movement during an active pointer drag, disables it after a real drag, and re-enables it only through reset.
- `computeRoamX` now also anchors an oversized native window at the work-area origin instead of returning a negative X.
- The stale process was stopped and the app was launched normally with `npm start` (no debugging switch or remote-debugging port). X11 then reported initial native geometry `X=3612, Y=823, width=228, height=225`, exactly reaching the physical right edge at 3840. Its fixed X11 min/max hints were also 228×225.
- The normal app's primary-display work area is `x=1536, y=0, width=1536, height=839` DIPs at scale factor 1.25; this maps to X=1920..3840 and a physical work-area bottom of approximately 1049. After an automatic normal roam, X11 reported `X=3608, Y=815, width=232, height=234`: right edge 3840 and bottom edge 1049. This confirms live roaming uses the actual native geometry and remains in the Electron-reported work area.
- The focused controller test covers the reviewed 350×325 case: reset uses `{ x: 3490, y: 695 }` for a `{ x: 1920, y: 0, width: 1920, height: 1020 }` work area; a subsequent roam moves to `{ x: 3430, y: 695 }`. The same test verifies that active dragging blocks movement, a completed manual drag remains blocked, and reset alone restores movement.

### Self-review

- The original defect is caught by a behavior-level test with literal actual-native dimensions, not a source-text assertion.
- Every position is recomputed from fresh bounds; no placement path uses the 180 CSS-size constant as a native size.
- The fresh normal Electron launch is compact (228×225 physical at 1.25 scale, approximately 180×180 CSS/DIP) and contains no remote-debugging configuration.
- No pet assets, renderer interactions, or production network/screen access were changed.

### Final normal-launch verification

After the final full test run, the stale process was again replaced with `npm start` (no debug switch and no remote-debugging port). X11 reported initial geometry `X=3612, Y=823, 228×225` physical pixels and fixed X11 min/max hints of 228×225; the right edge is exactly 3840. After an automatic roam, X11 reported `X=3597, Y=820, 230×229`: right edge 3827 (inside the 3840 work-area right edge) and bottom edge 1049, the Electron-reported scaled work-area bottom.

On this fractional-scale X11 host Electron rounds the compact 180-DIP request to roughly 228–230×225–229 physical pixels during normal renderer activity. This is close to the requested 180×180 CSS/DIP size and materially smaller than the stale 369×342 process. The controller reads the live bounds before every reset/roam, so these native rounding differences are included in its clamp calculation.
