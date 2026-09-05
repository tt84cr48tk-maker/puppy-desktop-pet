# 白色小狗桌面宠物 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地运行、透明置顶、可互动的 Electron 白色小狗桌面宠物。

**Architecture:** Electron 主进程创建并管理桌面窗口和上下文菜单，预加载脚本只暴露所需的窗口 API。渲染进程以 HTML/CSS 绘制小狗并运行一个可单元测试的行为状态机，负责动画、拖拽和点击互动。

**Tech Stack:** Electron、Vanilla JavaScript、HTML/CSS、Node.js 内置测试运行器。

**Spec:** `docs/superpowers/specs/2026-09-04-puppy-desktop-pet-design.md`

## Global Constraints

- 应用必须可在 Linux 上离线运行；不读取屏幕内容，也不访问网络。
- 窗口必须透明、无边框、始终置顶，并能拖动到任意位置。
- 宠物包含白色卷毛、黑色圆眼鼻和粉色编织玩具的原创卡通表现。
- 状态机使用 `idle`、`sleep`、`look`、`walk`、`jump`、`toy`、`happy`、`roll` 等互斥状态；随机行为具有冷却时间。
- 右键菜单必须提供暂停/继续、声音开关、重置位置、退出。

---

## File Structure

- `package.json`：依赖和启动/测试脚本。
- `src/main.js`：Electron 窗口、菜单和 IPC。
- `src/preload.js`：安全暴露窗口控制 API。
- `src/renderer/index.html`：宠物 DOM。
- `src/renderer/styles.css`：透明布局、小狗插画、状态动画。
- `src/renderer/pet-state.js`：纯行为状态机。
- `src/renderer/app.js`：状态机与 DOM、拖拽、点击的集成。
- `test/pet-state.test.js`：状态机单元测试。
- `test/preload-api.test.js`：预加载 API 合约测试。

### Task 1: 项目脚手架与行为状态机

**Files:**
- Create: `package.json`
- Create: `src/renderer/pet-state.js`
- Create: `test/pet-state.test.js`

**Interfaces:**
- Produces: `createPetState({ random, clock })`，返回 `{ getState(), next(), reactToClick(clickCount), setPaused(paused), isPaused() }`。
- Produces: `getState()` 返回 `{ name: string, endsAt: number }`；暂停时 `next()` 返回当前状态。

- [ ] **Step 1: Write the failing state-machine tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetState } from '../src/renderer/pet-state.js';

