const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const path = require('path');

class UpdateService {
  constructor() {
    this.mainWindow = null;
    this.updateInfo = null;
    this.setupAutoUpdater();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupAutoUpdater() {
    // Configure update server (you'll need to set this up)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'quan8', // Thay bằng GitHub username của bạn
      repo: 'luugmail-desktop' // Thay bằng repo name của bạn
    });

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.sendStatusToWindow('checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.updateInfo = info;
      this.sendStatusToWindow('update-available', info);
      this.showUpdateDialog();
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.sendStatusToWindow('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Error in auto-updater:', err);
      this.sendStatusToWindow('error', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);
      this.sendStatusToWindow('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.sendStatusToWindow('update-downloaded', info);
      this.showInstallDialog();
    });
  }

  sendStatusToWindow(status, data = null) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  async showUpdateDialog() {
    if (!this.mainWindow) return;

    const currentVersion = app.getVersion();
    const latestVersion = this.updateInfo.version;

    const options = {
      type: 'info',
      buttons: ['Có', 'Không'],
      defaultId: 0,
      title: 'Có bản cập nhật mới!',
      message: 'PHÁT HIỆN PHIÊN BẢN MỚI',
      detail: `Phiên bản hiện tại: v${currentVersion}\nPhiên bản mới nhất: v${latestVersion}\n\nBạn có muốn tải và chạy phiên bản mới?`
    };

    const result = await dialog.showMessageBox(this.mainWindow, options);
    
    if (result.response === 0) {
      // User clicked "Có" (Yes)
      this.downloadUpdate();
    }
  }

  async showInstallDialog() {
    if (!this.mainWindow) return;

    const options = {
      type: 'info',
      buttons: ['Khởi động lại ngay', 'Khởi động lại sau'],
      defaultId: 0,
      title: 'Cập nhật đã sẵn sàng',
      message: 'Cập nhật đã được tải xuống',
      detail: 'Ứng dụng cần khởi động lại để hoàn tất việc cập nhật. Bạn có muốn khởi động lại ngay bây giờ?'
    };

    const result = await dialog.showMessageBox(this.mainWindow, options);
    
    if (result.response === 0) {
      // User clicked "Khởi động lại ngay" (Restart now)
      autoUpdater.quitAndInstall();
    }
  }

  checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
  }

  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  installUpdate() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = UpdateService;
