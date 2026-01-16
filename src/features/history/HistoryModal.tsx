import React from 'react';
import { Clock } from 'lucide-react';
import type { LoginHistoryItem } from '../../types';

export interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  loginHistory: LoginHistoryItem[];
}

const HistoryModal = ({ open, onClose, loginHistory }: HistoryModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Lịch Sử Hoạt Động</h2>

        <div className="space-y-2">
          {loginHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có lịch sử</p>
          ) : (
            loginHistory.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.action}</p>
                  <p className="text-sm text-gray-500">{item.timestamp}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default HistoryModal;
