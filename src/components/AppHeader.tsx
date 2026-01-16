import React from 'react';
import { History, Lock, Plus, Settings, StickyNote, Wrench } from 'lucide-react';

type TabId = 'passwords' | 'notes' | 'tools';

export interface AppHeaderProps {
  activeTab: TabId;
  accountsCount: number;
  accountsFavoriteCount: number;
  notesCount: number;
  notesFavoriteCount: number;
  toolsCount: number;
  onShowHistory: () => void;
  onShowSettings: () => void;
  onAdd: () => void;
  onLock: () => void;
  onTabChange: (tab: TabId) => void;
}

const AppHeader = (props: AppHeaderProps) => {
  const {
    activeTab,
    accountsCount,
    accountsFavoriteCount,
    notesCount,
    notesFavoriteCount,
    toolsCount,
    onShowHistory,
    onShowSettings,
    onAdd,
    onLock,
    onTabChange
  } = props;

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Cá Nhân</h1>
          <p className="text-sm text-gray-600">
            {activeTab === 'passwords'
              ? `${accountsCount} tài khoản • ${accountsFavoriteCount} yêu thích`
              : activeTab === 'notes'
                ? `${notesCount} ghi chú • ${notesFavoriteCount} yêu thích`
                : `${toolsCount} công cụ Windows`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onShowHistory}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            title="Lịch sử"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={onShowSettings}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            title="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
          {activeTab !== 'tools' && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Thêm
            </button>
          )}
          <button
            onClick={onLock}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Lock className="w-5 h-5" />
            Khóa
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => onTabChange('passwords')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'passwords'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-5 h-5" />
            Mật khẩu ({accountsCount})
          </button>

          <button
            onClick={() => onTabChange('notes')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <StickyNote className="w-5 h-5" />
            Ghi chú ({notesCount})
          </button>

          <button
            onClick={() => onTabChange('tools')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'tools'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="w-5 h-5" />
            Công cụ ({toolsCount})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppHeader;
