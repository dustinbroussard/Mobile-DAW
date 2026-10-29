import React, { useRef } from 'react';
import {
  X,
  FilePlus,
  FolderOpen,
  Save,
  Download,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Music,
} from 'lucide-react';
import { InstrumentCategory, TrackType } from '../types/daw';
import { CURRENT_PROJECT_SCHEMA_VERSION, DAW_PROJECT_FILE_EXTENSION } from '../types/projectFile';
import { DAW_THEME } from '../config/theme';

interface ProjectMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  onAddTrack: (category: InstrumentCategory, name: string, trackType: TrackType) => void;
  onNewProject: () => void;
  onOpenProjectFile: (file: File) => void;
  onSaveProject: () => void;
  onOpenSaveAs: () => void;
  onResetProject: () => void;
  onOpenMidiFile?: (file: File) => void;
  onExportMidi?: () => void;
}

export const ProjectMenuModal: React.FC<ProjectMenuModalProps> = ({
  isOpen,
  onClose,
  projectName,
  hasUnsavedChanges,
  lastSavedAt,
  onAddTrack,
  onNewProject,
  onOpenProjectFile,
  onSaveProject,
  onOpenSaveAs,
  onResetProject,
  onOpenMidiFile,
  onExportMidi,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenProjectFile(file);
      onClose();
    }
    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      {/* Hidden Native File Picker Input (.dawproj) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dawproj,.json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Native MIDI File Picker (.mid, .midi) */}
      <input
        ref={midiFileInputRef}
        type="file"
        accept=".mid,.midi,audio/midi,audio/x-midi"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onOpenMidiFile) {
            onOpenMidiFile(file);
            onClose();
          }
          if (midiFileInputRef.current) {
            midiFileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      <div className="bg-[#121212] border border-[#222222] rounded-xl w-full max-w-lg overflow-hidden shadow-[0_0_24px_rgba(0,0,0,0.9)] max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#161616] border-b border-[#222222] px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37]">PROJECT & FILE MANAGER</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded bg-black hover:bg-[#222222] text-[#555555] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Project Status Banner */}
          <div className="bg-black border border-[#222222] p-3 rounded-lg flex items-center justify-between text-xs">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-bold text-white truncate">{projectName}</span>
              <span className="text-[10px] text-[#555555]">
                SCHEMA V{CURRENT_PROJECT_SCHEMA_VERSION} • {lastSavedAt ? `Saved ${lastSavedAt}` : 'Autosaved in session'}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              {hasUnsavedChanges ? (
                <span className="text-[10px] bg-[#FF9500]/10 border border-[#FF9500] text-[#FF9500] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> UNSAVED EDITS
                </span>
              ) : (
                <span className="text-[10px] bg-[#00FF41]/10 border border-[#00FF41] text-[#00FF41] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ALL SAVED
                </span>
              )}
            </div>
          </div>

          {/* 1. Project File Actions */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              FILE OPERATIONS (.DAWPROJ)
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Save */}
              <button
                onClick={() => {
                  onSaveProject();
                  onClose();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00FF41] text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-[#00FF41]/20 flex items-center justify-center shrink-0">
                  <Save className="w-3.5 h-3.5 text-[#00FF41]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-[#00FF41] transition-colors">
                    SAVE PROJECT
                  </span>
                  <span className="text-[9px] text-[#555555]">Fast file export</span>
                </div>
              </button>

              {/* Save As */}
              <button
                onClick={() => {
                  onOpenSaveAs();
                  onClose();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00E5FF] text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-[#00E5FF]/20 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-[#00E5FF] transition-colors">
                    SAVE AS...
                  </span>
                  <span className="text-[9px] text-[#555555]">Custom filename</span>
                </div>
              </button>

              {/* Open File */}
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#D4AF37] text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-[#D4AF37] transition-colors">
                    OPEN PROJECT...
                  </span>
                  <span className="text-[9px] text-[#555555]">Load .dawproj file</span>
                </div>
              </button>

              {/* New Project */}
              <button
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-white text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-white/20 flex items-center justify-center shrink-0">
                  <FilePlus className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-white transition-colors">
                    NEW PROJECT
                  </span>
                  <span className="text-[9px] text-[#555555]">Start fresh session</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Standard MIDI I/O (.MID / .MIDI) */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              STANDARD MIDI I/O (.MID / .MIDI)
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Import MIDI */}
              <button
                onClick={() => {
                  midiFileInputRef.current?.click();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00E5FF] text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-[#00E5FF]/20 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-[#00E5FF]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-[#00E5FF] transition-colors">
                    IMPORT MIDI...
                  </span>
                  <span className="text-[9px] text-[#555555]">Standard .mid file</span>
                </div>
              </button>

              {/* Export MIDI */}
              <button
                onClick={() => {
                  onExportMidi?.();
                  onClose();
                }}
                className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00FF41] text-white p-2.5 rounded text-left flex items-center gap-2.5 transition-colors group"
              >
                <div className="w-7 h-7 rounded bg-[#161616] group-hover:bg-[#00FF41]/20 flex items-center justify-center shrink-0">
                  <Music className="w-3.5 h-3.5 text-[#00FF41]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold group-hover:text-[#00FF41] transition-colors">
                    EXPORT MIDI (.MID)
                  </span>
                  <span className="text-[9px] text-[#555555]">Standard Type 1 file</span>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Add New Track Section */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              ADD INSTRUMENT TRACK
            </span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((item) => (
                <button
                  key={item.cat}
                  onClick={() => handleCreateTrack(item.cat, item.label, item.defaultType)}
                  className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-current p-2 rounded text-left flex items-center gap-2 transition-colors group"
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

          {/* 3. Session Reset Action */}
          <div className="border-t border-[#222222] pt-3 space-y-2">
            <span className="text-[10px] text-[#555555] font-bold uppercase tracking-wider block">
              DEFAULT TEMPLATE RESTORE
            </span>
            <button
              onClick={() => {
                onResetProject();
                onClose();
              }}
              className="w-full bg-black hover:bg-[#221212] border border-[#222222] hover:border-[#FF3B30] text-[#FF3B30] p-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> RESET SESSION TO DEFAULT TRACKS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
