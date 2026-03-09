import { describe, it, expect } from 'vitest';
import { createPcmBase64, decodeBase64 } from '../utils/audio';

describe('Audio Utilities', () => {
    it('should convert Float32Array to PCM Base64', () => {
        const audioData = new Float32Array([0.5, -0.5, 0, 1, -1]);
        const base64 = createPcmBase64(audioData);
        expect(typeof base64).toBe('string');
        expect(base64.length).toBeGreaterThan(0);
    });

    it('should decode base64 back to Uint8Array', () => {
        const original = 'SGVsbG8='; // "Hello" in base64
        const decoded = decodeBase64(original);
        expect(decoded instanceof Uint8Array).toBe(true);
        expect(decoded.length).toBe(5);
        expect(String.fromCharCode(decoded[0])).toBe('H');
    });

    it('should handle clipping during PCM conversion', () => {
        const clippedData = new Float32Array([2.0, -2.0]);
        const base64 = createPcmBase64(clippedData);
        expect(base64).toBeDefined();
        // Since we clamp at -1 and 1, this should not throw
    });
});
