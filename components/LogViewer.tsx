import React, { useRef, useEffect } from 'react';
import { Search, VolumeX } from 'lucide-react';
import { LogMessage } from '../types';
import { getSpeakerColor, getSpeakerInitials } from '../utils/colors';

interface LogViewerProps {
  logs: LogMessage[];
  showTranscript: boolean;
  speakerRegistry: Record<string, string>;
  onSpeakerClick: (id: string) => void;
}

const LogViewer: React.FC<LogViewerProps> = React.memo(({ 
  logs, 
  showTranscript, 
  speakerRegistry, 
  onSpeakerClick 
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (showTranscript) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showTranscript]);

  if (!showTranscript) {
    return (
      <div className="h-full flex flex-col items-center justify-start pt-32 text-slate-500 space-y-6">
        <div className="w-24 h-24 rounded-full bg-slate-800/30 border border-slate-800 flex items-center justify-center animate-pulse">
          <Search size={40} className="text-slate-600" />
        </div>
        <p className="text-sm font-medium">Transcript Hidden</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-start pt-32 text-slate-500 space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
          <Search size={32} className="opacity-50" />
        </div>
        <p className="text-center max-w-xs text-sm">
          <b>System Online.</b><br />Sensors are ready.<br />Listening for speakers...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
      {logs.map(msg => {
        if (msg.role === 'date-marker') {
          return (
            <div key={msg.id} className="flex justify-center py-4">
              <span className="bg-slate-800/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700/50 font-mono">
                {msg.text}
              </span>
            </div>
          );
        }
        return (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] flex flex-col gap-1">
              <div className={`flex items-center gap-2 text-[10px] text-slate-400 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {(msg.speakerId || msg.role === 'model') && (
                  <button
                    onClick={() => msg.speakerId && onSpeakerClick(msg.speakerId)}
                    className="flex items-center gap-2 hover:bg-slate-800/50 rounded-full pr-2 py-0.5 transition-colors group"
                    disabled={!msg.speakerId}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${msg.speakerId ? getSpeakerColor(msg.speakerId) : 'bg-blue-600'
                      }`}>
                      {msg.speakerId ? getSpeakerInitials(speakerRegistry[msg.speakerId] || msg.speakerId) : 'AI'}
                    </div>
                    <span className="font-semibold text-slate-300 group-hover:text-blue-400 transition-colors">
                      {msg.speakerId ? (speakerRegistry[msg.speakerId] || msg.speakerId) : 'AI Assistant'}
                    </span>
                  </button>
                )}
                <span className="opacity-50">•</span>
                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className={`rounded-2xl p-4 shadow-sm ${msg.isError
                ? 'bg-red-900/20 border border-red-500/50 text-red-200'
                : msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.role === 'system'
                    ? 'bg-slate-800/50 text-slate-400 text-sm border border-slate-700 font-mono'
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                }`}>
                {msg.isError && <VolumeX size={16} className="mt-1 flex-shrink-0 text-red-400 mb-1" />}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={logsEndRef} />
    </div>
  );
});

export default LogViewer;
