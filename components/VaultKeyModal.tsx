import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Unlock, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string | null;
  onSaveKey: (key: string | null) => void;
}

const VaultKeyModal: React.FC<Props> = ({ isOpen, onClose, currentKey, onSaveKey }) => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (passphrase.trim().length >= 4) {
      onSaveKey(passphrase.trim());
      onClose();
    } else {
      alert("Please enter a passphrase with at least 4 characters.");
    }
  };

  const handleClear = () => {
    onSaveKey(null);
    setPassphrase('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${currentKey ? 'bg-purple-900/40 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Privacy Vault</h2>
            <p className="text-xs text-slate-400">Zero-Knowledge Session Encryption</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-sm text-slate-300 leading-relaxed">
            Protect your transcription history with a master passphrase.
            All data will be encrypted locally using <span className="text-blue-400 font-mono">AES-GCM 256-bit</span> before being stored.
          </p>

          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 flex gap-3 text-xs text-blue-300">
            <Lock size={16} className="shrink-0" />
            <p>Your passphrase is never stored. If you forget it, your encrypted history cannot be recovered.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Vault Passphrase</label>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={currentKey ? "Current Vault is Active" : "Enter new passphrase..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassphrase ? "Hide" : "Show"}
              >
                {showPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {currentKey && (
              <button
                onClick={handleClear}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-red-900/40 hover:text-red-400 rounded-xl text-slate-300 transition-all font-semibold flex items-center justify-center gap-2 border border-slate-600 hover:border-red-500/30"
              >
                <Unlock size={18} />
                Lock Vault
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {currentKey ? 'Update Key' : 'Unlock Vault'}
            </button>
          </div>
        </div>

        {!currentKey && (
          <p className="text-center text-[10px] text-slate-500 mt-6">
            Privacy Vault uses industry-standard encryption protocols.
          </p>
        )}
      </div>
    </div>
  );
};

export default VaultKeyModal;
