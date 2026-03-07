# Updated Files for Copy/Paste\n\nHere are the full contents of all the files that were updated during the recent debugging and optimization phase. You can copy and paste these directly to replace your older versions.\n\n## App.tsx\n\n`tsx\n/// <reference types="vite/client" />
import React, { useState, useEffect, useCallback } from 'react';
import { Key } from 'lucide-react';
import AppHeader from './components/AppHeader';
import ChatList from './components/ChatList';
import ControlPanel from './components/ControlPanel';
import ModalsLayer from './components/ModalsLayer';
import PocketModeOverlay from './components/PocketModeOverlay';
import SpatialMap from './components/SpatialMap';
import { LogMessage, AppMode, Settings, PeerNode, BeforeInstallPromptEvent } from './types';
import { useOfflineWorker } from './hooks/useOfflineWorker';
import { useAudioSession } from './hooks/useAudioSession';
import { saveSession, importSessions, clearAllSessions, getStorageUsage } from './services/db';
import { getSpeakerColor, getSpeakerInitials } from './utils/colors';
import { discoveryService } from './services/DiscoveryService';

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSpatialMap, setShowSpatialMap] = useState<boolean>(false);

  // --- Peer Discovery State ---
  const [nodes, setNodes] = useState<PeerNode[]>([]);
  useEffect(() => {
    discoveryService.setUpdateListener(setNodes);
    discoveryService.advertisePresence();
  }, []);

  const handleScanPeers = useCallback(() => {
    setShowSpatialMap(true);
    discoveryService.scanForPeers();
  }, []);

  // --- Listen for PWA install prompt ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // --- Update storage usage when settings open ---
  useEffect(() => {
    if (showSettings) {
      getStorageUsage(vaultKey).then(setStorageUsage);
    }
  }, [showSettings, vaultKey]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleImportData = useCallback(async (file: File) => {
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
  }, [vaultKey]);

  const handleClearData = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete ALL local history? This cannot be undone.')) {
      await clearAllSessions();
      setLogs([]); // Clear current view too
      getStorageUsage(vaultKey).then(setStorageUsage);
      alert('All local data cleared.');
    }
  }, [vaultKey]);

  // --- Speaker Management State ---
  const [speakerRegistry, setSpeakerRegistry] = useState<Record<string, string>>({});

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const renameSpeaker = useCallback((id: string, newName: string) => {
    setSpeakerRegistry(prev => ({ ...prev, [id]: newName }));
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const deleteSpeaker = useCallback((id: string) => {
    setSpeakerRegistry(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // --- Offline Worker ---
  const { status: offlineStatus, result: offlineResult, transcribe: offlineTranscribe } = useOfflineWorker();

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
  const handleExport = useCallback(() => {
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
    a.download = `lp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('system', 'Backup exported successfully.');
  }, [settings, speakerRegistry, logs, addLog]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/preserve-manual-memoization
  const handleSelectSession = useCallback((session: any) => {
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
  }, []);

  const handleConnectApiKey = useCallback(async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setApiKey('STUDIO_MANAGED');
    } else {
      alert("API Key selection is not available in this environment. Please set VITE_GEMINI_API_KEY in .env");
    }
  }, []);

  const initializeApiKey = useCallback(async () => {
    let key = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
    if (!key) {
      key = localStorage.getItem('gemini_api_key');
    }
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
      if (window.aistudio?.openSelectKey) {
        handleConnectApiKey();
      } else {
        setShowVaultModal(true);
      }
    }
  }, [handleConnectApiKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initializeApiKey();
  }, [initializeApiKey]);

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

  // --- Offline Result Handling ---
  useEffect(() => {
    if (offlineResult?.task === 'transcribe') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      addLog('model', `[Offline]: ${offlineResult.output.text}`);
    }
  }, [offlineResult, addLog]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (activeMode === AppMode.OFFLINE_MODE) {
        stopOfflineRecording();
      } else {
        stopSession();
      }
    } else {
      const newSessionId = Date.now().toString();
      setCurrentSessionId(newSessionId);
      setLogs([]);
      if (activeMode === AppMode.OFFLINE_MODE) {
        startOfflineRecording();
      } else {
        startSession();
      }
    }
  }, [isRecording, activeMode, stopOfflineRecording, stopSession, startOfflineRecording, startSession]);

  const handleOfflineModeToggle = useCallback(() => {
    if (activeMode === AppMode.OFFLINE_MODE) {
      setActiveMode(AppMode.LIVE_TRANSLATOR);
    } else {
      setShowOfflineWarning(true);
    }
  }, [activeMode]);

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
      saveSession(session, vaultKey).catch(err => {
        console.error("Failed to auto-save session:", err);
      });
    }, 2000);
    return () => clearTimeout(saveTimer);
  }, [logs, currentSessionId, activeMode, settings.targetLanguage, speakerRegistry, vaultKey]);

  if (!apiKey) {
    return (
      <div className="flex flex-col h-screen animate-ambient text-slate-200 items-center justify-center p-6 text-center">
        <div className="glass-panel p-10 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
            <Key size={40} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ListeningProject</h1>
          <p className="text-slate-400 mb-8 text-xs leading-relaxed">Secure connection required.</p>
          <button onClick={handleConnectApiKey} className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 mb-8">
            <Key size={18} /> Connect Google AI Studio
          </button>
          <div className="w-full border-t border-white/5 pt-8">
            <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-bold">Manual API Key</p>
            <div className="flex gap-2">
              <input type="password" value={manualKey} onChange={(e) => setManualKey(e.target.value)} placeholder="Paste Key here..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
              <button onClick={handleSaveManualKey} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors">Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen animate-ambient text-slate-200 safe-area-inset overflow-hidden selection:bg-blue-500/30">
      <PocketModeOverlay
        isActive={isPocketMode}
        onUnlock={() => setIsPocketMode(false)}
        statusText={isRecording ? `ListeningProject Live: ${connectedMics} Sensors Active` : 'ListeningProject Standby'}
      />

      <AppHeader
        connectedMics={connectedMics}
        activeMode={activeMode}
        handleOfflineModeToggle={handleOfflineModeToggle}
        setIsPocketMode={setIsPocketMode}
        setShowSpeakerManager={setShowSpeakerManager}
        setShowHistory={setShowHistory}
        setShowVaultModal={setShowVaultModal}
        setShowSettings={setShowSettings}
        vaultKey={vaultKey}
        nodes={nodes}
        onScan={handleScanPeers}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ChatList
          logs={logs}
          showTranscript={showTranscript}
          speakerRegistry={speakerRegistry}
          getSpeakerColor={getSpeakerColor}
          getSpeakerInitials={getSpeakerInitials}
        />

        <ControlPanel
          isRecording={isRecording}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          analyserNode={analyserNode}
          offlineStatus={offlineStatus}
          settings={settings}
          setSettings={setSettings}
          toggleRecording={toggleRecording}
          showTranscript={showTranscript}
          setShowTranscript={setShowTranscript}
        />
      </main>

      {showSpatialMap && (
        <SpatialMap
          nodes={nodes}
          onClose={() => setShowSpatialMap(false)}
        />
      )}

      <ModalsLayer
        showSpeakerManager={showSpeakerManager}
        setShowSpeakerManager={setShowSpeakerManager}
        speakerRegistry={speakerRegistry}
        renameSpeaker={renameSpeaker}
        deleteSpeaker={deleteSpeaker}
        logs={logs}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        setSettings={setSettings}
        handleExport={handleExport}
        handleImportData={handleImportData}
        handleClearData={handleClearData}
        storageUsage={storageUsage}
        deferredPrompt={deferredPrompt}
        handleInstallApp={handleInstallApp}
        showOfflineWarning={showOfflineWarning}
        setShowOfflineWarning={setShowOfflineWarning}
        setActiveMode={setActiveMode}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        vaultKey={vaultKey}
        onSelectSession={handleSelectSession}
        showVaultModal={showVaultModal}
        setShowVaultModal={setShowVaultModal}
        setVaultKey={setVaultKey}
      />
    </div>
  );
};

export default App;
\n`\n\n## index.tsx\n\n`tsx\nimport React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Initialize Sentry before rendering.
// Only initializes if VITE_SENTRY_DSN is set — safe to omit in local dev.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,         // 'development' or 'production'
    tracesSampleRate: 1.0,                      // Capture 100% of transactions (lower in prod if needed)
    replaysSessionSampleRate: 0.1,              // Replay 10% of all sessions
    replaysOnErrorSampleRate: 1.0,              // Replay 100% of sessions with errors
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

\n`\n\n## global.d.ts\n\n`ts\nexport { };

declare global {
    interface Window {
        aistudio?: {
            hasSelectedApiKey?: () => Promise<boolean>;
            openSelectKey?: () => Promise<void>;
        };
    }

    interface ImportMetaEnv {
        readonly VITE_GEMINI_API_KEY: string;
        readonly VITE_SENTRY_DSN?: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}
\n`\n\n## components/SettingsModal.tsx\n\n`tsx\nimport React, { useRef } from 'react';
import { Settings, VoiceName, NoiseLevel } from '../types';
import { LANGUAGES, VOICES } from '../constants';
import { X, Mic, Volume2, Globe, Download, Upload, Trash2, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearData: () => void;
  storageUsage: number;
  canInstall: boolean;
  onInstall: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onExport,
  onImport,
  onClearData,
  storageUsage,
  canInstall,
  onInstall
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const languageOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label
  }));

  const voiceOptions = VOICES.map(voice => ({
    value: voice.id,
    label: voice.label
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <SettingsIcon size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-xl font-bold text-white">Translator Settings</h2>
              <p className="text-xs text-slate-400">Configure your experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Target Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe size={18} />
              <label className="text-sm font-medium">Target Language</label>
            </div>
            <CustomSelect
              value={settings.targetLanguage}
              onChange={(value) => onUpdate({ ...settings, targetLanguage: value })}
              options={languageOptions}
              className="w-full bg-slate-950 border-slate-700 justify-between px-4 py-3 rounded-xl"
              position="down"
            />
          </div>

          {/* Noise Cancellation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Mic size={18} />
              <label className="text-sm font-medium">Ambient Noise Cancellation</label>
            </div>
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-700">
              {(['off', 'low', 'high'] as NoiseLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdate({ ...settings, noiseCancellationLevel: level })}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${settings.noiseCancellationLevel === level
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-1">
              {settings.noiseCancellationLevel === 'off' && "Raw audio. No filtering. Best for quiet studios."}
              {settings.noiseCancellationLevel === 'low' && "Volume leveling only. Background noise preserved."}
              {settings.noiseCancellationLevel === 'high' && "Reduces background noise. Best for outdoors/crowds."}
            </p>
          </div>

          {/* Voice Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Volume2 size={18} />
              <label className="text-sm font-medium">AI Voice</label>
            </div>
            <CustomSelect
              value={settings.voice}
              onChange={(value) => onUpdate({ ...settings, voice: value as VoiceName })}
              options={voiceOptions}
              className="w-full bg-slate-950 border-slate-700 justify-between px-4 py-3 rounded-xl"
              position="down"
            />
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <span className="text-slate-300 text-sm font-medium">Auto-speak Translations</span>
            <button
              onClick={() => onUpdate({ ...settings, autoSpeak: !settings.autoSpeak })}
              className={`w-11 h-6 rounded-full relative transition-colors ${settings.autoSpeak ? 'bg-blue-600' : 'bg-slate-600'
                }`}
            >
              <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.autoSpeak ? 'translate-x-5' : ''
                }`} />
            </button>
          </div>

          {/* Push to Talk Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex flex-col">
              <span className="text-slate-300 text-sm font-medium">Push to Talk Mode</span>
              <span className="text-slate-500 text-xs">Hold microphone to listen, release to stop</span>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, pushToTalk: !settings.pushToTalk })}
              className={`w-11 h-6 rounded-full relative transition-colors ${settings.pushToTalk ? 'bg-blue-600' : 'bg-slate-600'
                }`}
            >
              <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.pushToTalk ? 'translate-x-5' : ''
                }`} />
            </button>
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Data Management</span>
              <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                <HardDrive size={12} />
                {formatBytes(storageUsage)} used
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={onExport}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl transition-colors border border-slate-700"
              >
                <Download size={18} />
                <span>Export</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl transition-colors border border-slate-700"
              >
                <Upload size={18} />
                <span>Import</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            <button
              onClick={onClearData}
              className="w-full flex items-center justify-center gap-2 bg-red-900/10 hover:bg-red-900/20 text-red-400 hover:text-red-300 py-3 rounded-xl transition-colors border border-red-900/20"
            >
              <Trash2 size={18} />
              <span>Clear All Local Data</span>
            </button>

            <p className="text-xs text-slate-500 mt-3 text-center">
              Your data is stored locally on this device. Exporting allows you to backup or transfer your history.
            </p>
          </div>

          {/* Install App */}
          {canInstall && (
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 font-semibold py-3 rounded-xl transition-colors border border-blue-900/30"
              >
                <span>Install App</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-none p-6 border-t border-slate-800 bg-slate-900/80 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
\n`\n\n## components/HistoryModal.tsx\n\n`tsx\nimport React, { useEffect, useState } from 'react';
import { X, Trash2, Clock, AppWindow, Globe, ChevronRight } from 'lucide-react';
import { Session } from '../types';
import { getSessions, deleteSession } from '../services/db';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    vaultKey: string | null;
    onSelectSession: (session: Session) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, vaultKey, onSelectSession }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSessions(vaultKey);
            setSessions(data);
        } catch (err) {
            console.error("Failed to load sessions", err);
        } finally {
            setLoading(false);
        }
    }, [vaultKey]);

    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen, fetchSessions]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this session?')) {
            await deleteSession(id);
            await fetchSessions();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Clock className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Session History</h2>
                            <p className="text-xs text-slate-400">Your local transcription history</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-20">
                            <Clock size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                            <p className="text-slate-500">No sessions saved yet.</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                className="group relative p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-blue-500/30 transition-all cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">
                                                {session.startTime.toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-blue-400 border border-slate-700">
                                                <AppWindow size={10} /> {session.mode.replace('_', ' ')}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                                                <Globe size={10} /> {session.targetLanguage}
                                            </span>
                                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-500 border border-slate-700">
                                                {session.logs.length} Messages
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(e, session.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Session"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-4 bg-slate-900/80 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500">History is stored locally in your browser and is not uploaded to any server.</p>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
\n`\n\n## components/Visualizer.tsx\n\n`tsx\nimport React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({
  analyserNode,
  isActive,
  color = '#3b82f6',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const drawFlatLine = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    if (!isActive || !analyserNode) {
      drawFlatLine();
      cancelAnimationFrame(animationRef.current);
      return;
    }

    // fftSize must be set on the AnalyserNode — this is a required Web Audio API configuration.
    // eslint-disable-next-line react-hooks/immutability
    analyserNode.fftSize = 1024;
    const bufferLength = 1024; // same value; avoids reading back the mutated prop
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();

      const sliceWidth = WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // dataArray[i] is 0-255; 128 = silence (center)
        const v = dataArray[i] / 128.0;
        const y = (v * HEIGHT) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      drawFlatLine();
    };
  }, [isActive, analyserNode, color]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={60}
      className="w-full h-16 rounded-lg bg-slate-900/50 backdrop-blur-sm"
      role="img"
      aria-label="Audio frequency visualizer"
    />
  );
};

export default Visualizer;
\n`\n\n## components/ErrorBoundary.tsx\n\n`tsx\nimport React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info?.componentStack);
        // Report to Sentry with the React component stack for debugging
        Sentry.captureException(error, {
            extra: { componentStack: info?.componentStack },
        });
    }

    handleReload = () => {
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-slate-200">
                    <div className="w-full max-w-md bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-900/20 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} className="text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 text-sm mb-6">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 mb-6 text-left">
                            <p className="text-xs font-mono text-red-300 break-all">
                                {(this.state.error as Error)?.message || 'Unknown error'}
                            </p>
                        </div>
                        <button
                            onClick={this.handleReload}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                            <RefreshCw size={18} />
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
\n`\n\n## hooks/useAudioSession.ts\n\n`ts\nimport { useState, useRef, useCallback, useEffect } from 'react';
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
    const sessionPromiseRef = useRef<Promise<unknown> | null>(null);
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
    }, [isRecording, addLog]);
    const initializeMultiInputAudio = async (ctx: AudioContext): Promise<AudioWorkletNode> => {
        let devices: MediaDeviceInfo[] = [];
        try { devices = await navigator.mediaDevices.enumerateDevices(); } catch (e) {
            console.debug('Failed to enumerate devices:', e);
        }
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const specific = audioInputs.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications');
        const toTry = specific.length > 0 ? specific : audioInputs;
        const merger = ctx.createChannelMerger(1);
        const constraints = getAudioConstraints(settings.noiseCancellationLevel);
        addLog('system', `Scanning hardware... Found ${toTry.length} potential sensors.`);
        let streamCount: number;
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
                    console.warn(`Failed to access sensor ${device.label || device.deviceId}:`, e);
                    return false;
                }
            })
        );
        streamCount = scanResults.filter(Boolean).length;
        if (streamCount === 0) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
                activeStreamsRef.current.push(stream);
                ctx.createMediaStreamSource(stream).connect(merger);
                streamCount = 1;
                addLog('system', 'Using primary sensor array.');
            } catch (e: unknown) {
                if (e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) throw new Error('PermissionDenied', { cause: e });
                throw new Error('No audio sensors available.', { cause: e });
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
        // Load and initialize AudioWorklet (prevent redundant loads)
        try {
            await ctx.audioWorklet.addModule(audioProcessorUrl);
        } catch (e: unknown) {
            // Ignore if already added, but log other failures
            if (e instanceof Error && !e.message?.includes('already registered')) {
                console.error('Failed to load AudioWorklet module:', e, audioProcessorUrl);
                throw new Error('AudioWorklet module failed to load. Check storage/paths.', { cause: e });
            }
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
        try {
            if (workletNodeRef.current) {
                workletNodeRef.current.port.onmessage = null;
                workletNodeRef.current.disconnect();
            }
        } catch (e) {
            console.warn('Worklet disconnect failed:', e);
        }
        workletNodeRef.current = null;
        setAnalyserNode(null);
        activeStreamsRef.current.forEach(s => {
            try {
                s.getTracks().forEach(t => {
                    t.stop();
                    t.enabled = false;
                });
            } catch (e) {
                console.debug('Failed to stop track:', e);
            }
        });
        activeStreamsRef.current = [];
        try {
            if (audioContextInput.current && audioContextInput.current.state !== 'closed') {
                audioContextInput.current.close().catch(() => { });
            }
        } catch (e) {
            console.debug('Failed to close input context:', e);
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

            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextOutput.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

            await audioContextInput.current.resume();
            await audioContextOutput.current.resume();

            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            workletNodeRef.current = workletNode;

            const finalApiKey = apiKeyProp === 'STUDIO_MANAGED' ? undefined : (apiKeyProp || undefined);
            const ai = new GoogleGenAI({ apiKey: finalApiKey });

            const translatorInstruction = `You are "ListeningProject".
CORE PROTOCOLS:
1. UNIVERSAL TRANSLATOR: Translate EVERYTHING you hear into the target language (**${settings.targetLanguage}**).
2. MULTI-LANGUAGE SCANNING: Listen for ANY and ALL languages.
3. SPEAKER ID: Start EVERY output line with [Speaker Label]:.
   Example: [Spanish Speaker 1]: The translation goes here.
4. TARGET-LANGUAGE HANDLING: If you hear the target language, transcribe it verbatim to preserve the record.
5. NO LATENCY: Provide the translation as soon as the speaker begins. Do not wait for long pauses.`;

            const assistantInstruction = `You are "ListeningProject Assistant". 
CORE PROTOCOLS:
1. SPEAKER TRACKING: Identify speakers with [Speaker Name]: format.
2. CONTEXTUAL AWARENESS: Use integrated search grounding to explain cultural references or terms mentioned in the audio.
3. LANGUAGE: Always respond in the user's selected target language (**${settings.targetLanguage}**).`;

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
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            sessionPromiseRef.current?.then((session: any) => session.sendRealtimeInput({
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
        } catch (err: unknown) {
            let msg = 'Critical Failure: Audio Sensors Unreachable.';
            const errorObj = err instanceof Error ? err : new Error(String(err));
            if (errorObj.message === 'PermissionDenied' || errorObj.name === 'NotAllowedError') msg = 'Microphone access denied. Enable permissions in browser settings.';
            else if (errorObj.message === 'No audio sensors available.') msg = 'No microphone found. Please connect an audio device.';
            else if (errorObj.message === 'API_KEY_MISSING') msg = 'API Configuration Error: VITE_GEMINI_API_KEY is missing from environment.';
            else if (errorObj.message?.includes('API_KEY')) msg = 'API Configuration Error: Invalid API Key.';
            addLog('system', `${msg} [${errorObj.message || 'Unknown Error'}]`, true);
            releaseWakeLock();
            disableBackgroundMode();
            setIsRecording(false);
        }
    };
    const stopSession = useCallback(() => {
        teardownAudio();
        try {
            if (audioContextOutput.current && audioContextOutput.current.state !== 'closed') {
                audioContextOutput.current.close()?.catch(() => { });
            }
        } catch (e) {
            console.debug('Failed to close output context:', e);
        }
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
    }, [disableBackgroundMode, teardownAudio, addLog]);
    const startOfflineRecording = async () => {
        if (isRecording) return;
        try {
            addLog('system', 'Initializing Offline Mode...');
            await requestWakeLock();
            enableBackgroundMode();
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextInput.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
            await audioContextInput.current.resume();
            const workletNode = await initializeMultiInputAudio(audioContextInput.current);
            workletNodeRef.current = workletNode;
            offlineChunksRef.current = [];
            workletNode.port.onmessage = (e) => {
                offlineChunksRef.current.push(new Float32Array(e.data));
            };
            setIsRecording(true);
            addLog('system', 'Offline Recording Started. Speak now.');
        } catch {
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
    }, [disableBackgroundMode, onOfflineChunks, teardownAudio, addLog]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);
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
\n`\n\n## services/db.ts\n\n`ts\nimport { Session, AppMode } from '../types';
import { encryptData, decryptData, arrayBufferToBase64, base64ToArrayBuffer } from './encryption';

const DB_NAME = 'listening-project-db';
const STORE_NAME = 'sessions';
const DB_VERSION = 2;

// Singleton: cache the DB promise so we open exactly one connection for the app's lifetime.
// Re-opening on every operation wastes resources and can cause race conditions.
let _dbPromise: Promise<IDBDatabase> | null = null;

export const openDB = (): Promise<IDBDatabase> => {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('startTime', 'startTime', { unique: false });
                store.createIndex('isEncrypted', 'isEncrypted');
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            _dbPromise = null; // Reset on failure so next call can retry
            reject(request.error);
        };
    });
    return _dbPromise;
};

export const saveSession = async (session: Session, vaultKey?: string | null): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataToStore: any = session;

    if (vaultKey) {
        // Zero-Knowledge Encryption
        const json = JSON.stringify(session);
        const encrypted = await encryptData(json, vaultKey);

        dataToStore = {
            id: session.id,
            encryptedData: arrayBufferToBase64(encrypted),
            isEncrypted: true,
            startTime: session.startTime // Keep searchable/sortable
        };
    }

    store.put(dataToStore);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getSessions = async (vaultKey?: string | null): Promise<Session[]> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResult = request.result as any[];
            const processedSessions: Session[] = [];

            for (const item of rawResult) {
                if (item.isEncrypted) {
                    if (vaultKey) {
                        try {
                            const bytes = base64ToArrayBuffer(item.encryptedData);
                            const decryptedStr = await decryptData(bytes, vaultKey);
                            const session = JSON.parse(decryptedStr);

                            session.startTime = new Date(session.startTime);
                            if (session.endTime) session.endTime = new Date(session.endTime);
                            if (session.logs) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                session.logs.forEach((log: any) => {
                                    if (log.timestamp) log.timestamp = new Date(log.timestamp);
                                });
                            }
                            processedSessions.push(session);
                        } catch (e) {
                            console.error(`Failed to decrypt session ${item.id}`, e);
                        }
                    } else {
                        // Return a stub for locked sessions
                        processedSessions.push({
                            id: item.id,
                            startTime: new Date(item.startTime),
                            mode: AppMode.LOCKED,
                            targetLanguage: 'LOCKED',
                            logs: [],
                            speakerRegistry: {}
                        });
                    }
                } else {
                    // Plaintext session
                    if (typeof item.startTime === 'string') item.startTime = new Date(item.startTime);
                    if (typeof item.endTime === 'string') item.endTime = new Date(item.endTime);
                    processedSessions.push(item);
                }
            }

            // Sort by most recent
            resolve(processedSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSession = async (id: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const clearAllSessions = async (): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const importSessions = async (sessions: Session[], vaultKey?: string | null): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const session of sessions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dataToStore: any = session;
        if (vaultKey) {
            const encrypted = await encryptData(JSON.stringify(session), vaultKey);
            dataToStore = {
                id: session.id,
                encryptedData: arrayBufferToBase64(encrypted),
                isEncrypted: true,
                startTime: new Date(session.startTime)
            };
        }
        store.put(dataToStore);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getStorageUsage = async (_vaultKey?: string | null): Promise<number> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
        request.onsuccess = () => {
            const data = JSON.stringify(request.result);
            resolve(new Blob([data]).size);
        };
        request.onerror = () => resolve(0);
    });
};
\n`\n\n## services/encryption.ts\n\n`ts\n/**
 * Zero-Knowledge Privacy Layer
 * Uses Web Crypto API (AES-GCM 256-bit)
 */

