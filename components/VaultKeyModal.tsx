import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Unlock, X, Check, Key } from 'lucide-react';

interface VaultKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string | null;
  onSaveKey: (key: string | null) => void;
}

const VaultKeyModal: React.FC<VaultKeyModalProps> = ({ isOpen, onClose, currentKey, onSaveKey }) => {
  const [passphrase, setPassphrase] = useState<string>(currentKey || '');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (passphrase.trim().length >= 4) {
      onSaveKey(passphrase.trim());
      onClose();
    } else {
      setError("Please enter a passphrase with at least 4 characters.");
    }
  };

  const handleClear = () => {
    onSaveKey(null);
    setPassphrase('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${currentKey ? 'bg-blue-900/40 text-blue-400' : 'bg-slate-800 text-slate-400'} border border-slate-700/50`}>
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Privacy Vault</h2>
              <p className="text-xs text-slate-400">Zero-Knowledge AES-256 Encryption</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm text-blue-200 leading-relaxed">
              Protect your transcription history with a master passphrase.
              All data will be encrypted locally using <span className="text-blue-400 font-mono">AES-GCM 256-bit</span> before being stored.
            </p>
          </div>

          <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-xs text-blue-300">
            <Lock size={16} className="shrink-0 text-blue-400" />
            <p>Your passphrase is never stored. If you forget it, your encrypted history cannot be recovered.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Vault Passphrase</label>
              <div className="relative">
                <input
                  type={showPassphrase ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setError(null);
                  }}
                  placeholder={currentKey ? "Current Vault is Active" : "Enter new passphrase..."}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono placeholder:text-slate-600"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs ml-1">{error}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              {currentKey && (
                <button
                  onClick={handleClear}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 rounded-xl text-slate-300 transition-all font-semibold flex items-center justify-center gap-2 border border-slate-700 hover:border-red-500/30"
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
        </div>

        <div className="p-6 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500">
            Privacy Vault uses industry-standard encryption protocols.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VaultKeyModal;
