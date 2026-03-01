class AudioProcessor extends AudioWorkletProcessor {
  private silenceThreshold = 0.002;

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      let sumSquare = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquare += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquare / channelData.length);
      
      if (rms < this.silenceThreshold) return true;

      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      this.port.postMessage(pcm16, [pcm16.buffer]);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
