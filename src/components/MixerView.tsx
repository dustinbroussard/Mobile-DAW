import React from 'react';
import { TrackData } from '../types/daw';
import { Sliders } from 'lucide-react';
import { getLEDGlowStyle, getTrackColor } from '../config/theme';

interface MixerViewProps {
  tracks: TrackData[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange: (id: string, pan: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onToggleArm: (id: string) => void;
  isPlaying: boolean;
}

export const MixerView: React.FC<MixerViewProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
  isPlaying,
}) => {
  return (
    <div className="flex flex-col flex-1 bg-black text-white font-mono overflow-hidden select-none">
      {/* Mixer Top Toolbar */}
      <div className="bg-[#121212] border-b border-[#222222] px-3 py-2 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#D4AF37] font-bold flex items-center gap-1">
            <Sliders className="w-4 h-4" /> CONSOLE MIXER
          </span>
          <span className="text-[#555555]">|</span>
          <span className="text-white font-semibold">32-BIT FLOAT ENGINE</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#555555]">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#00FF41] shadow-[0_0_6px_#00FF41]" /> SOFT LIMITER ACTIVE
          </span>
        </div>
      </div>

      {/* Channel Strips Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 flex gap-2 items-stretch">
        {/* Track Channel Strips */}
        {tracks.map((track, idx) => {
          const rawColor = getTrackColor(track.category);
          const accentColor = track.muted ? '#555555' : rawColor;
          const isSelected = track.id === selectedTrackId;
          const displayNum = String(idx + 1).padStart(2, '0');

          // Calculate volume percentage for VU meter simulation
          const vuLevel = isPlaying && !track.muted ? Math.min(100, Math.max(10, track.volume * (0.6 + Math.random() * 0.4))) : 0;

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`w-28 sm:w-32 bg-[#121212] border rounded-lg flex flex-col justify-between p-2 shrink-0 relative group cursor-pointer transition-colors ${
                isSelected ? 'border-[#00FF41] bg-[#161616]' : 'border-[#222222]'
              }`}
            >
              {/* Top Accent Bar */}
              <div
                className="h-1.5 w-full rounded-t-sm mb-2"
                style={{
                  backgroundColor: accentColor,
                  ...(isSelected && !track.muted ? getLEDGlowStyle(rawColor, 'high') : {}),
                }}
              />

              {/* Track Title */}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-bold text-[#D4AF37]">{displayNum}</span>
                <span className={`text-xs font-bold truncate max-w-full ${track.muted ? 'text-[#555555] line-through' : 'text-white'}`}>
                  {track.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] bg-black px-1 rounded border border-[#222222] text-[#888888] uppercase">
                    {track.trackType}
                  </span>
                  <span className="text-[9px] text-[#555555] uppercase truncate max-w-[60px]">
                    {track.category}
                  </span>
                </div>
              </div>

              {/* Pan Control Dial */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center my-2 bg-black p-1.5 rounded border border-[#222222]"
              >
                <span className="text-[9px] text-[#555555] mb-0.5 font-bold">PAN</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={track.pan}
                  onChange={(e) => onPanChange(track.id, Number(e.target.value))}
                  className="w-full accent-[#00E5FF] cursor-pointer h-1.5 bg-[#222222] rounded"
                />
                <span className="text-[9px] text-[#00E5FF] font-bold mt-0.5">
                  {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan)}` : `R${track.pan}`}
                </span>
              </div>

              {/* Mute / Solo / Rec Arm Touch Buttons */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="grid grid-cols-3 gap-1 my-1"
              >
                <button
                  onClick={() => onToggleMute(track.id)}
                  className={`py-1 rounded text-[10px] font-bold ${
                    track.muted
                      ? 'bg-[#555555] text-white shadow-[0_0_6px_#555555]'
                      : 'bg-black text-[#555555] border border-[#222222]'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => onToggleSolo(track.id)}
                  className={`py-1 rounded text-[10px] font-bold ${
                    track.soloed
                      ? 'bg-[#FFE600] text-black shadow-[0_0_6px_#FFE600]'
                      : 'bg-black text-[#555555] border border-[#222222]'
                  }`}
                >
                  S
                </button>
                <button
                  onClick={() => onToggleArm(track.id)}
                  className={`py-1 rounded text-[10px] font-bold ${
                    track.armed
                      ? 'bg-[#FF3B30] text-white shadow-[0_0_6px_#FF3B30] animate-pulse'
                      : 'bg-black text-[#FF3B30]/50 border border-[#222222]'
                  }`}
                >
                  R
                </button>
              </div>

              {/* Volume Fader & Vertical LED Meter */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-3 my-2 min-h-[140px] bg-black p-2 rounded border border-[#222222]"
              >
                {/* Vertical Slider */}
                <div className="h-full flex items-center justify-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => onVolumeChange(track.id, Number(e.target.value))}
                    className="h-32 accent-[#00FF41] cursor-pointer appearance-none bg-[#222222] w-2 rounded"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  />
                </div>

                {/* Vertical LED VU Meter */}
                <div className="h-32 w-3 bg-[#161616] border border-[#222222] rounded flex flex-col-reverse p-[1px] gap-[1px]">
                  {Array.from({ length: 16 }).map((_, idx2) => {
                    const threshold = (idx2 / 16) * 100;
                    const isActive = vuLevel > threshold;
                    let color = '#00FF41'; // Green
                    if (idx2 > 11) color = '#FFE600'; // Yellow
                    if (idx2 > 14) color = '#FF3B30'; // Red

                    return (
                      <div
                        key={idx2}
                        className="flex-1 rounded-xs transition-opacity"
                        style={{
                          backgroundColor: isActive ? color : '#222222',
                          boxShadow: isActive ? `0 0 4px ${color}` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Fader dB Readout */}
              <div className="text-center font-bold text-xs text-[#00FF41] bg-black py-1 rounded border border-[#222222]">
                {track.volume === 0 ? '-INF' : `${((track.volume - 80) / 80 * 12).toFixed(1)} dB`}
              </div>
            </div>
          );
        })}

        {/* Master Output Channel Strip */}
        <div className="w-32 sm:w-36 bg-[#161616] border-2 border-[#D4AF37] rounded-lg flex flex-col justify-between p-2 shrink-0 relative shadow-[0_0_12px_rgba(212,175,55,0.2)]">
          <div className="h-2 w-full rounded-t-sm mb-2 bg-[#D4AF37]" />

          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-bold text-[#D4AF37] uppercase">MASTER BUS</span>
            <span className="text-[9px] text-white">STEREO OUT</span>
          </div>

          <div className="my-2 bg-black p-2 rounded border border-[#222222] text-center">
            <span className="text-[9px] text-[#D4AF37] font-bold">STEREO WIDTH</span>
            <span className="text-xs text-white block font-bold">100%</span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-3 my-2 min-h-[140px] bg-black p-2 rounded border border-[#222222]">
            <input
              type="range"
              min="0"
              max="100"
              defaultValue={85}
              className="h-32 accent-[#D4AF37] cursor-pointer appearance-none bg-[#222222] w-2 rounded"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />

            {/* Master Stereo VU Meters (L & R) */}
            <div className="flex gap-1 h-32">
              <div className="w-2.5 bg-[#161616] border border-[#222222] rounded flex flex-col-reverse p-[1px] gap-[1px]">
                {Array.from({ length: 16 }).map((_, idx2) => {
                  const masterLevel = isPlaying ? Math.min(100, Math.max(10, 80 * (0.7 + Math.random() * 0.3))) : 0;
                  const isActive = masterLevel > (idx2 / 16) * 100;
                  let color = '#00FF41';
                  if (idx2 > 11) color = '#FFE600';
                  if (idx2 > 14) color = '#FF3B30';
                  return (
                    <div
                      key={idx2}
                      className="flex-1 rounded-xs"
                      style={{ backgroundColor: isActive ? color : '#222222' }}
                    />
                  );
                })}
              </div>

              <div className="w-2.5 bg-[#161616] border border-[#222222] rounded flex flex-col-reverse p-[1px] gap-[1px]">
                {Array.from({ length: 16 }).map((_, idx2) => {
                  const masterLevel = isPlaying ? Math.min(100, Math.max(10, 78 * (0.7 + Math.random() * 0.3))) : 0;
                  const isActive = masterLevel > (idx2 / 16) * 100;
                  let color = '#00FF41';
                  if (idx2 > 11) color = '#FFE600';
                  if (idx2 > 14) color = '#FF3B30';
                  return (
                    <div
                      key={idx2}
                      className="flex-1 rounded-xs"
                      style={{ backgroundColor: isActive ? color : '#222222' }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-center font-bold text-xs text-[#D4AF37] bg-black py-1 rounded border border-[#D4AF37]">
            0.0 dB (OUT)
          </div>
        </div>
      </div>
    </div>
  );
};
