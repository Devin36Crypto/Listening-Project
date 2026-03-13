import { useState, useCallback, useEffect, useMemo } from 'react';
import { AppMode, LogMessage, Settings, PeerNode, BeforeInstallPromptEvent, Session } from '../types';
import { discoveryService } from '../services/DiscoveryService';
import { importSessions, clearAllSessions, getStorageUsage } from '../services/db';
import { initSubscriptions, getDetailedSubscriptionStatus } from '../services/subscriptions';

declare global {
    interface Window {
        aistudio?: {
            openSelectKey?: () => Promise<void>;
            hasSelectedApiKey?: () => Promise<boolean>;
        };
    }
}

export function useAppUI() {
    // --- UI State ---
    const [activeMode, setActiveMode] = useState<AppMode>(AppMode.LIVE_TRANSLATOR);
    const [isPocketMode, setIsPocketMode] = useState<boolean>(false);
    const [showTranscript, setShowTranscript] = useState<boolean>(true);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
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
    const [nodes, setNodes] = useState<PeerNode[]>([]);
    const [speakerRegistry, setSpeakerRegistry] = useState<Record<string, string>>({});

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

    // --- initialization effect ---
    useEffect(() => {
        let lastUpdate = 0;
        discoveryService.setUpdateListener((newNodes) => {
            const now = Date.now();
            if (now - lastUpdate > 500) {
                setNodes(newNodes);
                lastUpdate = now;
            }
        });

        const init = async () => {
            try {
                await initSubscriptions();
                const sub = await getDetailedSubscriptionStatus();
                if (sub.hasExpired && !sub.isPro) {
                    setActiveMode(AppMode.LOCKED);
                }
            } catch (err) {
                console.error("Failed to initialize RevenueCat:", err);
            }
            await initializeApiKey();
        };
        init();
    }, [initializeApiKey]);

    // --- handlers ---
    const handleScanPeers = useCallback(() => {
        setShowSpatialMap(true);
        discoveryService.scanForPeers();
    }, []);

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
            setLogs([]);
            getStorageUsage().then(setStorageUsage);
            alert('All local data cleared.');
        }
    }, []);

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

    const handleSelectSession = useCallback((session: Session) => {
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





    const handleSaveManualKey = useCallback(() => {
        if (manualKey.trim().length > 10) {
            localStorage.setItem('gemini_api_key', manualKey.trim());
            setApiKey(manualKey.trim());
            window.location.reload();
        } else {
            alert("Please enter a valid API Key.");
        }
    }, [manualKey]);

    const handleOfflineModeToggle = useCallback(() => {
        if (activeMode === AppMode.OFFLINE_MODE) {
            setActiveMode(AppMode.LIVE_TRANSLATOR);
        } else {
            setShowOfflineWarning(true);
        }
    }, [activeMode]);

    return useMemo(() => ({
        activeMode, setActiveMode,
        isPocketMode, setIsPocketMode,
        showTranscript, setShowTranscript,
        logs, setLogs,
        showSettings, setShowSettings,
        showAuthModal, setShowAuthModal,
        showOfflineWarning, setShowOfflineWarning,
        showHistory, setShowHistory,
        showSpeakerManager, setShowSpeakerManager,
        currentSessionId, setCurrentSessionId,
        apiKey, setApiKey,
        manualKey, setManualKey,
        settings, setSettings,
        storageUsage, setStorageUsage,
        vaultKey, setVaultKey,
        showVaultModal, setShowVaultModal,
        deferredPrompt, setDeferredPrompt,
        showSpatialMap, setShowSpatialMap,
        nodes, setNodes,
        speakerRegistry, setSpeakerRegistry,
        handleScanPeers,
        addLog,
        handleImportData,
        handleClearData,
        renameSpeaker,
        deleteSpeaker,
        handleExport,
        handleSelectSession,
        handleConnectApiKey,
        initializeApiKey,
        handleSaveManualKey,
        handleOfflineModeToggle
    }), [
        activeMode, isPocketMode, showTranscript, logs, showSettings,
        showAuthModal, showOfflineWarning, showHistory, showSpeakerManager,
        currentSessionId, apiKey, manualKey, settings, storageUsage,
        vaultKey, showVaultModal, deferredPrompt, showSpatialMap, nodes,
        speakerRegistry, handleScanPeers, addLog, handleImportData,
        handleClearData, renameSpeaker, deleteSpeaker, handleExport,
        handleSelectSession, handleConnectApiKey, initializeApiKey,
        handleSaveManualKey, handleOfflineModeToggle
    ]);
}
