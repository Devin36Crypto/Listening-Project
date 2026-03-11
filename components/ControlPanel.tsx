import React from 'react';
import { Mic, MicOff, WifiOff, Globe, FileText, FileX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Visualizer from './Visualizer';
import CustomSelect from './CustomSelect';
import { AppMode, Settings } from '../types';
import { LANGUAGES } from '../constants';

interface ControlPanelProps {
    isRecording: boolean;
    activeMode: AppMode;
    setActiveMode: (mode: AppMode) => void;
    analyserNode: AnalyserNode | null;
    offlineStatus: { status: string; progress?: number; message?: string };
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    toggleRecording: () => void;
    showTranscript: boolean;
    setShowTranscript: (val: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    isRecording,
    activeMode,
    setActiveMode,
    analyserNode,
    offlineStatus,
    settings,
    setSettings,
    toggleRecording,
    showTranscript,
    setShowTranscript
}) => {
    if (activeMode === AppMode.LOCKED) {
        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-0 left-0 right-0 bg-premium-zinc/90 backdrop-blur-3xl p-8 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] safe-area-inset-bottom"
            >
                <div className="max-w-md mx-auto text-center">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20"
                    >
                        <MicOff size={32} className="text-brand-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">3-Day Trial Expired</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        To continue using ListeningProject's Android features and sensors, please choose a plan in your account settings.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs text-brand-400 font-bold border-b border-brand-500/30 pb-1 opacity-80">
                        <Globe size={14} />
                        ANDROID & DESKTOP ACTIVE
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-premium-zinc to-transparent pt-2 pb-[max(1.2rem,env(safe-area-inset-bottom))] px-4 pointer-events-none lg:flex lg:justify-center">
            <div className="pointer-events-auto lg:w-full lg:max-w-3xl">
                {/* Visualizer */}
                <div className="mb-4 h-10">
                    <Visualizer
                        analyserNode={analyserNode}
                        isActive={isRecording}
                        color={isRecording
                            ? activeMode === AppMode.OFFLINE_MODE ? '#f97316' : '#00e5ff'
                            : '#475569'
                        }
                    />
                </div>

                {/* Mode Selector */}
                <div className="flex justify-center mb-4 w-full">
                    <div className="flex bg-premium-zinc/60 backdrop-blur-xl rounded-2xl p-1 border border-white/5 shadow-2xl">
                        {[
                            { mode: AppMode.LIVE_TRANSLATOR, label: 'Translator', color: 'bg-brand-500' },
                            { mode: AppMode.TRANSCRIBER, label: 'Transcriber', color: 'bg-brand-500' },
                            { mode: AppMode.CONTEXT_AWARE, label: 'AI Helper', color: 'bg-accent-emerald' }
                        ].map((m) => (
                            <button
                                key={m.mode}
                                onClick={() => setActiveMode(m.mode)}
                                className={`relative w-24 px-2 py-2 rounded-xl text-[11px] font-bold transition-all ${activeMode === m.mode ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >

                                {activeMode === m.mode && (
                                    <motion.div
                                        layoutId="active-mode"
                                        className={`absolute inset-0 ${m.color} rounded-xl shadow-lg`}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Offline Progress Bar */}
                <AnimatePresence>
                    {offlineStatus.status === 'loading' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-6 px-4 md:px-12"
                        >
                            <div className="flex justify-between text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-bold">
                                <span>{offlineStatus.message}</span>
                                <span>{Math.round(offlineStatus.progress || 0)}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                <motion.div
                                    className="bg-brand-500 h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${offlineStatus.progress || 0}%` }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 items-center w-72 mx-auto">
                    {/* Language Selector (Left Column) */}
                    <div className="flex justify-center flex-col items-center">
                        {!isRecording && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex flex-col items-center"
                            >
                                <CustomSelect
                                    value={settings.targetLanguage}
                                    onChange={(val) => setSettings(prev => ({ ...prev, targetLanguage: val }))}
                                    options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
                                    position="up"
                                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center justify-center"
                                    placeholder=""
                                    icon={<Globe size={24} className="text-brand-400" />}
                                />
                                <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                                    {settings.targetLanguage.slice(0, 10)}
                                </span>
                            </motion.div>
                        )}
                    </div>

                    {/* Mic Button (Center Column) */}
                    <div className="flex justify-center">
                        <motion.button

                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
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
                            className={`relative w-14 h-14 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all ${isRecording
                                ? activeMode === AppMode.OFFLINE_MODE
                                    ? 'bg-accent-orange shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                                    : 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                                : 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)] text-premium-zinc'
                                }`}
                        >
                            {isRecording ? (
                                <MicOff size={24} className="text-white relative z-10" />
                            ) : (
                                activeMode === AppMode.OFFLINE_MODE
                                    ? <WifiOff size={24} className="text-black relative z-10" />
                                    : <Mic size={24} className="text-black relative z-10" />
                            )}


                            {isRecording && (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-white blur-xl"
                                />
                            )}
                        </motion.button>
                    </div>

                    {/* Transcript Toggle (Right Column) */}
                    <div className="flex justify-center flex-col items-center">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative flex flex-col items-center"
                        >
                            <button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${showTranscript ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-transparent border-white/5 text-slate-600'}`}
                            >
                                {showTranscript
                                    ? <FileText size={24} className="text-brand-400" />
                                    : <FileX size={24} />
                                }
                            </button>
                            <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">Transcript</span>
                        </motion.div>
                    </div>
                </div>


                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[10px] text-slate-500 mt-4 pb-2 font-bold uppercase tracking-[0.2em]"
                >
                    {isRecording
                        ? activeMode === AppMode.LIVE_TRANSLATOR
                            ? `IDENTIFYING -> ${settings.targetLanguage}`
                            : 'RECORDING ACTIVE'
                        : 'READY FOR CAPTURE'
                    }
                </motion.p>
            </div>
        </div>
    );
};

export default React.memo(ControlPanel);