test('chooses a calm or playful state after idle', () => {
  const pet = createPetState({ random: () => 0, clock: () => 1000 });
  assert.equal(pet.next().name, 'sleep');
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
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- --test-name-pattern="pet"`

Expected: FAIL because `package.json` and `createPetState` do not exist.

- [ ] **Step 3: Implement the minimal state-machine contract and test script**

```js
export function createPetState({ random = Math.random, clock = Date.now } = {}) {
  let paused = false;
  let state = { name: 'idle', endsAt: clock() + 2500 };
  const actions = ['sleep', 'look', 'walk', 'jump', 'toy'];
  return {
    getState: () => state,
    isPaused: () => paused,
    setPaused(value) { paused = Boolean(value); },
    next() {
      if (!paused) state = { name: actions[Math.floor(random() * actions.length)], endsAt: clock() + 3000 };
      return state;
    },
    reactToClick(count) {
      if (!paused) state = { name: count >= 3 ? 'roll' : 'happy', endsAt: clock() + 1200 };
      return state;
    }
  };
}
```

Set `type` to `module`, add `electron` as a development dependency, and define `test` as `node --test` in `package.json`.

- [ ] **Step 4: Run the state-machine test suite**

Run: `npm test -- --test-name-pattern="pet"`

Expected: PASS for all three cases.

- [ ] **Step 5: Commit the task**

```bash
git add package.json src/renderer/pet-state.js test/pet-state.test.js
git commit -m "feat: add pet behavior state machine"
```

### Task 2: Electron window, menu, and preload bridge

**Files:**
- Create: `src/main.js`
- Create: `src/preload.js`
- Create: `test/preload-api.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm start` script from `package.json`.
- Produces: `window.petDesktop` with `dragStart()`, `dragMove()`, `dragEnd()`, `resetPosition()`, `onPaused(listener)`, and `onSoundChanged(listener)`.

- [ ] **Step 1: Write the failing preload API contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { petApi } from '../src/preload.js';

test('preload API exposes only pet window controls', () => {
  assert.deepEqual(Object.keys(petApi).sort(), [
    'dragEnd', 'dragMove', 'dragStart', 'onPaused', 'onSoundChanged', 'resetPosition'
  ].sort());
});
```

- [ ] **Step 2: Run the preload test to verify failure**

Run: `npm test -- --test-name-pattern="preload"`

Expected: FAIL because `petApi` does not exist.

- [ ] **Step 3: Implement the transparent window, controlled IPC, and menu**

```js
const win = new BrowserWindow({
  width: 230, height: 230, transparent: true, frame: false,
  alwaysOnTop: true, resizable: false, webPreferences: {
    preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false
  }
});
```

In `main.js`, load `src/renderer/index.html`; add IPC handlers for `pet:drag-start`, `pet:drag-move`, and `pet:reset-position`; and show an Electron `Menu` with pause/resume, sound toggle, reset, and quit. In `preload.js`, export `petApi` for testing and publish it as `window.petDesktop` via `contextBridge.exposeInMainWorld`.

- [ ] **Step 4: Run the preload contract test**

Run: `npm test -- --test-name-pattern="preload"`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add package.json src/main.js src/preload.js test/preload-api.test.js
git commit -m "feat: create desktop pet window controls"
```

### Task 3: Render original puppy illustration and CSS behavior animations

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/styles.css`

**Interfaces:**
- Consumes: body `data-state` values from `app.js`: `idle`, `sleep`, `look`, `walk`, `jump`, `toy`, `happy`, `roll`.
- Produces: `#pet` interactive target and `#toy` toy element used by `app.js`.

- [ ] **Step 1: Write a DOM visual checklist before coding**

```text
Expected initial render: transparent page; a white curly puppy with black eyes and nose;
pink woven toy hidden outside toy state; no browser scrollbars; pet fills a 230x230 stage.
```

- [ ] **Step 2: Start the unfinished renderer to verify it is absent**

Run: `npm start`

Expected: Electron reports that `src/renderer/index.html` cannot be loaded.

- [ ] **Step 3: Implement semantic DOM and focused CSS animations**

```html
<main id="stage" aria-label="白色小狗桌面宠物">
  <button id="pet" aria-label="和小狗互动"><span class="face"></span><span id="toy"></span></button>
</main>
```

Create the puppy from layered CSS shapes and pseudo-elements: cream-white curly coat, black eyes/nose, short legs, and a pink braided toy. Set `body` transparent and `overflow: hidden`. Add distinct, finite animations for sleep, look, walk, jump, toy, happy, and roll; honor `prefers-reduced-motion` by disabling continuous animation.

- [ ] **Step 4: Run and inspect the renderer manually**

Run: `npm start`

Expected: a transparent 230x230 window displays an original white curly puppy; its default state is visible without scrollbars.

- [ ] **Step 5: Commit the task**

```bash
git add src/renderer/index.html src/renderer/styles.css
git commit -m "feat: render animated white puppy"
```

### Task 4: Connect interactions, randomized behavior, and menu events

**Files:**
- Create: `src/renderer/app.js`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Consumes: `createPetState()` and `window.petDesktop` from Tasks 1-2; `#pet` and `#toy` from Task 3.
- Produces: DOM state changes through `document.body.dataset.state`; no click reaction while dragging.

- [ ] **Step 1: Write the interaction acceptance cases**

```text
Click #pet once => body data-state becomes happy.
Click #pet three times within 550ms => body data-state becomes roll.
Move pointer more than 6px while pressed => drag IPC runs and no happy/roll state is set.
Pause menu event => random timer stops; resume event => timer restarts.
Sound toggle event => UI sound setting changes without preventing animation.
```

- [ ] **Step 2: Start the application and verify integration does not yet occur**

Run: `npm start`

Expected: the puppy renders but clicking it does not change `data-state` and it does not move by random behavior.

- [ ] **Step 3: Implement renderer integration**

```js
const pet = createPetState();
function apply(next) { document.body.dataset.state = next.name; }
function scheduleNext() {
  clearTimeout(timer);
  timer = setTimeout(() => { apply(pet.next()); scheduleNext(); }, 2600 + Math.random() * 3200);
}
```

Track pointer-down coordinates and only treat a pointer-up within 6px as a click. Count clicks in a 550ms window; call `reactToClick(3)` for three or more, otherwise `reactToClick(1)`. Wire the preload listeners to `setPaused`, `scheduleNext`, local sound state, and position reset. Include `app.js` at the end of `index.html`.

- [ ] **Step 4: Run tests and perform manual acceptance checks**

Run: `npm test && npm start`

Expected: automated tests pass; manual cases in Step 1 all pass; right-click offers all four menu actions.

- [ ] **Step 5: Commit the task**

```bash
git add src/renderer/app.js src/renderer/index.html src/renderer/styles.css
git commit -m "feat: add desktop pet interactions"
```

### Task 5: Final offline and window-behavior verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed Electron application and its `npm start` command.
- Produces: concise Chinese startup and behavior instructions.

- [ ] **Step 1: Write user-facing verification checklist in README**

```markdown
## 验证

- 启动后小狗显示透明背景且可拖动。
- 点击、连续点击、随机动作和右键菜单均可用。
- 断开网络后重新启动，应用仍可用。
```

- [ ] **Step 2: Run all automated checks**

Run: `npm test`

Expected: PASS with zero failures.

- [ ] **Step 3: Manually verify behavior and recoverable error cases**

Run: `npm start`

Expected: window is transparent, frameless and always on top; test dragging, click and triple-click reactions, each menu item, pause/resume, reset after off-screen placement, and quit. Disable the network before restarting to confirm no runtime network dependency.

- [ ] **Step 4: Record the exact startup instruction**

```markdown
## 启动

npm install
npm start
```

- [ ] **Step 5: Commit the task**

```bash
git add README.md
git commit -m "docs: add puppy desktop pet instructions"
```

## Plan Self-Review

- Spec coverage: transparent Electron window (Task 2); original puppy and toy (Task 3); random companion/playful behavior and click/drag interaction (Task 4); menu, offline operation, reset position, and verification (Tasks 2, 4, 5).
- Placeholder scan: no unfinished requirements or generic test instructions remain.
- Type consistency: Task 1 defines `createPetState`; Task 2 defines `window.petDesktop`; Tasks 3–4 consume their documented names and `data-state` values.
