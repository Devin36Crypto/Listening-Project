import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
  Mic, MicOff, Settings as SettingsIcon, Globe, 
  Sparkles, Lock, Radio, FileText, FileX, AlertCircle,
  Clock, Edit2, Check, User, WifiOff, Download
} from 'lucide-react';

import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import PocketModeOverlay from './components/PocketModeOverlay';
import { LogMessage, AppMode, Settings, NoiseLevel } from './types';
import { createPcmBlob, decodeBase64, decodeAudioData } from './utils/audio';
import { MODEL_LIVE, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE, LANGUAGES } from './constants';
import { transcribeAudio, speakText, getContextualInfo } from './services/gemini';
import { useOfflineWorker } from './hooks/useOfflineWorker';

const getAudioConstraints = (level: NoiseLevel) => {
  const baseConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Advanced constraints (Chrome/Webkit specific)
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true,
    googBeamforming: true, // Request beamforming
  };

  switch (level) {
    case 'off': 
      return { 
        ...baseConstraints,
        echoCancellation: false, 
        noiseSuppression: false, 
        autoGainControl: false,
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false,
        googBeamforming: false
      };
    case 'low': 
      return { 
        ...baseConstraints,
        noiseSuppression: false, // Keep some background
        googNoiseSuppression: false,
      };
    case 'high': 
      return baseConstraints; // Max processing
    default: 
      return baseConstraints;
  }
};

