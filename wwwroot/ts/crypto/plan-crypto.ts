export interface EncryptedEnvelope {
  encrypted: true;
  version: '1.0';
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2';
  kdfIterations: number;
  salt: string;
  iv: string;
  data: string;
}

const ENVELOPE_VERSION = '1.0' as const;
const ALGORITHM = 'AES-256-GCM' as const;
const KDF = 'PBKDF2' as const;
const KDF_ITERATIONS = 600000 as const;
const MIN_KDF_ITERATIONS = 100000;
const MAX_KDF_ITERATIONS = 2000000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

type GlobalWithBuffer = typeof globalThis & {
  Buffer?: {
    from: (data: ArrayBuffer | Uint8Array | string, encoding?: string) => {
      toString: (encoding: string) => string;
      [index: number]: number;
      length: number;
    };
  };
};

function getCryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    const chunkSize = 0x8000;
    const chunks: string[] = [];
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      chunks.push(String.fromCharCode(...chunk));
    }
    return btoa(chunks.join(''));
  }

  const buffer = (globalThis as GlobalWithBuffer).Buffer;
  if (buffer) {
    return buffer.from(bytes).toString('base64');
  }

  throw new Error('Base64 encoding is not available');
}

function isSupportedKdfIterations(value: unknown): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= MIN_KDF_ITERATIONS &&
    Number(value) <= MAX_KDF_ITERATIONS;
}

function getValidatedKdfIterations(value: unknown): number {
  if (!isSupportedKdfIterations(value)) {
    throw new Error('Unsupported PBKDF2 iteration count');
  }

  return value;
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  const buffer = (globalThis as GlobalWithBuffer).Buffer;
  if (buffer) {
    return Uint8Array.from(buffer.from(base64, 'base64'));
  }

  throw new Error('Base64 decoding is not available');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const cryptoApi = getCryptoApi();
  const encodedPassword = new TextEncoder().encode(password);
  const passwordKey = await cryptoApi.subtle.importKey(
    'raw',
    encodedPassword,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: getValidatedKdfIterations(iterations),
      hash: 'SHA-256'
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    usages
  );
}

export async function encryptPlan(plaintext: string, password: string): Promise<EncryptedEnvelope> {
  const cryptoApi = getCryptoApi();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesKey(password, salt, KDF_ITERATIONS, ['encrypt']);
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv)
    },
    key,
    encodedPlaintext
  );

  return {
    encrypted: true,
    version: ENVELOPE_VERSION,
    algorithm: ALGORITHM,
    kdf: KDF,
    kdfIterations: KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

export async function decryptPlan(envelope: EncryptedEnvelope, password: string): Promise<string> {
  const cryptoApi = getCryptoApi();
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.data);
  const key = await deriveAesKey(password, salt, envelope.kdfIterations, ['decrypt']);
  const decrypted = await cryptoApi.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv)
    },
    key,
    toArrayBuffer(ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}

export function isEncryptedPlan(data: unknown): data is EncryptedEnvelope {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const envelope = data as Partial<EncryptedEnvelope>;

  return envelope.encrypted === true &&
    envelope.version === ENVELOPE_VERSION &&
    envelope.algorithm === ALGORITHM &&
    envelope.kdf === KDF &&
    isSupportedKdfIterations(envelope.kdfIterations) &&
    typeof envelope.salt === 'string' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.data === 'string';
}
