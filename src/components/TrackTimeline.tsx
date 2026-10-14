import React from 'react';
import { TrackData, ClipRegion } from '../types/daw';
import { DAW_THEME, getTrackColor } from '../config/theme';

interface TrackTimelineProps {
  track: TrackData;
  totalBars: number;
  barWidthPx: number; // e.g. 60px per bar
  currentBar: number;
  onSelectRegion?: (trackId: string, regionId: string) => void;
  selectedRegionId?: string;
}

export const TrackTimeline: React.FC<TrackTimelineProps> = ({
  track,
  totalBars,
  barWidthPx,
  currentBar: _currentBar,
  onSelectRegion,
  selectedRegionId,
}) => {
  const rawColor = getTrackColor(track.category);
  const accentColor = track.muted ? DAW_THEME.mutedState : rawColor;

  // Render dummy waveform or note dot patterns inside region
  const renderClipContent = (region: ClipRegion) => {
    if (region.type === 'midi') {
      return (
        <div className="w-full h-full p-1 flex flex-col justify-between overflow-hidden opacity-80">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold truncate">
            <span className="truncate">{region.name}</span>
            <span className="text-[8px] opacity-70 ml-1 font-normal">MIDI</span>
          </div>
          <div className="grid grid-cols-8 gap-0.5 h-3 items-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  opacity: i % 3 === 0 ? 0.9 : 0.4,
                  height: `${(i % 4 + 1) * 20}%`,
                }}
              />
            ))}
          </div>
        </div>
      );
    } else {
      // Audio waveform simulation
      return (
        <div className="w-full h-full p-1 flex flex-col justify-between overflow-hidden opacity-80">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold truncate">
            <span className="truncate">{region.name}</span>
            <span className="text-[8px] opacity-70 ml-1 font-normal">AUDIO</span>
          </div>
          <div className="flex items-center gap-[2px] h-3 w-full overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-sm"
                style={{
                  backgroundColor: accentColor,
                  height: `${Math.max(15, Math.sin(i * 0.8) * 45 + 50)}%`,
                }}
              />
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div
      className="relative h-16 bg-black/80 border-b border-[#222222] overflow-hidden select-none"
      style={{ width: `${totalBars * barWidthPx}px` }}
    >
      {/* Bar Measure Grid Lines */}
      {Array.from({ length: totalBars }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-r border-[#1A1A1A]"
          style={{ left: `${(i + 1) * barWidthPx}px` }}
        >
          {/* Subtle 1/4 beat subdiv lines */}
          <div className="w-full h-full flex justify-between">
            <div className="border-r border-[#141414] h-full w-1/4" />
            <div className="border-r border-[#141414] h-full w-1/4" />
            <div className="border-r border-[#141414] h-full w-1/4" />
          </div>
        </div>
      ))}

      {/* Clip Regions */}
      {track.regions.map((region) => {
        const leftPx = (region.startBar - 1) * barWidthPx;
        const widthPx = region.lengthBars * barWidthPx;
        const isSelected = selectedRegionId === region.id;

        return (
          <div
            key={region.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRegion?.(track.id, region.id);
            }}
            className={`absolute top-1 bottom-1 rounded border cursor-pointer transition-all ${
              track.muted
                ? 'bg-[#1A1A1A] border-[#333333] text-[#555555]'
                : 'bg-[#161616]'
            }`}
            style={{
              left: `${leftPx}px`,
              width: `${widthPx}px`,
              borderColor: track.muted ? '#333333' : accentColor,
              backgroundColor: track.muted ? '#121212' : `${accentColor}1A`, // 10% opacity background fill
              boxShadow: isSelected ? `0 0 10px ${accentColor}` : 'none',
              color: track.muted ? '#555555' : accentColor,
            }}
          >
            {/* Top Region Accent Header Strip */}
            <div
              className="h-1 w-full rounded-t-sm"
              style={{ backgroundColor: accentColor }}
            />
            {renderClipContent(region)}
          </div>
        );
      })}
    </div>
  );
};
