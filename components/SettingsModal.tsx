import React from 'react';
import { Settings, VoiceName, NoiseLevel } from '../types';
import { LANGUAGES, VOICES } from '../constants';
import { X, Mic, Volume2, Globe } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-white">Translator Settings</h2>
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
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    settings.noiseCancellationLevel === level
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
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.autoSpeak ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                settings.autoSpeak ? 'translate-x-6' : ''
              }`} />
            </button>
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