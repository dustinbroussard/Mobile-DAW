import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TrackData } from '../types/daw';
import { getTrackColor, getLEDGlowStyle } from '../config/theme';

interface TrackHeaderProps {
  track: TrackData;
  displayIndex: number;
  isSelected: boolean;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onToggleArm: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onSelectTrack: (id: string) => void;
  onToggleExpandInspector?: (id: string) => void;
  isExpanded?: boolean;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  displayIndex,
  isSelected,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
  onVolumeChange,
  onSelectTrack,
  onToggleExpandInspector,
  isExpanded,
}) => {
  // Convert 0-100 volume scale to dB readout
  const getVolumeDb = (vol: number) => {
    if (vol === 0) return '-INF';
    const db = ((vol - 80) / 80) * 12; // 80 is 0dB, 100 is +3dB
    return db > 0 ? `+${db.toFixed(1)}dB` : `${db.toFixed(1)}dB`;
  };

  const rawColor = getTrackColor(track.category);
  const accentColor = track.muted ? '#555555' : rawColor;
  const formattedNumber = String(displayIndex).padStart(2, '0');

  return (
    <div
      onClick={() => onSelectTrack(track.id)}
      className={`relative flex items-center h-16 bg-[#121212] border-b border-[#222222] transition-colors select-none group cursor-pointer ${
        isSelected ? 'bg-[#161616]' : 'hover:bg-[#141414]'
      }`}
    >
      {/* Colored Left-Edge Accent Indicator Bar */}
      <div
        className="w-1.5 h-full transition-all shrink-0"
        style={{
          backgroundColor: accentColor,
          ...(isSelected && !track.muted ? getLEDGlowStyle(rawColor, 'high') : {}),
        }}
      />

      <div className="flex items-center justify-between w-full px-2 gap-1.5 min-w-0">
        {/* Track Number & Instrument Name */}
        <div className="flex items-center gap-2 min-w-0 max-w-[140px] shrink-0">
          <span
            className="font-mono text-xs font-bold shrink-0"
            style={{ color: accentColor }}
          >
            {formattedNumber}
          </span>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold truncate ${track.muted ? 'text-[#555555] line-through' : 'text-white'}`}>
                {track.name}
              </span>
              <span className="text-[8px] font-mono px-1 rounded bg-black/60 border border-[#222222] text-[#888888] uppercase shrink-0">
                {track.trackType}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#555555] uppercase truncate">
              {track.category}
            </span>
          </div>
        </div>

        {/* Quick Touch Controls: M, S, REC (Minimum touch target compliant) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* MUTE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute(track.id);
            }}
            className={`w-7 h-7 rounded font-mono text-[10px] font-bold transition-all ${
              track.muted
                ? 'bg-[#555555] text-white border border-[#555555] shadow-[0_0_6px_#555555]'
                : 'bg-black text-[#555555] border border-[#222222] hover:text-white'
            }`}
            title="Mute Track"
          >
            M
          </button>

          {/* SOLO */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo(track.id);
            }}
            className={`w-7 h-7 rounded font-mono text-[10px] font-bold transition-all ${
              track.soloed
                ? 'bg-[#FFE600] text-black border border-[#FFE600] shadow-[0_0_8px_#FFE600]'
                : 'bg-black text-[#555555] border border-[#222222] hover:text-white'
            }`}
            title="Solo Track"
          >
            S
          </button>

          {/* REC ARM */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleArm(track.id);
            }}
            className={`w-7 h-7 rounded font-mono text-[9px] font-bold transition-all ${
              track.armed
                ? 'bg-[#FF3B30] text-white border border-[#FF3B30] shadow-[0_0_8px_#FF3B30] animate-pulse'
                : 'bg-black text-[#FF3B30]/50 border border-[#222222] hover:text-[#FF3B30]'
            }`}
            title="Arm for Recording"
          >
            REC
          </button>
        </div>

        {/* Volume Fader & dB Readout */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-black/60 border border-[#222222] px-2 py-1 rounded">
          <input
            type="range"
            min="0"
            max="100"
            value={track.volume}
            onChange={(e) => {
              e.stopPropagation();
              onVolumeChange(track.id, Number(e.target.value));
            }}
            className="w-16 accent-[#00FF41] cursor-pointer h-1.5 bg-[#222222] rounded-lg"
          />
          <span className="text-[10px] font-mono text-[#D4AF37] min-w-[36px] text-right font-semibold">
            {getVolumeDb(track.volume)}
          </span>
        </div>

        {/* Track Detail / Inspector Expander */}
        {onToggleExpandInspector && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpandInspector(track.id);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-transform ${
              isExpanded ? 'rotate-90 text-[#00E5FF]' : 'text-[#555555] hover:text-white'
            }`}
            title="Toggle Track Inspector"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
