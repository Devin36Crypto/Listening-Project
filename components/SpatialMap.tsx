import React from 'react';
import { PeerNode } from '../types';
import { Smartphone, Watch, Headphones, Tablet, Wifi } from 'lucide-react';

interface SpatialMapProps {
    nodes: PeerNode[];
    onClose: () => void;
}

const SpatialMap: React.FC<SpatialMapProps> = ({ nodes, onClose }) => {
    const getIcon = (type: PeerNode['type']) => {
        switch (type) {
            case 'phone': return <Smartphone size={24} />;
            case 'watch': return <Watch size={24} />;
            case 'earbuds': return <Headphones size={24} />;
            case 'tablet': return <Tablet size={24} />;
            default: return <Wifi size={24} />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Spatial Sensor Network</h2>
                        <p className="text-sm text-zinc-400">Visualizing active acoustic nodes</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>

                <div className="flex-1 p-8 bg-zinc-950 relative overflow-hidden flex items-center justify-center min-h-[400px]">
                    {/* Spatial Grid Background */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    {/* Master Node (Center) */}
                    <div className="relative z-10">
                        <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)] animate-pulse">
                            <Smartphone size={40} />
                        </div>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono text-blue-400 uppercase tracking-widest whitespace-nowrap">Host (You)</span>
                    </div>

                    {/* Peer Nodes (Orbital) */}
                    {nodes.filter(n => n.status === 'connected').map((node, i) => {
                        const angle = (i * (360 / nodes.length)) * (Math.PI / 180);
                        const radius = 120;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;

                        return (
                            <div
                                key={node.id}
                                className="absolute z-10 flex flex-col items-center gap-2 transition-all duration-1000"
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
                                    {getIcon(node.type)}
                                </div>
                                <div className="bg-zinc-900/80 backdrop-blur-md px-2 py-1 rounded border border-white/5 text-[10px] text-zinc-300 font-mono whitespace-nowrap">
                                    {node.name}
                                </div>
                            </div>
                        );
                    })}

                    {/* Wave interference patterns (Decorative) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-[300px] h-[300px] border border-blue-500/30 rounded-full animate-ping" />
                        <div className="w-[500px] h-[500px] border border-blue-500/10 rounded-full animate-pulse" />
                    </div>
                </div>

                <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] text-zinc-400 uppercase">Primary Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-zinc-400 uppercase">Sub-Sensor</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] text-zinc-400 uppercase">Syncing...</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpatialMap;