const App: React.FC = () => {
  // --- State ---
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.LIVE_TRANSLATOR);
  const [isRecording, setIsRecording] = useState(false);
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    targetLanguage: 'English',
    voice: 'Puck',
    autoSpeak: true,
    noiseCancellationLevel: 'high',
    pushToTalk: false,
  });
  const [connectedMics, setConnectedMics] = useState<number>(0);

  // --- Offline Worker ---
  const { status: offlineStatus, result: offlineResult, transcribe: offlineTranscribe } = useOfflineWorker();
  const offlineChunksRef = useRef<Float32Array[]>([]);

  // --- Speaker Registry State ---
  // Maps "Spanish Speaker 1" (ID) -> "Maria" (User assigned name)
  const [speakerRegistry, setSpeakerRegistry] = useState<Record<string, string>>({});
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [tempSpeakerName, setTempSpeakerName] = useState('');

  // --- Refs for Audio & API ---
  const audioContextInput = useRef<AudioContext | null>(null);
  const audioContextOutput = useRef<AudioContext | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // --- Refs for Transcription Accumulation ---
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  
  // --- Refs for UI scrolling ---
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // --- Background Mode Refs ---
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Cleanup on unmount ---
  useEffect(() => {
    // Initialize silent audio element for background persistence
    const audio = new Audio();
    audio.loop = true;
    // Tiny silent MP3 to keep the audio session active in background
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAA//OEMAAAAAAAABAAAAAAAAAAABFhAAAAAAAAAAAAAA===';
    backgroundAudioRef.current = audio;

    return () => {
      stopSession();
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Background Mode Logic ---
  const enableBackgroundMode = () => {
    // 1. Play silent audio to trigger OS media session
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.play().catch(e => console.warn("Background audio start failed", e));
    }

    // 2. Set MediaSession metadata for Lock Screen controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'ListeningProject Active',
        artist: activeMode === AppMode.OFFLINE_MODE ? 'Offline Mode' : 'Live Translator',
        album: 'Background Listening',
        artwork: [
          { src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '128x128', type: 'image/svg+xml' },
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      
      // Add handlers to keep session alive if user interacts with lock screen
      navigator.mediaSession.setActionHandler('play', () => {}); 
      navigator.mediaSession.setActionHandler('pause', () => {
        // Optional: Allow stopping from lock screen? 
        // For now, let's just keep it active or maybe stop recording?
        // Let's keep it active to prevent accidental stops.
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        toggleRecording();
      });
    }
  };

  const disableBackgroundMode = () => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  };

  useEffect(() => {
    if (showTranscript) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showTranscript]);

  // --- Offline Result Handling ---
  useEffect(() => {
    if (offlineResult) {
      if (offlineResult.task === 'transcribe') {
        addLog('model', `[Offline]: ${offlineResult.output.text}`);
      }
    }
  }, [offlineResult]);

  // --- Dynamic Audio Constraints Effect ---
  useEffect(() => {
    if (!isRecording || activeStreamsRef.current.length === 0) return;

    const applyConstraints = async () => {
      const constraints = getAudioConstraints(settings.noiseCancellationLevel);
      addLog('system', `Adjusting audio filters: ${settings.noiseCancellationLevel.toUpperCase()}`);
      
      for (const stream of activeStreamsRef.current) {
        for (const track of stream.getAudioTracks()) {
          try {
            await track.applyConstraints(constraints);
          } catch (err) {
            console.warn("Hardware does not support dynamic constraint updates:", err);
          }
        }
      }
    };
    
    applyConstraints();
  }, [settings.noiseCancellationLevel, isRecording]);


  // --- Wake Lock ---
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // Re-acquire wake lock if visibility changes while recording
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isRecording) requestWakeLock();
      } else {
        // App went to background
        if (isRecording) {
           addLog('system', 'Background mode active. Listening continues...');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording]);

  // --- Helper: Add Log ---
  const addLog = (
    role: 'user' | 'model' | 'system' | 'date-marker', 
    text: string, 
    isError: boolean = false,
    speakerId?: string
  ) => {
    setLogs((prev) => [
      ...prev,
      { 
        id: Date.now().toString() + Math.random(), 
        role, 
        text, 
        timestamp: new Date(), 
        isError,
        speakerId
      }
    ]);
  };

  // --- Speaker Management ---
  const handleSpeakerClick = (id: string) => {
    const currentName = speakerRegistry[id] || id;
    setTempSpeakerName(currentName);
    setEditingSpeakerId(id);
  };

  const saveSpeakerName = () => {
    if (editingSpeakerId && tempSpeakerName.trim()) {
      setSpeakerRegistry(prev => ({
        ...prev,
        [editingSpeakerId]: tempSpeakerName.trim()
      }));
      setEditingSpeakerId(null);
    }
  };

  // --- AUDIO FUSION SYSTEM ---
  const initializeMultiInputAudio = async (ctx: AudioContext): Promise<ScriptProcessorNode> => {
    let devices: MediaDeviceInfo[] = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
    }
    
    const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
    const specificDevices = audioInputDevices.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications');
    const devicesToTry = specificDevices.length > 0 ? specificDevices : audioInputDevices;

    const merger = ctx.createChannelMerger(1); 
    let streamCount = 0;
    
    const audioConstraints = getAudioConstraints(settings.noiseCancellationLevel);
    addLog('system', `Scanning hardware... Found ${devicesToTry.length} potential sensors.`);

    const promises = devicesToTry.map(async (device) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: device.deviceId },
            ...audioConstraints
          }
        });
        
        activeStreamsRef.current.push(stream);
        const source = ctx.createMediaStreamSource(stream);
        source.connect(merger);
        streamCount++;
      } catch (e) {
        // console.warn(`Access denied for ${device.label}`);
      }
    });

    await Promise.all(promises);

    if (streamCount === 0) {
       try {
         const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: audioConstraints 
         });
         activeStreamsRef.current.push(stream);
         const source = ctx.createMediaStreamSource(stream);
         source.connect(merger);
         streamCount = 1;
         addLog('system', 'Hardware restriction detected. Using primary sensor array.');
       } catch (e: any) {
         if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
             throw new Error("PermissionDenied");
         }
         throw new Error("No audio sensors available.");
       }
    } else {
      addLog('system', `Audio Fusion Active: ${streamCount} sensors online.`);
      if (settings.noiseCancellationLevel === 'high') {
        addLog('system', `Beamforming & Noise Suppression: ENABLED`);
      }
      addLog('system', `Triangulating 3D audio picture...`);
    }

    setConnectedMics(streamCount);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    merger.connect(processor);
    processor.connect(ctx.destination);
    
    return processor;
  };

  // --- LIVE API: Connection & Audio Handling ---

  const startSession = async () => {
    if (isRecording) return;

    try {
      // Add Date Marker at start of session
      const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      addLog('date-marker', dateStr);
      
      addLog('system', `Initializing Neural Interface...`);
      await requestWakeLock();
      enableBackgroundMode();
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutput.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      await audioContextInput.current.resume();
      await audioContextOutput.current.resume();

      const processor = await initializeMultiInputAudio(audioContextInput.current);
      processorRef.current = processor;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const translatorInstruction = `
        You are "ListeningProject".
        
        **CORE PROTOCOLS:**
        1.  **UNIVERSAL TRANSLATOR:** You are a real-time universal translator. Your goal is to make the user understand EVERYONE around them, regardless of what language they are speaking.
        2.  **MULTI-LANGUAGE SCANNING:** Actively listen for ANY and ALL languages spoken in the audio stream. Do not limit yourself to one source language. If multiple people are speaking different languages (e.g., one in Spanish, one in French), translate ALL of them.
        3.  **TARGET LANGUAGE:** Translate EVERYTHING into **${settings.targetLanguage}**.
        4.  **SPEAKER ID:** You MUST attempt to identify and separate speakers based on voice and context.
        5.  **FORMAT:** Start EVERY output line with a speaker label in brackets.
            Example: \`[Spanish Speaker 1]: The translation goes here.\`
            Example: \`[French Female]: The translation goes here.\`
            Example: \`[John]: Text...\` (If name is known).
        
        **BEHAVIOR:**
        - If you hear a foreign language, translate it to ${settings.targetLanguage} immediately.
        - If you hear ${settings.targetLanguage}, transcribe it verbatim.
        - If multiple people speak at once or in quick succession, separate their translations clearly with new lines and speaker tags.
        - Capture the nuance and tone of the original speaker in the translation.
      `;

      const assistantInstruction = `
        You are "ListeningProject".
        Identify distinct speakers in your output using the format \`[Speaker Name]: Text\`.
        Answer queries in **${settings.targetLanguage}**.
      `;

      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } },
        },
        systemInstruction: activeMode === AppMode.LIVE_TRANSLATOR ? translatorInstruction : assistantInstruction,
        inputAudioTranscription: {}, 
        outputAudioTranscription: {}, 
      };

      const sessionPromise = ai.live.connect({
        model: MODEL_LIVE,
        config: config,
        callbacks: {
          onopen: () => {
            setIsRecording(true);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const blob = createPcmBlob(inputData);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: blob });
                });
              }
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            const { serverContent } = msg;

            if (serverContent?.inputTranscription?.text) {
               currentInputTranscription.current += serverContent.inputTranscription.text;
            }

            if (serverContent?.outputTranscription?.text) {
               currentOutputTranscription.current += serverContent.outputTranscription.text;
            }

            if (serverContent?.turnComplete) {
               // Process Model Output (This contains the speaker tags from instruction)
               if (currentOutputTranscription.current.trim()) {
                   const fullText = currentOutputTranscription.current.trim();
                   
                   // Regex to extract [Speaker ID]: Text
                   const match = fullText.match(/^\[(.*?)]:?\s*(.*)/s);
                   
                   if (match) {
                     const speakerId = match[1];
                     const content = match[2];
                     addLog('model', content, false, speakerId);
                   } else {
                     // Fallback if model didn't follow format exactly
                     addLog('model', fullText);
                   }
                   currentOutputTranscription.current = '';
               }
               
               // Optional: We can log the raw input as 'Microphone' or 'Raw Audio' if desired, 
               // but usually the Model Output covers the "Translation" requirement.
               // We will clear input buffer but not display it to avoid duplicate UI clutter 
               // since the user wants "Listening" (Output focus).
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
          onclose: () => {
            addLog('system', 'Neural link severed.');
            setIsRecording(false);
            releaseWakeLock();
          },
          onerror: (err) => {
            console.error("Session Error:", err);
            addLog('system', 'Connection disrupted. Please check your connection.', true);
            setIsRecording(false);
            releaseWakeLock();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start session:", err);
      
      let errorMessage = "Critical Failure: Audio Sensors Unreachable.";
      if (err.message === "PermissionDenied" || err.name === 'NotAllowedError' || err.message.includes('permission')) {
          errorMessage = "Microphone access denied. Please enable microphone permissions in your browser settings.";
      } else if (err.message === "No audio sensors available.") {
          errorMessage = "No microphone found. Please connect an audio device.";
      } else if (err.message.includes("API_KEY")) {
          errorMessage = "API Configuration Error: Invalid API Key.";
      }
      
      addLog('system', errorMessage, true);
      releaseWakeLock();
      disableBackgroundMode();
      setIsRecording(false);
    }
  };

  const stopSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    activeStreamsRef.current.forEach(stream => {
      stream.getTracks().forEach(t => t.stop());
    });
    activeStreamsRef.current = [];

    if (audioContextInput.current) {
      audioContextInput.current.close();
      audioContextInput.current = null;
    }
    if (audioContextOutput.current) {
      audioContextOutput.current.close();
      audioContextOutput.current = null;
    }
    
    // Flush remaining buffers
    if (currentOutputTranscription.current.trim()) {
        addLog('model', currentOutputTranscription.current.trim());
        currentOutputTranscription.current = '';
    }

    setIsRecording(false);
    sessionPromiseRef.current = null;
    releaseWakeLock();
    disableBackgroundMode();
    addLog('system', 'System halted.');
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (activeMode === AppMode.OFFLINE_MODE) {
        stopOfflineRecording();
      } else {
        stopSession();
      }
    } else {
      if (activeMode === AppMode.TRANSCRIBER) {
        startTraditionalTranscribe();
      } else if (activeMode === AppMode.OFFLINE_MODE) {
        startOfflineRecording();
      } else {
        startSession();
      }
    }
  };

  const startOfflineRecording = async () => {
    if (isRecording) return;
    try {
      addLog('system', 'Initializing Offline Mode...');
      await requestWakeLock();
      enableBackgroundMode();
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      // Whisper expects 16k sample rate
      audioContextInput.current = new AudioContextClass({ sampleRate: 16000 });
      await audioContextInput.current.resume();

      const processor = await initializeMultiInputAudio(audioContextInput.current);
      processorRef.current = processor;
      
      offlineChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone the data because the buffer is reused
        offlineChunksRef.current.push(new Float32Array(inputData));
      };

      setIsRecording(true);
      addLog('system', 'Offline Recording Started. Speak now.');
    } catch (err) {
      console.error(err);
      addLog('system', 'Failed to start offline recording.', true);
      setIsRecording(false);
    }
  };

  const stopOfflineRecording = () => {
    if (!processorRef.current) return;
    
    // Stop audio
    processorRef.current.disconnect();
    processorRef.current = null;
    activeStreamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    activeStreamsRef.current = [];
    if (audioContextInput.current) {
      audioContextInput.current.close();
      audioContextInput.current = null;
    }

    setIsRecording(false);
    releaseWakeLock();
    disableBackgroundMode();
    addLog('system', 'Processing offline audio...');

    // Merge chunks
    const totalLength = offlineChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of offlineChunksRef.current) {
      mergedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Send to worker
    // Simple mapping for Whisper (lowercase, first word)
    // e.g. "Chinese (Mandarin)" -> "chinese"
    const lang = settings.targetLanguage.toLowerCase().split(' ')[0].replace(/[()]/g, '');
    offlineTranscribe(mergedAudio, lang); 
  };

  const startTraditionalTranscribe = async () => {
    // ... (Existing implementation kept simple for brevity, doesn't support live speaker ID as well as Live API)
    addLog('system', 'Scanning for audio patterns (5s)...');
    await requestWakeLock();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: getAudioConstraints(settings.noiseCancellationLevel)
        });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                addLog('user', 'Processing data packet...');
                const text = await transcribeAudio(base64data, 'audio/webm');
                addLog('model', text);
            };
            stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
            releaseWakeLock();
        };

        mediaRecorder.start();
        setIsRecording(true);
        setTimeout(() => mediaRecorder.stop(), 5000); 
    } catch (e: any) {
        console.error("Transcription Error:", e);
        let msg = "Recording failed.";
        addLog('system', msg, true);
        setIsRecording(false);
        releaseWakeLock();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 safe-area-inset">
      
      <PocketModeOverlay 
        isActive={isPocketMode} 
        onUnlock={() => setIsPocketMode(false)}
        statusText={isRecording ? `ListeningProject Live: ${connectedMics} Sensors Active` : "ListeningProject Standby"}
      />

      {/* Header */}
      <header className="flex-none p-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-10 pt-[env(safe-area-inset-top,20px)]">
        <div className="flex items-center gap-3">
          <img src="./icon.svg" alt="LP Logo" className="w-10 h-10" />
          <h1 className="font-bold text-lg tracking-tight text-white">ListeningProject</h1>
          {connectedMics > 1 && (
             <div className="ml-2 bg-green-900/50 p-1 px-2 rounded-full border border-green-500/30 flex items-center gap-1">
               <Radio size={12} className="text-green-400" />
               <span className="text-[10px] text-green-400 font-mono">{connectedMics} MICS</span>
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode(activeMode === AppMode.OFFLINE_MODE ? AppMode.LIVE_TRANSLATOR : AppMode.OFFLINE_MODE)}
            className={`p-2 rounded-full transition-colors ${activeMode === AppMode.OFFLINE_MODE ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Offline Mode"
          >
            <WifiOff size={20} />
          </button>
          <button
            onClick={() => setIsPocketMode(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Pocket Mode"
          >
            <Lock size={20} />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Logs / Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {!showTranscript ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
               <div className="w-24 h-24 rounded-full bg-slate-800/30 border border-slate-800 flex items-center justify-center animate-pulse">
                  <FileX size={40} className="text-slate-600" />
               </div>
               <p className="text-sm font-medium">Transcript Hidden</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
                <Sparkles size={32} className="opacity-50" />
              </div>
              <p className="text-center max-w-xs text-sm">
                <b>System Online.</b><br/>
                Sensors are ready.<br/>
                Listening for speakers...
              </p>
            </div>
          ) : (
            logs.map((msg) => {
              if (msg.role === 'date-marker') {
                return (
                  <div key={msg.id} className="flex justify-center py-4">
                     <span className="bg-slate-800/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700/50 font-mono">
                       {msg.text}
                     </span>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex flex-col gap-1`}>
                    {/* Metadata Header (Time + Speaker) */}
                    <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* Speaker ID Button */}
                        {(msg.speakerId || msg.role === 'model') && (
                          <button 
                            onClick={() => msg.speakerId && handleSpeakerClick(msg.speakerId)}
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                          >
                            <User size={10} />
                            <span className="font-semibold uppercase tracking-wider">
                              {msg.speakerId ? (speakerRegistry[msg.speakerId] || msg.speakerId) : 'AI'}
                            </span>
                            {msg.speakerId && <Edit2 size={8} className="opacity-50" />}
                          </button>
                        )}
                        <span className="opacity-50">•</span>
                        <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>

                    {/* Bubble */}
                    <div className={`rounded-2xl p-4 shadow-sm ${
                      msg.isError 
                        ? 'bg-red-900/20 border border-red-500/50 text-red-200' 
                        : msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : msg.role === 'system'
                            ? 'bg-slate-800/50 text-slate-400 text-sm border border-slate-700 font-mono'
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}>
                      {msg.isError && <AlertCircle size={16} className="mt-1 flex-shrink-0 text-red-400 mb-1" />}
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4">
          
          {/* Visualizer */}
          <div className="mb-6">
            <Visualizer isActive={isRecording} color={isRecording ? '#3b82f6' : '#475569'} />
          </div>

          {/* Mode Selector */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-slate-800/80 rounded-full p-1 border border-slate-700">
              <button 
                onClick={() => setActiveMode(AppMode.LIVE_TRANSLATOR)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.LIVE_TRANSLATOR ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Auto Translator
              </button>
              <button 
                onClick={() => setActiveMode(AppMode.TRANSCRIBER)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.TRANSCRIBER ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Transcriber
              </button>
              <button 
                onClick={() => setActiveMode(AppMode.CONTEXT_AWARE)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.CONTEXT_AWARE ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                AI Assistant
              </button>
            </div>
          </div>

          {/* Offline Progress Bar */}
          {offlineStatus.status === 'loading' && (
            <div className="mb-4 px-8">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                 <span>{offlineStatus.message}</span>
                 <span>{Math.round(offlineStatus.progress || 0)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${offlineStatus.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Button Area */}
          <div className="flex items-center justify-center gap-6">
            
            {/* Language Selector (Left) */}
            {!isRecording && (
               <div className="relative flex flex-col items-center">
                  <div className="relative w-12 h-12">
                      <select
                          value={settings.targetLanguage}
                          onChange={(e) => setSettings(prev => ({ ...prev, targetLanguage: e.target.value }))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      >
                          {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.label}</option>
                          ))}
                      </select>
                      <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shadow-sm pointer-events-none hover:bg-slate-700 transition-colors">
                          <Globe size={20} className="text-blue-400" />
                      </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-[60px] truncate text-center">
                      Output: {settings.targetLanguage}
                  </span>
               </div>
            )}

            {/* Mic Button (Center) */}
            <button
              onPointerDown={(e) => {
                if (settings.pushToTalk) {
                  e.preventDefault(); // Prevent click
                  if (!isRecording) {
                    if (activeMode === AppMode.TRANSCRIBER) {
                      startTraditionalTranscribe();
                    } else if (activeMode === AppMode.OFFLINE_MODE) {
                      startOfflineRecording();
                    } else {
                      startSession();
                    }
                  }
                }
              }}
              onPointerUp={(e) => {
                if (settings.pushToTalk) {
                  e.preventDefault();
                  if (isRecording) {
                     if (activeMode === AppMode.OFFLINE_MODE) {
                        stopOfflineRecording();
                      } else {
                        stopSession();
                      }
                  }
                }
              }}
              onPointerLeave={(e) => {
                 // Safety: if finger slides off button, stop recording
                 if (settings.pushToTalk && isRecording) {
                    if (activeMode === AppMode.OFFLINE_MODE) {
                        stopOfflineRecording();
                      } else {
                        stopSession();
                      }
                 }
              }}
              onClick={() => {
                if (!settings.pushToTalk) {
                  toggleRecording();
                }
              }}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all transform ${
                 settings.pushToTalk ? 'active:scale-90' : 'hover:scale-105 active:scale-95'
              } ${
                isRecording 
                  ? activeMode === AppMode.OFFLINE_MODE 
                    ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                    : 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-white hover:bg-slate-100'
              }`}
            >
              {isRecording ? (
                <MicOff size={32} className="text-white" />
              ) : (
                activeMode === AppMode.OFFLINE_MODE ? (
                  <WifiOff size={32} className="text-slate-900" />
                ) : (
                  <Mic size={32} className="text-slate-900" />
                )
              )}
            </button>
            
            {/* Transcript Toggle (Right) */}
            <div className="relative flex flex-col items-center">
                <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors shadow-sm ${showTranscript ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}
                >
                    {showTranscript ? (
                        <FileText size={20} className="text-blue-400" />
                    ) : (
                        <FileX size={20} />
                    )}
                </button>
                <span className="text-[10px] text-slate-400 mt-1 text-center">Transcript</span>
            </div>
          </div>
          
          <p className="text-center text-xs text-slate-500 mt-6 pb-2">
             {isRecording 
               ? activeMode === AppMode.LIVE_TRANSLATOR 
                  ? `Listening & Identifying -> ${settings.targetLanguage}`
                  : activeMode === AppMode.OFFLINE_MODE
                    ? 'Recording Offline...'
                    : 'Recording...'
               : 'Tap microphone to start'
             }
          </p>
        </div>
      </main>

      {/* Rename Speaker Modal */}
      {editingSpeakerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-xl">
             <h3 className="text-white font-semibold mb-4">Rename Speaker</h3>
             <input 
                type="text" 
                value={tempSpeakerName}
                onChange={(e) => setTempSpeakerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Enter new name..."
                autoFocus
             />
             <div className="flex gap-3">
               <button 
                  onClick={() => setEditingSpeakerId(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
               >
                 Cancel
               </button>
               <button 
                  onClick={saveSpeakerName}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
               >
                 <Check size={16} /> Save
               </button>
             </div>
          </div>
        </div>
      )}

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={setSettings}
        onExport={() => {
          const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            settings,
            speakerRegistry,
            logs
          };
          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `listening-project-backup-${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addLog('system', 'Backup exported successfully.');
        }}
      />
    </div>
  );
};

export default App;