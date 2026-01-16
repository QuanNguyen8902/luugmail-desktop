import { useState, useEffect, useCallback } from 'react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface UpdateStatus {
  status: 'checking-for-update' | 'update-available' | 'update-not-available' | 'download-progress' | 'update-downloaded' | 'error';
  data?: any;
}

export const useUpdateManager = () => {
  const [isUpdateDialogVisible, setIsUpdateDialogVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Get current version
    if (window.electronAPI?.getVersion) {
      Promise.resolve(window.electronAPI.getVersion())
        .then((v) => setCurrentVersion(String(v || '')))
        .catch(() => {
          setCurrentVersion('');
        });
    }

    // Listen for update status from main process
    const handleUpdateStatus = ({ status, data }: UpdateStatus) => {
      console.log('Update status:', status, data);

      switch (status) {
        case 'checking-for-update':
          // Optionally show a loading indicator
          break;

        case 'update-available':
          setUpdateInfo({
            version: data.version,
            releaseNotes: data.releaseNotes
          });
          setIsUpdateDialogVisible(true);
          break;

        case 'update-not-available':
          // Optionally show a message that app is up to date
          break;

        case 'download-progress':
          setDownloadProgress(Math.round(data.percent || 0));
          setIsDownloading(true);
          break;

        case 'update-downloaded':
          setIsDownloading(false);
          setDownloadProgress(100);
          // Show restart dialog is handled by main process
          break;

        case 'error':
          console.error('Update error:', data);
          setIsDownloading(false);
          // Optionally show error message
          break;
      }
    };

    // Set up listener
    if (window.electronAPI?.onUpdateStatus) {
      window.electronAPI.onUpdateStatus(handleUpdateStatus);
    }

    // Cleanup
    return () => {
      if (window.electronAPI?.removeUpdateStatusListener) {
        window.electronAPI.removeUpdateStatusListener();
      }
    };
  }, []);

  const handleUpdateConfirm = useCallback(() => {
    if (window.electronAPI?.downloadUpdate) {
      window.electronAPI.downloadUpdate();
    }
  }, []);

  const handleUpdateCancel = useCallback(() => {
    setIsUpdateDialogVisible(false);
    setUpdateInfo(null);
    setDownloadProgress(0);
    setIsDownloading(false);
  }, []);

  const checkForUpdatesManually = useCallback(() => {
    if (window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates();
    }
  }, []);

  return {
    isUpdateDialogVisible,
    updateInfo,
    currentVersion,
    downloadProgress,
    isDownloading,
    handleUpdateConfirm,
    handleUpdateCancel,
    checkForUpdatesManually
  };
};
