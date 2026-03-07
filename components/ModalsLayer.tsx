import React from 'react';
import SpeakerManagerModal from './SpeakerManagerModal';
import SettingsModal from './SettingsModal';
import OfflineWarningModal from './OfflineWarningModal';
import HistoryModal from './HistoryModal';
import VaultKeyModal from './VaultKeyModal';
import { AppMode, Settings, LogMessage } from '../types';

interface ModalsLayerProps {
    showSpeakerManager: boolean;
    setShowSpeakerManager: (val: boolean) => void;
    speakerRegistry: Record<string, string>;
    renameSpeaker: (id: string, name: string) => void;
    deleteSpeaker: (id: string) => void;
    logs: LogMessage[];

    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    settings: Settings;
    setSettings: (settings: Settings) => void;
    handleExport: () => void;
    handleImportData: (file: File) => void;
    handleClearData: () => void;
    storageUsage: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deferredPrompt: any;
    handleInstallApp: () => void;

    showOfflineWarning: boolean;
    setShowOfflineWarning: (val: boolean) => void;
    setActiveMode: (mode: AppMode) => void;

    showHistory: boolean;
    setShowHistory: (val: boolean) => void;
    vaultKey: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectSession: (session: any) => void;

    showVaultModal: boolean;
    setShowVaultModal: (val: boolean) => void;
    setVaultKey: (key: string | null) => void;
}

const ModalsLayer: React.FC<ModalsLayerProps> = ({
    showSpeakerManager,
    setShowSpeakerManager,
    speakerRegistry,
    renameSpeaker,
    deleteSpeaker,
    logs,
    showSettings,
    setShowSettings,
    settings,
    setSettings,
    handleExport,
    handleImportData,
    handleClearData,
    storageUsage,
    deferredPrompt,
    handleInstallApp,
    showOfflineWarning,
    setShowOfflineWarning,
    setActiveMode,
    showHistory,
    setShowHistory,
    vaultKey,
    onSelectSession,
    showVaultModal,
    setShowVaultModal,
    setVaultKey
}) => {
    return (
        <>
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
                onExport={handleExport}
                onImport={handleImportData}
                onClearData={handleClearData}
                storageUsage={storageUsage}
                canInstall={!!deferredPrompt}
                onInstall={handleInstallApp}
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
                onSelectSession={onSelectSession}
            />

            <VaultKeyModal
                key={showVaultModal ? 'open' : 'closed'}
                isOpen={showVaultModal}
                onClose={() => setShowVaultModal(false)}
                currentKey={vaultKey}
                onSaveKey={setVaultKey}
            />
        </>
    );
};

export default React.memo(ModalsLayer);
