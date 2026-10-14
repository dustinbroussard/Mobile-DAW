import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Grid, Plus, Layers, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { TrackData, TransportState, SectionMarker } from '../types/daw';
import { Track } from './Track';

interface TrackListProps {
  tracks: TrackData[];
  selectedTrackId: string | null;
  transport: TransportState;
  sectionMarkers: SectionMarker[];
  setTransport: React.Dispatch<React.SetStateAction<TransportState>>;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onToggleArm: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange: (id: string, pan: number) => void;
  onSelectTrack: (id: string) => void;
  onReorderTrack?: (id: string, direction: 'up' | 'down') => void;
  onDeleteTrack?: (id: string) => void;
  onAddTrack?: () => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  selectedTrackId,
  transport,
  sectionMarkers,
  setTransport,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
  onVolumeChange,
  onPanChange,
  onSelectTrack,
  onReorderTrack,
  onDeleteTrack,
  onAddTrack,
}) => {
  const [totalBars] = useState(24);
  const [barWidthPx, setBarWidthPx] = useState(64); // default 64px per bar
  const [snapGrid, setSnapGrid] = useState('1/1');
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>();

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Calculate current playhead position in pixels from bar 1
  const playheadPosPx =
    ((transport.currentBar - 1) +
      (transport.currentBeat - 1) / transport.timeSignatureNumerator +
      transport.currentTick / (transport.timeSignatureNumerator * 240)) *
    barWidthPx;

  // Jump playhead on click on ruler
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedBarFloat = clickX / barWidthPx + 1;
    const clickedBar = Math.max(1, Math.min(totalBars, Math.floor(clickedBarFloat)));
    const remainingFraction = clickedBarFloat - Math.floor(clickedBarFloat);
    const clickedBeat = Math.max(1, Math.min(transport.timeSignatureNumerator, Math.floor(remainingFraction * transport.timeSignatureNumerator) + 1));

    setTransport((prev) => ({
      ...prev,
      currentBar: clickedBar,
      currentBeat: clickedBeat,
      currentTick: 0,
    }));
  };

  const zoomIn = () => setBarWidthPx((prev) => Math.min(120, prev + 12));
  const zoomOut = () => setBarWidthPx((prev) => Math.max(36, prev - 12));

  return (
    <div className="flex flex-col flex-1 bg-black overflow-hidden select-none relative">
      {/* Timeline Controls & Settings Toolbar */}
      <div className="bg-[#121212] border-b border-[#222222] px-3 py-1.5 flex items-center justify-between text-xs font-mono shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-[#D4AF37] font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> MULTITRACK
          </span>
          <span className="text-[#555555]">|</span>
          <span className="text-white font-semibold">{tracks.length} TRACKS</span>

          {/* Quick Track Reorder & Delete Toolbar for Selected Track */}
          {selectedTrackId && onReorderTrack && onDeleteTrack && (
            <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-[#222222]">
              <span className="text-[10px] text-[#555555]">ARRANGE:</span>
              <button
                onClick={() => onReorderTrack(selectedTrackId, 'up')}
                className="w-5 h-5 rounded bg-[#161616] hover:bg-[#222222] border border-[#222222] flex items-center justify-center text-white"
                title="Move Track Up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => onReorderTrack(selectedTrackId, 'down')}
                className="w-5 h-5 rounded bg-[#161616] hover:bg-[#222222] border border-[#222222] flex items-center justify-center text-white"
                title="Move Track Down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              {tracks.length > 1 && (
                <button
                  onClick={() => onDeleteTrack(selectedTrackId)}
                  className="w-5 h-5 rounded bg-[#161616] hover:bg-[#221212] border border-[#222222] hover:border-[#FF3B30] flex items-center justify-center text-[#FF3B30]"
                  title="Delete Selected Track"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Snap & Zoom Bar */}
        <div className="flex items-center gap-2">
          {/* Snap Grid Dropdown */}
          <div className="flex items-center gap-1 bg-black border border-[#222222] px-2 py-0.5 rounded text-[10px]">
            <Grid className="w-3 h-3 text-[#00E5FF]" />
            <span className="text-[#555555]">SNAP:</span>
            <select
              value={snapGrid}
              onChange={(e) => setSnapGrid(e.target.value)}
              className="bg-transparent text-[#00E5FF] font-bold focus:outline-none cursor-pointer"
            >
              <option value="1/1" className="bg-[#121212]">BAR (1/1)</option>
              <option value="1/4" className="bg-[#121212]">BEAT (1/4)</option>
              <option value="1/8" className="bg-[#121212]">8TH (1/8)</option>
              <option value="1/16" className="bg-[#121212]">16TH (1/16)</option>
              <option value="OFF" className="bg-[#121212]">OFF</option>
            </select>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-black border border-[#222222] p-0.5 rounded">
            <button
              onClick={zoomOut}
              disabled={barWidthPx <= 36}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-40 flex items-center justify-center text-white"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomIn}
              disabled={barWidthPx >= 120}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-40 flex items-center justify-center text-white"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Track Button */}
          {onAddTrack && (
            <button
              onClick={onAddTrack}
              className="px-2 py-1 bg-[#161616] hover:bg-[#222222] border border-[#222222] hover:border-[#00FF41] text-[#00FF41] rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> ADD TRACK
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Track Area */}
      <div className="flex-1 overflow-auto flex relative" ref={timelineContainerRef}>
        {/* Track Headers Column (Sticky Left) */}
        <div className="w-[200px] sm:w-[240px] shrink-0 sticky left-0 z-30 bg-[#121212] border-r border-[#222222]">
          {/* Header Corner Box */}
          <div className="h-9 bg-[#121212] border-b border-[#222222] px-3 flex items-center justify-between text-[10px] font-mono text-[#555555]">
            <span>INSTRUMENT</span>
            <span>M S REC</span>
          </div>

          {/* Track Headers */}
          {tracks.map((track, idx) => (
            <Track
              key={track.id}
              track={track}
              displayIndex={idx + 1}
              isSelected={track.id === selectedTrackId}
              totalBars={totalBars}
              barWidthPx={barWidthPx}
              currentBar={transport.currentBar}
              onToggleMute={onToggleMute}
              onToggleSolo={onToggleSolo}
              onToggleArm={onToggleArm}
              onVolumeChange={onVolumeChange}
              onPanChange={onPanChange}
              onSelectTrack={onSelectTrack}
              isHeaderOnly
            />
          ))}
        </div>

        {/* Timeline Timeline Column */}
        <div className="relative min-h-full flex-1 bg-black" style={{ width: `${totalBars * barWidthPx}px` }}>
          {/* Measure Ruler Top Bar */}
          <div
            onClick={handleRulerClick}
            className="h-9 bg-[#121212] border-b border-[#222222] sticky top-0 z-20 cursor-pointer select-none flex relative"
            style={{ width: `${totalBars * barWidthPx}px` }}
          >
            {/* Render Section Markers (Gold #D4AF37) */}
            {sectionMarkers.map((marker) => {
              const leftPx = (marker.bar - 1) * barWidthPx;
              return (
                <div
                  key={marker.id}
                  className="absolute top-0 bottom-0 px-1.5 py-0.5 bg-[#D4AF37]/20 border-l-2 border-[#D4AF37] text-[#D4AF37] font-mono font-bold text-[9px] flex items-center gap-1 z-10"
                  style={{ left: `${leftPx}px` }}
                >
                  <span>[{marker.label}]</span>
                </div>
              );
            })}

            {/* Render Bar Numbers */}
            {Array.from({ length: totalBars }).map((_, i) => (
              <div
                key={i}
                className="h-full border-r border-[#222222] font-mono text-[10px] text-[#555555] px-1 flex flex-col justify-end pb-0.5"
                style={{ width: `${barWidthPx}px` }}
              >
                <span>Bar {i + 1}</span>
              </div>
            ))}
          </div>

          {/* Render Tracks Timeline Rows */}
          <div className="relative">
            {/* Vertical Playhead Cursor Bar */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[#00FF41] z-20 pointer-events-none transition-all"
              style={{
                left: `${playheadPosPx}px`,
                boxShadow: '0 0 10px #00FF41, 0 0 20px #00FF41',
              }}
            >
              <div className="w-3 h-3 bg-[#00FF41] rotate-45 -ml-[5px] -mt-1 shadow-[0_0_8px_#00FF41]" />
            </div>

            {tracks.map((track, idx) => (
              <Track
                key={track.id}
                track={track}
                displayIndex={idx + 1}
                isSelected={track.id === selectedTrackId}
                totalBars={totalBars}
                barWidthPx={barWidthPx}
                currentBar={transport.currentBar}
                onToggleMute={onToggleMute}
                onToggleSolo={onToggleSolo}
                onToggleArm={onToggleArm}
                onVolumeChange={onVolumeChange}
                onPanChange={onPanChange}
                onSelectTrack={onSelectTrack}
                onSelectRegion={(_tId, rId) => setSelectedRegionId(rId)}
                selectedRegionId={selectedRegionId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
