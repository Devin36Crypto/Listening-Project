import React from 'react';
import {
    Smartphone,
    Lock as LucideLock,
    Users,
    Clock,
    Shield,
    Settings as SettingsIcon,
    Wifi,
    User
} from 'lucide-react';
import { AppMode, PeerNode } from '../types';

interface AppHeaderProps {
    connectedMics: number;
    activeMode: AppMode;
    handleOfflineModeToggle: () => void;
    setIsPocketMode: (val: boolean) => void;
    setShowSpeakerManager: (val: boolean) => void;
    setShowHistory: (val: boolean) => void;
    setShowVaultModal: (val: boolean) => void;
    setShowSettings: (val: boolean) => void;
    setShowAuthModal: (val: boolean) => void;
    vaultKey: string | null;
    nodes: PeerNode[];
    onScan: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    connectedMics,
    activeMode,
    handleOfflineModeToggle,
    setIsPocketMode,
    setShowSpeakerManager,
    setShowHistory,
    setShowVaultModal,
    setShowSettings,
    setShowAuthModal,
    vaultKey,
    nodes,
    onScan
}) => {
    const activeNodesCount = nodes.filter(n => n.status === 'online' || n.status === 'connected').length;

    return (
        <header className="flex-none p-4 glass-panel backdrop-blur-3xl border-b border-white/5 flex justify-between items-center z-10 pt-[env(safe-area-inset-top,20px)] mx-4 mt-4 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3">
                <img src="./icon.svg" alt="LP Logo" className="w-10 h-10 drop-shadow-lg" />
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg tracking-tight text-white leading-none">ListeningProject</h1>
                </div>
                {(connectedMics > 1 || activeNodesCount > 0) && (
                    <div className="ml-2 bg-green-900/50 p-1 px-2 rounded-full border border-green-500/30 flex items-center gap-1">
                        <Wifi size={12} className="text-green-400" />
                        <span className="text-[10px] text-green-400 font-mono uppercase">
                            {connectedMics + activeNodesCount} SENSORS
                        </span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onScan}
                    className={`p-2 rounded-full transition-all ${activeNodesCount > 0 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="Scan for Peers"
                >
                    <Wifi size={20} className={activeNodesCount > 0 ? 'animate-pulse' : ''} />
                </button>
                <button
                    onClick={handleOfflineModeToggle}
                    className={`p-2 rounded-full transition-colors ${activeMode === AppMode.OFFLINE_MODE ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="Offline Mode"
                >
                    <Smartphone size={20} />
                </button>
                <button
                    onClick={() => setIsPocketMode(true)}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white lg:hidden"
                    title="Lock Screen"
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
                    onClick={() => setShowAuthModal(true)}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    title="Account"
                >
                    <User size={20} />
                </button>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    title="Settings"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>
        </header>
    );
};

export default React.memo(AppHeader);
