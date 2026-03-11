/**
 * Zero-Knowledge Privacy Layer
 * Uses Web Crypto API (AES-GCM 256-bit)
 */

const ENC_ALGO = 'AES-GCM';
const KDF_ALGO = 'PBKDF2';
const HASH_ALGO = 'SHA-256';
const ITERATIONS = 210_000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

// Early assertion of capability
if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('SECURE_CONTEXT_REQUIRED: Web Crypto API is not available. Please ensure the app is running over HTTPS or on localhost.');
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: KDF_ALGO,
            salt: salt as BufferSource,
            iterations: ITERATIONS,
            hash: HASH_ALGO
        },
        baseKey,
        { name: ENC_ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(text: string, passphrase: string): Promise<Uint8Array> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(passphrase, salt);

    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: ENC_ALGO, iv },
        key,
        encoder.encode(text)
    );

    // Combine SALT + IV + CIPHERTEXT
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return combined;
}

export async function decryptData(combined: Uint8Array, passphrase: string): Promise<string> {
    const salt = combined.slice(0, SALT_SIZE);
    const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = combined.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(passphrase, salt);

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: ENC_ALGO, iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        throw new Error('DECRYPTION_FAILED', { cause: e });
    }
}

// Helpers for Base64 storage
export function arrayBufferToBase64(buffer: Uint8Array): string {
    // Build in 8KB chunks to avoid O(n²) concatenation on large payloads
    const CHUNK = 0x2000;
    const parts: string[] = [];
    for (let i = 0; i < buffer.length; i += CHUNK) {
        parts.push(String.fromCharCode(...buffer.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''));
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
