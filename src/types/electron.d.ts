export interface ElectronAPI {
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (data: any) => void) => void;
  removeUpdateStatusListener: () => void;
  vaultDekEncrypt: (plaintext: string) => Promise<{ ok: boolean; data?: string; reason?: string }>;
  vaultDekDecrypt: (b64: string) => Promise<{ ok: boolean; data?: string; reason?: string }>;
  runWindowsTool: (target: string) => Promise<{ ok: boolean; reason?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
