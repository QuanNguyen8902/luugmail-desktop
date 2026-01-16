import React from 'react';
import { Download, Fingerprint, Trash2, Upload } from 'lucide-react';

export interface SettingsModalProps {
  open: boolean;
  autoLockTime: number;
  setAutoLockTime: (value: number) => void;
  useBiometric: boolean;
  setUseBiometric: (value: boolean) => void;
  webauthnCredentialId: string;
  setupWindowsHello: () => void;
  resetWindowsHello: () => void;
  exportData: () => void;
  importData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  saveSettings: () => void;
  onClose: () => void;
}

const SettingsModal = (props: SettingsModalProps) => {
  const {
    open,
    autoLockTime,
    setAutoLockTime,
    useBiometric,
    setUseBiometric,
    webauthnCredentialId,
    setupWindowsHello,
    resetWindowsHello,
    exportData,
    importData,
    saveSettings,
    onClose
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Cài Đặt</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tự động khóa sau (phút)</label>
            <select
              value={autoLockTime}
              onChange={(e) => setAutoLockTime(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              <option value="0">Không tự động khóa</option>
              <option value="1">1 phút</option>
              <option value="5">5 phút</option>
              <option value="10">10 phút</option>
              <option value="15">15 phút</option>
              <option value="30">30 phút</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Bật Windows Hello</label>
            <button
              onClick={() => {
                const next = !useBiometric;
                setUseBiometric(next);
                localStorage.setItem('useBiometric', String(next));
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useBiometric ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useBiometric ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Windows Hello</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Trạng thái</p>
                  <p className="text-xs text-gray-500">{webauthnCredentialId ? 'Đã thiết lập' : 'Chưa thiết lập'}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    webauthnCredentialId ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {webauthnCredentialId ? 'READY' : 'SETUP'}
                </span>
              </div>

              {!webauthnCredentialId ? (
                <button
                  onClick={setupWindowsHello}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Fingerprint className="w-5 h-5" />
                  Thiết lập Windows Hello
                </button>
              ) : (
                <button
                  onClick={resetWindowsHello}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Xóa thiết lập Windows Hello
                </button>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Sao lưu & Khôi phục</h3>
            <div className="space-y-2">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Xuất dữ liệu
              </button>
              <label className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                Nhập dữ liệu
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={saveSettings}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Lưu
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
