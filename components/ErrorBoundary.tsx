import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info?.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-slate-200">
                    <div className="w-full max-w-md bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-900/20 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/40 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} className="text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 text-sm mb-6">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 mb-6 text-left">
                            <p className="text-xs font-mono text-red-300 break-all">
                                {(this.state.error as Error)?.message || 'Unknown error'}
                            </p>
                        </div>
                        <button
                            onClick={this.handleReload}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                            <RefreshCw size={18} />
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
