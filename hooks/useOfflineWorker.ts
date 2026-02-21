
import { useRef, useState, useEffect, useCallback } from 'react';

interface WorkerStatus {
  status: 'idle' | 'loading' | 'ready' | 'processing' | 'error';
  progress?: number;
  message?: string;
}

export function useOfflineWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<WorkerStatus>({ status: 'idle' });
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('../workers/offline.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event) => {
      const { status: workerStatus, task, output, progress, error, file } = event.data;

      if (workerStatus === 'loading') {
        setStatus({
          status: 'loading',
          progress: progress,
          message: `Loading ${task} model... ${file || ''} (${Math.round(progress || 0)}%)`,
        });
      } else if (workerStatus === 'complete') {
        setStatus({ status: 'ready' });
        setResult({ task, output });
      } else if (workerStatus === 'error') {
        setStatus({ status: 'error', message: error });
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const transcribe = useCallback((audio: Float32Array, language: string) => {
    if (workerRef.current) {
      setStatus({ status: 'processing', message: 'Transcribing...' });
      workerRef.current.postMessage({
        type: 'transcribe',
        data: { audio, language },
      });
    }
  }, []);

  const translate = useCallback((text: string, source_lang: string, target_lang: string) => {
    if (workerRef.current) {
      setStatus({ status: 'processing', message: 'Translating...' });
      workerRef.current.postMessage({
        type: 'translate',
        data: { text, source_lang, target_lang },
      });
    }
  }, []);

  return { status, result, transcribe, translate };
}
