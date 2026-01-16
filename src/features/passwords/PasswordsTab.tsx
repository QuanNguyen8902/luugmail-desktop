import React from 'react';
import {
  Check,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Plus,
  Save,
  Search,
  Shield,
  Star,
  Trash2,
  Unlock,
  X
} from 'lucide-react';
import type { Account, CategoryId } from '../../types';

type SortBy = 'recent' | 'az' | 'favorite';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface PasswordsTabProps {
  categories: CategoryInfo[];
  accounts: Account[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  isAdding: boolean;
  editingId: number | null;
  newAccount: Omit<Account, 'id'>;
  setNewAccount: (value: Omit<Account, 'id'>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  copiedId: string | null;
  showPassword: Record<string, boolean>;
  togglePasswordVisibility: (id: number) => void;
  copyToClipboard: (text: string, id: string) => void;
  copyAll: (username: string, password: string, twoFactorSecret: string | undefined, accountId: number) => void;
  openLink: (category: CategoryId, username: string, accountId: number) => void;
  openChangePassword: (category: CategoryId) => void;
  toggleFavorite: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  generateOTP: (secret: string) => string;
}

const PasswordsTab = (props: PasswordsTabProps) => {
  const {
    categories,
    accounts,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    sortBy,
    setSortBy,
    isAdding,
    editingId,
    newAccount,
    setNewAccount,
    onSubmit,
    onCancel,
    copiedId,
    showPassword,
    togglePasswordVisibility,
    copyToClipboard,
    copyAll,
    openLink,
    openChangePassword,
    toggleFavorite,
    onEdit,
    onDelete,
    generateOTP
  } = props;

  const getCategoryInfo = (categoryId: CategoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[categories.length - 1];
  };

  const getAccountStats = () => {
    const stats: Record<string, number> = {};
    for (const a of accounts) {
      stats[a.category] = (stats[a.category] || 0) + 1;
    }
    return stats;
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (sortBy === 'az') return a.username.localeCompare(b.username);
    if (sortBy === 'recent') return b.createdAt - a.createdAt;
    if (sortBy === 'favorite') return Number(!!b.isFavorite) - Number(!!a.isFavorite);
    return 0;
  });

  const filteredAccounts = sortedAccounts.filter(acc => {
    const matchesSearch = acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || acc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản..."
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

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tất cả ({accounts.length})
          </button>
          {categories.map(cat => {
            const Icon = cat.icon;
            const count = getAccountStats()[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat.id
                    ? `${cat.color} text-white`
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại tài khoản</label>
              <select
                value={newAccount.category}
                onChange={(e) => setNewAccount({ ...newAccount, category: e.target.value as Account['category'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập / Email / SĐT</label>
              <input
                type="text"
                value={newAccount.username}
                onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="example@gmail.com hoặc 0987654321"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
              <input
                type="text"
                value={newAccount.note || ''}
                onChange={(e) => setNewAccount({ ...newAccount, note: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="Tài khoản cá nhân, công việc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã Secret 2FA (tùy chọn)
                <span className="text-xs text-gray-500 ml-2">Dùng để tạo mã xác thực 6 số</span>
              </label>
              <input
                type="text"
                value={newAccount.twoFactorSecret || ''}
                onChange={(e) => setNewAccount({ ...newAccount, twoFactorSecret: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="JBSWY3DPEHPK3PXP (16-32 ký tự)"
              />
              <p className="text-xs text-gray-500 mt-1">💡 Tìm trong app Authenticator hoặc khi setup 2FA</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!newAccount.isFavorite}
                onChange={(e) => setNewAccount({ ...newAccount, isFavorite: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-700">Đánh dấu yêu thích</label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSubmit}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Cập Nhật' : 'Lưu'}
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
        {filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Unlock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {accounts.length === 0
                ? 'Chưa có tài khoản nào. Nhấn "Thêm" để bắt đầu!'
                : 'Không tìm thấy tài khoản nào phù hợp.'}
            </p>
          </div>
        ) : (
          filteredAccounts.map(account => {
            const categoryInfo = getCategoryInfo(account.category);
            const Icon = categoryInfo.icon;

            return (
              <div key={account.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => openLink(account.category, account.username, account.id)}
                    className={`${categoryInfo.color} p-3 rounded-lg hover:opacity-80 transition-opacity relative group`}
                    title="Mở trang + Copy tài khoản"
                  >
                    <Icon className="w-6 h-6 text-white" />
                    {copiedId === `quick-login-${account.id}` && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        Đã copy tài khoản!
                      </div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">{categoryInfo.name}</span>
                      {account.note && <span className="text-xs text-gray-400">• {account.note}</span>}
                      {account.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    </div>

                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Tên đăng nhập</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 truncate">{account.username}</p>
                        <button
                          onClick={() => copyToClipboard(account.username, `user-${account.id}`)}
                          className="text-gray-500 hover:text-indigo-600 flex-shrink-0"
                          title="Sao chép"
                        >
                          {copiedId === `user-${account.id}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600">Mật khẩu</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-gray-800">{showPassword[account.id] ? account.password : '••••••••'}</p>
                        <button
                          onClick={() => togglePasswordVisibility(account.id)}
                          className="text-gray-500 hover:text-indigo-600"
                          title={showPassword[account.id] ? 'Ẩn' : 'Hiện'}
                        >
                          {showPassword[account.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(account.password, `pass-${account.id}`)}
                          className="text-gray-500 hover:text-indigo-600"
                          title="Sao chép"
                        >
                          {copiedId === `pass-${account.id}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {account.twoFactorSecret && (
                      <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800">Mã 2FA</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-green-700 font-mono tracking-wider">{generateOTP(account.twoFactorSecret)}</p>
                          <button
                            onClick={() => copyToClipboard(generateOTP(account.twoFactorSecret || ''), `2fa-${account.id}`)}
                            className="text-green-600 hover:text-green-700"
                            title="Sao chép mã 2FA"
                          >
                            {copiedId === `2fa-${account.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-green-600 mt-1">Làm mới mỗi 30 giây</p>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => copyAll(account.username, account.password, account.twoFactorSecret, account.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                      >
                        {copiedId === `all-${account.id}` ? (
                          <>
                            <Check className="w-4 h-4" />
                            Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Sao chép tất cả
                          </>
                        )}
                      </button>

                      {['gmail', 'facebook', 'youtube', 'telegram'].includes(account.category) && (
                        <button
                          onClick={() => openChangePassword(account.category)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
                          title="Đổi mật khẩu"
                        >
                          <Key className="w-4 h-4" />
                          Đổi mật khẩu
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(account.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        account.isFavorite ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title="Yêu thích"
                    >
                      <Star className={`w-5 h-5 ${account.isFavorite ? 'fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => onEdit(account.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(account.id)}
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

export default PasswordsTab;
