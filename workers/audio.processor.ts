/**
 * Optimized AudioWorkletProcessor for high-performance audio ingestion.
 * Performs PCM16 conversion and Silence Suppression to reduce CPU/Bandwidth.
 */
class AudioProcessor extends AudioWorkletProcessor {
    private silenceThreshold = 0.002; // RMS threshold

    process(inputs: Float32Array[][]) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];

            // 1. SILENCE SUPPRESSION (Peak/RMS Check)
            let sumSquare = 0;
            for (let i = 0; i < channelData.length; i++) {
                sumSquare += channelData[i] * channelData[i];
            }
            const rms = Math.sqrt(sumSquare / channelData.length);

            // Skip processing if below threshold (gate)
            if (rms < this.silenceThreshold) return true;

            // 2. PCM16 CONVERSION (In-place/Vectorizable approach)
            const pcm16 = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                // Clamp and scale to 16-bit range
                const s = Math.max(-1, Math.min(1, channelData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // 3. TRANSFERABLE (Zero-copy transfer to main thread)
            this.port.postMessage(pcm16, [pcm16.buffer]);
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
