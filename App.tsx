/// <reference types="vite/client" />

declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<void>;
      hasSelectedApiKey?: () => Promise<boolean>;
    };
  }
}

import React, { useEffect, useCallback } from 'react';
import { Key, Wifi } from 'lucide-react';

// Components
import AppHeader from './components/AppHeader';
import ChatList from './components/ChatList';
import ControlPanel from './components/ControlPanel';
import ModalsLayer from './components/ModalsLayer';
import AuthModal from './components/AuthModal';
import PocketModeOverlay from './components/PocketModeOverlay';
import SpatialMap from './components/SpatialMap';

// Types & Hooks
import { AppMode, PeerNode, BeforeInstallPromptEvent } from './types';
import { useAppUI } from './hooks/useAppUI';
import { useSubscription } from './hooks/useSubscription';
import { useAudioSession } from './hooks/useAudioSession';
import { useOfflineWorker } from './hooks/useOfflineWorker';

// Services & Utils
import { getSpeakerColor, getSpeakerInitials } from './utils/colors';
import { getStorageUsage, saveSession } from './services/db';

const App: React.FC = () => {
  // --- Custom Hooks ---
  const appUI = useAppUI();
  const { isPro: subIsPro } = useSubscription();

  // --- State Synchronization & Unlock Logic ---
  useEffect(() => {
    if (appUI.activeMode === AppMode.LOCKED && subIsPro) {
      appUI.setActiveMode(AppMode.LIVE_TRANSLATOR);
    }
  }, [appUI, subIsPro]);

  // --- PWA & UI Effects ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      appUI.setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [appUI]);

  const handleInstallApp = useCallback(async () => {
    if (!appUI.deferredPrompt) return;
    const promptEvent = appUI.deferredPrompt as unknown as BeforeInstallPromptEvent;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      appUI.setDeferredPrompt(null);
    }
  }, [appUI]);

  useEffect(() => {
    if (appUI.showSettings) {
      getStorageUsage().then(appUI.setStorageUsage);
    }
  }, [appUI.showSettings, appUI.vaultKey, appUI.setStorageUsage]);

  // --- Offline Worker ---
  const { status: offlineStatus, result: offlineResult, transcribe: offlineTranscribe } = useOfflineWorker();

  // --- Handle offline chunks from audio session ---
  const handleOfflineChunksWithTranscribe = useCallback((chunks: Float32Array[]) => {
    if (chunks.length === 0) return;
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    const lang = appUI.settings.targetLanguage.toLowerCase().split(' ')[0].replace(/[()]/g, '');
    offlineTranscribe(merged, lang);
  }, [offlineTranscribe, appUI.settings.targetLanguage]);

  const {
    isRecording,
    connectedMics,
    analyserNode,
    startSession,
    stopSession,
    startOfflineRecording,
    stopOfflineRecording,
  } = useAudioSession(appUI.settings, appUI.activeMode, appUI.addLog, handleOfflineChunksWithTranscribe, appUI.apiKey);

  // --- Recording Toggle Bridge ---
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (appUI.activeMode === AppMode.OFFLINE_MODE) {
        stopOfflineRecording();
      } else {
        stopSession();
      }
    } else {
      const newSessionId = Date.now().toString();
      appUI.setCurrentSessionId(newSessionId);
      appUI.setLogs([]);
      if (appUI.activeMode === AppMode.OFFLINE_MODE) {
        startOfflineRecording();
      } else {
        startSession();
      }
    }
  }, [isRecording, stopOfflineRecording, stopSession, startOfflineRecording, startSession, appUI]);

  // --- Offline Result Handling ---
  useEffect(() => {
    if (offlineResult) {
      const { task, output } = offlineResult as { task: string; output: { text: string } };
      if (task === 'transcribe') {
        appUI.addLog('model', `[Offline]: ${output.text}`);
      }
    }
  }, [offlineResult, appUI]);

  // --- Auto-Save to IndexedDB (Debounced) ---
  useEffect(() => {
    if (!appUI.currentSessionId || appUI.logs.length === 0) return;
    const saveTimer = setTimeout(() => {
      const session = {
        id: appUI.currentSessionId as string,
        startTime: new Date(parseInt(appUI.currentSessionId as string)),
        endTime: new Date(),
        mode: appUI.activeMode,
        targetLanguage: appUI.settings.targetLanguage,
        logs: appUI.logs,
        speakerRegistry: appUI.speakerRegistry
      };
      saveSession(session, appUI.vaultKey).catch(err => {
        // Essential error logging
        console.error("Failed to auto-save session:", err);
      });
    }, 2000);
    return () => clearTimeout(saveTimer);
  }, [appUI, appUI.logs, appUI.currentSessionId, appUI.activeMode, appUI.settings.targetLanguage, appUI.speakerRegistry, appUI.vaultKey]);

  if (!appUI.apiKey) {
    return (
      <div className="flex flex-col h-screen animate-ambient text-slate-200 items-center justify-center p-6 text-center">
        <div className="glass-panel p-10 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-600/20 rounded-full flex items-center justify-center mb-6 border border-brand-500/30">
            <Key size={40} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ListeningProject</h1>
          <p className="text-slate-400 mb-8 text-xs leading-relaxed">Secure connection required.</p>
          <button onClick={appUI.handleConnectApiKey} className="w-full px-6 py-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-brand-900/40 flex items-center justify-center gap-2 mb-8">
            <Key size={18} /> Connect Google AI Studio
          </button>
          <div className="w-full border-t border-white/5 pt-8">
            <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-bold">Manual API Key</p>
            <div className="flex gap-2">
              <input type="password" value={appUI.manualKey} onChange={(e) => appUI.setManualKey(e.target.value)} placeholder="Paste Key here..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
              <button onClick={appUI.handleSaveManualKey} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors">Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen animate-ambient text-slate-200 safe-area-inset overflow-hidden selection:bg-brand-500/30">
      <PocketModeOverlay
        isActive={appUI.isPocketMode}
        onUnlock={() => appUI.setIsPocketMode(false)}
        statusText={isRecording ? `ListeningProject Live: ${connectedMics} Sensors Active` : 'ListeningProject Standby'}
      />

      <AppHeader
        connectedMics={connectedMics || 0}
        activeMode={appUI.activeMode}
        handleOfflineModeToggle={appUI.handleOfflineModeToggle}
        setShowSpeakerManager={appUI.setShowSpeakerManager}
        setShowHistory={appUI.setShowHistory}
        setShowVaultModal={appUI.setShowVaultModal}
        setShowSettings={appUI.setShowSettings}
        setShowAuthModal={appUI.setShowAuthModal}
        vaultKey={appUI.vaultKey}
        nodes={appUI.nodes}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ChatList
          logs={appUI.logs}
          showTranscript={appUI.showTranscript}
          speakerRegistry={appUI.speakerRegistry}
          getSpeakerColor={getSpeakerColor}
          getSpeakerInitials={getSpeakerInitials}
        />

        <ControlPanel
          isRecording={isRecording}
          activeMode={appUI.activeMode}
          setActiveMode={appUI.setActiveMode}
          analyserNode={analyserNode}
          offlineStatus={offlineStatus}
          settings={appUI.settings}
          setSettings={appUI.setSettings}
          toggleRecording={toggleRecording}
          showTranscript={appUI.showTranscript}
          setShowTranscript={appUI.setShowTranscript}
        />
      </main>

      {appUI.showSpatialMap && (
        <SpatialMap
          nodes={appUI.nodes}
          onClose={() => appUI.setShowSpatialMap(false)}
        />
      )}

      <ModalsLayer
        showSpeakerManager={appUI.showSpeakerManager}
        setShowSpeakerManager={appUI.setShowSpeakerManager}
        speakerRegistry={appUI.speakerRegistry}
        renameSpeaker={appUI.renameSpeaker}
        deleteSpeaker={appUI.deleteSpeaker}
        logs={appUI.logs}
        showSettings={appUI.showSettings}
        setShowSettings={appUI.setShowSettings}
        settings={appUI.settings}
        setSettings={appUI.setSettings}
        handleExport={appUI.handleExport}
        handleImportData={appUI.handleImportData}
        handleClearData={appUI.handleClearData}
        storageUsage={appUI.storageUsage}
        deferredPrompt={appUI.deferredPrompt}
        handleInstallApp={handleInstallApp}
        showOfflineWarning={appUI.showOfflineWarning}
        setShowOfflineWarning={appUI.setShowOfflineWarning}
        setActiveMode={appUI.setActiveMode}
        showHistory={appUI.showHistory}
        setShowHistory={appUI.setShowHistory}
        vaultKey={appUI.vaultKey}
        onSelectSession={appUI.handleSelectSession}
        showVaultModal={appUI.showVaultModal}
        setShowVaultModal={appUI.setShowVaultModal}
        setVaultKey={appUI.setVaultKey}
      />

      <AuthModal
        isOpen={appUI.showAuthModal}
        onClose={() => appUI.setShowAuthModal(false)}
      />

      {appUI.activeMode !== AppMode.LOCKED && (
        <button
          onClick={appUI.handleScanPeers}
          className={`fixed bottom-8 left-8 p-4 rounded-2xl transition-all z-20 shadow-2xl glass-panel border border-white/10 ${appUI.nodes.some((n: PeerNode) => n.status === 'online' || n.status === 'connected') ? 'bg-brand-600/20 text-brand-400 border-brand-500/30' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
          title="Scan for Peers"
        >
          <Wifi size={24} className={appUI.nodes.some((n: PeerNode) => n.status === 'online' || n.status === 'connected') ? 'animate-pulse' : ''} />
        </button>
      )}
    </div>
  );
};

export default App;
