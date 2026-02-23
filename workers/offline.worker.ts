import { pipeline, env } from '@xenova/transformers';

// Skip local check to download from Hub
env.allowLocalModels = false;
env.useBrowserCache = true;

class OfflineProcessor {
  static task_instances: Record<string, any> = {};

  static async getInstance(task: string, model: string, progress_callback?: (data: any) => void) {
    const key = `${task}-${model}`;
    if (!this.task_instances[key]) {
      this.task_instances[key] = pipeline(task as any, model, { progress_callback });
    }
    return this.task_instances[key];
  }
}

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    if (type === 'transcribe') {
      const { audio, language } = data;

      const progress_callback = (progress: any) => {
        self.postMessage({ status: 'loading', task: 'transcribe', progress: progress.progress, file: progress.file });
      };

      const transcriber = await OfflineProcessor.getInstance(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        progress_callback
      );

      const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: language || 'english',
        task: 'transcribe',
        return_timestamps: true,
      });

      self.postMessage({ status: 'complete', task: 'transcribe', output });

    } else if (type === 'translate') {
      const { text, source_lang, target_lang } = data;

      const progress_callback = (progress: any) => {
        self.postMessage({ status: 'loading', task: 'translate', progress: progress.progress, file: progress.file });
      };

      const translator = await OfflineProcessor.getInstance(
        'translation',
        'Xenova/nLLB-200-distilled-600M',
        progress_callback
      );

      const output = await translator(text, {
        src_lang: source_lang,
        tgt_lang: target_lang,
      });

      self.postMessage({ status: 'complete', task: 'translate', output });
    }
  } catch (error: any) {
    self.postMessage({ status: 'error', error: error.message });
  }
});
