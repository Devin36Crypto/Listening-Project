/// <reference types="vite/client" />
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
