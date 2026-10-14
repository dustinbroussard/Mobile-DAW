import React from 'react';
import { TrackData } from '../types/daw';
import { TrackHeader } from './TrackHeader';
import { TrackTimeline } from './TrackTimeline';

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
  onPanChange?: (id: string, pan: number) => void;
  onSelectTrack: (id: string) => void;
  onSelectRegion?: (trackId: string, regionId: string) => void;
  selectedRegionId?: string;
  renderMode?: 'header' | 'timeline';
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
  onSelectTrack,
  onSelectRegion,
  selectedRegionId,
  renderMode = 'timeline',
}) => {
  if (renderMode === 'header') {
    return (
      <TrackHeader
        track={track}
        displayIndex={displayIndex}
        isSelected={isSelected}
        onToggleMute={onToggleMute}
        onToggleSolo={onToggleSolo}
        onToggleArm={onToggleArm}
        onVolumeChange={onVolumeChange}
        onSelectTrack={onSelectTrack}
      />
    );
  }

  return (
    <TrackTimeline
      track={track}
      totalBars={totalBars}
      barWidthPx={barWidthPx}
      currentBar={currentBar}
      onSelectRegion={onSelectRegion}
      selectedRegionId={selectedRegionId}
    />
  );
};