const ENC_ALGO = 'AES-GCM';
const KDF_ALGO = 'PBKDF2';
const HASH_ALGO = 'SHA-256';
const ITERATIONS = 210_000; // OWASP 2024 recommendation for PBKDF2-HMAC-SHA256 with AES-256
const SALT_SIZE = 16;
const IV_SIZE = 12;

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: KDF_ALGO,
            salt: salt as BufferSource,
            iterations: ITERATIONS,
            hash: HASH_ALGO
        },
        baseKey,
        { name: ENC_ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(text: string, passphrase: string): Promise<Uint8Array> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(passphrase, salt);

    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: ENC_ALGO, iv },
        key,
        encoder.encode(text)
    );

    // Combine SALT + IV + CIPHERTEXT
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return combined;
}

export async function decryptData(combined: Uint8Array, passphrase: string): Promise<string> {
    const salt = combined.slice(0, SALT_SIZE);
    const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = combined.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(passphrase, salt);

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: ENC_ALGO, iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        throw new Error('DECRYPTION_FAILED', { cause: e });
    }
}

// Helpers for Base64 storage
export function arrayBufferToBase64(buffer: Uint8Array): string {
    // NOTE: Do NOT use String.fromCharCode(...buffer) — spread on large arrays causes
    // "Maximum call stack size exceeded" for encrypted payloads >65,535 bytes.
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
\n`\n\n## workers/offline.worker.ts\n\n`ts\nimport { pipeline, env } from '@xenova/transformers';

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

\n`\n\n## vitest-setup.ts\n\n`ts\nimport '@testing-library/jest-dom';
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock AudioContext
class AudioContextMock {
    sampleRate = 16000;
    state = 'suspended';
    close = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(undefined);
    createGain = vi.fn().mockReturnValue({
        gain: { value: 1, setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createChannelMerger = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createAnalyser = vi.fn().mockReturnValue({
        fftSize: 1024,
        smoothingTimeConstant: 0.75,
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
    });
    createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    audioWorklet = {
        addModule: vi.fn().mockResolvedValue(undefined),
    };
    createMediaElementSource = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
    });
    destination = {};
}
vi.stubGlobal('AudioContext', AudioContextMock);

// Mock AudioWorkletNode
class AudioWorkletNode {
    port = {
        postMessage: vi.fn(),
        onmessage: null,
    };
    connect = vi.fn();
    disconnect = vi.fn();
}
vi.stubGlobal('AudioWorkletNode', AudioWorkletNode);

// Mock HTMLMediaElement.prototype.play
vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { });

// Mock MediaStream
class MediaStreamMock {
    id = 'mock-stream';
    active = true;
    getTracks = vi.fn().mockReturnValue([]);
    getAudioTracks = vi.fn().mockReturnValue([]);
    getVideoTracks = vi.fn().mockReturnValue([]);
}
vi.stubGlobal('MediaStream', MediaStreamMock);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStreamMock()),
        enumerateDevices: vi.fn().mockResolvedValue([
            { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }
        ]),
    },
    writable: true
});

// Mock navigator.wakeLock
Object.defineProperty(navigator, 'wakeLock', {
    value: {
        request: vi.fn().mockResolvedValue({
            release: vi.fn().mockResolvedValue(undefined)
        }),
    },
    writable: true
});

// Mock navigator.mediaSession
Object.defineProperty(navigator, 'mediaSession', {
    value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: vi.fn(),
    },
    writable: true
});

// Mock MediaMetadata
class MediaMetadataMock {
    title = '';
    artist = '';
    album = '';
    artwork = [];
    constructor(init?: Partial<MediaMetadataMock>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}
vi.stubGlobal('MediaMetadata', MediaMetadataMock);
\n`\n\n