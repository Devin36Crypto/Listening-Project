/**
 * Converts Float32Array audio data (standard in Web Audio API) 
 * to 16-bit Linear PCM base64 string (required by Google Gemini API).
 */
export function createPcmBase64(data: Float32Array): string {
    const pcm = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
        // Clamp and scale to 16-bit range
        const s = Math.max(-1, Math.min(1, data[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert Int16Array buffer to binary string
    let binary = '';
    const bytes = new Uint8Array(pcm.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Decodes a base64 string into a Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decodes compressed audio bytes (from API) into an AudioBuffer for playback.
 */
export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number
): Promise<AudioBuffer> {
    // Some browsers might require the standard decodeAudioData which returns a promise
    // but expects an ArrayBuffer
    try {
        return await ctx.decodeAudioData(data.buffer);
    } catch (e) {
        // Fallback for raw PCM if the model returns it (though Gemini usually returns AAC/Opus in base64)
        const floatData = new Float32Array(data.length / 2);
        const view = new DataView(data.buffer);

        for (let i = 0; i < floatData.length; i++) {
            floatData[i] = view.getInt16(i * 2, true) / 0x7FFF;
        }

        const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
        buffer.getChannelData(0).set(floatData);
        return buffer;
    }
}
