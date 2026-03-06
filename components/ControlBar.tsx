import React from 'react';
import { Mic, MicOff, WifiOff, Globe, FileText, FileX } from 'lucide-react';
import Visualizer from './Visualizer';
import CustomSelect from './CustomSelect';
import { AppMode, Settings, OfflineStatus } from '../types';
import { LANGUAGES } from '../constants';

interface ControlBarProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  offlineStatus: OfflineStatus;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  toggleRecording: () => void;
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
}

const ControlBar: React.FC<ControlBarProps> = React.memo(({
  analyserNode,
  isRecording,
  activeMode,
  setActiveMode,
  offlineStatus,
  settings,
  setSettings,
  toggleRecording,
  showTranscript,
  setShowTranscript
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4">
      {/* Visualizer */}
      <div className="mb-6">
        <Visualizer
          analyserNode={analyserNode}
          isActive={isRecording}
          color={isRecording
            ? activeMode === AppMode.OFFLINE_MODE ? '#f97316' : '#3b82f6'
            : '#475569'
          }
        />
      </div>
      {/* Mode Selector */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-slate-800/80 rounded-full p-1 border border-slate-700">
          <button
            onClick={() => setActiveMode(AppMode.LIVE_TRANSLATOR)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.LIVE_TRANSLATOR ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Auto Translator
          </button>
          <button
            onClick={() => setActiveMode(AppMode.TRANSCRIBER)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.TRANSCRIBER ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Transcriber
          </button>
          <button
            onClick={() => setActiveMode(AppMode.CONTEXT_AWARE)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeMode === AppMode.CONTEXT_AWARE ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            AI Assistant
          </button>
        </div>
      </div>
      {/* Offline Progress Bar */}
      {offlineStatus.status === 'loading' && (
        <div className="mb-4 px-8">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{offlineStatus.message}</span>
            <span>{Math.round(offlineStatus.progress || 0)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${offlineStatus.progress || 0}%` }}
            />
          </div>
        </div>
      )}
      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6">
        {/* Language Selector */}
        {!isRecording && (
          <div className="flex flex-col items-center">
            <CustomSelect
              value={settings.targetLanguage}
              onChange={(val) => setSettings(prev => ({ ...prev, targetLanguage: val }))}
              options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
              position="up"
              className="w-12 h-12"
              placeholder=""
              icon={<Globe size={20} className="text-blue-400" />}
            />
            <span className="text-[10px] text-slate-400 mt-1 max-w-[60px] truncate text-center">
              Output: {settings.targetLanguage}
            </span>
          </div>
        )}
        {/* Mic Button */}
        <button
          onPointerDown={e => {
            if (settings.pushToTalk) {
              e.preventDefault();
              if (!isRecording) toggleRecording();
            }
          }}
          onPointerUp={e => {
            if (settings.pushToTalk) {
              e.preventDefault();
              if (isRecording) toggleRecording();
            }
          }}
          onPointerLeave={() => {
            if (settings.pushToTalk && isRecording) toggleRecording();
          }}
          onClick={() => { if (!settings.pushToTalk) toggleRecording(); }}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all transform ${settings.pushToTalk ? 'active:scale-90' : 'hover:scale-105 active:scale-95'
            } ${isRecording
              ? activeMode === AppMode.OFFLINE_MODE
                ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                : 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-white hover:bg-slate-100'
            }`}
        >
          {isRecording ? (
            <MicOff size={32} className="text-white" />
          ) : (
            activeMode === AppMode.OFFLINE_MODE
              ? <WifiOff size={32} className="text-slate-900" />
              : <Mic size={32} className="text-slate-900" />
          )}
        </button>
        {/* Transcript Toggle */}
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors shadow-sm ${showTranscript ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}
          >
            {showTranscript
              ? <FileText size={20} className="text-blue-400" />
              : <FileX size={20} />
            }
          </button>
          <span className="text-[10px] text-slate-400 mt-1 text-center">Transcript</span>
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-500 mt-6 pb-2">
        {isRecording
          ? activeMode === AppMode.LIVE_TRANSLATOR
            ? `Listening & Identifying -> ${settings.targetLanguage}`
            : activeMode === AppMode.OFFLINE_MODE
              ? 'Recording Offline...'
              : 'Recording...'
          : 'Tap microphone to start'
        }
      </p>
    </div>
  );
});

export default ControlBar;
