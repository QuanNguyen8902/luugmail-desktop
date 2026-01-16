import React from 'react';
import {
  Check,
  CheckSquare,
  Copy,
  Edit2,
  Plus,
  Save,
  Search,
  Star,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';
import type { Note, NoteCategoryId, TodoItem } from '../../types';

type SortBy = 'recent' | 'az' | 'favorite';

export interface NoteCategoryInfo {
  id: NoteCategoryId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface NotesTabProps {
  noteCategories: NoteCategoryInfo[];
  notes: Note[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  isAddingNote: boolean;
  editingNoteId: number | null;
  newNote: Omit<Note, 'id'>;
  setNewNote: (value: Omit<Note, 'id'>) => void;
  addTodoItem: () => void;
  toggleTodoDraftItem: (todoId: number) => void;
  updateTodoItem: (todoId: number, text: string) => void;
  deleteTodoItem: (todoId: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  toggleTodoItem: (noteId: number, todoId: number) => void;
  toggleNoteFavorite: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const NotesTab = (props: NotesTabProps) => {
  const {
    noteCategories,
    notes,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    isAddingNote,
    editingNoteId,
    newNote,
    setNewNote,
    addTodoItem,
    toggleTodoDraftItem,
    updateTodoItem,
    deleteTodoItem,
    onSubmit,
    onCancel,
    copiedId,
    copyToClipboard,
    toggleTodoItem,
    toggleNoteFavorite,
    onEdit,
    onDelete
  } = props;

  const getNoteCategory = (categoryId: NoteCategoryId) => {
    return noteCategories.find(cat => cat.id === categoryId) || noteCategories[0];
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    if (sortBy === 'recent') return b.createdAt - a.createdAt;
    if (sortBy === 'favorite') return Number(!!b.isFavorite) - Number(!!a.isFavorite);
    return 0;
  });

  const filteredNotes = sortedNotes.filter(note => {
    const matchesSearch = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="recent">Mới nhất</option>
            <option value="az">A-Z</option>
            <option value="favorite">Yêu thích</option>
          </select>
        </div>
      </div>

      {isAddingNote && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingNoteId ? 'Chỉnh Sửa Ghi Chú' : 'Thêm Ghi Chú Mới'}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
              <select
                value={newNote.category}
                onChange={(e) => setNewNote({ ...newNote, category: e.target.value as Note['category'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                {noteCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề</label>
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="Ví dụ: Việc cần làm hôm nay"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none min-h-[120px]"
                placeholder="Ghi nội dung..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!newNote.isFavorite}
                onChange={(e) => setNewNote({ ...newNote, isFavorite: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-700">Đánh dấu yêu thích</label>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">Checklist</h3>
                <button
                  onClick={addTodoItem}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Thêm việc
                </button>
              </div>

              {newNote.todos.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có việc nào. Bạn có thể thêm checklist (tùy chọn).</p>
              ) : (
                <div className="space-y-2">
                  {newNote.todos.map((todo: TodoItem) => (
                    <div key={todo.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!todo.completed}
                        onChange={() => toggleTodoDraftItem(todo.id)}
                        className="w-4 h-4"
                      />
                      <input
                        type="text"
                        value={todo.text}
                        onChange={(e) => updateTodoItem(todo.id, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                        placeholder="Nhập việc cần làm..."
                      />
                      <button
                        onClick={() => deleteTodoItem(todo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSubmit}
                disabled={!newNote.title}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-5 h-5" />
                {editingNoteId ? 'Cập Nhật' : 'Lưu'}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <StickyNote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {notes.length === 0
                ? 'Chưa có ghi chú nào. Nhấn "Thêm" để bắt đầu!'
                : 'Không tìm thấy ghi chú nào phù hợp.'}
            </p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const noteCat = getNoteCategory(note.category);
            const Icon = noteCat.icon;
            const todos = Array.isArray(note.todos) ? note.todos : [];
            const completedCount = todos.filter(t => t.completed).length;

            return (
              <div key={note.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`${noteCat.color} p-3 rounded-lg flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">{noteCat.name}</span>
                      {note.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    </div>

                    <p className="font-semibold text-gray-800 truncate">{note.title}</p>

                    {note.content && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{note.content}</p>
                    )}

                    {todos.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <CheckSquare className="w-4 h-4" />
                          <span>{completedCount}/{todos.length} hoàn thành</span>
                        </div>
                        <div className="space-y-1">
                          {todos.map(todo => (
                            <label key={todo.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={!!todo.completed}
                                onChange={() => toggleTodoItem(note.id, todo.id)}
                                className="w-4 h-4"
                              />
                              <span className={todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}>
                                {todo.text || '(trống)'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2 flex-wrap">
                      <button
                        onClick={() => copyToClipboard(`${note.title}\n\n${note.content || ''}`, `note-${note.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                        title="Sao chép"
                      >
                        {copiedId === `note-${note.id}` ? (
                          <>
                            <Check className="w-4 h-4" />
                            Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Sao chép
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleNoteFavorite(note.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        note.isFavorite ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title="Yêu thích"
                    >
                      <Star className={`w-5 h-5 ${note.isFavorite ? 'fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => onEdit(note.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(note.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default NotesTab;
