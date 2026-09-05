# Smaller puppy, visible walking, and mouth-safe toy report

## Scope completed

- Reduced the requested Electron window size and renderer stage from 180 to
  150 CSS/DIP pixels.
- Reduced the displayed puppy raster from 140px to 115px while retaining a
  140px pointer target.
- Added a pure `createWalkPlan` utility. Every plan contains three evenly
  timed positions at 400ms, 800ms, and 1200ms; each is clamped to the
  work-area width using the actual native window width.
- Wired the plan into main-process timers. A successful native roam emits
  `pet:walk` through the preload bridge before executing the three native
  `setPosition` calls. A pending walk is cancelled when a drag starts, a
  reset occurs, or Pause is selected.
- Changed autonomous scheduling to 2.0--4.0 seconds and restart it after a
  click, so the delay is measured from the prior user action.
- Repositioned the unchanged bunny asset: it is a 32px layer centered at 50%
  horizontal / 55% vertical of the 140px pet target, translating only -10%
  vertically. Its pop animation stays between +2px and -2px vertically and
  never exceeds scale 1, preventing the former eye-covering rise.

## TDD evidence

The initial RED focused command was:

```text
npm test -- test/renderer-app.test.js test/walk-plan.test.js
```

It failed because the renderer still exposed `180px` dimensions and a 140px
puppy raster, while `createWalkPlan` was `undefined`. A subsequent RED run
also showed that `planRoam` was absent from the placement controller. The
click-rescheduling test then failed until `recordClick()` restarted the
2--4-second timer. Finally, the mouth-safe toy assertion failed against the
old 58px, `left: 55%`, `top: 45%` layer and its 1.1-scale, face-rising keyframe.

The final focused command passed 18/18:

```text
npm test -- test/renderer-app.test.js test/walk-plan.test.js test/window-placement.test.js test/preload-api.test.js
```

The final full command passed 26/26:

```text
npm test
```

## Fresh normal-Electron evidence

A previously running project Electron instance was stopped and a new one was
launched with plain `npm start`; the process command was
`node .../node_modules/.bin/electron .` and contained no
`--remote-debugging-port` flag.

On the normal X11 desktop, `xwininfo` reported the compact transparent native
window at 195x200 physical pixels (the desktop compositor applies fractional
scaling to the 150-DIP request). A native capture showed the 115px puppy in
that compact transparent window.

During the same normal launch, 0.2-second X11 samples captured a single roam
at these positions:

```text
1788509335.537  X=3486 Y=828
1788509335.765  X=3470 Y=828
1788509336.188  X=3455 Y=828
```

This is three distinct bounded horizontal updates rather than one teleport;
the pure planner test independently fixes their scheduled times at 400ms,
800ms, and 1200ms and checks both ordinary and right-edge-clamped walks.

## Live-automation limitation

The required normal launch intentionally had no remote debugging port.
`agent-browser` therefore could not attach (its Electron workflow requires a
CDP port). I used native X11 inspection, screenshots, and input attempts
instead. The normal transparency/fractional-scaling compositor made input
coordinates and native context-menu keyboard selection unreliable, so I do
not claim a definitive live Reset Position selection or a live `toy`-state
capture. The app has no direct toy gesture (single/triple click are preserved
as happy/roll), and no debugging session was retained to force renderer state.

Drag suppression and reset recovery are covered deterministically by
`test/window-placement.test.js`: `beginDrag()` rejects a planned step,
`disableRoaming()` keeps roaming rejected after release, and `reset()` restores
bottom-right placement plus roaming. The final suite also verifies that a
pointer drag sends native drag IPC without a click reaction.

## Concerns

The X11 compositor reports physical transparent-window dimensions that vary
with its fractional scaling while the requested Electron size remains 150 DIP.
The window-placement implementation always reads Electron's actual native
bounds before planning and keeps each step on the work-area bottom edge.

The bunny is now visually constrained by a focused CSS contract (small size,
mouth anchor, and bounded keyframes). A human visual check of the `toy` state
on the target desktop remains worthwhile because the normal no-CDP run could
not force that otherwise non-interactive state.

## Follow-up: visible raster gait

The clarification that walking must be visible on the puppy itself added a
renderer-owned `walk-cycle` class. A fresh RED run of
`npm test -- test/renderer-app.test.js` failed because neither the class nor
the two alternating-paw selectors existed. The implementation restarts that
class for each `pet:walk` event, applies a 1.2-second body bob, and overlays
two 12x18px semi-transparent front-paw shapes at `bottom: 25px`, wholly over
the lower raster legs. The left and right steps have opposite phases. The
class is removed on the `pup-walk-body` `animationend` event, so no paw overlay
remains after a finite walk.

Fresh final verification passed 20/20 focused tests and 28/28 full tests.

A fresh normal Electron process (again launched with plain `npm start`, no
remote debugging flag) provided two native captures: a movement-triggered
walk frame showed one raised front paw, while a capture 1.5 seconds later
showed the ordinary raster paws with the overlay cleared. The same X11 poll
recorded the triggering native movement from X=3612 to X=3590. The earlier
toy-state capture limitation remains: normal no-CDP automation cannot force
the otherwise non-interactive `toy` state, but its placement and all keyframe
bounds are asserted by the focused renderer test.

