import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle, LogOut, User, CloudUpload, CloudDownload, Check } from 'lucide-react';
import { getSupabase } from '../services/supabase';
import { backupToCloud, restoreFromCloud } from '../services/sync';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [supabaseClient, setSupabaseClient] = useState<any>(null);

    useEffect(() => {
        let subscription: any;

        const initSupabase = async () => {
            const client = await getSupabase();
            setSupabaseClient(client);

            if (!client) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.auth.getSession().then((response: any) => {
                setSession(response?.data?.session || null);
            });

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col pt-4">
                {/* Header */}
                <div className="flex-none px-6 pb-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <User className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Account</h2>
                            <p className="text-xs text-slate-400">Sync & Subscription</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!supabaseClient ? (
                        <div className="text-center py-8">
                            <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4 opacity-50" />
                            <h3 className="text-white font-semibold mb-2">Supabase Not Configured</h3>
                            <p className="text-sm text-slate-400">Please provide your Supabase URL and Anon Key in the environment variables to enable authentication.</p>
                        </div>
                    ) : session ? (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-900/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">Signed In</h3>
                            <p className="text-sm text-slate-400 mb-8">{session.user.email}</p>

                            {error && (
                                <div className="p-3 mb-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-red-400 text-sm text-left">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {message && (
                                <div className="p-3 mb-4 bg-green-900/20 border border-green-900/50 rounded-lg flex items-start gap-2 text-green-400 text-sm text-left">
                                    <Check size={16} className="mt-0.5 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div className="space-y-3 mb-8">
                                <button
                                    onClick={handleBackup}
                                    disabled={syncLoading !== null || loading}
                                    className="w-full flex items-center justify-between px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors border border-slate-700 disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        {syncLoading === 'backup' ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <CloudUpload size={18} className="text-blue-400" />}
                                        <span>Backup to Cloud</span>
                                    </div>
                                    <span className="text-xs text-slate-400">Encrypted</span>
                                </button>

                                <button
                                    onClick={handleRestore}
                                    disabled={syncLoading !== null || loading}
                                    className="w-full flex items-center justify-between px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors border border-slate-700 disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        {syncLoading === 'restore' ? <Loader2 size={18} className="animate-spin text-purple-400" /> : <CloudDownload size={18} className="text-purple-400" />}
                                        <span>Restore from Cloud</span>
                                    </div>
                                    <span className="text-xs text-slate-400">Download</span>
                                </button>
                            </div>

                            <button
                                onClick={handleSignOut}
                                disabled={loading || syncLoading !== null}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-300 font-semibold py-3 rounded-xl transition-colors border border-slate-700 hover:border-red-900/50 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {message && (
                                <div className="p-3 bg-green-900/20 border border-green-900/50 rounded-lg flex items-start gap-2 text-green-400 text-sm">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </button>

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                >
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
