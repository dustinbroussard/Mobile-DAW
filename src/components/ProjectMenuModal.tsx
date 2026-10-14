import React from 'react';
import { X } from 'lucide-react';
import { InstrumentCategory, TrackType } from '../types/daw';
import { DAW_THEME } from '../config/theme';

interface ProjectMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (category: InstrumentCategory, name: string, trackType: TrackType) => void;
  onResetProject: () => void;
}

export const ProjectMenuModal: React.FC<ProjectMenuModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  onResetProject,
}) => {
  if (!isOpen) return null;

  const categories: { cat: InstrumentCategory; label: string; defaultType: TrackType; color: string }[] = [
    { cat: 'piano', label: 'Piano / Keyboard', defaultType: 'midi', color: DAW_THEME.trackAccents['piano'] },
    { cat: 'drums', label: 'Drums / Percussion', defaultType: 'midi', color: DAW_THEME.trackAccents['drums'] },
    { cat: 'guitar', label: 'Distorted Guitar', defaultType: 'audio', color: DAW_THEME.trackAccents['guitar'] },
    { cat: 'clean-guitar', label: 'Clean / Rhythm Guitar', defaultType: 'audio', color: DAW_THEME.trackAccents['clean-guitar'] },
    { cat: 'bass', label: 'Electric / Synth Bass', defaultType: 'midi', color: DAW_THEME.trackAccents['bass'] },
    { cat: 'strings', label: 'Orchestral Strings', defaultType: 'midi', color: DAW_THEME.trackAccents['strings'] },
    { cat: 'horns', label: 'Brass / Horn Section', defaultType: 'midi', color: DAW_THEME.trackAccents['horns'] },
    { cat: 'blues-organ', label: 'Hammond Blues Organ', defaultType: 'midi', color: DAW_THEME.trackAccents['blues-organ'] },
    { cat: 'electric-piano', label: 'Rhodes / Electric Piano', defaultType: 'midi', color: DAW_THEME.trackAccents['electric-piano'] },
    { cat: 'lead-vocal', label: 'Lead Vocal Track', defaultType: 'audio', color: DAW_THEME.trackAccents['lead-vocal'] },
  ];

  const handleCreateTrack = (cat: InstrumentCategory, label: string, type: TrackType) => {
    onAddTrack(cat, label, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#222222] rounded-xl w-full max-w-md overflow-hidden shadow-[0_0_24px_rgba(0,0,0,0.9)]">
        {/* Modal Header */}
        <div className="bg-[#161616] border-b border-[#222222] px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37]">PROJECT & TRACK MANAGER</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Add New Track Section */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              ADD NEW INSTRUMENT TRACK
            </span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((item) => (
                <button
                  key={item.cat}
                  onClick={() => handleCreateTrack(item.cat, item.label, item.defaultType)}
                  className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-current p-2.5 rounded text-left flex items-center gap-2 transition-colors group"
                  style={{ color: item.color }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-white group-hover:text-current">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-[#555555] uppercase">
                      {item.cat} • {item.defaultType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3 space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              SESSION ACTIONS
            </span>
            <button
              onClick={() => {
                onResetProject();
                onClose();
              }}
              className="w-full bg-black hover:bg-[#221212] border border-[#222222] hover:border-[#FF3B30] text-[#FF3B30] p-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              RESET SESSION TO DEFAULT TRACKS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
