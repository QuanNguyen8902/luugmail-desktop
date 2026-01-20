const { app, BrowserWindow, Menu, ipcMain, safeStorage, protocol } = require('electron');
const path = require('path');
const UpdateService = require('./src/services/updateService');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

const http = require('http');

let staticServer = null;
let lastStartUrl = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true
    }

  }
]);

const startStaticServer = () => {
  return new Promise((resolve, reject) => {
    try {
      const distDir = path.join(__dirname, 'dist');

      const server = http.createServer((req, res) => {
        try {
          const rawUrl = String(req.url || '/');
          const urlPath = rawUrl.split('?')[0].split('#')[0];
          const safePath = decodeURIComponent(urlPath).replace(/^\/+/, '');
          const requested = safePath || 'index.html';
          const filePath = path.normalize(path.join(distDir, requested));

          if (!filePath.startsWith(distDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          const exists = fs.existsSync(filePath);
          const finalPath = exists ? filePath : path.join(distDir, 'index.html');
          const ext = path.extname(finalPath).toLowerCase();
          const mimeByExt = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain; charset=utf-8'
          };
          const contentType = mimeByExt[ext] || 'application/octet-stream';

          const buf = fs.readFileSync(finalPath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(buf);
        } catch {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        staticServer = server;
        console.log(`[luugmail] static server: http://localhost:${port}/index.html`);
        resolve({ server, port });
      });
      server.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
};

function createWindow(startUrl) {
  lastStartUrl = startUrl || lastStartUrl;
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

  const shouldOpenDevTools =
    process.env.LUUGMAIL_DEVTOOLS === '1' ||
    process.argv.includes('--devtools') ||
    process.argv.includes('--open-devtools');

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadURL(lastStartUrl);
  }

  if (shouldOpenDevTools) {
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
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const url = request.url.replace(/^app:\/\//, '');
      const decodedPath = decodeURIComponent(url);
      const relative = decodedPath.replace(/^\.\//, '');
      const resolvedPath = path.normalize(path.join(__dirname, 'dist', relative));
      callback({ path: resolvedPath });
    } catch (e) {
      callback({ path: path.join(__dirname, 'dist', 'index.html') });
    }
  });

  // Initialize update service
  const updateService = new UpdateService();
  // In dev, Electron can reload; avoid "Attempted to register a second handler".
  try {
    ipcMain.removeHandler('vault-dek-encrypt');
    ipcMain.removeHandler('vault-dek-decrypt');
    ipcMain.removeHandler('run-windows-tool');
    ipcMain.removeHandler('open-chrome-profile');
  } catch (e) {
  }

  ipcMain.handle('open-chrome-profile', async (_event, accountId, url) => {
    try {
      const id = String(accountId || '').trim();
      if (!id) return { ok: false, reason: 'Thiếu accountId.' };

      const targetUrl = String(url || '').trim() || 'about:blank';

      const appName = 'LuuGMail Desktop';
      const profileRoot = path.join(os.homedir(), 'AppData', 'Local', appName, 'chrome-profiles');
      const userDataDir = path.join(profileRoot, id);

      try {
        fs.mkdirSync(userDataDir, { recursive: true });
      } catch (e) {
        return { ok: false, reason: 'Không tạo được thư mục profile Chrome.' };
      }

      const candidates = [
        path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'Application', 'chrome.exe')
      ];

      const chromePath = candidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      });

      const args = ['--user-data-dir=' + userDataDir, '--new-window', targetUrl];

      if (chromePath) {
        execFile(chromePath, args, { windowsHide: false }, () => {});
        return { ok: true };
      }

      // Fallback: rely on PATH association
      execFile('cmd.exe', ['/c', 'start', '', 'chrome', ...args], { windowsHide: false }, () => {});
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e && e.message ? e.message : e) };
    }
  });

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

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    createWindow(devServerUrl);
  } else {
    startStaticServer()
      .then(({ port }) => {
        const url = `http://localhost:${port}/index.html`;
        console.log(`[luugmail] renderer url: ${url}`);
        createWindow(url);
      })
      .catch(() => {
        console.log('[luugmail] static server failed, fallback to app://');
        createWindow('app://./index.html');
      });
  }
  
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
      createWindow(lastStartUrl || process.env.VITE_DEV_SERVER_URL || 'app://./index.html');
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try {
      staticServer?.close?.();
    } catch (e) {}
    app.quit();
  }
});
