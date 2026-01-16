const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  vaultDekEncrypt: (plaintext) => ipcRenderer.invoke('vault-dek-encrypt', plaintext),
  vaultDekDecrypt: (b64) => ipcRenderer.invoke('vault-dek-decrypt', b64),
  runWindowsTool: (target) => ipcRenderer.invoke('run-windows-tool', target),
  
  // Listen for update status events
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },
  
  // Remove listener
  removeUpdateStatusListener: () => {
    ipcRenderer.removeAllListeners('update-status');
  }
});
