import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { LogMessage } from '../types';
import ChatMessage from './ChatMessage';

interface ChatListProps {
    logs: LogMessage[];
    showTranscript: boolean;
    speakerRegistry: Record<string, string>;
    getSpeakerColor: (id: string) => string;
    getSpeakerInitials: (name: string) => string;
}

const ChatList: React.FC<ChatListProps> = ({
    logs,
    showTranscript,
    speakerRegistry,
    getSpeakerColor,
    getSpeakerInitials
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

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
            {logs.map((log) => (
                <ChatMessage
                    key={log.id}
                    log={log}
                    speakerName={speakerRegistry[log.speakerId || ''] || log.speakerId || ''}
                    getSpeakerColor={getSpeakerColor}
                    getSpeakerInitials={getSpeakerInitials}
                />
            ))}
            <div ref={logsEndRef} />
        </div>
    );
};

export default React.memo(ChatList);
