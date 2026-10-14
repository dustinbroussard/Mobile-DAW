import React, { useState } from 'react';
import { TrackData } from '../types/daw';
import { TrackHeader } from './TrackHeader';
import { TrackTimeline } from './TrackTimeline';
import { TrackControls } from './TrackControls';

interface TrackProps {
  track: TrackData;
  displayIndex: number;
  isSelected: boolean;
  totalBars: number;
  barWidthPx: number;
  currentBar: number;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onToggleArm: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange: (id: string, pan: number) => void;
  onSelectTrack: (id: string) => void;
  onSelectRegion?: (trackId: string, regionId: string) => void;
  selectedRegionId?: string;
  isHeaderOnly?: boolean;
}

export const Track: React.FC<TrackProps> = ({
  track,
  displayIndex,
  isSelected,
  totalBars,
  barWidthPx,
  currentBar,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
  onVolumeChange,
  onPanChange,
  onSelectTrack,
  onSelectRegion,
  selectedRegionId,
  isHeaderOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col border-b border-[#222222]">
      <div className="flex items-center">
        {/* Track Header Controls */}
        <div className="w-[200px] sm:w-[240px] shrink-0 z-10 sticky left-0 shadow-[2px_0_10px_rgba(0,0,0,0.8)]">
          <TrackHeader
            track={track}
            displayIndex={displayIndex}
            isSelected={isSelected}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
            onToggleArm={onToggleArm}
            onVolumeChange={onVolumeChange}
            onSelectTrack={onSelectTrack}
            onToggleExpandInspector={() => setIsExpanded(!isExpanded)}
            isExpanded={isExpanded}
          />
        </div>

        {/* Track Timeline Clips */}
        {!isHeaderOnly && (
          <div className="flex-1 overflow-hidden">
            <TrackTimeline
              track={track}
              totalBars={totalBars}
              barWidthPx={barWidthPx}
              currentBar={currentBar}
              onSelectRegion={onSelectRegion}
              selectedRegionId={selectedRegionId}
            />
          </div>
        )}
      </div>

      {/* Expanded Channel Inspector */}
      {isExpanded && (
        <TrackControls
          track={track}
          displayIndex={displayIndex}
          onVolumeChange={onVolumeChange}
          onPanChange={onPanChange}
          onToggleMute={onToggleMute}
          onToggleSolo={onToggleSolo}
          onToggleArm={onToggleArm}
        />
      )}
    </div>
  );
};
