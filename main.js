const { app, BrowserWindow, Menu, ipcMain, safeStorage } = require('electron');
const path = require('path');
const UpdateService = require('./src/services/updateService');
const { execFile } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    // Open DevTools in production for debugging
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-fail-load', () => {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Remove menu bar
  Menu.setApplicationMenu(null);
}

// When Electron has finished initialization
app.whenReady().then(() => {
  // Initialize update service
  const updateService = new UpdateService();
  // In dev, Electron can reload; avoid "Attempted to register a second handler".
  try {
    ipcMain.removeHandler('vault-dek-encrypt');
    ipcMain.removeHandler('vault-dek-decrypt');
    ipcMain.removeHandler('run-windows-tool');
  } catch (e) {
  }

  ipcMain.handle('vault-dek-encrypt', (_event, plaintext) => {
    try {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
        return { ok: false, reason: 'safeStorage không khả dụng hoặc Windows DPAPI không hỗ trợ.' };
      }
      const encrypted = safeStorage.encryptString(String(plaintext));
      return { ok: true, data: encrypted.toString('base64') };
    } catch (e) {
      return { ok: false, reason: `encryptString thất bại: ${String(e && e.message ? e.message : e)}` };
    }
  });

  ipcMain.handle('vault-dek-decrypt', (_event, b64) => {
    try {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
        return { ok: false, reason: 'safeStorage không khả dụng hoặc Windows DPAPI không hỗ trợ.' };
      }
      const buf = Buffer.from(String(b64 || ''), 'base64');
      const plaintext = safeStorage.decryptString(buf);
      return { ok: true, data: plaintext };
    } catch (e) {
      return { ok: false, reason: `decryptString thất bại: ${String(e && e.message ? e.message : e)}` };
    }
  });

  ipcMain.handle('run-windows-tool', (_event, target) => {
    try {
      const t = String(target || '').trim();
      if (!t) return { ok: false, reason: 'Target rỗng.' };

      execFile('cmd.exe', ['/c', 'start', '', t], { windowsHide: false }, (error) => {
        if (error) {
          // Best-effort: report error to renderer via update-status channel is not appropriate.
          // Return value already resolved; renderer can re-try.
        }
      });

      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e && e.message ? e.message : e) };
    }
  });

  createWindow();
  
  // Set the main window for update service
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    updateService.setMainWindow(mainWindow);
  }

  // Add IPC handlers for update functionality
  try {
    ipcMain.removeHandler('get-version');
    ipcMain.removeHandler('check-for-updates');
    ipcMain.removeHandler('download-update');
  } catch (e) {}

  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('check-for-updates', () => {
    updateService.checkForUpdates();
  });

  ipcMain.handle('download-update', () => {
    updateService.downloadUpdate();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
