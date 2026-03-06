export function createPcmBase64(data: Int16Array): string {
  const bytes = new Uint8Array(data.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number
): Promise<AudioBuffer> {
  try {
    return await ctx.decodeAudioData(data.buffer as ArrayBuffer);
  } catch {
    const floatData = new Float32Array(data.length / 2);
    const view = new DataView(data.buffer as ArrayBuffer);

    for (let i = 0; i < floatData.length; i++) {
      floatData[i] = view.getInt16(i * 2, true) / 0x7FFF;
    }

    const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);
    return buffer;
  }
}
