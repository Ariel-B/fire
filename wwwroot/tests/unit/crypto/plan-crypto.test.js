/* eslint-env jest */

import { webcrypto } from 'node:crypto';

function decodeBase64(base64) {
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

function encodeBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

describe('plan crypto', () => {
  async function encryptWithIterations(plaintext, password, iterations) {
    const encoder = new TextEncoder();
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const passwordKey = await webcrypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await webcrypto.subtle.deriveKey({
      name: 'PBKDF2',
      salt: Uint8Array.from(salt).buffer,
      iterations,
      hash: 'SHA-256'
    }, passwordKey, {
      name: 'AES-GCM',
      length: 256
    }, false, ['encrypt']);
    const encrypted = await webcrypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: Uint8Array.from(iv).buffer
    }, key, encoder.encode(plaintext));

    return {
      encrypted: true,
      version: '1.0',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      kdfIterations: iterations,
      salt: encodeBase64(salt),
      iv: encodeBase64(iv),
      data: encodeBase64(new Uint8Array(encrypted))
    };
  }

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true
    });
  });

  test('encrypts and decrypts a plan without changing the plaintext', async () => {
    const { encryptPlan, decryptPlan } = await import('../../../js/crypto/plan-crypto.js');
    const plaintext = JSON.stringify({
      monthlyContribution: { amount: 5000, currency: 'USD' },
      grants: [{ numberOfShares: 1000, symbol: 'RSU' }]
    });

    const envelope = await encryptPlan(plaintext, 'test-password-123');
    const decrypted = await decryptPlan(envelope, 'test-password-123');

    expect(envelope).toMatchObject({
      encrypted: true,
      version: '1.0',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      kdfIterations: 600000
    });
    expect(decrypted).toBe(plaintext);
  });

  test('rejects the wrong password with an authentication failure', async () => {
    const { encryptPlan, decryptPlan } = await import('../../../js/crypto/plan-crypto.js');
    const envelope = await encryptPlan('{"sensitive":true}', 'correct-password-123');

    await expect(decryptPlan(envelope, 'wrong-password-123')).rejects.toMatchObject({
      name: 'OperationError'
    });
  });

  test('rejects tampered ciphertext data', async () => {
    const { encryptPlan, decryptPlan } = await import('../../../js/crypto/plan-crypto.js');
    const envelope = await encryptPlan('{"sensitive":true}', 'correct-password-123');
    const tamperedData = decodeBase64(envelope.data);
    tamperedData[0] = tamperedData[0] ^ 1;

    await expect(
      decryptPlan({ ...envelope, data: encodeBase64(tamperedData) }, 'correct-password-123')
    ).rejects.toMatchObject({
      name: 'OperationError'
    });
  });

  test('decrypts an envelope that uses a supported non-default PBKDF2 iteration count', async () => {
    const { decryptPlan } = await import('../../../js/crypto/plan-crypto.js');
    const plaintext = '{"compatibility":"future-kdf"}';
    const envelope = await encryptWithIterations(plaintext, 'test-password-123', 650000);

    await expect(decryptPlan(envelope, 'test-password-123')).resolves.toBe(plaintext);
  });

  test('detects encrypted envelopes and ignores legacy or invalid data', async () => {
    const { isEncryptedPlan } = await import('../../../js/crypto/plan-crypto.js');

    expect(isEncryptedPlan({
      encrypted: true,
      version: '1.0',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      kdfIterations: 600000,
      salt: 'salt',
      iv: 'iv',
      data: 'cipher'
    })).toBe(true);
    expect(isEncryptedPlan({
      encrypted: true,
      version: '1.0',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      kdfIterations: 9000000,
      salt: 'salt',
      iv: 'iv',
      data: 'cipher'
    })).toBe(false);
    expect(isEncryptedPlan({ birthDate: '1990-01-01' })).toBe(false);
    expect(isEncryptedPlan(null)).toBe(false);
    expect(isEncryptedPlan('garbage')).toBe(false);
  });
});
