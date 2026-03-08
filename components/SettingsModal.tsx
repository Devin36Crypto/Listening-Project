import React, { useRef } from 'react';
import { Settings, VoiceName, NoiseLevel } from '../types';
import { LANGUAGES, VOICES } from '../constants';
import { X, Mic, Volume2, Globe, Download, Upload, Trash2, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearData: () => void;
  storageUsage: number;
  canInstall: boolean;
  onInstall: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onExport,
  onImport,
  onClearData,
  storageUsage,
  canInstall,
  onInstall
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      onImport(file);
    } else {
      alert('Please drop at .json backup file.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const languageOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label
  }));

  const voiceOptions = VOICES.map(voice => ({
    value: voice.id,
    label: voice.label
  }));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-all ${isDragging ? 'bg-blue-600/20' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`bg-slate-900 border ${isDragging ? 'border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.3)]' : 'border-slate-700'} rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col transition-all relative`}>
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-blue-600/10 backdrop-blur-[2px] pointer-events-none border-2 border-dashed border-blue-500 rounded-2xl animate-pulse">
            <Upload size={48} className="text-blue-400 mb-2" />
            <p className="text-blue-400 font-bold text-lg">Drop to Import Backup</p>
          </div>
        )}
        {/* Header */}
        <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <SettingsIcon size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-xl font-bold text-white">Translator Settings</h2>
              <p className="text-xs text-slate-400">Configure your experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Target Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Globe size={18} />
              <label className="text-sm font-medium">Target Language</label>
            </div>
            <CustomSelect
              value={settings.targetLanguage}
              onChange={(value) => onUpdate({ ...settings, targetLanguage: value })}
              options={languageOptions}
              className="w-full bg-slate-950 border-slate-700 justify-between px-4 py-3 rounded-xl"
              position="down"
            />
          </div>

          {/* Noise Cancellation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Mic size={18} />
              <label className="text-sm font-medium">Ambient Noise Cancellation</label>
            </div>
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-700">
              {(['off', 'low', 'high'] as NoiseLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdate({ ...settings, noiseCancellationLevel: level })}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${settings.noiseCancellationLevel === level
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
            <CustomSelect
              value={settings.voice}
              onChange={(value) => onUpdate({ ...settings, voice: value as VoiceName })}
              options={voiceOptions}
              className="w-full bg-slate-950 border-slate-700 justify-between px-4 py-3 rounded-xl"
              position="down"
            />
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
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
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
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
          <div className="pt-4 border-t border-slate-800">
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
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl transition-colors border border-slate-700"
              >
                <Download size={18} />
                <span>Export</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl transition-colors border border-slate-700"
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
              className="w-full flex items-center justify-center gap-2 bg-red-900/10 hover:bg-red-900/20 text-red-400 hover:text-red-300 py-3 rounded-xl transition-colors border border-red-900/20"
            >
              <Trash2 size={18} />
              <span>Clear All Local Data</span>
            </button>

            <p className="text-xs text-slate-500 mt-3 text-center">
              Your data is stored locally on this device. Exporting allows you to backup or transfer your history.
            </p>
          </div>

          {/* Install App */}
          {canInstall && (
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 font-semibold py-3 rounded-xl transition-colors border border-blue-900/30"
              >
                <span>Install App</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-none p-6 border-t border-slate-800 bg-slate-900/80 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
