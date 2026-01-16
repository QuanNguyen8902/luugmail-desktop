const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const cleanBase32 = (input: string) => input.replace(/\s+/g, '').toUpperCase().replace(/=+$/g, '');

const hmacKeyCache = new Map<string, CryptoKey>();

const base32ToBytes = (input: string): Uint8Array => {
  const s = cleanBase32(input);
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (let i = 0; i < s.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(s[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
};

const intToBytes8 = (counter: number): Uint8Array => {
  const buf = new Uint8Array(8);
  let x = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = x & 0xff;
    x = Math.floor(x / 256);
  }
  return buf;
};

const hotp = async (secretBase32: string, counter: number, digits: number): Promise<string> => {
  const keyBytes = base32ToBytes(secretBase32);
  const counterBytes = intToBytes8(counter);

  let cryptoKey = hmacKeyCache.get(secretBase32);
  if (!cryptoKey) {
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    hmacKeyCache.set(secretBase32, cryptoKey);
  }

  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBytes.buffer as ArrayBuffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  const otp = String(binCode % mod).padStart(digits, '0');
  return otp;
};

export const totp = async (
  secretBase32: string,
  options?: { digits?: number; period?: number; timestamp?: number }
): Promise<string> => {
  const digits = options?.digits ?? 6;
  const period = options?.period ?? 30;
  const timestamp = options?.timestamp ?? Date.now();

  if (!secretBase32) return '';

  const counter = Math.floor(timestamp / 1000 / period);
  return hotp(secretBase32, counter, digits);
};

export const secondsRemaining = (period = 30, timestamp = Date.now()): number => {
  const sec = Math.floor(timestamp / 1000);
  const rem = period - (sec % period);
  return rem === period ? 0 : rem;
};
