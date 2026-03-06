import React from 'react';
import { AppMode, PeerNode } from '../types';
import { Settings, History, Mic, Shield, Wifi, Scan } from 'lucide-react';

interface AppHeaderProps {
  connectedMics: number;
  activeMode: AppMode;
  handleOfflineModeToggle: () => void;
  setIsPocketMode: (val: boolean) => void;
  setShowSpeakerManager: (val: boolean) => void;
  setShowHistory: (val: boolean) => void;
  setShowVaultModal: (val: boolean) => void;
  setShowSettings: (val: boolean) => void;
  vaultKey: string | null;
  nodes: PeerNode[];
  onScan: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  connectedMics,
  activeMode,
  handleOfflineModeToggle,
  setIsPocketMode: _setIsPocketMode,
  setShowSpeakerManager: _setShowSpeakerManager,
  setShowHistory,
  setShowVaultModal,
  setShowSettings,
  vaultKey,
  nodes,
  onScan
}) => {
  const activeNodesCount = nodes.length;

  return (
    <header className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10">
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
          className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors relative"
          title="Scan for Peers"
        >
          <Scan size={20} />
          {nodes.length > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-900" />
          )}
        </button>

        <button
          onClick={handleOfflineModeToggle}
          className={`p-2 rounded-full transition-colors ${activeMode === AppMode.OFFLINE_MODE ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          title="Offline Mode"
        >
          <Wifi size={20} />
        </button>

        <button
          onClick={() => setShowVaultModal(true)}
          className={`p-2 rounded-full transition-colors ${vaultKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          title="Privacy Vault"
        >
          <Shield size={20} />
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="History"
        >
          <History size={20} />
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
