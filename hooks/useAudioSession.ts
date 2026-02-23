import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Settings, AppMode, NoiseLevel } from '../types';
import { createPcmBase64, decodeBase64, decodeAudioData } from '../utils/audio';
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
    onOfflineChunks: (chunks: Float32Array[]) => void
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
        audio.src =
            'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAA//OEMAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAA==';
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
                artwork: [{ src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' }],
            });
            navigator.mediaSession.playbackState = 'playing';
            navigator.mediaSession.setActionHandler('play', () => { });
            navigator.mediaSession.setActionHandler('pause', () => { });
        }
    }, [activeMode]);

    const disableBackgroundMode = useCallback(() => {
        backgroundAudioRef.current?.pause();
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
        }
    }, []);

    // Re-acquire wake lock on visibility change
    useEffect(() => {
        const handle = () => {
            if (document.visibilityState === 'visible' && isRecording) requestWakeLock();
            else if (isRecording) addLog('system', 'Background mode active. Listening continues...');
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [isRecording]);

    const initializeMultiInputAudio = async (ctx: AudioContext): Promise<AudioWorkletNode> => {
        let devices: MediaDeviceInfo[] = [];
        try { devices = await navigator.mediaDevices.enumerateDevices(); } catch { }

        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const specific = audioInputs.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications');
        const toTry = specific.length > 0 ? specific : audioInputs;

        const merger = ctx.createChannelMerger(1);
        const constraints = getAudioConstraints(settings.noiseCancellationLevel);
        let streamCount = 0;

        addLog('system', `Scanning hardware... Found ${toTry.length} potential sensors.`);

        await Promise.all(
            toTry.map(async device => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: device.deviceId }, ...constraints },
                    });
                    activeStreamsRef.current.push(stream);
                    ctx.createMediaStreamSource(stream).connect(merger);
                    streamCount++;
                } catch { }
            })
        );

        if (streamCount === 0) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
                activeStreamsRef.current.push(stream);
                ctx.createMediaStreamSource(stream).connect(merger);
                streamCount = 1;
                addLog('system', 'Using primary sensor array.');
            } catch (e: any) {
                if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') throw new Error('PermissionDenied');
                throw new Error('No audio sensors available.');
            }
        } else {
            addLog('system', `Audio Fusion Active: ${streamCount} sensors online.`);
            if (settings.noiseCancellationLevel === 'high') addLog('system', 'Beamforming & Noise Suppression: ENABLED');
        }

        setConnectedMics(streamCount);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        setAnalyserNode(analyser);

        // Load and initialize AudioWorklet
        try {
            await ctx.audioWorklet.addModule(audioProcessorUrl);
        } catch (e) {
            console.error('Failed to load AudioWorklet module:', e, audioProcessorUrl);
            throw new Error('AudioWorklet module failed to load. Check storage/paths.');
        }

        const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
        merger.connect(analyser);
        analyser.connect(workletNode);
        workletNode.connect(ctx.destination);

        workletNodeRef.current = workletNode;
        return workletNode;
    };

    const teardownAudio = () => {
        workletNodeRef.current?.disconnect();
        workletNodeRef.current = null;
        setAnalyserNode(null);
        activeStreamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
        activeStreamsRef.current = [];
        audioContextInput.current?.close();
        audioContextInput.current = null;
    };

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

            await audioContextInput.current.resume();
            await audioContextOutput.current.resume();

            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            workletNodeRef.current = workletNode;

            // Fix environment variable access
            let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
                apiKey = process.env.API_KEY;
            }
            if (!apiKey) {
                apiKey = localStorage.getItem('gemini_api_key') || undefined;
            }

            if (!apiKey) {
                throw new Error('API_KEY_MISSING');
            }

            const ai = new GoogleGenAI({ apiKey });

            const translatorInstruction = `You are "ListeningProject".
CORE PROTOCOLS:
1. UNIVERSAL TRANSLATOR: Translate EVERYTHING into **${settings.targetLanguage}**.
2. MULTI-LANGUAGE SCANNING: Listen for ANY and ALL languages.
3. SPEAKER ID: Start EVERY output line with [Speaker Label]:.
   Example: [Spanish Speaker 1]: The translation goes here.
4. If you hear the target language, transcribe verbatim.`;

            const assistantInstruction = `You are "ListeningProject". Identify speakers with [Speaker Name]: format. Answer in **${settings.targetLanguage}**.`;

            const sessionPromise = ai.live.connect({
                model: MODEL_LIVE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } } },
                    systemInstruction: activeMode === AppMode.LIVE_TRANSLATOR ? translatorInstruction : assistantInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setIsRecording(true);
                        workletNode.port.onmessage = (e) => {
                            const base64 = createPcmBase64(e.data);
                            sessionPromiseRef.current?.then(session => session.sendRealtimeInput({
                                media: {
                                    mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                                    data: base64
                                }
                            }));
                        };
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const { serverContent } = msg;

                        if (serverContent?.inputTranscription?.text) currentInputTranscription.current += serverContent.inputTranscription.text;
                        if (serverContent?.outputTranscription?.text) currentOutputTranscription.current += serverContent.outputTranscription.text;

                        if (serverContent?.turnComplete) {
                            if (currentOutputTranscription.current.trim()) {
                                const full = currentOutputTranscription.current.trim();
                                const match = full.match(/^\[(.*?)]:?\s*(.*)/s);
                                if (match) addLog('model', match[2], false, match[1]);
                                else addLog('model', full);
                                currentOutputTranscription.current = '';
                            }
                            currentInputTranscription.current = '';
                        }

                        const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && audioContextOutput.current) {
                            const ctx = audioContextOutput.current;
                            if (ctx.state === 'suspended') await ctx.resume();

                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBytes = decodeBase64(base64Audio);
                            const audioBuffer = await decodeAudioData(audioBytes, ctx, OUTPUT_SAMPLE_RATE);

                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onclose: () => { addLog('system', 'Neural link severed.'); setIsRecording(false); releaseWakeLock(); },
                    onerror: (err) => {
                        console.error('Session Error:', err);
                        addLog('system', 'Connection disrupted. Please check your connection.', true);
                        setIsRecording(false);
                        releaseWakeLock();
                    },
                },
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (err: any) {
            let msg = 'Critical Failure: Audio Sensors Unreachable.';
            if (err.message === 'PermissionDenied' || err.name === 'NotAllowedError') msg = 'Microphone access denied. Enable permissions in browser settings.';
            else if (err.message === 'No audio sensors available.') msg = 'No microphone found. Please connect an audio device.';
            else if (err.message === 'API_KEY_MISSING') msg = 'API Configuration Error: VITE_GEMINI_API_KEY is missing from environment.';
            else if (err.message?.includes('API_KEY')) msg = 'API Configuration Error: Invalid API Key.';

            addLog('system', msg, true);
            releaseWakeLock();
            disableBackgroundMode();
            setIsRecording(false);
        }
    };

    const stopSession = useCallback(() => {
        teardownAudio();
        audioContextOutput.current?.close();
        audioContextOutput.current = null;

        if (currentOutputTranscription.current.trim()) {
            addLog('model', currentOutputTranscription.current.trim());
            currentOutputTranscription.current = '';
        }

        setIsRecording(false);
        sessionPromiseRef.current = null;
        releaseWakeLock();
        disableBackgroundMode();
        addLog('system', 'System halted.');
    }, [disableBackgroundMode]);

    const startOfflineRecording = async () => {
        if (isRecording) return;

        try {
            addLog('system', 'Initializing Offline Mode...');
            await requestWakeLock();
            enableBackgroundMode();

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextInput.current = new AudioContextClass({ sampleRate: 16000 });
            await audioContextInput.current.resume();

            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            workletNodeRef.current = workletNode;

            offlineChunksRef.current = [];
            workletNode.port.onmessage = (e) => {
                offlineChunksRef.current.push(new Float32Array(e.data));
            };

            setIsRecording(true);
            addLog('system', 'Offline Recording Started. Speak now.');

        } catch (err) {
            addLog('system', 'Failed to start offline recording.', true);
            setIsRecording(false);
        }
    };

    const stopOfflineRecording = useCallback(() => {
        if (!workletNodeRef.current) return;

        teardownAudio();
        setIsRecording(false);
        releaseWakeLock();
        disableBackgroundMode();

        addLog('system', 'Processing offline audio...');
        onOfflineChunks(offlineChunksRef.current);
        offlineChunksRef.current = [];
    }, [disableBackgroundMode, onOfflineChunks]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, []);

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
