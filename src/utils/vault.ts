export interface VaultKdf {
  salt: string;
  iterations: number;
}

export interface VaultCipher {
  iv: string;
  data: string;
}

export interface VaultV1 {
  v: 1;
  kdf: VaultKdf;
  cipher: VaultCipher;
}

export interface VaultV2 {
  v: 2;
  kdf: VaultKdf;
  dek: {
    pin: VaultCipher;
    os?: string;
  };
  data: VaultCipher;
}

export type VaultAny = VaultV1 | VaultV2;

export const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const base64UrlToBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const deriveVaultKey = async (password: string, saltBase64Url: string, iterations: number): Promise<CryptoKey> => {
  const salt = new Uint8Array(base64UrlToBuffer(saltBase64Url));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptVaultData = async <T>(key: CryptoKey, data: T): Promise<VaultCipher> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv: bufferToBase64Url(iv.buffer),
    data: bufferToBase64Url(ciphertext)
  };
};

export const decryptVaultData = async <T>(key: CryptoKey, ivBase64Url: string, dataBase64Url: string): Promise<T> => {
  const iv = new Uint8Array(base64UrlToBuffer(ivBase64Url));
  const ciphertext = base64UrlToBuffer(dataBase64Url);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext)) as T;
};

const isValidCipher = (c: any): c is VaultCipher => {
  return !!(c && typeof c === 'object' && typeof c.iv === 'string' && typeof c.data === 'string');
};

const isValidKdf = (k: any): k is VaultKdf => {
  return !!(k && typeof k === 'object' && typeof k.salt === 'string' && typeof k.iterations === 'number');
};

export const isValidVaultAny = (obj: any): obj is VaultAny => {
  if (!obj || typeof obj !== 'object') return false;
  if (!isValidKdf(obj.kdf)) return false;

  if (obj.v === 2) {
    if (!obj.dek || typeof obj.dek !== 'object') return false;
    if (!isValidCipher(obj.dek.pin)) return false;
    if (obj.dek.os != null && typeof obj.dek.os !== 'string') return false;
    if (!isValidCipher(obj.data)) return false;
    return true;
  }

  if (obj.v === 1 || obj.v == null) {
    return isValidCipher(obj.cipher);
  }

  return false;
};

export const readVaultFromStorage = (storageKey = 'vault'): VaultAny | null => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const candidate: any = JSON.parse(raw);
    if (!isValidVaultAny(candidate)) return null;
    if (candidate.v === 2) return candidate as VaultV2;
    return { v: 1, kdf: candidate.kdf, cipher: candidate.cipher } as VaultV1;
  } catch {
    return null;
  }
};

export const writeVaultToStorage = (vaultObj: VaultAny, storageKey = 'vault'): void => {
  localStorage.setItem(storageKey, JSON.stringify(vaultObj));
};

export const generateDataKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']) as Promise<CryptoKey>;
};

export const exportKeyBase64Url = async (key: CryptoKey): Promise<string> => {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(raw as ArrayBuffer);
};

export const importDataKeyFromBase64Url = async (base64url: string): Promise<CryptoKey> => {
  const raw = base64UrlToBuffer(base64url);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export const createVaultV2 = async <T>(
  pin: string,
  payload: T,
  opts?: { iterations?: number; kdfSaltBase64Url?: string }
): Promise<{ vault: VaultV2; dekBase64Url: string }> => {
  const iterations = opts?.iterations ?? 210000;
  const salt = opts?.kdfSaltBase64Url ?? bufferToBase64Url(crypto.getRandomValues(new Uint8Array(16)).buffer);

  const pinKey = await deriveVaultKey(pin, salt, iterations);
  const dekKey = await generateDataKey();
  const dekBase64Url = await exportKeyBase64Url(dekKey);

  const data = await encryptVaultData(dekKey, payload);
  const pinWrappedDek = await encryptVaultData(pinKey, { dek: dekBase64Url });

  return {
    vault: {
      v: 2,
      kdf: { salt, iterations },
      dek: { pin: pinWrappedDek },
      data
    },
    dekBase64Url
  };
};

export const unlockVaultV2WithPin = async <T>(
  vault: VaultV2,
  pin: string
): Promise<{ payload: T; dekKey: CryptoKey; dekBase64Url: string }> => {
  const pinKey = await deriveVaultKey(pin, vault.kdf.salt, vault.kdf.iterations);
  const wrapped = await decryptVaultData<{ dek: string }>(pinKey, vault.dek.pin.iv, vault.dek.pin.data);
  const dekBase64Url = String(wrapped?.dek || '');
  const dekKey = await importDataKeyFromBase64Url(dekBase64Url);
  const payload = await decryptVaultData<T>(dekKey, vault.data.iv, vault.data.data);
  return { payload, dekKey, dekBase64Url };
};

export const unlockVaultV2WithDek = async <T>(vault: VaultV2, dekBase64Url: string): Promise<{ payload: T; dekKey: CryptoKey }> => {
  const dekKey = await importDataKeyFromBase64Url(dekBase64Url);
  const payload = await decryptVaultData<T>(dekKey, vault.data.iv, vault.data.data);
  return { payload, dekKey };
};

export const migrateV1ToV2 = async <T>(
  vaultV1: VaultV1,
  pin: string
): Promise<{ vault: VaultV2; dekBase64Url: string }> => {
  const key = await deriveVaultKey(pin, vaultV1.kdf.salt, vaultV1.kdf.iterations);
  const payload = await decryptVaultData<T>(key, vaultV1.cipher.iv, vaultV1.cipher.data);
  return createVaultV2<T>(pin, payload, { iterations: vaultV1.kdf.iterations, kdfSaltBase64Url: vaultV1.kdf.salt });
};
