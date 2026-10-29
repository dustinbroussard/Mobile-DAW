import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Terminal,
  Music,
  HardDrive,
  Save,
  FolderOpen,
  FilePlus,
  Check,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { ProjectState } from '../types/daw';
import { CURRENT_PROJECT_SCHEMA_VERSION, DAW_PROJECT_FILE_EXTENSION } from '../types/projectFile';

interface ProjectViewProps {
  project: ProjectState;
  hasUnsavedChanges?: boolean;
  lastSavedAt?: string | null;
  onUpdateProjectName: (name: string) => void;
  onUpdateBpm: (bpm: number) => void;
  onUpdateKeySignature: (key: string) => void;
  onUpdateTimeSignature: (num: number, den: number) => void;
  onResetProject: () => void;
  onSaveProject?: () => void;
  onOpenSaveAs?: () => void;
  onOpenProjectFile?: (file: File) => void;
  onNewProject?: () => void;
  onOpenMidiFile?: (file: File) => void;
  onExportMidi?: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  hasUnsavedChanges = false,
  lastSavedAt,
  onUpdateProjectName,
  onUpdateBpm,
  onUpdateKeySignature,
  onUpdateTimeSignature,
  onResetProject,
  onSaveProject,
  onOpenSaveAs,
  onOpenProjectFile,
  onNewProject,
  onOpenMidiFile,
  onExportMidi,
}) => {
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiFileInputRef = useRef<HTMLInputElement>(null);

  const handleActionNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onOpenProjectFile) {
      onOpenProjectFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 bg-black text-white font-mono p-4 overflow-y-auto select-none">
      {/* Hidden Native File Input (.dawproj) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dawproj,.json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Native MIDI File Input (.mid, .midi) */}
      <input
        ref={midiFileInputRef}
        type="file"
        accept=".mid,.midi,audio/midi,audio/x-midi"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onOpenMidiFile) {
            onOpenMidiFile(file);
          }
          if (midiFileInputRef.current) {
            midiFileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#FFFFFF] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#D4AF37]" /> PROJECT & SYSTEM SETTINGS
            </h1>
            <p className="text-xs text-[#555555]">DEBIAN LINUX CHROMIUM DAW ENVIRONMENT</p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="text-xs font-bold text-[#FF9500] bg-black px-2 py-1 rounded border border-[#FF9500] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> UNSAVED EDITS
              </span>
            ) : (
              <span className="text-xs font-bold text-[#00FF41] bg-black px-2 py-1 rounded border border-[#00FF41]">
                PROJECT SAVED
              </span>
            )}
          </div>
        </div>

        {/* Notice feedback banner without window.alert */}
        {exportNotice && (
          <div className="bg-[#121212] border border-[#00FF41] text-[#00FF41] px-4 py-2 rounded text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Card 1: Song Properties */}
        <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 space-y-4">
          <h2 className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-2">
            <Music className="w-4 h-4" /> SONG PROPERTIES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Song Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555555]">PROJECT NAME</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => onUpdateProjectName(e.target.value)}
                className="bg-black text-white px-3 py-2 rounded border border-[#222222] focus:border-[#00E5FF] focus:outline-none"
              />
            </div>

            {/* Tempo BPM */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555555]">TEMPO (BPM)</label>
              <input
                type="number"
                min="40"
                max="240"
                value={project.bpm}
                onChange={(e) => onUpdateBpm(Number(e.target.value))}
                className="bg-black text-white px-3 py-2 rounded border border-[#222222] focus:border-[#00FF41] focus:outline-none"
              />
            </div>

            {/* Key Signature */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555555]">KEY SIGNATURE</label>
              <select
                value={project.keySignature}
                onChange={(e) => onUpdateKeySignature(e.target.value)}
                className="bg-black text-white px-3 py-2 rounded border border-[#222222] focus:border-[#00E5FF] focus:outline-none"
              >
                <option value="C Major">C Major / A Minor</option>
                <option value="G Major">G Major / E Minor</option>
                <option value="D Major">D Major / B Minor</option>
                <option value="F Major">F Major / D Minor</option>
                <option value="Bb Major">Bb Major / G Minor</option>
              </select>
            </div>

            {/* Time Signature */}
            <div className="flex flex-col gap-1">
              <label className="text-[#555555]">TIME SIGNATURE</label>
              <div className="flex gap-2">
                <select
                  value={project.timeSignatureNumerator}
                  onChange={(e) =>
                    onUpdateTimeSignature(Number(e.target.value), project.timeSignatureDenominator)
                  }
                  className="bg-black text-white px-3 py-2 rounded border border-[#222222] focus:border-[#00E5FF] focus:outline-none flex-1"
                >
                  <option value={4}>4 Beats</option>
                  <option value={3}>3 Beats</option>
                  <option value={6}>6 Beats</option>
                </select>
                <span className="my-auto font-bold text-[#555555]">/</span>
                <select
                  value={project.timeSignatureDenominator}
                  onChange={(e) =>
                    onUpdateTimeSignature(project.timeSignatureNumerator, Number(e.target.value))
                  }
                  className="bg-black text-white px-3 py-2 rounded border border-[#222222] focus:border-[#00E5FF] focus:outline-none flex-1"
                >
                  <option value={4}>4 (Quarter)</option>
                  <option value={8}>8 (Eighth)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Local Project Persistence & File Operations */}
        <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#00FF41] uppercase flex items-center gap-2">
              <Save className="w-4 h-4" /> LOCAL PROJECT PERSISTENCE
            </h2>
            <span className="text-[10px] text-[#555555]">
              FORMAT: {DAW_PROJECT_FILE_EXTENSION.toUpperCase()} (SCHEMA V{CURRENT_PROJECT_SCHEMA_VERSION})
            </span>
          </div>

          <p className="text-xs text-[#888888]">
            Save and load fully articulated multi-track sessions including note events, arrangement, clip boundaries, velocities, and mixer states.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {/* Quick Save */}
            <button
              onClick={() => onSaveProject?.()}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00FF41] p-3 rounded flex flex-col items-center text-center gap-1 transition-all group"
            >
              <Save className="w-5 h-5 text-[#00FF41]" />
              <span className="text-xs font-bold text-white group-hover:text-[#00FF41]">SAVE PROJECT</span>
              <span className="text-[9px] text-[#555555]">Export .dawproj file</span>
            </button>

            {/* Save As */}
            <button
              onClick={() => onOpenSaveAs?.()}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00E5FF] p-3 rounded flex flex-col items-center text-center gap-1 transition-all group"
            >
              <Download className="w-5 h-5 text-[#00E5FF]" />
              <span className="text-xs font-bold text-white group-hover:text-[#00E5FF]">SAVE AS...</span>
              <span className="text-[9px] text-[#555555]">Custom filename</span>
            </button>

            {/* Open File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#D4AF37] p-3 rounded flex flex-col items-center text-center gap-1 transition-all group"
            >
              <FolderOpen className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-xs font-bold text-white group-hover:text-[#D4AF37]">OPEN FILE...</span>
              <span className="text-[9px] text-[#555555]">Load from disk</span>
            </button>

            {/* New Project */}
            <button
              onClick={() => onNewProject?.()}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-white p-3 rounded flex flex-col items-center text-center gap-1 transition-all group"
            >
              <FilePlus className="w-5 h-5 text-white" />
              <span className="text-xs font-bold text-white">NEW PROJECT</span>
              <span className="text-[9px] text-[#555555]">Fresh session</span>
            </button>
          </div>

          {lastSavedAt && (
            <div className="text-[10px] text-[#555555] font-mono pt-1">
              Last saved to file: <span className="text-[#AAAAAA]">{lastSavedAt}</span>
            </div>
          )}
        </div>

        {/* Card 3: Debian Linux Architecture Overview */}
        <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-[#00E5FF] uppercase flex items-center gap-2">
            <Terminal className="w-4 h-4" /> DEBIAN LINUX RUNTIME ENVIRONMENT
          </h2>

          <div className="bg-black p-3 rounded border border-[#222222] space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#1A1A1A] pb-1">
              <span className="text-[#555555]">OS KERNEL:</span>
              <span className="text-white font-bold">Debian Linux x86_64 / Android Termux</span>
            </div>
            <div className="flex justify-between border-b border-[#1A1A1A] pb-1">
              <span className="text-[#555555]">LOCAL PERSISTENCE:</span>
              <span className="text-[#00FF41] font-bold">Portable JSON (.dawproj) + LocalStorage Autosave</span>
            </div>
            <div className="flex justify-between border-b border-[#1A1A1A] pb-1">
              <span className="text-[#555555]">TIMING ACCURACY:</span>
              <span className="text-white font-bold">960 PPQ Resolution (Integer Ticks)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">CONFIGURED TRACKS:</span>
              <span className="text-[#D4AF37] font-bold">{project.tracks.length} Tracks Configured</span>
            </div>
          </div>
        </div>

        {/* Card 4: Standard MIDI Import & Export Subsystem */}
        <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#00E5FF] uppercase flex items-center gap-2">
              <Music className="w-4 h-4 text-[#00E5FF]" /> STANDARD MIDI FILE (SMF) ENGINE
            </h2>
            <span className="text-[10px] text-[#00FF41] bg-black border border-[#00FF41]/40 px-2 py-0.5 rounded font-bold">
              FORMAT 0 & 1 ACTIVE
            </span>
          </div>

          <p className="text-[11px] text-[#AAAAAA] leading-relaxed">
            Import existing songs and sketches or export your current edited project with full 960 PPQ timing resolution, polyphonic chords, track names, GM instrument mappings, and channel preservation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => midiFileInputRef.current?.click()}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00E5FF] p-3 rounded flex items-center gap-3 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded bg-[#161616] group-hover:bg-[#00E5FF]/20 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-[#00E5FF]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white group-hover:text-[#00E5FF]">
                  IMPORT MIDI FILE...
                </span>
                <span className="text-[9px] text-[#555555]">Open .mid / .midi</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (onExportMidi) {
                  onExportMidi();
                }
              }}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00FF41] p-3 rounded flex items-center gap-3 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded bg-[#161616] group-hover:bg-[#00FF41]/20 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4 text-[#00FF41]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white group-hover:text-[#00FF41]">
                  EXPORT MIDI FILE (.MID)
                </span>
                <span className="text-[9px] text-[#555555]">Download Type 1 multitrack</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
