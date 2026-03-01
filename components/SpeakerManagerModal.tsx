import React, { useState } from 'react';
import { X, User, Edit2, Check, Trash2 } from 'lucide-react';
import { getSpeakerColor, getSpeakerInitials } from '../utils/colors';

interface SpeakerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakerRegistry: Record<string, string>;
  onRenameSpeaker: (id: string, newName: string) => void;
  onDeleteSpeaker: (id: string) => void;
  activeSpeakers: string[];
}

const SpeakerManagerModal: React.FC<SpeakerManagerModalProps> = ({
  isOpen,
  onClose,
  speakerRegistry,
  onRenameSpeaker,
  onDeleteSpeaker,
  activeSpeakers,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  // Get all unique speaker IDs from registry and active speakers
  const allSpeakerIds = Array.from(new Set([...Object.keys(speakerRegistry), ...activeSpeakers]));

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRenameSpeaker(editingId, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <User className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Speaker Manager</h2>
              <p className="text-xs text-slate-400">Rename or remove identified speakers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {allSpeakerIds.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <User size={48} className="mx-auto mb-4 opacity-20" />
              <p>No speakers identified yet.</p>
            </div>
          ) : (
            allSpeakerIds.map((id) => {
              const name = speakerRegistry[id] || id;
              const colorClass = getSpeakerColor(id);
              const isEditing = editingId === id;

              return (
                <div key={id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                      {getSpeakerInitials(name)}
                    </div>
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none w-full"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-medium">{name}</span>
                        {name !== id && <span className="text-[10px] text-slate-500 font-mono">ID: {id}</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    {isEditing ? (
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      >
                        <Check size={16} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(id, name)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteSpeaker(id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Clear custom name"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex-none p-4 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500">
          Speakers are automatically identified by the AI. Rename them here for clarity.
        </div>
      </div>
    </div>
  );
};

export default SpeakerManagerModal;
