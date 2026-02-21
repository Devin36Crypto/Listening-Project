
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks
env.allowLocalModels = false;
env.useBrowserCache = true;

class OfflineProcessor {
  static instance: any = null;
  static transcriber: any = null;
  static translator: any = null;

  static async getInstance(task: string, model: string) {
    if (task === 'automatic-speech-recognition') {
      if (!this.transcriber) {
        console.log(`Loading transcriber: ${model}`);
        this.transcriber = await pipeline(task, model, {
          progress_callback: (data: any) => {
            self.postMessage({
              status: 'loading',
              task: 'transcribe',
              file: data.file,
              progress: data.progress,
            });
          },
        });
      }
      return this.transcriber;
    } else if (task === 'translation') {
      if (!this.translator) {
        console.log(`Loading translator: ${model}`);
        this.translator = await pipeline(task, model, {
          progress_callback: (data: any) => {
            self.postMessage({
              status: 'loading',
              task: 'translate',
              file: data.file,
              progress: data.progress,
            });
          },
        });
      }
      return this.translator;
    }
    return null;
  }
}

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    if (type === 'transcribe') {
      const transcriber = await OfflineProcessor.getInstance(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny'
      );

      const output = await transcriber(data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: data.language, // e.g., 'english', 'spanish'
        task: 'transcribe',
      });

      self.postMessage({
        status: 'complete',
        task: 'transcribe',
        output,
      });
    } else if (type === 'translate') {
      // Use a smaller model for demo purposes or NLLB for full support
      // For now, let's use NLLB-200-distilled-600M (quantized)
      const translator = await OfflineProcessor.getInstance(
        'translation',
        'Xenova/nllb-200-distilled-600M'
      );

      const output = await translator(data.text, {
        src_lang: data.source_lang, // e.g., 'eng_Latn'
        tgt_lang: data.target_lang, // e.g., 'spa_Latn'
      });

      self.postMessage({
        status: 'complete',
        task: 'translate',
        output,
      });
    }
  } catch (error: any) {
    self.postMessage({
      status: 'error',
      error: error.message,
    });
  }
});
