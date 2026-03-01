import { useState, useCallback, useEffect, useRef } from 'react';

type WorkerStatus = {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress?: number;
    message?: string;
};

export function useOfflineWorker() {
    const [status, setStatus] = useState<WorkerStatus>({ status: 'idle' });
    const [result, setResult] = useState<any>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker from public URL or Vite-managed asset
        const worker = new Worker(new URL('../workers/offline.worker.ts', import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (e) => {
            const { type, status: s, progress, message, result: r } = e.data;
            
            if (type === 'status') {
                setStatus({ status: s, progress, message });
            } else if (type === 'result') {
                setResult(r);
            }
        };

        workerRef.current = worker;

        return () => worker.terminate();
    }, []);

    const transcribe = useCallback((audio: Float32Array, language: string) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                task: 'transcribe',
                audio,
                language
            });
        }
    }, []);

    const translate = useCallback((text: string, source: string, target: string) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                task: 'translate',
                text,
                source,
                target
            });
        }
    }, []);

    const ping = useCallback(() => {
        if (workerRef.current) workerRef.current.postMessage({ task: 'ping' });
    }, []);

    return { status, result, transcribe, translate, ping };
}
