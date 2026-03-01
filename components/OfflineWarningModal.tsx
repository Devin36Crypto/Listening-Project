import React from 'react';
import { WifiOff, Download, AlertTriangle, X } from 'lucide-react';

interface OfflineWarningModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const OfflineWarningModal: React.FC<OfflineWarningModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-warning-title"
        >
            <div className="bg-slate-800 border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-amber-900/20">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-500/40 flex items-center justify-center">
                            <WifiOff size={20} className="text-amber-400" />
                        </div>
                        <h2 id="offline-warning-title" className="text-lg font-bold text-white">Offline Mode</h2>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    <div className="flex gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
                        <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200">
                            Offline mode uses on-device AI models that must be downloaded to your browser cache on first use.
                        </p>
                    </div>

                    {/* Model sizes */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Models that will be downloaded
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">Whisper Tiny</p>
                                    <p className="text-xs text-slate-500">Speech recognition (transcription)</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Download size={14} className="text-blue-400" />
                                    <span className="text-sm text-blue-400 font-mono">~75 MB</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">NLLB-200-Distilled</p>
                                    <p className="text-xs text-slate-500">Offline translation (optional)</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Download size={14} className="text-blue-400" />
                                    <span className="text-sm text-blue-400 font-mono">~1.2 GB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        Downloads are cached. You only pay this cost once. Requires a stable internet connection for the initial download.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                    <button
                        onClick={onCancel}
                        className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <WifiOff size={16} />
                        Go Offline
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfflineWarningModal;
