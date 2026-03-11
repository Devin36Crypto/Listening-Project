import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Settings, AppMode, NoiseLevel } from '../types';
import { createPcmBase64, decodeAudioData, decodeBase64 } from '../utils/audio';
import { MODEL_LIVE, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../constants';
import audioProcessorUrl from '../workers/audio.processor.ts?url';

type AddLogFn = (
    role: 'user' | 'model' | 'system' | 'date-marker',
    text: string,
    isError?: boolean,
    speakerId?: string
) => void;
const getAudioConstraints = (level: NoiseLevel) => {
    const base = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googBeamforming: true,
    };
    if (level === 'off') {
        return Object.fromEntries(Object.keys(base).map(k => [k, false]));
    }
    if (level === 'low') {
        return { ...base, noiseSuppression: false, googNoiseSuppression: false };
    }
    return base;
};
export function useAudioSession(
    settings: Settings,
    activeMode: AppMode,
    addLog: AddLogFn,
    onOfflineChunks: (chunks: Float32Array[]) => void,
    apiKeyProp?: string | null
) {
    const [isRecording, setIsRecording] = useState(false);
    const [connectedMics, setConnectedMics] = useState(0);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const audioContextInput = useRef<AudioContext | null>(null);
    const audioContextOutput = useRef<AudioContext | null>(null);
    const activeStreamsRef = useRef<MediaStream[]>([]);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
    const offlineChunksRef = useRef<Float32Array[]>([]);
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    // Silent MP3 for background audio persistence
    useEffect(() => {
        const audio = new Audio();
        audio.loop = true;
        audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAA//OEMAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAA==';
        backgroundAudioRef.current = audio;
        return () => {
            backgroundAudioRef.current?.pause();
            backgroundAudioRef.current = null;
        };
    }, []);

    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn('Wake Lock failed:', err);
            }
        }
    };

    const releaseWakeLock = () => {
        wakeLockRef.current?.release().catch(() => { });
        wakeLockRef.current = null;
    };

    const enableBackgroundMode = useCallback(() => {
        backgroundAudioRef.current?.play().catch(e => console.warn('Background audio failed', e));
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'ListeningProject Active',
                artist: activeMode === AppMode.OFFLINE_MODE ? 'Offline Mode' : 'Live Translator',
                album: 'Background Listening',
                artwork: [{ src: './icon.png', sizes: '512x512', type: 'image/png' }],
            });
            navigator.mediaSession.playbackState = 'playing';
        }
    }, [activeMode]);

    const disableBackgroundMode = useCallback(() => {
        backgroundAudioRef.current?.pause();
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }, []);

    const handleError = useCallback((err: any, context: string) => {
        console.error(`AudioSession Error [${context}]:`, err);
        let msg = 'Neural synchronization failure.';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message === 'PermissionDenied') {
            msg = 'Microphone access denied. Check browser permissions.';
        } else if (err.message === 'No audio sensors available.') {
            msg = 'No audio input sensors detected.';
        } else if (err.message?.includes('API_KEY')) {
            msg = 'Security token invalid or missing.';
        } else if (context === 'session') {
            msg = 'Connection to neural engine disrupted.';
        }

        addLog('system', `${msg} (${err.message || 'Unknown'})`, true);
        setIsRecording(false);
        releaseWakeLock();
        disableBackgroundMode();
    }, [addLog, disableBackgroundMode]);

    const initializeMultiInputAudio = async (ctx: AudioContext): Promise<AudioWorkletNode> => {
        let devices: MediaDeviceInfo[] = [];
        try { devices = await navigator.mediaDevices.enumerateDevices(); } catch (e) {
            console.debug('Failed to enumerate devices:', e);
        }

        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const toTry = audioInputs.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications').slice(0, 4);
        if (toTry.length === 0 && audioInputs.length > 0) toTry.push(audioInputs[0]);

        const merger = ctx.createChannelMerger(1);
        const constraints = getAudioConstraints(settings.noiseCancellationLevel);

        const scanResults = await Promise.all(
            toTry.map(async device => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: device.deviceId }, ...constraints },
                    });
                    activeStreamsRef.current.push(stream);
                    ctx.createMediaStreamSource(stream).connect(merger);
                    return true;
                } catch (e) {
                    // Log failure for this specific device but don't halt the whole scan
                    console.warn(`Sensor access failed: ${device.label || device.deviceId}`);
                    return false;
                }
            })
        );

        let streamCount = scanResults.filter(Boolean).length;
        if (streamCount === 0) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
                activeStreamsRef.current.push(stream);
                ctx.createMediaStreamSource(stream).connect(merger);
                streamCount = 1;
            } catch (e) {
                throw new Error('No audio sensors available.');
            }
        }

        setConnectedMics(streamCount);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        setAnalyserNode(analyser);

        try {
            await ctx.audioWorklet.addModule(audioProcessorUrl);
        } catch (e: any) {
            if (!e.message?.includes('already registered')) throw e;
        }

        const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
        merger.connect(analyser);
        analyser.connect(workletNode);
        workletNode.connect(ctx.destination);
        workletNodeRef.current = workletNode;
        return workletNode;
    };

    const teardownAudio = useCallback(() => {
        setIsRecording(false);
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        setAnalyserNode(null);
        activeStreamsRef.current.forEach(s => {
            s.getTracks().forEach(t => t.stop());
        });
        activeStreamsRef.current = [];

        // Clear audio sources to prevent memory leaks
        sourcesRef.current.forEach(source => {
            try { source.stop(); source.disconnect(); } catch (e) { }
        });
        sourcesRef.current.clear();

        if (audioContextInput.current && audioContextInput.current.state !== 'closed') {
            audioContextInput.current.close().catch(() => { });
        }
        audioContextInput.current = null;
    }, []);

    const startSession = async () => {
        if (isRecording) return;
        try {
            const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            addLog('date-marker', dateStr);
            addLog('system', 'Initializing Neural Interface...');
            await requestWakeLock();
            enableBackgroundMode();

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextOutput.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

            await Promise.all([audioContextInput.current?.resume(), audioContextOutput.current?.resume()]);

            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            const finalApiKey = apiKeyProp === 'STUDIO_MANAGED' ? undefined : (apiKeyProp || undefined);
            const ai = new GoogleGenAI({ apiKey: finalApiKey });

            const sessionPromise = ai.live.connect({
                model: MODEL_LIVE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } } },
                    systemInstruction: {
                        parts: [{
                            text: activeMode === AppMode.LIVE_TRANSLATOR
                                ? `You are "ListeningProject". Translate EVERYTHING to ${settings.targetLanguage}. Identify speakers with [Label]:. Be fast.`
                                : `You are "Assistant". Help the user in ${settings.targetLanguage}. Identify speakers with [Name]:.`
                        }]
                    },
                },
                callbacks: {
                    onopen: () => {
                        setIsRecording(true);
                        addLog('system', 'Neural link established.');
                        workletNode.port.onmessage = (e) => {
                            if (!isRecording) return;
                            const base64 = createPcmBase64(e.data);
                            sessionPromiseRef.current?.then(session => {
                                if (isRecording) {
                                    session.sendRealtimeInput({
                                        media: { mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: base64 }
                                    });
                                }
                            });
                        };
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const { serverContent } = msg;
                        if (serverContent?.inputTranscription?.text) currentInputTranscription.current += serverContent.inputTranscription.text;
                        if (serverContent?.outputTranscription?.text) currentOutputTranscription.current += serverContent.outputTranscription.text;

                        if (serverContent?.turnComplete) {
                            const full = currentOutputTranscription.current.trim();
                            if (full) {
                                const match = full.match(/^\[(.*?)]:?\s*(.*)/s);
                                if (match) addLog('model', match[2], false, match[1]);
                                else addLog('model', full);
                            }
                            currentOutputTranscription.current = '';
                            currentInputTranscription.current = '';
                        }

                        const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && audioContextOutput.current) {
                            const ctx = audioContextOutput.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, OUTPUT_SAMPLE_RATE);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onclose: () => {
                        addLog('system', 'Neural link severed.');
                        setIsRecording(false);
                    },
                    onerror: (err) => handleError(err, 'session'),
                },
            });
            sessionPromiseRef.current = sessionPromise;
        } catch (err) {
            handleError(err, 'start');
        }
    };

    const stopSession = useCallback(() => {
        teardownAudio();
        if (audioContextOutput.current && audioContextOutput.current.state !== 'closed') {
            audioContextOutput.current.close().catch(() => { });
        }
        audioContextOutput.current = null;
        setIsRecording(false);
        sessionPromiseRef.current = null;
        releaseWakeLock();
        disableBackgroundMode();
        addLog('system', 'System offline.');
    }, [disableBackgroundMode, teardownAudio, addLog]);

    const startOfflineRecording = async () => {
        if (isRecording) return;
        try {
            addLog('system', 'Activating Offline Matrix...');
            await requestWakeLock();
            enableBackgroundMode();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
            await audioContextInput.current.resume();
            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            offlineChunksRef.current = [];
            workletNode.port.onmessage = (e) => offlineChunksRef.current.push(new Float32Array(e.data));
            setIsRecording(true);
        } catch (err) {
            handleError(err, 'offline-start');
        }
    };

    const stopOfflineRecording = useCallback(() => {
        teardownAudio();
        releaseWakeLock();
        disableBackgroundMode();
        addLog('system', 'Processing local audio buffer...');
        onOfflineChunks(offlineChunksRef.current);
        offlineChunksRef.current = [];
    }, [disableBackgroundMode, onOfflineChunks, teardownAudio, addLog]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRecording) stopSession();
        };
    }, [stopSession, isRecording]);

    return {
        isRecording,
        connectedMics,
        analyserNode,
        startSession,
        stopSession,
        startOfflineRecording,
        stopOfflineRecording,
    };
}

