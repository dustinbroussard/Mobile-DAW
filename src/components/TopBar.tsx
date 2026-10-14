import React, { useState } from 'react';
import { Play, Pause, Square, Circle, RotateCcw, Settings, Music, Disc } from 'lucide-react';
import {
  ProjectState,
  ViewMode,
  formatBarBeatTick,
  calculatePlaybackSeconds,
  formatTimecode,
} from '../types/daw';

interface TopBarProps {
  project: ProjectState;
  onUpdateProjectName: (name: string) => void;
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onStopTransport: () => void;
  onReturnToZero: () => void;
  onToggleMetronome: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenProjectMenu: () => void;
  orientation: 'portrait' | 'landscape';
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  onUpdateProjectName,
  onTogglePlay,
  onToggleRecord,
  onStopTransport,
  onReturnToZero,
  onToggleMetronome,
  onOpenProjectMenu,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);

  const { transport, bpm, timeSignatureNumerator, name } = project;

  // Format position & timecode via consolidated DAW timing utilities
  const formattedPosition = formatBarBeatTick(
    transport.currentBar,
    transport.currentBeat,
    transport.currentTick
  );

  const elapsedSeconds = calculatePlaybackSeconds(
    transport.currentBar,
    transport.currentBeat,
    transport.currentTick,
    bpm,
    timeSignatureNumerator
  );
  const formattedTimecode = formatTimecode(elapsedSeconds);

  return (
    <header className="bg-[#121212] border-b border-[#222222] text-white px-2 py-1.5 flex items-center justify-between select-none min-h-[48px] z-30">
      {/* Left: Project Branding & Name */}
      <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[280px]">
        <div className="w-7 h-7 rounded bg-black border border-[#222222] flex items-center justify-center shrink-0">
          <Disc
            className="w-4 h-4 text-[#00FF41] animate-spin"
            style={{ animationDuration: transport.isPlaying ? '3s' : '0s' }}
          />
        </div>

        <div className="flex flex-col min-w-0">
          {isEditingName ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onUpdateProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              autoFocus
              className="bg-black text-white px-1.5 py-0.5 text-xs font-mono rounded border border-[#222222] focus:outline-none focus:border-[#00E5FF] w-full"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs font-semibold text-left truncate hover:text-[#00E5FF] transition-colors"
              title="Click to rename project"
            >
              {name}
            </button>
          )}
          <span className="text-[10px] text-[#555555] font-mono leading-none">
            DEBIAN AUDIO ENGINE
          </span>
        </div>
      </div>

      {/* Center: Main Time/Tempo Readout & Compact Transport */}
      <div className="flex items-center gap-2">
        {/* Time LCD Box */}
        <div className="bg-black border border-[#222222] px-2 py-1 rounded flex items-center gap-2 font-mono text-center">
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-[#D4AF37] leading-none uppercase font-bold tracking-wider">
              POS
            </span>
            <span className="text-xs font-bold text-[#00FF41] tracking-widest">
              {formattedPosition}
            </span>
          </div>

          <div className="h-5 w-[1px] bg-[#222222]" />

          <div className="flex flex-col items-start hidden xs:flex">
            <span className="text-[9px] text-[#555555] leading-none uppercase font-bold">
              TIME
            </span>
            <span className="text-xs text-white">{formattedTimecode}</span>
          </div>

          <div className="h-5 w-[1px] bg-[#222222] hidden xs:block" />

          {/* Tempo Display */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[#D4AF37] leading-none uppercase font-bold">
              BPM
            </span>
            <span className="text-xs font-bold text-white">{bpm}</span>
          </div>
        </div>

        {/* Compact Bar Transport Controls for Quick Action */}
        <div className="flex items-center gap-1 bg-black border border-[#222222] p-1 rounded">
          <button
            onClick={onReturnToZero}
            className="w-8 h-8 rounded bg-[#161616] hover:bg-[#222222] flex items-center justify-center text-[#555555] hover:text-white transition-colors"
            title="Return to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
              transport.isPlaying
                ? 'bg-[#00FF41] text-black shadow-[0_0_12px_#00FF41]'
                : 'bg-[#161616] text-white hover:bg-[#222222]'
            }`}
            title={transport.isPlaying ? 'Pause' : 'Play'}
          >
            {transport.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onStopTransport}
            className="w-8 h-8 rounded bg-[#161616] hover:bg-[#222222] flex items-center justify-center text-white transition-colors"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={onToggleRecord}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
              transport.isRecording
                ? 'bg-[#FF3B30] text-white shadow-[0_0_12px_#FF3B30] animate-pulse'
                : 'bg-[#161616] text-[#FF3B30] hover:bg-[#222222]'
            }`}
            title="Record Arm/Trigger"
          >
            <Circle className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Right: Metronome & Project Menu */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleMetronome}
          className={`px-2 py-1.5 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
            transport.metronomeOn
              ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              : 'border-[#222222] text-[#555555] bg-black hover:text-white'
          }`}
          title="Toggle Metronome"
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden md:inline">CLICK</span>
        </button>

        <button
          onClick={onOpenProjectMenu}
          className="w-8 h-8 rounded bg-black border border-[#222222] hover:border-[#555555] flex items-center justify-center text-white transition-colors"
          title="Project Settings & Menu"
        >
          <Settings className="w-4 h-4 text-[#D4AF37]" />
        </button>
      </div>
    </header>
  );
};
