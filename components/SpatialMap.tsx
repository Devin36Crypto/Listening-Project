import React from 'react';
import { PeerNode } from '../types';
import { X } from 'lucide-react';

interface SpatialMapProps {
  nodes: PeerNode[];
  onClose: () => void;
}

const SpatialMap: React.FC<SpatialMapProps> = ({ nodes, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg h-[60vh] flex flex-col relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white z-10 hover:bg-slate-700"
        >
          <X size={20} />
        </button>
        
        <div className="flex-1 relative bg-slate-950 grid-bg">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border border-blue-500/20 rounded-full animate-pulse" />
            <div className="w-32 h-32 border border-blue-500/40 rounded-full absolute" />
            <div className="w-4 h-4 bg-blue-500 rounded-full absolute shadow-lg shadow-blue-500/50" />
          </div>
          
          {nodes.map(node => (
            <div 
              key={node.id}
              className="absolute w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50 transition-all duration-500"
              style={{ 
                left: `calc(50% + ${node.position.x * 100}px)`, 
                top: `calc(50% + ${node.position.y * 100}px)` 
              }}
              title={node.name}
            >
              <span className="text-[10px] font-bold text-black">{node.name.substring(0, 2)}</span>
            </div>
          ))}
          
          {nodes.length === 0 && (
            <div className="absolute bottom-8 left-0 right-0 text-center text-slate-500 text-sm">
              Scanning for nearby peers...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpatialMap;
