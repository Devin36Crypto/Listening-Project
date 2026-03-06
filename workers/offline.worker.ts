import { pipeline, env } from '@xenova/transformers';

// Skip local check to download from Hub
env.allowLocalModels = false;
env.useBrowserCache = true;

class OfflineProcessor {
  static task_instances: Record<string, unknown> = {};

  static async getInstance(task: string, model: string, progress_callback?: (data: { file: string, progress: number }) => void) {
    const key = `${task}-${model}`;
    if (!this.task_instances[key]) {
      // @ts-expect-error pipeline signature varies
      this.task_instances[key] = await pipeline(task, model, { progress_callback });
    }
    return this.task_instances[key];
  }
}

// Shared progress reporter — posts loading status back to the main thread
const makeProgressCallback = () => (progress: { file: string; progress: number }) => {
  self.postMessage({
    type: 'status',
    status: 'loading',
    message: `Loading model: ${progress.file}`,
    progress: progress.progress,
  });
};

self.addEventListener('message', async (event) => {
  const { task, ...data } = event.data;

  try {
    if (task === 'transcribe') {
      const { audio, language } = data;

      const transcriber = await OfflineProcessor.getInstance(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        makeProgressCallback()
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = await (transcriber as any)(audio, {
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

      const translator = await OfflineProcessor.getInstance(
        'translation',
        'Xenova/nLLB-200-distilled-600M',
        makeProgressCallback()
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = await (translator as any)(text, {
        src_lang: source,
        tgt_lang: target,
      });

      self.postMessage({
        type: 'result',
        status: 'ready',
        result: { task: 'translate', output }
      });
    }
  } catch (error: unknown) {
    self.postMessage({
      type: 'status',
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});
