import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle, LogOut, User, CloudUpload, CloudDownload, Check, CreditCard, Sparkles, Clock } from 'lucide-react';
import { getSupabase } from '../services/supabase';
import { backupToCloud, restoreFromCloud } from '../services/sync';
import { useSubscription } from '../hooks/useSubscription';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [session, setSession] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState<'backup' | 'restore' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Subscription logic
    const { details, loading: subLoading, purchase, offerings } = useSubscription();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [supabaseClient, setSupabaseClient] = useState<any>(null);

    useEffect(() => {
        let subscription: { unsubscribe(): void } | undefined;

        const initSupabase = async () => {
            const client = await getSupabase();
            setSupabaseClient(client);

            if (!client) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.auth.getSession().then((response: any) => {
                setSession(response?.data?.session || null);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = client.auth.onAuthStateChange((_event: string, session: any) => {
                setSession(session);
            });
            subscription = data.subscription;
        };

        initSupabase();

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabaseClient) {
            setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else {
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose(); // Close modal on successful login
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        if (!supabaseClient) return;
        setLoading(true);
        try {
            await supabaseClient.auth.signOut();
        } catch (err) {
            console.error('Error signing out:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        setSyncLoading('backup');
        setError(null);
        setMessage(null);
        try {
            const count = await backupToCloud();
            setMessage(`Successfully backed up ${count} encrypted sessions to the cloud.`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSyncLoading(null);
        }
    };

    const handleRestore = async () => {
        setSyncLoading('restore');
        setError(null);
        setMessage(null);
        try {
            const count = await restoreFromCloud();
            setMessage(count > 0 ? `Restored ${count} sessions to this device.` : 'No backups found in the cloud.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSyncLoading(null);
        }
    };

    const handleSubscribe = async () => {
        const pkg = offerings?.current?.availablePackages[0];
        if (!pkg) {
            alert("No subscription offerings available right now.");
            return;
        }
        setLoading(true);
        try {
            await purchase(pkg, email);
        } catch (err) {
            console.error("Subscription failed:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <div className="glass-panel w-full max-w-md shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col pt-4 rounded-[2rem] border-white/10">
                {/* Header */}
                <div className="flex-none px-6 pb-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-inner">
                            <User className="text-brand-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Account</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Digital Vault & Pro Plans</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                    {!supabaseClient ? (
                        <div className="text-center py-12">
                            <AlertCircle size={64} className="mx-auto text-orange-500/50 mb-6" />
                            <h3 className="text-white font-bold text-lg mb-2 tracking-tight">Cloud Integration Required</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Please provide your Supabase credentials to enable secure cloud sync and encryption.</p>
                        </div>
                    ) : session ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-brand-500/5 border border-brand-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-2xl">
                                    <User size={36} className="text-brand-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white leading-none">Hello, Explorer</h3>
                                <p className="text-xs text-slate-500 mt-2 font-mono">{session.user.email}</p>
                            </div>

                            {/* Subscription Status Card */}
                            <div className="premium-card p-6 border-white/10 shadow-inner">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl ${details?.isPro ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-[0.15em]">
                                                {details?.isPro ? 'PRO SUBSCRIPTION' : 'BASIC TIER'}
                                            </h4>
                                            <p className="text-[10px] text-brand-400 font-bold tracking-widest uppercase">
                                                {details?.platform?.replace('_', ' ') || 'Detecting...'}
                                            </p>
                                        </div>
                                    </div>
                                    {details?.isTrial && (
                                        <div className="bg-accent-purple/20 text-accent-purple text-[9px] font-black px-3 py-1.5 rounded-full border border-accent-purple/30 shadow-[0_0_15px_rgba(139,92,246,0.3)] uppercase tracking-tighter">
                                            3-DAY TRIAL
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Base Access</span>
                                        <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md">${details?.basePrice || 0}.00</span>
                                    </div>
                                    {details?.extraDevicesCount && details.extraDevicesCount > 0 ? (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Support Lines x{details.extraDevicesCount}</span>
                                            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md">+${details.extraDevicesCount * (details.addonPrice || 0)}.00</span>
                                        </div>
                                    ) : null}
                                    <div className="h-px bg-white/5 my-2 shadow-inner" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Total Monthly</span>
                                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-purple font-mono">${details?.totalMonthlyCost || 0}.00</span>
                                    </div>
                                </div>

                                {!details?.isPro && (
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={loading || subLoading}
                                        className="w-full relative overflow-hidden flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white py-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(59,130,246,0.4)] group active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="animate-pulse" />}
                                        <span className="font-black text-sm uppercase tracking-widest">Activate Pro</span>
                                    </button>
                                )}

                                {details?.isPro && (
                                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-4">
                                        <Clock size={12} className="text-brand-400" />
                                        <span>Next charge: {details.trialDaysRemaining > 0 ? `Trial Ends in ${details.trialDaysRemaining}d` : details.expiryDate ? new Date(details.expiryDate).toLocaleDateString() : 'Active'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleBackup}
                                    disabled={syncLoading !== null || loading}
                                    className="flex flex-col items-center justify-center p-3 glass-panel hover:bg-white/5 text-white py-4 rounded-2xl transition-all border border-white/5 hover:border-brand-500/30 group disabled:opacity-50"
                                >
                                    {syncLoading === 'backup' ? <Loader2 size={20} className="animate-spin text-brand-400 mb-2" /> : <CloudUpload size={20} className="text-brand-400 mb-2 group-hover:-translate-y-1 transition-transform" />}
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Sync Cloud</span>
                                </button>

                                <button
                                    onClick={handleRestore}
                                    disabled={syncLoading !== null || loading}
                                    className="flex flex-col items-center justify-center p-3 glass-panel hover:bg-white/5 text-white py-4 rounded-2xl transition-all border border-white/5 hover:border-accent-purple/30 group disabled:opacity-50"
                                >
                                    {syncLoading === 'restore' ? <Loader2 size={20} className="animate-spin text-accent-purple mb-2" /> : <CloudDownload size={20} className="text-accent-purple mb-2 group-hover:translate-y-1 transition-transform" />}
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Fetch Data</span>
                                </button>
                            </div>

                            <button
                                onClick={handleSignOut}
                                disabled={loading || syncLoading !== null}
                                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl transition-all hover:bg-red-500/5"
                            >
                                <LogOut size={16} />
                                Terminate Session
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            {/* ... (LoginForm content remains same but condensed for clarity in this edit) ... */}
                            <div className="text-center py-2 mb-4">
                                <div className="inline-flex items-center gap-2 bg-blue-900/20 text-blue-400 text-xs px-3 py-1.5 rounded-full border border-blue-500/30">
                                    <Sparkles size={12} />
                                    <span>Download for free. Try for 3 days.</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500" placeholder="you@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500" placeholder="••••••••" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl mt-4 disabled:opacity-50">
                                {loading ? <Loader2 size={18} className="animate-spin inline mr-2" /> : null}
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </button>
                            <div className="text-center mt-4">
                                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-slate-400 hover:text-white transition-colors">
                                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
