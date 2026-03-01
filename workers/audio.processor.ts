/**
 * AudioWorkletProcessor for handling real-time audio input on a separate thread.
 * This prevents UI jank and ensures consistent audio sampling.
 */
class AudioProcessor extends AudioWorkletProcessor {
    process(inputs: Float32Array[][]) {
        // inputs[0] is the 1st input (our merger node)
        const input = inputs[0];
        if (input && input.length > 0) {
            // We take the first channel of the first input
            const channelData = input[0];

            // Post the raw Float32Array to the main thread
            // Using a copy (slice) to avoid modification issues
            this.port.postMessage(channelData.slice());
        }

        // Return true to keep the processor alive
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
