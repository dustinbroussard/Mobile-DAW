import React from 'react';
import { Volume2, Sliders } from 'lucide-react';
import { TrackData } from '../types/daw';
import { getTrackColor } from '../config/theme';

interface TrackControlsProps {
  track: TrackData;
  displayIndex: number;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange: (id: string, pan: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onToggleArm: (id: string) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  track,
  displayIndex,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
}) => {
  const rawColor = getTrackColor(track.category);
  const accentColor = track.muted ? '#555555' : rawColor;
  const formattedNumber = String(displayIndex).padStart(2, '0');

  return (
    <div className="bg-[#121212] border-b border-[#222222] p-3 text-white flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: accentColor }}>
            [{formattedNumber}]
          </span>
          <span className="text-sm font-bold text-white">{track.name}</span>
          <span className="text-[10px] bg-black px-1.5 py-0.5 rounded border border-[#222222] text-[#888888] uppercase">
            {track.trackType}
          </span>
          <span className="text-[10px] bg-black px-1.5 py-0.5 rounded border border-[#222222] text-[#555555] uppercase">
            {track.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleMute(track.id)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              track.muted
                ? 'bg-[#555555] text-white shadow-[0_0_8px_#555555]'
                : 'bg-black text-[#555555] border border-[#222222]'
            }`}
          >
            MUTE
          </button>
          <button
            onClick={() => onToggleSolo(track.id)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              track.soloed
                ? 'bg-[#FFE600] text-black shadow-[0_0_8px_#FFE600]'
                : 'bg-black text-[#555555] border border-[#222222]'
            }`}
          >
            SOLO
          </button>
          <button
            onClick={() => onToggleArm(track.id)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              track.armed
                ? 'bg-[#FF3B30] text-white shadow-[0_0_8px_#FF3B30] animate-pulse'
                : 'bg-black text-[#FF3B30]/50 border border-[#222222]'
            }`}
          >
            REC ARM
          </button>
        </div>
      </div>

      {/* Touch Sliders & Dials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black p-3 rounded border border-[#222222]">
        {/* Volume Fader */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555555] flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-[#00FF41]" /> VOLUME
            </span>
            <span className="font-bold text-[#00FF41]">{track.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, Number(e.target.value))}
            className="w-full accent-[#00FF41] cursor-pointer h-2 bg-[#222222] rounded"
          />
        </div>

        {/* Pan Dial */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#555555] flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" /> PANORAMA
            </span>
            <span className="font-bold text-[#00E5FF]">
              {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan)}` : `R${track.pan}`}
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={track.pan}
            onChange={(e) => onPanChange(track.id, Number(e.target.value))}
            className="w-full accent-[#00E5FF] cursor-pointer h-2 bg-[#222222] rounded"
          />
        </div>
      </div>

      {/* Audio / MIDI Metadata */}
      <div className="flex items-center justify-between text-[10px] text-[#555555] border-t border-[#1A1A1A] pt-2">
        <span>{track.trackType === 'midi' ? 'SYNTH ENGINE: FLUIDSYNTH SF2' : 'AUDIO ENGINE: LOW-LATENCY ALSA'}</span>
        <span>CHANNEL {displayIndex}</span>
        <span>LATENCY: 4.2ms</span>
      </div>
    </div>
  );
};
