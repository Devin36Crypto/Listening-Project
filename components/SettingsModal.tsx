import React, { useRef } from 'react';
import { Settings, VoiceName, NoiseLevel } from '../types';
import { LANGUAGES, VOICES } from '../constants';
import { X, Mic, Volume2, Globe, Download, Upload, Trash2, HardDrive } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearData: () => void;
  storageUsage: number;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdate, 
  onExport, 
  onImport, 
  onClearData, 
  storageUsage 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 id="settings-modal-title" className="text-xl font-bold text-white">Translator Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Target Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe size={18} />
              <label className="text-sm font-medium">Target Language</label>
            </div>
            <select
              value={settings.targetLanguage}
              onChange={(e) => onUpdate({ ...settings, targetLanguage: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Noise Cancellation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Mic size={18} />
              <label className="text-sm font-medium">Ambient Noise Cancellation</label>
            </div>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-600">
              {(['off', 'low', 'high'] as NoiseLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdate({ ...settings, noiseCancellationLevel: level })}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.noiseCancellationLevel === level
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-1">
              {settings.noiseCancellationLevel === 'off' && "Raw audio. No filtering. Best for quiet studios."}
              {settings.noiseCancellationLevel === 'low' && "Volume leveling only. Background noise preserved."}
              {settings.noiseCancellationLevel === 'high' && "Reduces background noise. Best for outdoors/crowds."}
            </p>
          </div>

          {/* Voice Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Volume2 size={18} />
              <label className="text-sm font-medium">AI Voice</label>
            </div>
            <select
              value={settings.voice}
              onChange={(e) => onUpdate({ ...settings, voice: e.target.value as VoiceName })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {VOICES.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700/50">
            <span className="text-slate-300 text-sm font-medium">Auto-speak Translations</span>
            <button
              onClick={() => onUpdate({ ...settings, autoSpeak: !settings.autoSpeak })}
              className={`w-11 h-6 rounded-full relative transition-colors ${settings.autoSpeak ? 'bg-blue-600' : 'bg-slate-600'
                }`}
            >
              <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.autoSpeak ? 'translate-x-5' : ''
                }`} />
            </button>
          </div>

          {/* Push to Talk Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700/50">
            <div className="flex flex-col">
              <span className="text-slate-300 text-sm font-medium">Push to Talk Mode</span>
              <span className="text-slate-500 text-xs">Hold microphone to listen, release to stop</span>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, pushToTalk: !settings.pushToTalk })}
              className={`w-11 h-6 rounded-full relative transition-colors ${settings.pushToTalk ? 'bg-blue-600' : 'bg-slate-600'
                }`}
            >
              <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.pushToTalk ? 'translate-x-5' : ''
                }`} />
            </button>
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Data Management</span>
              <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                <HardDrive size={12} />
                {formatBytes(storageUsage)} used
              </span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={onExport}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg transition-colors border border-slate-600"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg transition-colors border border-slate-600"
              >
                <Upload size={18} />
                <span>Import</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
            </div>

            <button
              onClick={onClearData}
              className="w-full flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 py-3 rounded-lg transition-colors border border-red-900/30"
            >
              <Trash2 size={18} />
              <span>Clear All Local Data</span>
            </button>
            
            <p className="text-xs text-slate-500 mt-3 text-center">
              Your data is stored locally on this device. Exporting allows you to backup or transfer your history.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
