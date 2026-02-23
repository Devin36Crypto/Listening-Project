import React, { useEffect, useState } from 'react';
import { X, Trash2, Clock, AppWindow, Globe, ChevronRight } from 'lucide-react';
import { Session } from '../types';
import { getSessions, deleteSession } from '../services/db';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSession: (session: Session) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelectSession }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (err) {
            console.error("Failed to load sessions", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this session?')) {
            await deleteSession(id);
            await loadSessions();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Clock className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Session History</h2>
                            <p className="text-xs text-slate-400">Your local transcription history</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-20">
                            <Clock size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                            <p className="text-slate-500">No sessions saved yet.</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                className="group relative p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-blue-500/30 transition-all cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">
                                                {session.startTime.toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-blue-400 border border-slate-700">
                                                <AppWindow size={10} /> {session.mode.replace('_', ' ')}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                                                <Globe size={10} /> {session.targetLanguage}
                                            </span>
                                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-500 border border-slate-700">
                                                {session.logs.length} Messages
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(e, session.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Session"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-4 bg-slate-900/80 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500">History is stored locally in your browser and is not uploaded to any server.</p>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
