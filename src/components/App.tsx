import React from 'react';
import { useUpdateManager } from '../hooks/useUpdateManager';
import UpdateDialog from './UpdateDialog';

interface AppProps {
  children: React.ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  const {
    isUpdateDialogVisible,
    updateInfo,
    currentVersion,
    downloadProgress,
    isDownloading,
    handleUpdateConfirm,
    handleUpdateCancel
  } = useUpdateManager();

  return (
    <>
      {children}
      <UpdateDialog
        isVisible={isUpdateDialogVisible}
        updateInfo={updateInfo}
        currentVersion={currentVersion}
        onConfirm={handleUpdateConfirm}
        onCancel={handleUpdateCancel}
        downloadProgress={downloadProgress}
        isDownloading={isDownloading}
      />
    </>
  );
};

export default App;
