import { pipeline, env } from '@xenova/transformers';

// Skip local check to download from Hub
env.allowLocalModels = false;
env.useBrowserCache = true;

class OfflineProcessor {
  static task_instances: Record<string, any> = {};

  static async getInstance(task: string, model: string, progress_callback?: (data: any) => void) {
    const key = `${task}-${model}`;
    if (!this.task_instances[key]) {
      this.task_instances[key] = await pipeline(task as any, model, { progress_callback });
    }
    return this.task_instances[key];
  }
}

self.addEventListener('message', async (event) => {
  const { task, ...data } = event.data;

  try {
    if (task === 'transcribe') {
      const { audio, language } = data;

      const progress_callback = (progress: any) => {
        self.postMessage({
          type: 'status',
          status: 'loading',
          message: `Loading model: ${progress.file}`,
          progress: progress.progress
        });
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

      self.postMessage({
        type: 'result',
        status: 'ready',
        result: { task: 'transcribe', output }
      });

    } else if (task === 'translate') {
      const { text, source, target } = data;

      const progress_callback = (progress: any) => {
        self.postMessage({
          type: 'status',
          status: 'loading',
          message: `Loading model: ${progress.file}`,
          progress: progress.progress
        });
      };

      const translator = await OfflineProcessor.getInstance(
        'translation',
        'Xenova/nLLB-200-distilled-600M',
        progress_callback
      );

      const output = await translator(text, {
        src_lang: source,
        tgt_lang: target,
      });

      self.postMessage({
        type: 'result',
        status: 'ready',
        result: { task: 'translate', output }
      });
    }
  } catch (error: any) {
    self.postMessage({
      type: 'status',
      status: 'error',
      message: error.message
    });
  }
});
