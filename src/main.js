import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWindowPlacementController } from './window-placement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOW_SIZE = 150;
let petWindow;
let paused = false;
let soundEnabled = true;
let dragOrigin;
const walkTimers = new Set();

function sendWindowEvent(channel, value) {
  if (!petWindow?.isDestroyed()) petWindow.webContents.send(channel, value);
}

const windowPlacement = createWindowPlacementController({
  getWorkArea: () => screen.getPrimaryDisplay().workArea,
  windowSize: WINDOW_SIZE,
  onRoamingChanged: (enabled) => sendWindowEvent('pet:roaming-changed', enabled)
});

function lockPetWindow(window) {
  if (!window || window.isDestroyed()) return;
  window.setContentSize(WINDOW_SIZE, WINDOW_SIZE, false);
  window.setShape?.([{ x: 0, y: 0, width: WINDOW_SIZE, height: WINDOW_SIZE }]);
}

function resetWindowPosition(window) {
  dragOrigin = undefined;
  stopWalk();
  lockPetWindow(window);
  windowPlacement.reset(window);
}

function stopWalk() {
  for (const timer of walkTimers) clearTimeout(timer);
  walkTimers.clear();
}

function roamWindow(window, delta) {
  stopWalk();
  lockPetWindow(window);
  const plan = windowPlacement.planRoam(window, delta);
  if (!plan) return false;
  sendWindowEvent('pet:walk', Math.sign(delta) || 1);
  for (const step of plan) {
    const timer = setTimeout(() => {
      walkTimers.delete(timer);
      if (!windowPlacement.moveRoamStep(window, step)) stopWalk();
      else lockPetWindow(window);
    }, step.at);
    walkTimers.add(timer);
  }
  return true;
}

function showContextMenu(window) {
  const menu = Menu.buildFromTemplate([
    {
      label: paused ? 'Resume' : 'Pause',
      click: () => {
        paused = !paused;
        if (paused) stopWalk();
        sendWindowEvent('pet:paused', paused);
      }
    },
    {
      label: soundEnabled ? 'Sound: On' : 'Sound: Off',
      click: () => {
        soundEnabled = !soundEnabled;
        sendWindowEvent('pet:sound-changed', soundEnabled);
      }
    },
    { type: 'separator' },
    { label: 'Reset Position', click: () => resetWindowPosition(window) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  menu.popup({ window });
}

function createWindow() {
  petWindow = new BrowserWindow({
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    useContentSize: true,
    minWidth: WINDOW_SIZE,
    minHeight: WINDOW_SIZE,
    maxWidth: WINDOW_SIZE,
    maxHeight: WINDOW_SIZE,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  lockPetWindow(petWindow);

  windowPlacement.placeAtBottomRight(petWindow);
  petWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  petWindow.webContents.on('did-finish-load', () => {
    lockPetWindow(petWindow);
  });
  petWindow.webContents.on('context-menu', () => showContextMenu(petWindow));
}

ipcMain.on('pet:drag-start', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  dragOrigin = window?.getPosition();
  stopWalk();
  if (window) windowPlacement.beginDrag();
});

ipcMain.on('pet:drag-move', (event, delta = {}) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || !dragOrigin || !Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return;
  windowPlacement.disableRoaming();
  window.setPosition(dragOrigin[0] + Math.round(delta.x), dragOrigin[1] + Math.round(delta.y));
  lockPetWindow(window);
});

ipcMain.on('pet:drag-end', () => {
  dragOrigin = undefined;
  windowPlacement.endDrag();
});

ipcMain.on('pet:reset-position', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) resetWindowPosition(window);
});

ipcMain.on('pet:roam', (event, delta) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) roamWindow(window, delta);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
