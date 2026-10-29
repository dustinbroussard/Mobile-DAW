import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { DAW_PROJECT_FILE_EXTENSION } from '../types/projectFile';

interface SaveAsModalProps {
  isOpen: boolean;
  currentName: string;
  onSaveAs: (filename: string) => void;
  onClose: () => void;
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({
  isOpen,
  currentName,
  onSaveAs,
  onClose,
}) => {
  const [filename, setFilename] = useState(
    currentName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'daw_project'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filename.trim()) {
      onSaveAs(filename.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#222222] rounded-xl w-full max-w-md overflow-hidden shadow-[0_0_24px_rgba(0,0,0,0.9)]">
        <div className="bg-[#161616] border-b border-[#222222] px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-[#00FF41]" />
            <span className="text-xs font-bold text-[#00FF41]">SAVE PROJECT AS</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-[#555555] uppercase font-bold">PROJECT FILE NAME</label>
            <div className="flex items-center gap-1 bg-black border border-[#222222] focus-within:border-[#00FF41] rounded px-3 py-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                autoFocus
                className="bg-transparent text-white font-mono text-xs w-full focus:outline-none"
                placeholder="my_track_session"
              />
              <span className="text-[11px] text-[#555555] shrink-0">{DAW_PROJECT_FILE_EXTENSION}</span>
            </div>
            <p className="text-[10px] text-[#555555] pt-1">
              Saves a portable versioned JSON file with all tracks, notes, tempo, and mixer configuration.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-black hover:bg-[#1A1A1A] border border-[#222222] text-[#888888] hover:text-white py-2 rounded text-xs transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!filename.trim()}
              className="flex-1 bg-[#00FF41] hover:bg-[#00FF41]/90 disabled:opacity-50 text-black font-bold py-2 rounded text-xs transition-all shadow-[0_0_10px_rgba(0,255,65,0.3)]"
            >
              SAVE AS FILE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