## Follow-up: side-facing walk and bitten bunny

The approved `src/renderer/assets/puppy-reference-v2.png` and existing
`pink-bunny-toy-v2.png` remain unchanged; no generated sprite, recolor, or
checkerboard/background-extraction candidate was used.

New renderer contracts were first run RED with
`npm test -- test/renderer-app.test.js`: they failed because the approved dog
had no side-turn hook and the bunny had neither muzzle placement nor a
one-ear crop. The final CSS adds `pup-walk-side-turn` only to the existing dog
image during `walk-cycle`. It uses `perspective(260px) rotateY(-38deg)` plus
the pre-existing body bob and alternating lower-leg gait; native three-step
movement remains unchanged. The untouched bunny is now a 28px, front-layer
element at the muzzle (50% / 47%), with a polygon clip that removes the upper
portion of one ear, so the ear reads as disappearing into the mouth while the
top of the toy starts below the eyes.

Fresh normal-Electron captures showed the compressed, side-turned approved
raster while X11 detected movement, then its unaltered front-facing form after
the 1.2-second cycle. A subsequent 0.2-second X11 sample recorded four
positions in one native walk: X=3536, X=3521, X=3506, and X=3492.

The visual limitation is intentional: a CSS perspective turn of a fixed,
front-facing approved raster can communicate a side-facing walk but cannot
create a genuine anatomical side profile. Replacing the dog with a side-view
asset would violate the confirmed-image constraint. A native `toy` state still
could not be forced without enabling remote debugging, which the normal-run
requirement prohibits; the bite anchor and clip are covered by the renderer
contract instead.

## Final muzzle alignment and stronger side turn

The final RED run of `npm test -- test/renderer-app.test.js` failed against
the prior 47% / 28px bunny anchor and -38-degree side turn. The focused test
now requires a 26px bunny layer at 50% / 34% of the 140px pet target, its
existing one-ear polygon clip, and a mouth-safe `toy-pop` vertical range of
only -1px through +1px. The implementation moves only that existing bunny
layer; neither approved image file changed.

The same CSS-only walk hook now uses `rotateY(-58deg)` on the unchanged
approved dog raster, with the body bob, alternating lower-leg gait, and
native multi-step plan intact. A fresh normal Electron capture at movement
showed the strongly narrowed side turn; a capture 1.5 seconds later showed
the ordinary front-facing idle raster after the finite walk cycle cleared.

Final verification passed 20/20 focused tests and 28/28 full tests. A native
toy-state capture remains unavailable because no supported user gesture enters
that state and the normal-run requirement rules out the CDP attachment needed
to force it. The muzzle position, front z-index, one-ear clip, eye-safe
26px size, and +/-1px animation bound are covered by the renderer contract.

## Walk-only curled tail

Using the provided second-photo cue, a failing renderer test first required a
dedicated `walk-tail` hook after the unchanged approved puppy image, with the
image above it in the stacking order and a 1.2-second walk-only wag. The
initial normal capture showed the first plume placement reading as detached;
a second RED contract moved the tail base to 44px / 44px, where the raster
body overlaps it.

The final tail is a small CSS C-shaped white plume with a soft circular curl,
at z-index 0 behind the approved dog raster (z-index 1), while the toy stays
at z-index 3. It appears only under `#pet.walk-cycle`, wags in sync with the
1.2-second walk, and returns to opacity zero automatically when the existing
cycle hook clears. No dog or bunny asset was changed.

Fresh normal Electron captures showed the curled plume behind the side-facing
walking body and showed no added tail in the later idle frame. The normal
no-CDP constraint still prevents forcing a `toy`-state screenshot; prior
contract coverage for the muzzle anchor, ear clip, and eye-safe bounds remains
in place.

## Reduced-motion walk-cycle cleanup

The review identified that reduced-motion disables CSS animations, so the
previous `animationend`-only cleanup could leave `walk-cycle` set forever and
therefore leave the walk-only tail visible after the dog should return to its
front-facing idle state. The new focused renderer test was run RED with
`npm test -- test/renderer-app.test.js`: it failed because no 1200ms cleanup
timer existed when an animation event was deliberately omitted.

The renderer now starts a separate bounded 1200ms walk-cycle timer whenever a
walk begins. Its shared cleanup removes `walk-cycle` and cancels any pending
timer; the normal `pup-walk-body` `animationend` uses that same cleanup. Thus
normal motion still ends promptly at its animation boundary, while
reduced-motion reaches the same finite cleanup without requiring CSS events.
This is behavior-only plumbing: the approved puppy and bunny assets and all
CSS visual hooks remain unchanged.

GREEN verification passed 16/16 focused renderer tests and 30/30 full tests;
`git diff --check` also passed. The new automated no-event path is the scoped
re-review evidence for reduced-motion, so no visual capture was needed or
claimed for this non-visual cleanup fix.
