import React from 'react';
import {
    Smartphone,
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
    setShowSpeakerManager: (val: boolean) => void;
    setShowHistory: (val: boolean) => void;
    setShowVaultModal: (val: boolean) => void;
    setShowSettings: (val: boolean) => void;
    setShowAuthModal: (val: boolean) => void;
    vaultKey: string | null;
    nodes: PeerNode[];
}

const AppHeader: React.FC<AppHeaderProps> = ({
    connectedMics,
    activeMode,
    handleOfflineModeToggle,
    setShowSpeakerManager,
    setShowHistory,
    setShowVaultModal,
    setShowSettings,
    setShowAuthModal,
    vaultKey,
    nodes
}) => {
    const activeNodesCount = nodes.filter(n => n.status === 'online' || n.status === 'connected').length;

    return (
        <header className="flex-none px-4 md:px-8 glass-panel backdrop-blur-3xl border-b border-white/10 flex justify-between items-center z-10 pt-[calc(env(safe-area-inset-top,20px)+6px)] pb-2.5 mx-4 mt-4 rounded-2xl shadow-2xl relative overflow-hidden">

            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-cyan-500/5 pointer-events-none" />
            <div className="flex-1 flex items-center gap-3 relative z-10">
                <img src="./icon.png" alt="ListeningProject Logo" className="w-14 h-14 drop-shadow-2xl rounded-xl" />
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg tracking-tight text-white leading-none">ListeningProject</h1>
                </div>
                {(connectedMics > 1 || activeNodesCount > 0) && (
                    <div className="hidden lg:flex ml-2 bg-green-900/40 p-1.5 px-3 rounded-full border border-green-500/20 items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <Wifi size={14} className="text-green-400" />
                        <span className="text-[11px] text-green-400 font-mono uppercase tracking-widest font-bold">
                            {connectedMics + activeNodesCount}
                        </span>
                    </div>
                )}
            </div>

            {/* Centered 4 Icons */}
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-6 z-20 ${activeMode === AppMode.LOCKED ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={handleOfflineModeToggle}
                    className={`p-2 rounded-xl transition-all ${activeMode === AppMode.OFFLINE_MODE ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Offline Mode"
                >
                    <Smartphone size={26} />
                </button>
                <button
                    onClick={() => setShowSpeakerManager(true)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
                    title="Manage Speakers"
                >
                    <Users size={26} />
                </button>
                <button
                    onClick={() => setShowHistory(true)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
                    title="History"
                >
                    <Clock size={26} />
                </button>
                <button
                    onClick={() => setShowVaultModal(true)}
                    className={`p-2 rounded-xl transition-all border ${vaultKey ? 'bg-brand-900/40 border-brand-500/30 text-brand-300 shadow-lg' : 'hover:bg-white/5 border-transparent text-slate-400 hover:text-white'}`}
                    title="Privacy Vault"
                >
                    <Shield size={26} />
                </button>
            </div>
            <div className="flex-1 flex items-center justify-end gap-2 relative z-10">
                <button
                    onClick={() => setShowAuthModal(true)}
                    className={`p-2 rounded-xl transition-all ${activeMode === AppMode.LOCKED ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40 animate-bounce' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Account"
                >
                    <User size={26} />
                </button>
                <button
                    onClick={() => setShowSettings(true)}
                    disabled={activeMode === AppMode.LOCKED}
                    className={`p-2 rounded-xl transition-all ${activeMode === AppMode.LOCKED ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Settings"
                >
                    <SettingsIcon size={26} />
                </button>
            </div>
        </header>
    );
};

export default React.memo(AppHeader);
