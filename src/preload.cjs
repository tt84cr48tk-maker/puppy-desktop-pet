const electron = require('electron');
const contextBridge = electron?.contextBridge;
const ipcRenderer = electron?.ipcRenderer;

const petApi = {
  dragStart() {
    ipcRenderer?.send('pet:drag-start');
  },
  dragMove(delta) {
    ipcRenderer?.send('pet:drag-move', delta);
  },
  dragEnd() {
    ipcRenderer?.send('pet:drag-end');
  },
  resetPosition() {
    ipcRenderer?.send('pet:reset-position');
  },
  roam(delta) {
    ipcRenderer?.send('pet:roam', delta);
  },
  onPaused(listener) {
    ipcRenderer?.on('pet:paused', (_event, paused) => listener(paused));
  },
  onRoamingChanged(listener) {
    ipcRenderer?.on('pet:roaming-changed', (_event, enabled) => listener(enabled));
  },
  onSoundChanged(listener) {
    ipcRenderer?.on('pet:sound-changed', (_event, enabled) => listener(enabled));
  },
  onWalk(listener) {
    ipcRenderer?.on('pet:walk', (_event, direction) => listener(direction));
  }
};

if (contextBridge) contextBridge.exposeInMainWorld('petDesktop', petApi);

module.exports = { petApi };
