import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, arrayBufferToBase64, base64ToArrayBuffer } from '../services/encryption';

describe('Encryption Service', () => {
    const passphrase = 'my-secret-vault-key';
    const testData = 'This is a sensitive transcript.';

    it('should encrypt and decrypt a string correctly', async () => {
        const encrypted = await encryptData(testData, passphrase);
        expect(encrypted instanceof Uint8Array).toBe(true);
        expect(encrypted.length).toBeGreaterThan(testData.length);

        const decrypted = await decryptData(encrypted, passphrase);
        expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with the wrong passphrase', async () => {
        const encrypted = await encryptData(testData, passphrase);
        await expect(decryptData(encrypted, 'wrong-password')).rejects.toThrow('DECRYPTION_FAILED');
    });

    it('should produce different ciphertext for the same input (unique salt/iv)', async () => {
        const enc1 = await encryptData(testData, passphrase);
        const enc2 = await encryptData(testData, passphrase);

        expect(arrayBufferToBase64(enc1)).not.toBe(arrayBufferToBase64(enc2));
    });

    it('should handle Base64 conversion helpers', () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const b64 = arrayBufferToBase64(data);
        const back = base64ToArrayBuffer(b64);
        expect(back).toEqual(data);
    });

    it('should handle arrayBufferToBase64 on large buffers without stack overflow', async () => {
        // Regression guard: the old spread-based implementation throws
        // "Maximum call stack size exceeded" for payloads > ~65,535 bytes.
        // Encrypted sessions are typically 50-500KB, so this must work reliably.
        const largeData = new Uint8Array(200_000).fill(0xAB);
        // Should NOT throw
        const b64 = arrayBufferToBase64(largeData);
        expect(typeof b64).toBe('string');
        expect(b64.length).toBeGreaterThan(0);
        // Full encrypt/decrypt round-trip on large payload
        const largeText = 'A'.repeat(100_000);
        const encrypted = await encryptData(largeText, passphrase);
        const decrypted = await decryptData(encrypted, passphrase);
        expect(decrypted).toBe(largeText);
    });
});
