import React from 'react';
import { VolumeX } from 'lucide-react';
import { LogMessage } from '../types';

interface ChatMessageProps {
    log: LogMessage;
    speakerName: string;
    getSpeakerColor: (id: string) => string;
    getSpeakerInitials: (name: string) => string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    log,
    speakerName,
    getSpeakerColor,
    getSpeakerInitials
}) => {
    if (log.role === 'date-marker') {
        return (
            <div className="flex justify-center py-4">
                <span className="bg-slate-800/50 text-slate-400 text-[10px] px-3 py-1 rounded-full border border-slate-700/50 font-mono tracking-widest uppercase">
                    {log.text}
                </span>
            </div>
        );
    }

    const isUser = log.role === 'user';
    const isModel = log.role === 'model';
    const isSystem = log.role === 'system';

    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 text-[10px] text-slate-400 mb-0.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {(log.speakerId || isModel) && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/50">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm transition-transform ${log.speakerId ? getSpeakerColor(log.speakerId) : 'bg-blue-600'}`}>
                                {log.speakerId ? getSpeakerInitials(speakerName) : 'AI'}
                            </div>
                            <span className="font-semibold text-slate-300">
                                {isModel ? 'AI Assistant' : speakerName}
                            </span>
                        </div>
                    )}
                    <span className="opacity-30">•</span>
                    <span className="font-mono text-[9px] opacity-50">
                        {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>

                <div className={`relative px-4 py-3 rounded-2xl shadow-xl transition-all ${log.isError
                        ? 'bg-red-900/20 border border-red-500/30 text-red-200'
                        : isUser
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10'
                            : isSystem
                                ? 'bg-slate-900/80 text-slate-400 text-[11px] border border-slate-800 font-mono italic'
                                : 'bg-slate-900/60 backdrop-blur-md text-slate-100 rounded-tl-none border border-white/5'
                    }`}>
                    {log.isError && <VolumeX size={14} className="absolute -left-6 top-4 text-red-500 animate-pulse" />}
                    <div className="whitespace-pre-wrap leading-relaxed text-[13px]">{log.text}</div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChatMessage);
