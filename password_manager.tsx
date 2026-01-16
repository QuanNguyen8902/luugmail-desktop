import React, { useState, useEffect, useRef } from 'react';
import { Mail, Facebook, Youtube, Send, Globe, StickyNote, Briefcase, User, Lightbulb, Wrench } from 'lucide-react';
import type { Account, LoginHistoryItem, Note, WindowsTool } from './src/types';
import { totp } from './src/utils/totp';
import {
  bufferToBase64Url,
  base64UrlToBuffer,
  createVaultV2,
  decryptVaultData,
  encryptVaultData,
  migrateV1ToV2,
  readVaultFromStorage,
  unlockVaultV2WithDek,
  unlockVaultV2WithPin,
  writeVaultToStorage
} from './src/utils/vault';
import LockScreen from './src/features/auth/LockScreen';
import SettingsModal from './src/features/settings/SettingsModal';
import HistoryModal from './src/features/history/HistoryModal';
import AppHeader from './src/components/AppHeader';
import PasswordsTab from './src/features/passwords/PasswordsTab';
import NotesTab from './src/features/notes/NotesTab';
import ToolsTab from './src/features/tools/ToolsTab';

const PasswordManager = () => {
  type AccountDraft = Omit<Account, 'id'>;
  type NoteDraft = Omit<Note, 'id'>;
  type CategoryInfo = {
    id: Account['category'];
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };

  type NoteCategoryInfo = {
    id: Note['category'];
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };

  type VaultPayload = {
    accounts: Account[];
    notes: Note[];
    loginHistory: LoginHistoryItem[];
    createdAt?: number;
    updatedAt?: number;
  };

  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const vaultKeyRef = useRef(null);
  const vaultMetaRef = useRef(null);
  const vaultDekBase64UrlRef = useRef<string | null>(null);
  const vaultPinWrappedDekRef = useRef<any>(null);
  const otpBySecretRef = useRef<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [hasVault, setHasVault] = useState(false);
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [authError, setAuthError] = useState('');
  const [helloError, setHelloError] = useState('');
  const [isHelloUnlocking, setIsHelloUnlocking] = useState(false);
  const [isHelloAvailable, setIsHelloAvailable] = useState(false);
  const [hasHelloVaultKey, setHasHelloVaultKey] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [currentOTP, setCurrentOTP] = useState<Record<number, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'favorite'>('recent');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [autoLockTime, setAutoLockTime] = useState(5);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [useBiometric, setUseBiometric] = useState(false);
  const [activeTab, setActiveTab] = useState<'passwords' | 'notes' | 'tools'>('passwords');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [webauthnCredentialId, setWebauthnCredentialId] = useState('');
  const [tools, setTools] = useState<WindowsTool[]>([]);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | number | null>(null);
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    target: ''
  });
  const [toolNameTouched, setToolNameTouched] = useState(false);

  const [newAccount, setNewAccount] = useState<AccountDraft>({
    category: 'gmail',
    username: '',
    password: '',
    note: '',
    isFavorite: false,
    twoFactorSecret: '',
    createdAt: Date.now()
  });

  const [newNote, setNewNote] = useState<NoteDraft>({
    title: '',
    content: '',
    category: 'quick',
    isFavorite: false,
    todos: [],
    createdAt: Date.now()
  });

  const categories: CategoryInfo[] = [
    { id: 'gmail', name: 'Gmail', icon: Mail, color: 'bg-red-500' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-500' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-sky-500' },
    { id: 'other', name: 'Khác', icon: Globe, color: 'bg-gray-500' }
  ];

  const VAULT_DEK_OS_KEY = 'vaultDekProtected';

  const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const base64ToBytes = (b64: string) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const saveDekToSafeStorage = async (dekBase64Url: string) => {
    if (!window.electronAPI?.vaultDekEncrypt) {
      return { ok: false, reason: 'electronAPI không khả dụng. Hãy chạy trong Electron (không phải browser).' };
    }
    try {
      const res = await window.electronAPI.vaultDekEncrypt(dekBase64Url);
      if (!res?.ok) return { ok: false, reason: res?.reason || 'Không thể encrypt khóa Vault.' };
      localStorage.setItem(VAULT_DEK_OS_KEY, String(res.data));
      setHasHelloVaultKey(true);
      return { ok: true, reason: '' };
    } catch (e: any) {
      return { ok: false, reason: `Không thể encrypt khóa Vault (IPC lỗi): ${String(e && e.message ? e.message : e)}` };
    }
  };

  const loadDekFromSafeStorage = async () => {
    if (!window.electronAPI?.vaultDekDecrypt) return null;
    try {
      const b64 = localStorage.getItem(VAULT_DEK_OS_KEY);
      if (!b64) return null;
      const res = await window.electronAPI.vaultDekDecrypt(b64);
      if (!res?.ok) return null;
      return String(res.data || '');
    } catch {
      return null;
    }
  };

  const noteCategories: NoteCategoryInfo[] = [
    { id: 'quick', name: 'Ghi chú nhanh', icon: StickyNote, color: 'bg-yellow-500' },
    { id: 'work', name: 'Công việc', icon: Briefcase, color: 'bg-blue-500' },
    { id: 'personal', name: 'Cá nhân', icon: User, color: 'bg-green-500' },
    { id: 'idea', name: 'Ý tưởng', icon: Lightbulb, color: 'bg-purple-500' }
  ];

  const defaultWindowsTools = [
    {
      id: 'cleanmgr',
      name: 'Disk Cleanup (cleanmgr)',
      description: 'Dọn rác hệ thống (Disk Cleanup).',
      target: 'cleanmgr'
    },
    {
      id: 'taskmgr',
      name: 'Task Manager',
      description: 'Quản lý tiến trình, tắt app đang treo.',
      target: 'taskmgr'
    },
    {
      id: 'services',
      name: 'Services',
      description: 'Quản lý các dịch vụ Windows (services.msc).',
      target: 'services.msc'
    },
    {
      id: 'eventvwr',
      name: 'Event Viewer',
      description: 'Xem log hệ thống (eventvwr.msc).',
      target: 'eventvwr.msc'
    },
    {
      id: 'msinfo32',
      name: 'System Information',
      description: 'Thông tin hệ thống chi tiết (msinfo32).',
      target: 'msinfo32'
    },
    {
      id: 'appwiz',
      name: 'Programs and Features',
      description: 'Gỡ cài đặt phần mềm (appwiz.cpl).',
      target: 'appwiz.cpl'
    },
    {
      id: 'sysdm',
      name: 'System Properties',
      description: 'Thuộc tính hệ thống (sysdm.cpl).',
      target: 'sysdm.cpl'
    },
    {
      id: 'dfrgui',
      name: 'Optimize Drives',
      description: 'Tối ưu/defrag ổ đĩa (dfrgui).',
      target: 'dfrgui'
    },
    {
      id: 'storage',
      name: 'Storage Settings',
      description: 'Mở Storage Sense (ms-settings:storagesense).',
      target: 'ms-settings:storagesense'
    },
    {
      id: 'windowsupdate',
      name: 'Windows Update',
      description: 'Mở trang Windows Update (ms-settings:windowsupdate).',
      target: 'ms-settings:windowsupdate'
    }
  ];

  // Load dữ liệu khi khởi động
  useEffect(() => {
    const legacyPin = localStorage.getItem('savedPin');
    const legacyAccounts = localStorage.getItem('accounts');
    const legacyNotes = localStorage.getItem('notes');
    const legacyHistory = localStorage.getItem('loginHistory');
    const storedAutoLock = localStorage.getItem('autoLockTime');
    const storedBiometric = localStorage.getItem('useBiometric');
    const storedCredentialId = localStorage.getItem('webauthnCredentialId');
    const storedTools = localStorage.getItem('windowsTools');

    const vault = readVaultFromStorage();
    const vaultLooksValid = !!vault;

    const legacyExists = !!(legacyPin || legacyAccounts || legacyNotes || legacyHistory);
    setHasVault(vaultLooksValid);
    setHasLegacyData(legacyExists && !vaultLooksValid);

    const hasOsWrapped = !!localStorage.getItem(VAULT_DEK_OS_KEY);
    setHasHelloVaultKey(hasOsWrapped);

    if (vaultLooksValid && legacyExists) {
      localStorage.removeItem('savedPin');
      localStorage.removeItem('accounts');
      localStorage.removeItem('notes');
      localStorage.removeItem('loginHistory');
    }

    if (storedAutoLock) setAutoLockTime(parseInt(storedAutoLock));
    if (storedBiometric) setUseBiometric(storedBiometric === 'true');
    if (storedCredentialId) setWebauthnCredentialId(storedCredentialId);
    if (storedTools) {
      try {
        const parsed = JSON.parse(storedTools);
        if (Array.isArray(parsed)) {
          setTools(parsed);
        } else {
          setTools(defaultWindowsTools);
        }
      } catch {
        setTools(defaultWindowsTools);
      }
    } else {
      setTools(defaultWindowsTools);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const checkHello = async () => {
      try {
        if (!window.PublicKeyCredential) return;
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsHelloAvailable(!!available);
      } catch {
        setIsHelloAvailable(false);
      }
    };
    checkHello();
  }, []);

  const setupWindowsHello = async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      alert('Thiết bị/trình duyệt không hỗ trợ Windows Hello (WebAuthn)!');
      return;
    }

    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        alert('Máy chưa bật Windows Hello hoặc không có vân tay/Face/PIN!');
        return;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          rp: { name: 'LuuGmail Desktop' },
          user: { id: userId, name: 'local-user', displayName: 'Local User' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'none',
          challenge
        }
      }) as PublicKeyCredential | null;

      if (!credential) {
        alert('Thiết lập Windows Hello thất bại!');
        return;
      }

      const id = bufferToBase64Url(credential.rawId);
      setWebauthnCredentialId(id);
      localStorage.setItem('webauthnCredentialId', id);
      setUseBiometric(true);
      localStorage.setItem('useBiometric', 'true');

      if (vaultDekBase64UrlRef.current) {
        const res = await saveDekToSafeStorage(vaultDekBase64UrlRef.current);
        if (!res.ok) {
          alert(`Thiết lập Windows Hello xong nhưng chưa lưu được khóa Vault vào Windows.\n\nLý do: ${res.reason}`);
        }
      }

      addLoginHistory('Thiết lập Windows Hello');
      alert('Thiết lập Windows Hello thành công!');
    } catch (error) {
      alert('Thiết lập Windows Hello thất bại!');
    }
  };

  const titleCase = (s) => {
    const normalized = String(s || '').trim().replace(/[-_]+/g, ' ');
    if (!normalized) return '';
    return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const suggestToolNameFromTarget = (target) => {
    const raw = String(target || '').trim();
    if (!raw) return '';

    const main = raw.split(/\s+/)[0];
    const lower = main.toLowerCase();
    const known = {
      cleanmgr: 'Disk Cleanup (cleanmgr)',
      taskmgr: 'Task Manager',
      'services.msc': 'Services (services.msc)',
      'eventvwr.msc': 'Event Viewer (eventvwr.msc)',
      msinfo32: 'System Information (msinfo32)',
      'appwiz.cpl': 'Programs and Features (appwiz.cpl)',
      'sysdm.cpl': 'System Properties (sysdm.cpl)',
      dfrgui: 'Optimize Drives (dfrgui)',
      'ms-settings:storagesense': 'Storage Settings (ms-settings:storagesense)',
      'ms-settings:windowsupdate': 'Windows Update (ms-settings:windowsupdate)'
    };

    if (known[lower]) return known[lower];

    if (lower.startsWith('ms-settings:')) {
      const page = main.slice('ms-settings:'.length);
      const readable = titleCase(page);
      return readable ? `Cài đặt: ${readable}` : `Cài đặt: ${main}`;
    }

    const base = main.replace(/\.(msc|cpl)$/i, '');
    const readable = titleCase(base);
    if (!readable) return main;
    if (readable.toLowerCase() === main.toLowerCase()) return readable;
    return `${readable} (${main})`;
  };

  const resetWindowsHello = () => {
    if (window.confirm('Bạn có chắc muốn xóa thiết lập Windows Hello?')) {
      setWebauthnCredentialId('');
      localStorage.removeItem('webauthnCredentialId');
      setUseBiometric(false);
      localStorage.setItem('useBiometric', 'false');
      localStorage.removeItem(VAULT_DEK_OS_KEY);
      setHasHelloVaultKey(false);
      addLoginHistory('Xóa thiết lập Windows Hello');
    }
  };

  const runWindowsTool = async (tool) => {
    if (!window.electronAPI?.runWindowsTool) {
      alert('Tab Công cụ chỉ chạy được trong app Desktop (Electron).');
      return;
    }

    const ok = window.confirm(`Chạy công cụ: ${tool.name}?`);
    if (!ok) return;

    try {
      const res = await window.electronAPI.runWindowsTool(String(tool.target || ''));
      if (!res?.ok) {
        alert(res?.reason || 'Không chạy được công cụ này.');
        return;
      }
      addLoginHistory(`Chạy công cụ: ${tool.name}`);
    } catch (e) {
      alert('Không thể chạy lệnh trong môi trường hiện tại.');
    }
  };

  const handleAddTool = () => {
    if (!newTool.name || !newTool.target) {
      alert('Vui lòng nhập tên và lệnh/target!');
      return;
    }
    const tool = {
      id: Date.now(),
      name: newTool.name,
      description: newTool.description || '',
      target: newTool.target
    };
    setTools([tool, ...tools]);
    setNewTool({ name: '', description: '', target: '' });
    setToolNameTouched(false);
    setIsAddingTool(false);
    addLoginHistory(`Thêm công cụ: ${tool.name}`);
  };

  const handleEditTool = (id) => {
    const tool = tools.find(t => t.id === id);
    if (!tool) return;
    setNewTool({
      name: tool.name || '',
      description: tool.description || '',
      target: tool.target || ''
    });
    setToolNameTouched(false);
    setEditingToolId(id);
    setIsAddingTool(true);
  };

  const handleUpdateTool = () => {
    if (!editingToolId) return;
    if (!newTool.name || !newTool.target) {
      alert('Vui lòng nhập tên và lệnh/target!');
      return;
    }
    setTools(tools.map(t =>
      t.id === editingToolId
        ? { ...t, name: newTool.name, description: newTool.description || '', target: newTool.target }
        : t
    ));
    addLoginHistory(`Cập nhật công cụ: ${newTool.name}`);
    setNewTool({ name: '', description: '', target: '' });
    setIsAddingTool(false);
    setEditingToolId(null);
  };

  const handleDeleteTool = (id) => {
    const tool = tools.find(t => t.id === id);
    if (!tool) return;
    if (window.confirm(`Xóa công cụ: ${tool.name}?`)) {
      setTools(tools.filter(t => t.id !== id));
      addLoginHistory(`Xóa công cụ: ${tool.name}`);
    }
  };

  // Lưu accounts và notes vào localStorage
  useEffect(() => {
    if (!isHydrated) return;
    if (isLocked) return;
    if (!vaultKeyRef.current || !vaultMetaRef.current) return;
    if (!vaultPinWrappedDekRef.current) return;

    const persist = async () => {
      try {
        const meta = vaultMetaRef.current;
        const payload = {
          accounts,
          notes,
          loginHistory,
          updatedAt: Date.now()
        };
        const cipher = await encryptVaultData(vaultKeyRef.current, payload);
        writeVaultToStorage({ v: 2, kdf: meta, dek: { pin: vaultPinWrappedDekRef.current, os: hasHelloVaultKey ? 'safeStorage' : undefined }, data: cipher });
      } catch {
      }
    };
    persist();
  }, [accounts, notes, loginHistory, isHydrated, isLocked, hasHelloVaultKey]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('windowsTools', JSON.stringify(tools));
  }, [tools, isHydrated]);

  // Auto lock
  useEffect(() => {
    if (!isLocked && autoLockTime > 0) {
      const checkInactivity = setInterval(() => {
        const inactiveTime = (Date.now() - lastActivityTime) / 1000 / 60;
        if (inactiveTime >= autoLockTime) {
          handleLock();
        }
      }, 10000);
      
      return () => clearInterval(checkInactivity);
    }
  }, [isLocked, lastActivityTime, autoLockTime]);

  // Cập nhật activity time
  useEffect(() => {
    const updateActivity = () => setLastActivityTime(Date.now());
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    
    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, []);

  const handleUnlock = async () => {
    if (pin.length < 6) {
      setAuthError('Mật khẩu phải có ít nhất 6 ký tự!');
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
      return;
    }

    const iterations = 210000;

    if (!hasVault) {
      const legacyPin = localStorage.getItem('savedPin') || '';
      const legacyAccountsRaw = localStorage.getItem('accounts');
      const legacyNotesRaw = localStorage.getItem('notes');
      const legacyHistoryRaw = localStorage.getItem('loginHistory');
      const legacyExists = !!(legacyPin || legacyAccountsRaw || legacyNotesRaw || legacyHistoryRaw);

      if (legacyExists && legacyPin && pin !== legacyPin) {
        setAuthError('Mật khẩu không đúng!');
        setPin('');
        setTimeout(() => pinInputRef.current?.focus?.(), 0);
        return;
      }

      let migratedAccounts = [];
      let migratedNotes = [];
      let migratedHistory = [];
      if (legacyExists) {
        try {
          migratedAccounts = legacyAccountsRaw ? JSON.parse(legacyAccountsRaw) : [];
        } catch {
          migratedAccounts = [];
        }
        try {
          migratedNotes = legacyNotesRaw ? JSON.parse(legacyNotesRaw) : [];
        } catch {
          migratedNotes = [];
        }
        try {
          migratedHistory = legacyHistoryRaw ? JSON.parse(legacyHistoryRaw) : [];
        } catch {
          migratedHistory = [];
        }
      }

      const payload = {
        accounts: Array.isArray(migratedAccounts) ? migratedAccounts : [],
        notes: Array.isArray(migratedNotes) ? migratedNotes : [],
        loginHistory: Array.isArray(migratedHistory) ? migratedHistory : [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const firstEvent = {
        id: Date.now(),
        action: legacyExists ? 'Nâng cấp bảo mật dữ liệu' : 'Tạo mật khẩu lần đầu',
        timestamp: new Date().toLocaleString('vi-VN')
      };
      payload.loginHistory = [firstEvent, ...(payload.loginHistory || [])].slice(0, 50);

      const created = await createVaultV2(pin, payload, { iterations });
      writeVaultToStorage(created.vault);

      const unlocked = await unlockVaultV2WithPin<VaultPayload>(created.vault, pin);
      vaultKeyRef.current = unlocked.dekKey;
      vaultMetaRef.current = created.vault.kdf;
      vaultDekBase64UrlRef.current = unlocked.dekBase64Url;
      vaultPinWrappedDekRef.current = created.vault.dek.pin;

      if (useBiometric && webauthnCredentialId) {
        const res = await saveDekToSafeStorage(unlocked.dekBase64Url);
        if (!res.ok) {
          setHelloError(res.reason);
        }
      }

      localStorage.removeItem('savedPin');
      localStorage.removeItem('accounts');
      localStorage.removeItem('notes');
      localStorage.removeItem('loginHistory');

      setAccounts(payload.accounts);
      setNotes(payload.notes);
      setLoginHistory(payload.loginHistory);
      setHasVault(true);
      setHasLegacyData(false);
      setIsLocked(false);
      setPin('');
      setAuthError('');
      return;
    }

    try {
      const vault = readVaultFromStorage();
      if (!vault) {
        setAuthError('Dữ liệu bị lỗi hoặc chưa thiết lập!');
        setPin('');
        setTimeout(() => pinInputRef.current?.focus?.(), 0);
        return;
      }
      let vaultV2: any = vault;
      if (vault.v === 1) {
        const migrated = await migrateV1ToV2<VaultPayload>(vault as any, pin);
        writeVaultToStorage(migrated.vault);
        vaultV2 = migrated.vault;
        vaultDekBase64UrlRef.current = migrated.dekBase64Url;
        vaultPinWrappedDekRef.current = migrated.vault.dek.pin;
        if (useBiometric && webauthnCredentialId) {
          const res = await saveDekToSafeStorage(migrated.dekBase64Url);
          if (!res.ok) {
            setHelloError(res.reason);
          }
        }
      }

      const unlocked = await unlockVaultV2WithPin<VaultPayload>(vaultV2, pin);
      const decrypted = unlocked.payload;

      const loginEvent = {
        id: Date.now(),
        action: 'Đăng nhập bằng PIN',
        timestamp: new Date().toLocaleString('vi-VN')
      };
      const nextHistory = [loginEvent, ...((Array.isArray(decrypted.loginHistory) ? decrypted.loginHistory : []))].slice(0, 50);

      vaultKeyRef.current = unlocked.dekKey;
      vaultMetaRef.current = vaultV2.kdf;
      vaultDekBase64UrlRef.current = unlocked.dekBase64Url;
      vaultPinWrappedDekRef.current = vaultV2.dek.pin;

      if (useBiometric && webauthnCredentialId) {
        const res = await saveDekToSafeStorage(unlocked.dekBase64Url);
        if (!res.ok) {
          setHelloError(res.reason);
        }
      }
      setAccounts(Array.isArray(decrypted.accounts) ? decrypted.accounts : []);
      setNotes(Array.isArray(decrypted.notes) ? decrypted.notes : []);
      setLoginHistory(nextHistory);
      setIsLocked(false);
      setPin('');
      setAuthError('');
    } catch {
      setAuthError('Mật khẩu không đúng!');
      setPin('');
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    }
  };

  const handleBiometricUnlock = async () => {
    setHelloError('');
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setHelloError('Thiết bị/trình duyệt không hỗ trợ Windows Hello (WebAuthn)!');
      return;
    }

    if (isHelloUnlocking) return;
    setIsHelloUnlocking(true);

    try {
      const available = isHelloAvailable || await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setHelloError('Máy chưa bật Windows Hello hoặc không có vân tay/Face/PIN!');
        return;
      }

      if (!webauthnCredentialId) {
        setHelloError('Bạn chưa thiết lập Windows Hello trong Cài đặt!');
        return;
      }

      const vault = readVaultFromStorage();
      if (!vault || vault.v !== 2) {
        setHelloError('Bạn cần mở bằng PIN 1 lần để nâng cấp Vault trước khi dùng Windows Hello.');
        return;
      }

      const dekBase64Url = await loadDekFromSafeStorage();
      if (!dekBase64Url) {
        setHelloError('Chưa có khóa Vault được bảo vệ bởi Windows. Hãy mở bằng PIN 1 lần và bật Windows Hello.');
        return;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 30000,
          userVerification: 'required',
          allowCredentials: [
            {
              id: base64UrlToBuffer(webauthnCredentialId),
              type: 'public-key',
              transports: ['internal']
            }
          ]
        }
      });

      if (!assertion) {
        setHelloError('Xác thực Windows Hello thất bại!');
        return;
      }

      const unlocked = await unlockVaultV2WithDek<VaultPayload>(vault as any, dekBase64Url);
      const loginEvent = {
        id: Date.now(),
        action: 'Đăng nhập bằng Windows Hello',
        timestamp: new Date().toLocaleString('vi-VN')
      };
      const nextHistory = [loginEvent, ...((Array.isArray(unlocked.payload.loginHistory) ? unlocked.payload.loginHistory : []))].slice(0, 50);

      vaultKeyRef.current = unlocked.dekKey;
      vaultMetaRef.current = (vault as any).kdf;
      vaultDekBase64UrlRef.current = dekBase64Url;
      vaultPinWrappedDekRef.current = (vault as any).dek.pin;

      setAccounts(Array.isArray(unlocked.payload.accounts) ? unlocked.payload.accounts : []);
      setNotes(Array.isArray(unlocked.payload.notes) ? unlocked.payload.notes : []);
      setLoginHistory(nextHistory);
      setIsLocked(false);
      setPin('');
      setAuthError('');
      setHasHelloVaultKey(true);
    } catch {
      setHelloError('Xác thực Windows Hello thất bại!');
    } finally {
      setIsHelloUnlocking(false);
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setPin('');
    setAuthError('');
    setHelloError('');
    setIsHelloUnlocking(false);
    setAccounts([]);
    setNotes([]);
    setLoginHistory([]);
    vaultKeyRef.current = null;
    vaultMetaRef.current = null;
    setIsAdding(false);
    setIsAddingNote(false);
    setEditingId(null);
    setEditingNoteId(null);
    setShowSettings(false);
    setShowHistory(false);
  };

  const addLoginHistory = (action) => {
    const newHistory = {
      id: Date.now(),
      action,
      timestamp: new Date().toLocaleString('vi-VN')
    };
    setLoginHistory((prev) => [newHistory, ...(Array.isArray(prev) ? prev : [])].slice(0, 50));
  };

  const handleAddAccount = () => {
    if (newAccount.username && newAccount.password) {
      setAccounts([...accounts, { ...newAccount, id: Date.now(), createdAt: Date.now() }]);
      setNewAccount({ category: 'gmail', username: '', password: '', note: '', isFavorite: false, twoFactorSecret: '', createdAt: Date.now() });
      setIsAdding(false);
      addLoginHistory(`Thêm tài khoản ${newAccount.category}`);
    }
  };

  const handleDeleteAccount = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa tài khoản này?')) {
      const account = accounts.find(acc => acc.id === id);
      setAccounts(accounts.filter(acc => acc.id !== id));
      addLoginHistory(`Xóa tài khoản ${account.category}`);
    }
  };

  const handleEditAccount = (id) => {
    const account = accounts.find(acc => acc.id === id);
    if (!account) return;
    setNewAccount({
      category: account.category,
      username: account.username,
      password: account.password,
      note: account.note || '',
      isFavorite: !!account.isFavorite,
      twoFactorSecret: account.twoFactorSecret || '',
      createdAt: account.createdAt || Date.now()
    });
    setEditingId(id);
    setIsAdding(true);
  };

  const handleUpdateAccount = () => {
    setAccounts(accounts.map(acc => 
      acc.id === editingId ? { ...newAccount, id: editingId } : acc
    ));
    const account = accounts.find(acc => acc.id === editingId);
    addLoginHistory(`Cập nhật tài khoản ${account.category}`);
    setNewAccount({ category: 'gmail', username: '', password: '', note: '', isFavorite: false, twoFactorSecret: '', createdAt: Date.now() });
    setIsAdding(false);
    setEditingId(null);
  };

  const toggleFavorite = (id) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, isFavorite: !acc.isFavorite } : acc
    ));
  };

  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[4];
  };

  // Hàm tạo mã OTP từ secret key
  const generateOTP = (secret) => {
    const key = String(secret || '').replace(/\s/g, '').toUpperCase();
    if (!key) return '';
    return otpBySecretRef.current[key] || '';
  };

  // Cập nhật OTP mỗi giây
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const byId: Record<number, string> = {};
      const bySecret: Record<string, string> = {};

      const items = accounts
        .filter(acc => !!acc.twoFactorSecret)
        .map(acc => ({ id: acc.id, secret: String(acc.twoFactorSecret || '').replace(/\s/g, '').toUpperCase() }));

      const results = await Promise.all(
        items.map(async (it) => {
          try {
            const code = await totp(it.secret, { digits: 6, period: 30 });
            return { ...it, code };
          } catch {
            return { ...it, code: '' };
          }
        })
      );

      for (const r of results) {
        byId[r.id] = r.code;
        if (r.secret) bySecret[r.secret] = r.code;
      }

      if (cancelled) return;
      otpBySecretRef.current = bySecret;
      setCurrentOTP(byId);
    };

    tick();
    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accounts]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const openLink = (category, username, accountId) => {
    navigator.clipboard.writeText(String(username || ''));
    
    const links = {
      gmail: `https://accounts.google.com/AccountChooser`,
      facebook: `https://www.facebook.com/login`,
      youtube: `https://accounts.google.com/AccountChooser`,
      telegram: `https://web.telegram.org`
    };
    
    if (links[category]) {
      window.open(links[category], '_blank');
      setCopiedId(`quick-login-${accountId}`);
      setTimeout(() => setCopiedId(null), 3000);
      addLoginHistory(`Mở ${category}`);
    }
  };

  const openChangePassword = (category) => {
    const changePasswordLinks = {
      gmail: 'https://myaccount.google.com/signinoptions/password',
      facebook: 'https://www.facebook.com/settings?tab=security&section=password',
      youtube: 'https://myaccount.google.com/signinoptions/password',
      telegram: 'https://telegram.org/faq#q-how-do-i-change-my-phone-number'
    };
    
    if (changePasswordLinks[category]) {
      window.open(changePasswordLinks[category], '_blank');
    }
  };

  const copyAll = (username, password, twoFactorSecret, accountId) => {
    let text = `${username}\n${password}`;
    if (twoFactorSecret) {
      const otp = generateOTP(twoFactorSecret);
      text += `\n${otp}`;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(`all-${accountId}`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const exportData = () => {
    const data = {
      accounts,
      notes,
      exportDate: new Date().toLocaleString('vi-VN'),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-backup-${Date.now()}.json`;
    a.click();
    addLoginHistory('Xuất dữ liệu');
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result) {
            throw new Error('Empty file result');
          }
          const text = typeof result === 'string' ? result : new TextDecoder().decode(result);
          const data = JSON.parse(text);
          if (data.accounts && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
          }
          if (data.notes && Array.isArray(data.notes)) {
            setNotes(data.notes);
          }
          alert('Nhập dữ liệu thành công!');
          addLoginHistory('Nhập dữ liệu');
        } catch (error) {
          alert('Lỗi khi đọc file!');
        }
      };
      reader.readAsText(file);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('autoLockTime', String(autoLockTime));
    localStorage.setItem('useBiometric', String(useBiometric));
    setShowSettings(false);
    alert('Đã lưu cài đặt!');
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

  const getAccountStats = () => {
    const stats = {};
    categories.forEach(cat => {
      stats[cat.id] = accounts.filter(acc => acc.category === cat.id).length;
    });
    return stats;
  };

  // Note functions
  const handleAddNote = () => {
    if (newNote.title) {
      setNotes([...notes, { ...newNote, id: Date.now(), createdAt: Date.now() }]);
      setNewNote({ title: '', content: '', category: 'quick', isFavorite: false, todos: [], createdAt: Date.now() });
      setIsAddingNote(false);
      addLoginHistory(`Thêm ghi chú: ${newNote.title}`);
    }
  };

  const handleDeleteNote = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa ghi chú này?')) {
      const note = notes.find(n => n.id === id);
      setNotes(notes.filter(n => n.id !== id));
      addLoginHistory(`Xóa ghi chú: ${note.title}`);
    }
  };

  const handleEditNote = (id) => {
    const note = notes.find(n => n.id === id);
    setNewNote({
      title: note?.title || '',
      content: note?.content || '',
      category: note?.category || 'quick',
      isFavorite: !!note?.isFavorite,
      todos: Array.isArray(note?.todos) ? note.todos : [],
      createdAt: note?.createdAt || Date.now()
    });
    setEditingNoteId(id);
    setIsAddingNote(true);
  };

  const handleUpdateNote = () => {
    setNotes(notes.map(n => 
      n.id === editingNoteId ? { ...newNote, id: editingNoteId } : n
    ));
    addLoginHistory(`Cập nhật ghi chú: ${newNote.title}`);
    setNewNote({ title: '', content: '', category: 'quick', isFavorite: false, todos: [], createdAt: Date.now() });
    setIsAddingNote(false);
    setEditingNoteId(null);
  };

  const toggleNoteFavorite = (id) => {
    setNotes(notes.map(n => 
      n.id === id ? { ...n, isFavorite: !n.isFavorite } : n
    ));
  };

  const addTodoItem = () => {
    setNewNote({
      ...newNote,
      todos: [...newNote.todos, { id: Date.now(), text: '', completed: false }]
    });
  };

  const updateTodoItem = (todoId, text) => {
    setNewNote({
      ...newNote,
      todos: newNote.todos.map(todo =>
        todo.id === todoId ? { ...todo, text } : todo
      )
    });
  };

  const toggleTodoDraftItem = (todoId) => {
    setNewNote({
      ...newNote,
      todos: newNote.todos.map(todo =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };

  const toggleTodoItem = (noteId, todoId) => {
    setNotes(notes.map(n =>
      n.id === noteId ? {
        ...n,
        todos: (Array.isArray(n.todos) ? n.todos : []).map(todo =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        )
      } : n
    ));
  };

  const deleteTodoItem = (todoId) => {
    setNewNote({
      ...newNote,
      todos: newNote.todos.filter(todo => todo.id !== todoId)
    });
  };

  if (isLocked) {
    const needsSetup = !hasVault && !hasLegacyData;
    return (
      <LockScreen
        pin={pin}
        setPin={(v) => {
          setPin(v);
          if (authError) setAuthError('');
        }}
        showPin={!!showPassword['mainPin']}
        toggleShowPin={() => setShowPassword(prev => ({ ...prev, mainPin: !prev.mainPin }))}
        authError={authError}
        needsSetup={needsSetup}
        onUnlock={handleUnlock}
        isUnlockDisabled={pin.length < 6}
        hasVault={hasVault}
        useBiometric={useBiometric}
        webauthnCredentialId={webauthnCredentialId}
        isHelloAvailable={isHelloAvailable}
        isHelloUnlocking={isHelloUnlocking}
        helloError={helloError}
        onBiometricUnlock={handleBiometricUnlock}
        pinInputRef={pinInputRef}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        activeTab={activeTab}
        accountsCount={accounts.length}
        accountsFavoriteCount={accounts.filter(a => a.isFavorite).length}
        notesCount={notes.length}
        notesFavoriteCount={notes.filter(n => n.isFavorite).length}
        toolsCount={tools.length}
        onShowHistory={() => setShowHistory(true)}
        onShowSettings={() => setShowSettings(true)}
        onAdd={() => {
          if (activeTab === 'passwords') {
            setIsAdding(true);
          } else if (activeTab === 'notes') {
            setIsAddingNote(true);
          }
        }}
        onLock={handleLock}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsAdding(false);
          setIsAddingNote(false);
        }}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <SettingsModal
          open={showSettings}
          autoLockTime={autoLockTime}
          setAutoLockTime={setAutoLockTime}
          useBiometric={useBiometric}
          setUseBiometric={setUseBiometric}
          webauthnCredentialId={webauthnCredentialId}
          setupWindowsHello={setupWindowsHello}
          resetWindowsHello={resetWindowsHello}
          exportData={exportData}
          importData={importData}
          saveSettings={saveSettings}
          onClose={() => setShowSettings(false)}
        />

        <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} loginHistory={loginHistory} />

        {activeTab === 'passwords' && (
          <PasswordsTab
            categories={categories}
            accounts={accounts}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isAdding={isAdding}
            editingId={editingId}
            newAccount={newAccount}
            setNewAccount={setNewAccount}
            onSubmit={() => (editingId ? handleUpdateAccount() : handleAddAccount())}
            onCancel={() => {
              setIsAdding(false);
              setEditingId(null);
              setNewAccount({ category: 'gmail', username: '', password: '', note: '', isFavorite: false, twoFactorSecret: '', createdAt: Date.now() });
            }}
            copiedId={copiedId}
            showPassword={showPassword}
            togglePasswordVisibility={togglePasswordVisibility}
            copyToClipboard={copyToClipboard}
            copyAll={copyAll}
            openLink={openLink}
            openChangePassword={openChangePassword}
            toggleFavorite={toggleFavorite}
            onEdit={handleEditAccount}
            onDelete={handleDeleteAccount}
            generateOTP={generateOTP}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            noteCategories={noteCategories}
            notes={notes}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isAddingNote={isAddingNote}
            editingNoteId={editingNoteId}
            newNote={newNote}
            setNewNote={setNewNote}
            addTodoItem={addTodoItem}
            toggleTodoDraftItem={toggleTodoDraftItem}
            updateTodoItem={updateTodoItem}
            deleteTodoItem={deleteTodoItem}
            onSubmit={() => (editingNoteId ? handleUpdateNote() : handleAddNote())}
            onCancel={() => {
              setIsAddingNote(false);
              setEditingNoteId(null);
              setNewNote({ title: '', content: '', category: 'quick', isFavorite: false, todos: [], createdAt: Date.now() });
            }}
            copiedId={copiedId}
            copyToClipboard={copyToClipboard}
            toggleTodoItem={toggleTodoItem}
            toggleNoteFavorite={toggleNoteFavorite}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsTab
            tools={tools}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isAddingTool={isAddingTool}
            setIsAddingTool={setIsAddingTool}
            editingToolId={editingToolId}
            setEditingToolId={setEditingToolId}
            newTool={newTool}
            setNewTool={setNewTool}
            toolNameTouched={toolNameTouched}
            setToolNameTouched={setToolNameTouched}
            suggestToolNameFromTarget={suggestToolNameFromTarget}
            handleAddTool={handleAddTool}
            handleUpdateTool={handleUpdateTool}
            handleEditTool={handleEditTool}
            handleDeleteTool={handleDeleteTool}
            runWindowsTool={runWindowsTool}
          />
        )}
      </div>
    </div>
  );
};

export default PasswordManager;