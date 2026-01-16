import React from 'react';
import { Edit2, Plus, Save, Search, Trash2, Wrench, X } from 'lucide-react';
import type { WindowsTool } from '../../types';

export interface ToolsTabProps {
  tools: WindowsTool[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isAddingTool: boolean;
  setIsAddingTool: (value: boolean) => void;
  editingToolId: string | number | null;
  setEditingToolId: (value: string | number | null) => void;
  newTool: { name: string; description: string; target: string };
  setNewTool: React.Dispatch<React.SetStateAction<{ name: string; description: string; target: string }>>;
  toolNameTouched: boolean;
  setToolNameTouched: (value: boolean) => void;
  suggestToolNameFromTarget: (target: string) => string;
  handleAddTool: () => void;
  handleUpdateTool: () => void;
  handleEditTool: (id: string | number) => void;
  handleDeleteTool: (id: string | number) => void;
  runWindowsTool: (tool: WindowsTool) => void | Promise<void>;
}

const ToolsTab = (props: ToolsTabProps) => {
  const {
    tools,
    searchTerm,
    setSearchTerm,
    isAddingTool,
    setIsAddingTool,
    editingToolId,
    setEditingToolId,
    newTool,
    setNewTool,
    toolNameTouched,
    setToolNameTouched,
    suggestToolNameFromTarget,
    handleAddTool,
    handleUpdateTool,
    handleEditTool,
    handleDeleteTool,
    runWindowsTool
  } = props;

  const filteredTools = tools.filter(tool => {
    const q = searchTerm.toLowerCase();
    return tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm công cụ... (cleanmgr, taskmgr, services...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-gray-800">Thêm lệnh / công cụ</p>
              <p className="text-sm text-gray-600">
                Ví dụ: <span className="font-mono">cleanmgr</span>, <span className="font-mono">taskmgr</span>,{' '}
                <span className="font-mono">services.msc</span>, <span className="font-mono">ms-settings:windowsupdate</span>
              </p>
            </div>
            <button
              onClick={() => {
                setIsAddingTool(true);
                setEditingToolId(null);
                setNewTool({ name: '', description: '', target: '' });
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm lệnh
            </button>
          </div>
        </div>

        {isAddingTool && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingToolId ? 'Chỉnh Sửa Công Cụ' : 'Thêm Công Cụ Mới'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên hiển thị</label>
                <input
                  type="text"
                  value={newTool.name}
                  onChange={(e) => {
                    setToolNameTouched(true);
                    setNewTool({ ...newTool, name: e.target.value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Ví dụ: Disk Cleanup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <input
                  type="text"
                  value={newTool.description}
                  onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Mô tả ngắn để bạn nhớ công cụ này làm gì"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lệnh/Target</label>
                <input
                  type="text"
                  value={newTool.target}
                  onChange={(e) => {
                    const nextTarget = e.target.value;
                    setNewTool((prev) => {
                      const next = { ...prev, target: nextTarget };
                      if (!toolNameTouched && String(prev.name || '').trim() === '') {
                        const suggestion = suggestToolNameFromTarget(nextTarget);
                        if (suggestion) next.name = suggestion;
                      }
                      return next;
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none font-mono"
                  placeholder="cleanmgr | taskmgr | services.msc | ms-settings:..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={editingToolId ? handleUpdateTool : handleAddTool}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {editingToolId ? 'Cập Nhật' : 'Lưu'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingTool(false);
                    setEditingToolId(null);
                    setNewTool({ name: '', description: '', target: '' });
                    setToolNameTouched(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">
            Các công cụ này chỉ chạy được trong app Desktop (Electron). Khi bấm, Windows sẽ mở tiện ích tương ứng.
          </p>
        </div>

        {filteredTools.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Không tìm thấy công cụ phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map(tool => (
              <div key={tool.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Wrench className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{tool.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                    <div className="mt-3">
                      <button
                        onClick={() => runWindowsTool(tool)}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Wrench className="w-4 h-4" />
                        Chạy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTool(tool.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ToolsTab;
