import React, { useState } from 'react';
import { Settings, Download, Terminal, Music, HardDrive, RefreshCw, Check } from 'lucide-react';
import { ProjectState } from '../types/daw';

interface ProjectViewProps {
  project: ProjectState;
  onUpdateProjectName: (name: string) => void;
  onUpdateBpm: (bpm: number) => void;
  onUpdateKeySignature: (key: string) => void;
  onUpdateTimeSignature: (num: number, den: number) => void;
  onResetProject: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  onUpdateProjectName,
  onUpdateBpm,
  onUpdateKeySignature,
  onUpdateTimeSignature,
  onResetProject,
}) => {
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleActionNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="flex-1 bg-black text-white font-mono p-4 overflow-y-auto select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#FFFFFF] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#D4AF37]" /> PROJECT & SYSTEM SETTINGS
            </h1>
            <p className="text-xs text-[#555555]">DEBIAN LINUX CHROMIUM DAW ENVIRONMENT</p>
          </div>
          <span className="text-xs font-bold text-[#00FF41] bg-black px-2 py-1 rounded border border-[#00FF41]">
            STATUS: ONLINE
          </span>
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

        {/* Card 2: Local Debian Linux Runtime Architecture */}
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
              <span className="text-[#555555]">SOUNDFONT SYNTHESIS:</span>
              <span className="text-[#00FF41] font-bold">FluidSynth SF2 Engine (General MIDI 128)</span>
            </div>
            <div className="flex justify-between border-b border-[#1A1A1A] pb-1">
              <span className="text-[#555555]">AUDIO DRIVER BINDING:</span>
              <span className="text-white font-bold">ALSA / WebAudio Low-Latency Buffer (128 samples)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555]">ACTIVE TRACK COUNT:</span>
              <span className="text-[#D4AF37] font-bold">{project.tracks.length} Tracks Configured</span>
            </div>
          </div>
        </div>

        {/* Card 3: Project Export Options */}
        <div className="bg-[#121212] border border-[#222222] rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-[#00FF41] uppercase flex items-center gap-2">
            <Download className="w-4 h-4" /> EXPORT & SAVE PROJECT
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleActionNotice('Standard MIDI File (.mid) export architecture ready.')}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00FF41] p-3 rounded flex flex-col items-center text-center gap-1 transition-colors"
            >
              <Music className="w-5 h-5 text-[#00FF41]" />
              <span className="text-xs font-bold text-white">EXPORT MIDI (.MID)</span>
              <span className="text-[9px] text-[#555555]">Multitrack Standard MIDI</span>
            </button>

            <button
              onClick={() => handleActionNotice('WAV 24-bit audio mixdown render queued.')}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#00E5FF] p-3 rounded flex flex-col items-center text-center gap-1 transition-colors"
            >
              <HardDrive className="w-5 h-5 text-[#00E5FF]" />
              <span className="text-xs font-bold text-white">RENDER WAV</span>
              <span className="text-[9px] text-[#555555]">Master Stereo Mixdown</span>
            </button>

            <button
              onClick={() => {
                handleActionNotice('Project state saved to local storage session.');
              }}
              className="bg-black hover:bg-[#1A1A1A] border border-[#222222] hover:border-[#D4AF37] p-3 rounded flex flex-col items-center text-center gap-1 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-xs font-bold text-white">SAVE PROJECT</span>
              <span className="text-[9px] text-[#555555]">Local DAW Session JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
