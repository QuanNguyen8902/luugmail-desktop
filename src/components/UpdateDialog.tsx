import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface UpdateDialogProps {
  isVisible: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  onConfirm: () => void;
  onCancel: () => void;
  downloadProgress?: number;
  isDownloading?: boolean;
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isVisible,
  updateInfo,
  currentVersion,
  onConfirm,
  onCancel,
  downloadProgress = 0,
  isDownloading = false
}) => {
  const [showChangelog, setShowChangelog] = useState(false);

  if (!isVisible || !updateInfo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-[90%]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Có bản cập nhật mới!</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="text-sm font-medium text-blue-600 mb-2">PHÁT HIỆN PHIÊN BẢN MỚI</div>
            
            <div className="flex justify-center items-center space-x-4 mb-4">
              <div className="text-center">
                <div className="text-xs text-gray-500">Phiên bản hiện tại</div>
                <div className="text-lg font-bold text-gray-700">v{currentVersion}</div>
              </div>
              <div className="text-gray-400">
                <RefreshCw size={20} />
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Phiên bản mới nhất</div>
                <div className="text-lg font-bold text-green-600">v{updateInfo.version}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              Bạn có muốn tải và chạy phiên bản mới?
            </div>

            {/* Download Progress */}
            {isDownloading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Đang tải xuống...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Changelog Toggle */}
            {updateInfo.releaseNotes && (
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="text-xs text-blue-600 hover:text-blue-800 underline mb-4"
              >
                {showChangelog ? 'Ẩn' : 'Xem'} ghi chú phiên bản
              </button>
            )}

            {/* Changelog Content */}
            {showChangelog && updateInfo.releaseNotes && (
              <div className="text-left bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-y-auto">
                <div className="text-xs text-gray-700 whitespace-pre-line">
                  {updateInfo.releaseNotes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isDownloading}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Không
          </button>
          <button
            onClick={onConfirm}
            disabled={isDownloading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isDownloading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Có</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateDialog;
