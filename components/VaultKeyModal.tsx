import React, { useState, useEffect } from 'react';
import { Shield, Key, X, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

interface VaultKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string | null;
  onSaveKey: (key: string | null) => void;
}

const VaultKeyModal: React.FC<VaultKeyModalProps> = ({ isOpen, onClose, currentKey, onSaveKey }) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(currentKey || '');
      setError(null);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!keyInput.trim()) {
      onSaveKey(null);
      onClose();
      return;
    }

    if (keyInput.length < 4) {
      setError('Vault Key must be at least 4 characters.');
      return;
    }

    onSaveKey(keyInput.trim());
    onClose();
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to remove the Vault Key? Your future sessions will not be encrypted.')) {
      onSaveKey(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30">
              <Shield size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Privacy Vault</h2>
              <p className="text-xs text-slate-400">End-to-End Encryption</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-200 leading-relaxed">
              Set a <strong>Vault Key</strong> to encrypt your session history locally. Without this key, your saved transcripts cannot be read, even if the device is compromised.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Key size={16} />
              {currentKey ? 'Current Vault Key' : 'Set New Vault Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setError(null);
                }}
                placeholder="Enter a secure passphrase..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-400">
                Status: <span className={currentKey ? 'text-green-400 font-medium' : 'text-slate-500'}>
                  {currentKey ? 'Encrypted' : 'Unencrypted'}
                </span>
              </span>
            </div>
            
            {currentKey && (
              <button 
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 underline decoration-red-400/30 hover:decoration-red-300"
              >
                Remove Key
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800 sticky bottom-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors font-medium border border-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {currentKey ? <Unlock size={18} /> : <Lock size={18} />}
            {currentKey ? 'Update Key' : 'Enable Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultKeyModal;
