import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
  Mic, MicOff, Settings as SettingsIcon, Globe, 
  Sparkles, Volume2, Lock, Bluetooth, Radio, FileText, FileX, AlertCircle
} from 'lucide-react';

import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import PocketModeOverlay from './components/PocketModeOverlay';
import { LogMessage, AppMode, Settings, NoiseLevel } from './types';
import { createPcmBlob, decodeBase64, decodeAudioData } from './utils/audio';
import { MODEL_LIVE, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE, LANGUAGES } from './constants';
import { transcribeAudio, speakText, getContextualInfo } from './services/gemini';

// --- Custom Insignia Component ---
const LPIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="100" height="100" rx="24" fill="url(#lp-gradient)" />
    <text x="50" y="72" fontSize="55" fontWeight="900" fontFamily="sans-serif" fill="white" textAnchor="middle" style={{ letterSpacing: '-2px' }}>LP</text>
    <defs>
      <linearGradient id="lp-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6"/>
        <stop offset="1" stopColor="#9333ea"/>
      </linearGradient>
    </defs>
  </svg>
);

const getAudioConstraints = (level: NoiseLevel) => {
  switch (level) {
    case 'off': return { echoCancellation: true, noiseSuppression: false, autoGainControl: false };
    case 'low': return { echoCancellation: true, noiseSuppression: false, autoGainControl: true };
    case 'high': return { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    default: return { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  }
};

const App: React.FC = () => {
  // --- State ---
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.LIVE_TRANSLATOR);
  const [isRecording, setIsRecording] = useState(false);
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true); // New Toggle State
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    targetLanguage: 'English',
    voice: 'Puck',
    autoSpeak: true,
    noiseCancellationLevel: 'high', // Default to High for typical phone use cases
  });
  const [connectedMics, setConnectedMics] = useState<number>(0);

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

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showTranscript) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showTranscript]);

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
      if (document.visibilityState === 'visible' && isRecording) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording]);

  // --- Helper: Add Log ---
  const addLog = (role: 'user' | 'model' | 'system', text: string, isError: boolean = false) => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random(), role, text, timestamp: new Date(), isError }
    ]);
  };

  // --- AUDIO FUSION SYSTEM ---
  // Connects to ALL available microphones and mixes them
  const initializeMultiInputAudio = async (ctx: AudioContext): Promise<ScriptProcessorNode> => {
    let devices: MediaDeviceInfo[] = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
    }
    
    const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
    
    // Deduplicate logic: prioritize unique deviceIds.
    // Filter out default/communications if specific devices exist to avoid duplicate streams of same hardware.
    const specificDevices = audioInputDevices.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications');
    const devicesToTry = specificDevices.length > 0 ? specificDevices : audioInputDevices;

    const merger = ctx.createChannelMerger(1); // Mix all inputs to mono for the AI
    let streamCount = 0;
    
    const audioConstraints = getAudioConstraints(settings.noiseCancellationLevel);
    addLog('system', `Scanning hardware... Found ${devicesToTry.length} potential sensors.`);

    // Attempt to open every single microphone found
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

    // Fallback: If strict multi-device failed (common on mobile OS restriction), get default
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
      addLog('system', `Triangulating 3D audio picture...`);
    }

    setConnectedMics(streamCount);

    const processor = ctx.createScriptProcessor(4096, 1, 1);
    merger.connect(processor);
    processor.connect(ctx.destination); // Needed for processing to flow, but mute output handled by ctx destination usually
    
    return processor;
  };

  // --- LIVE API: Connection & Audio Handling ---

  const startSession = async () => {
    if (isRecording) return;

    try {
      addLog('system', `Initializing Neural Interface...`);
      await requestWakeLock();
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutput.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      await audioContextInput.current.resume();
      await audioContextOutput.current.resume();

      // Initialize Multi-Mic Fusion
      const processor = await initializeMultiInputAudio(audioContextInput.current);
      processorRef.current = processor;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // EVOLUTIONARY AI INSTRUCTION
      const translatorInstruction = `
        You are "ListeningProject", a self-evolving, adaptive linguistic intelligence.
        
        **INPUT DATA:**
        - You are receiving a fused audio stream from **${connectedMics} separate microphones**.
        - Triangulate the clearest voice signal.
        - The user is in "Stealth Mode".
        
        **CORE PROTOCOLS:**
        1.  **UNIVERSAL LISTEN:** Constantly scan for ANY language.
        2.  **TARGET LANGUAGE:** **${settings.targetLanguage}**.
        
        **BEHAVIOR LOGIC:**
        - **CASE A: You hear a FOREIGN language (NOT ${settings.targetLanguage}):**
            - Translate it immediately to **${settings.targetLanguage}**.
            - SPEAK the translation clearly.
        
        - **CASE B: You hear the TARGET language (${settings.targetLanguage}):**
            - **DO NOT SPEAK.**
            - **DO NOT TRANSLATE.**
            - **PRODUCE NO AUDIO.**
            - Allow the system to log the transcription quietly.
        
        **ADAPTIVE LEARNING:**
        - Infer meaning from context, slang, and dialect.
      `;

      const assistantInstruction = `
        You are "ListeningProject".
        Listen to the environment.
        Answer queries in **${settings.targetLanguage}**.
        If the user speaks to you, respond helpfuly.
      `;

      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } },
        },
        systemInstruction: activeMode === AppMode.LIVE_TRANSLATOR ? translatorInstruction : assistantInstruction,
        inputAudioTranscription: {}, // Capture input text even if model is silent
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
               if (currentInputTranscription.current.trim()) {
                   addLog('user', currentInputTranscription.current.trim());
                   currentInputTranscription.current = '';
               }
               if (currentOutputTranscription.current.trim()) {
                   addLog('model', currentOutputTranscription.current.trim());
                   currentOutputTranscription.current = '';
               }
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
      setIsRecording(false);
    }
  };

  const stopSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    // Stop all active streams
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
    
    if (currentInputTranscription.current.trim()) {
       addLog('user', currentInputTranscription.current.trim());
       currentInputTranscription.current = '';
    }
    if (currentOutputTranscription.current.trim()) {
       addLog('model', currentOutputTranscription.current.trim());
       currentOutputTranscription.current = '';
    }

    setIsRecording(false);
    sessionPromiseRef.current = null;
    releaseWakeLock();
    addLog('system', 'System halted.');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSession();
    } else {
      if (activeMode === AppMode.TRANSCRIBER) {
        startTraditionalTranscribe();
      } else {
        startSession();
      }
    }
  };

  const startTraditionalTranscribe = async () => {
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
                
                if (text.toLowerCase().includes('explain') || text.toLowerCase().includes('what is')) {
                    const ctx = await getContextualInfo(text);
                    if (ctx.text) addLog('system', `Contextual Data: ${ctx.text}`);
                }
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
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            msg = "Microphone access denied. Please enable permissions.";
        }
        addLog('system', msg, true);
        setIsRecording(false);
        releaseWakeLock();
    }
  };

  const handleTextSubmit = async (text: string) => {
      addLog('user', text);
      const arrayBuffer = await speakText(text, settings.voice);
      if (arrayBuffer) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
            addLog('model', 'Vocalizing...');
        } catch (e) {
            console.error("Audio playback error:", e);
            addLog('system', 'Failed to play audio response.', true);
        }
      } else {
        addLog('system', 'Failed to generate speech.', true);
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
        <div className="flex items-center gap-2">
          <LPIcon size={36} className="shadow-lg" />
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
                Sensors are ready to fuse audio data.<br/>
                AI is ready to adapt and evolve.
              </p>
            </div>
          ) : (
            logs.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm flex items-start gap-2 ${
                  msg.isError 
                    ? 'bg-red-900/20 border border-red-500/50 text-red-200' 
                    : msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : msg.role === 'system'
                        ? 'bg-slate-800/50 text-slate-400 text-sm border border-slate-700 font-mono'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.isError && <AlertCircle size={16} className="mt-1 flex-shrink-0 text-red-400" />}
                  <div>
                    {msg.text}
                    <div className="text-[10px] opacity-50 mt-1 text-right">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
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
              onClick={toggleRecording}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 active:scale-95 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-white hover:bg-slate-100'
              }`}
            >
              {isRecording ? (
                <MicOff size={32} className="text-white" />
              ) : (
                <Mic size={32} className="text-slate-900" />
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
                  ? `Scanning Environment -> ${settings.targetLanguage}`
                  : 'Recording...'
               : 'Tap microphone to start'
             }
          </p>
        </div>
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={setSettings}
      />
    </div>
  );
};

export default App;