import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Mic,
  MicOff,
  Square,
  VolumeX,
  Smartphone,
  Lock as LucideLock,
  Clock,
  Search,
  Globe,
  WifiOff,
  FileText,
  FileX,
  Check,
  Key,
  User,
  Users,
  Shield
} from 'lucide-react';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';
import PocketModeOverlay from './components/PocketModeOverlay';
import OfflineWarningModal from './components/OfflineWarningModal';
import HistoryModal from './components/HistoryModal';
import SpeakerManagerModal from './components/SpeakerManagerModal';
import VaultKeyModal from './components/VaultKeyModal';
import CustomSelect from './components/CustomSelect';
import { LogMessage, AppMode, Settings } from './types';
import { LANGUAGES } from './constants';
import { useOfflineWorker } from './hooks/useOfflineWorker';
import { useAudioSession } from './hooks/useAudioSession';
import { saveSession, importSessions, clearAllSessions, getStorageUsage } from './services/db';
import { getSpeakerColor, getSpeakerInitials } from './utils/colors';
const App: React.FC = () => {
  // --- UI State ---
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.LIVE_TRANSLATOR);
  const [isPocketMode, setIsPocketMode] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSpeakerManager, setShowSpeakerManager] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string>('');
  const [settings, setSettings] = useState<Settings>({
    targetLanguage: 'English',
    voice: 'Puck',
    autoSpeak: true,
    noiseCancellationLevel: 'high',
    pushToTalk: false,
  });
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [vaultKey, setVaultKey] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  // --- Update storage usage when settings open ---
  useEffect(() => {
    if (showSettings) {
      getStorageUsage(vaultKey).then(setStorageUsage);
    }
  }, [showSettings, vaultKey]);
  const handleImportData = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.sessions && Array.isArray(data.sessions)) {
        await importSessions(data.sessions, vaultKey);
        alert('History imported successfully!');
      }
      if (data.settings) setSettings(data.settings);
      if (data.speakerRegistry) setSpeakerRegistry(data.speakerRegistry);
      getStorageUsage().then(setStorageUsage);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Invalid file format.');
    }
  };
  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to delete ALL local history? This cannot be undone.')) {
      await clearAllSessions();
      setLogs([]); // Clear current view too
      getStorageUsage(vaultKey).then(setStorageUsage);
      alert('All local data cleared.');
    }
  };
  // --- Speaker Management State ---
  const [speakerRegistry, setSpeakerRegistry] = useState<Record<string, string>>({});
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [tempSpeakerName, setTempSpeakerName] = useState<string>('');
  const handleSpeakerClick = useCallback((id: string) => {
    setTempSpeakerName(speakerRegistry[id] || id);
    setEditingSpeakerId(id);
  }, [speakerRegistry]);
  const saveSpeakerName = useCallback(() => {
    if (editingSpeakerId && tempSpeakerName.trim()) {
      setSpeakerRegistry((prev: Record<string, string>) => ({ ...prev, [editingSpeakerId]: tempSpeakerName.trim() }));
      setEditingSpeakerId(null);
    }
  }, [editingSpeakerId, tempSpeakerName]);
  const renameSpeaker = useCallback((id: string, newName: string) => {
    setSpeakerRegistry(prev => ({ ...prev, [id]: newName }));
  }, []);
  const deleteSpeaker = useCallback((id: string) => {
    setSpeakerRegistry(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  // --- Offline Worker ---
  const { status: offlineStatus, result: offlineResult, transcribe: offlineTranscribe } = useOfflineWorker();
  const logsEndRef = useRef<HTMLDivElement>(null);
  // --- Helper: Add Log ---
  const addLog = useCallback(
    (
      role: 'user' | 'model' | 'system' | 'date-marker',
      text: string,
      isError: boolean = false,
      speakerId?: string
    ) => {
      setLogs((prev: LogMessage[]) => [
        ...prev,
        { id: crypto.randomUUID(), role, text, timestamp: new Date(), isError, speakerId },
      ]);
    },
    []
  );
  // --- Consolidated API Key Initialization & Privacy Vault Logic ---
  const initializeApiKey = useCallback(async () => {
    // 1. Check environment variables
    let key = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
    // 2. Check LocalStorage
    if (!key) {
      key = localStorage.getItem('gemini_api_key');
    }
    // 3. Check AI Studio (if available)
    if (!key && window.aistudio?.hasSelectedApiKey) {
      const hasStudioKey = await window.aistudio.hasSelectedApiKey();
      if (hasStudioKey) {
        setApiKey('STUDIO_MANAGED');
        return;
      }
    }
    if (key) {
      setApiKey(key);
    } else {
      // No key found anywhere: Prompt or show Vault
      if (window.aistudio?.openSelectKey) {
        handleConnectApiKey();
      } else {
        setShowVaultModal(true);
      }
    }
  }, []);
  useEffect(() => {
    initializeApiKey();
  }, [initializeApiKey]);
  const handleConnectApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after dialog closes (race condition mitigation)
      setApiKey('STUDIO_MANAGED');
    } else {
      alert("API Key selection is not available in this environment. Please set VITE_GEMINI_API_KEY in .env");
    }
  };
  const handleSaveManualKey = () => {
    if (manualKey.trim().length > 10) {
      localStorage.setItem('gemini_api_key', manualKey.trim());
      setApiKey(manualKey.trim());
      window.location.reload();
    } else {
      alert("Please enter a valid API Key.");
    }
  };
  // --- Handle offline chunks from audio session ---
  const handleOfflineChunks = useCallback((chunks: Float32Array[]) => {
    if (chunks.length === 0) return;
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    const lang = settings.targetLanguage.toLowerCase().split(' ')[0].replace(/[()]/g, '');
    offlineTranscribe(merged, lang);
  }, [offlineTranscribe, settings.targetLanguage]);
  // --- Audio Session Hook ---
  const {
    isRecording,
    connectedMics,
    analyserNode,
    startSession,
    stopSession,
    startOfflineRecording,
    stopOfflineRecording,
  } = useAudioSession(settings, activeMode, addLog, handleOfflineChunks, apiKey);
  // --- Auto-scroll logs ---
  useEffect(() => {
    if (showTranscript) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showTranscript]);
  // --- Offline Result Handling ---
  useEffect(() => {
    if (offlineResult?.task === 'transcribe') {
      addLog('model', `[Offline]: ${offlineResult.output.text}`);
    }
  }, [offlineResult, addLog]);
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      activeMode === AppMode.OFFLINE_MODE ? stopOfflineRecording() : stopSession();
    } else {
      // Start new session
      const newSessionId = Date.now().toString();
      setCurrentSessionId(newSessionId);
      setLogs([]); // Reset logs for new session
      if (activeMode === AppMode.OFFLINE_MODE) startOfflineRecording();
      else startSession();
    }
  }, [isRecording, activeMode, stopOfflineRecording, stopSession, startOfflineRecording, startSession]);
  const handleOfflineModeToggle = useCallback(() => {
    if (activeMode === AppMode.OFFLINE_MODE) {
      setActiveMode(AppMode.LIVE_TRANSLATOR);
    } else {
      const acknowledged = localStorage.getItem('offlineModeAcknowledged');
      if (acknowledged) setActiveMode(AppMode.OFFLINE_MODE);
      else setShowOfflineWarning(true);
    }
  }, [activeMode]);
  const handleLanguageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings((prev: Settings) => ({ ...prev, targetLanguage: event.target.value }));
  }, []);
  // --- Auto-Save to IndexedDB (Debounced) ---
  useEffect(() => {
    if (!currentSessionId || logs.length === 0) return;
    const saveTimer = setTimeout(() => {
      const session = {
        id: currentSessionId,
        startTime: new Date(parseInt(currentSessionId)),
        endTime: new Date(),
        mode: activeMode,
        targetLanguage: settings.targetLanguage,
        logs: logs,
        speakerRegistry: speakerRegistry
      };
      // Explicitly capture values for async save to avoid closure issues
      const finalVaultKey = vaultKey;
      saveSession(session, finalVaultKey).catch(err => {
        console.error("Failed to auto-save session:", err);
        addLog('system', 'Auto-save failed. Your progress may not be persistent.', true);
      });
    }, 2000); // 2s Debounce
    return () => clearTimeout(saveTimer);
  }, [logs, currentSessionId, activeMode, settings.targetLanguage, speakerRegistry, vaultKey, addLog]);
  if (!apiKey) {
    return (
      <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
          <Key size={40} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">API Key Required</h1>
        <p className="text-slate-400 max-w-md mb-8">
          To use the ListeningProject Live features, you need to connect a Google Gemini API key.
        </p>
        <button
          onClick={handleConnectApiKey}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 mb-8"
        >
          <Key size={18} />
          Connect Google AI Studio
        </button>
        <div className="w-full max-w-sm border-t border-slate-800 pt-8">
          <p className="text-sm text-slate-400 mb-4">Or enter your API key manually:</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Paste API Key here..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSaveManualKey}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <p className="mt-8 text-xs text-slate-500">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
            Learn more about billing and API keys
          </a>
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 safe-area-inset">
      <PocketModeOverlay
        isActive={isPocketMode}
        onUnlock={() => setIsPocketMode(false)}
        statusText={isRecording ? `ListeningProject Live: ${connectedMics} Sensors Active` : 'ListeningProject Standby'}
      />
      {/* Header */}
      <header className="flex-none p-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-10 pt-[env(safe-area-inset-top,20px)]">
        <div className="flex items-center gap-3">
          <img src="./icon.svg" alt="LP Logo" className="w-10 h-10" />
          <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">ListeningProject</h1>
          {connectedMics > 1 && (
            <div className="ml-2 bg-green-900/50 p-1 px-2 rounded-full border border-green-500/30 flex items-center gap-1">
              <Smartphone size={12} className="text-green-400" />
              <span className="text-[10px] text-green-400 font-mono">{connectedMics} MICS</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOfflineModeToggle}
            className={`p-2 rounded-full transition-colors ${activeMode === AppMode.OFFLINE_MODE ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Offline Mode"
          >
            <Smartphone size={20} />
          </button>
          <button
            onClick={() => setIsPocketMode(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Enter Pocket Mode"
          >
            <LucideLock size={20} />
          </button>
          <button
            onClick={() => setShowSpeakerManager(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Manage Speakers"
          >
            <Users size={20} />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="History"
          >
            <Clock size={20} />
          </button>
          <button
            onClick={() => setShowVaultModal(true)}
            className={`p-2 rounded-full transition-all border ${vaultKey ? 'bg-purple-900/40 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-900/20' : 'hover:bg-slate-800 border-transparent text-slate-400 hover:text-white'}`}
            title="Privacy Vault"
          >
            <Shield size={20} />
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
        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {!showTranscript ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-800/30 border border-slate-800 flex items-center justify-center animate-pulse">
                <Search size={40} className="text-slate-600" />
              </div>
              <p className="text-sm font-medium">Transcript Hidden</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
                <Search size={32} className="opacity-50" />
              </div>
              <p className="text-center max-w-xs text-sm">
                <b>System Online.</b><br />Sensors are ready.<br />Listening for speakers...
              </p>
            </div>
          ) : (
            logs.map(msg => {
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
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] flex flex-col gap-1">
                    <div className={`flex items-center gap-2 text-[10px] text-slate-400 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {(msg.speakerId || msg.role === 'model') && (
                        <button
                          onClick={() => msg.speakerId && handleSpeakerClick(msg.speakerId)}
                          className="flex items-center gap-2 hover:bg-slate-800/50 rounded-full pr-2 py-0.5 transition-colors group"
                          disabled={!msg.speakerId}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${msg.speakerId ? getSpeakerColor(msg.speakerId) : 'bg-blue-600'
                            }`}>
                            {msg.speakerId ? getSpeakerInitials(speakerRegistry[msg.speakerId] || msg.speakerId) : 'AI'}
                          </div>
                          <span className="font-semibold text-slate-300 group-hover:text-blue-400 transition-colors">
                            {msg.speakerId ? (speakerRegistry[msg.speakerId] || msg.speakerId) : 'AI Assistant'}
                          </span>
                        </button>
                      )}
                      <span className="opacity-50">•</span>
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className={`rounded-2xl p-4 shadow-sm ${msg.isError
                      ? 'bg-red-900/20 border border-red-500/50 text-red-200'
                      : msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : msg.role === 'system'
                          ? 'bg-slate-800/50 text-slate-400 text-sm border border-slate-700 font-mono'
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                      }`}>
                      {msg.isError && <VolumeX size={16} className="mt-1 flex-shrink-0 text-red-400 mb-1" />}
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
            <Visualizer
              analyserNode={analyserNode}
              isActive={isRecording}
              color={isRecording
                ? activeMode === AppMode.OFFLINE_MODE ? '#f97316' : '#3b82f6'
                : '#475569'
              }
            />
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
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* Language Selector */}
            {!isRecording && (
              <div className="flex flex-col items-center">
                <CustomSelect
                  value={settings.targetLanguage}
                  onChange={(val) => setSettings(prev => ({ ...prev, targetLanguage: val }))}
                  options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
                  position="up"
                  className="w-12 h-12"
                  placeholder=""
                  icon={<Globe size={20} className="text-blue-400" />}
                />
                <span className="text-[10px] text-slate-400 mt-1 max-w-[60px] truncate text-center">
                  Output: {settings.targetLanguage}
                </span>
              </div>
            )}
            {/* Mic Button */}
            <button
              onPointerDown={e => {
                if (settings.pushToTalk) {
                  e.preventDefault();
                  if (!isRecording) toggleRecording();
                }
              }}
              onPointerUp={e => {
                if (settings.pushToTalk) {
                  e.preventDefault();
                  if (isRecording) toggleRecording();
                }
              }}
              onPointerLeave={e => {
                if (settings.pushToTalk && isRecording) toggleRecording();
              }}
              onClick={() => { if (!settings.pushToTalk) toggleRecording(); }}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all transform ${settings.pushToTalk ? 'active:scale-90' : 'hover:scale-105 active:scale-95'
                } ${isRecording
                  ? activeMode === AppMode.OFFLINE_MODE
                    ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                    : 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-white hover:bg-slate-100'
                }`}
            >
              {isRecording ? (
                <MicOff size={32} className="text-white" />
              ) : (
                activeMode === AppMode.OFFLINE_MODE
                  ? <WifiOff size={32} className="text-slate-900" />
                  : <Mic size={32} className="text-slate-900" />
              )}
            </button>
            {/* Transcript Toggle */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors shadow-sm ${showTranscript ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}
              >
                {showTranscript
                  ? <FileText size={20} className="text-blue-400" />
                  : <FileX size={20} />
                }
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
              onChange={e => setTempSpeakerName(e.target.value)}
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
      <SpeakerManagerModal
        isOpen={showSpeakerManager}
        onClose={() => setShowSpeakerManager(false)}
        speakerRegistry={speakerRegistry}
        onRenameSpeaker={renameSpeaker}
        onDeleteSpeaker={deleteSpeaker}
        activeSpeakers={Array.from(new Set(logs.map(l => l.speakerId).filter(Boolean) as string[]))}
      />
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
            logs,
          };
          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `listening-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addLog('system', 'Backup exported successfully.');
        }}
        onImport={handleImportData}
        onClearData={handleClearData}
        storageUsage={storageUsage}
      />
      <OfflineWarningModal
        isOpen={showOfflineWarning}
        onConfirm={() => {
          localStorage.setItem('offlineModeAcknowledged', 'true');
          setShowOfflineWarning(false);
          setActiveMode(AppMode.OFFLINE_MODE);
        }}
        onCancel={() => setShowOfflineWarning(false)}
      />
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        vaultKey={vaultKey}
        onSelectSession={(session) => {
          if (session.mode === AppMode.LOCKED) {
            setShowHistory(false);
            setShowVaultModal(true);
            return;
          }
          setLogs(session.logs);
          setSpeakerRegistry(session.speakerRegistry);
          setActiveMode(session.mode);
          setSettings(prev => ({ ...prev, targetLanguage: session.targetLanguage }));
          setCurrentSessionId(session.id);
          setShowHistory(false);
          addLog('system', `Loaded session from ${session.startTime.toLocaleString()}`);
        }}
      />
      <VaultKeyModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        currentKey={vaultKey}
        onSaveKey={setVaultKey}
      />
    </div>
  );
};
export default App;
