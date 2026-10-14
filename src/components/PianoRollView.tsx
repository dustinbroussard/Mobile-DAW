import React, { useState } from 'react';
import { TrackData } from '../types/daw';
import { PenTool, Eraser, MousePointer, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTrackColor } from '../config/theme';

interface PianoRollViewProps {
  tracks: TrackData[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
}

const NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const OCTAVES = [4, 3, 2];

export const PianoRollView: React.FC<PianoRollViewProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
}) => {
  const [activeTool, setActiveTool] = useState<'draw' | 'select' | 'erase'>('draw');
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [activeNotePressed, setActiveNotePressed] = useState<string | null>(null);

  // Default notes grid data (16 steps per bar, 2 bars = 32 steps)
  const stepsCount = 32;

  const currentTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];
  const accentColor = currentTrack ? getTrackColor(currentTrack.category) : '#00FF41';

  // Sample placed MIDI notes pattern for selected track
  const [placedNotes, setPlacedNotes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Pre-populate mock MIDI pattern
    initial.add('C3-1');
    initial.add('E3-1');
    initial.add('G3-1');
    initial.add('C3-5');
    initial.add('F3-5');
    initial.add('A3-5');
    initial.add('G3-9');
    initial.add('B3-9');
    initial.add('D4-9');
    return initial;
  });

  const handleCellClick = (noteKey: string, step: number) => {
    const key = `${noteKey}-${step}`;
    setPlacedNotes((prev) => {
      const next = new Set(prev);
      if (activeTool === 'erase') {
        next.delete(key);
      } else {
        if (next.has(key)) {
          if (activeTool === 'select') next.delete(key);
        } else {
          next.add(key);
        }
      }
      return next;
    });
  };

  // Generate note keys list based on octave offset
  const allNoteKeys: string[] = [];
  OCTAVES.forEach((oct) => {
    const currentOct = oct + octaveOffset;
    NOTES.forEach((n) => {
      allNoteKeys.push(`${n}${currentOct}`);
    });
  });

  return (
    <div className="flex flex-col flex-1 bg-black text-white font-mono overflow-hidden select-none">
      {/* Top Piano Roll Toolbar */}
      <div className="bg-[#121212] border-b border-[#222222] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        {/* Track Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#D4AF37] font-bold">PIANO ROLL:</span>
          <select
            value={currentTrack?.id || ''}
            onChange={(e) => onSelectTrack(e.target.value)}
            className="bg-black text-white font-bold text-xs px-2 py-1 rounded border border-[#222222] focus:outline-none focus:border-[#00FF41]"
            style={{ color: accentColor }}
          >
            {tracks.map((t, idx) => (
              <option key={t.id} value={t.id} className="bg-[#121212] text-white">
                [{String(idx + 1).padStart(2, '0')}] {t.name} ({t.trackType.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Editing Tools */}
        <div className="flex items-center gap-1 bg-black border border-[#222222] p-1 rounded">
          <button
            onClick={() => setActiveTool('draw')}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-all ${
              activeTool === 'draw'
                ? 'bg-[#00FF41] text-black font-bold shadow-[0_0_8px_#00FF41]'
                : 'text-[#555555] hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> DRAW
          </button>
          <button
            onClick={() => setActiveTool('select')}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-all ${
              activeTool === 'select'
                ? 'bg-[#00E5FF] text-black font-bold shadow-[0_0_8px_#00E5FF]'
                : 'text-[#555555] hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" /> SELECT
          </button>
          <button
            onClick={() => setActiveTool('erase')}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-all ${
              activeTool === 'erase'
                ? 'bg-[#FF3B30] text-white font-bold shadow-[0_0_8px_#FF3B30]'
                : 'text-[#555555] hover:text-white'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" /> ERASE
          </button>
        </div>

        {/* Octave Shift */}
        <div className="flex items-center gap-1 bg-black border border-[#222222] p-1 rounded text-xs">
          <span className="text-[10px] text-[#555555] px-1">OCTAVE</span>
          <button
            onClick={() => setOctaveOffset((prev) => Math.max(-2, prev - 1))}
            className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] flex items-center justify-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="w-4 text-center font-bold text-[#D4AF37]">{octaveOffset >= 0 ? `+${octaveOffset}` : octaveOffset}</span>
          <button
            onClick={() => setOctaveOffset((prev) => Math.min(2, prev + 1))}
            className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Piano Roll Matrix Area */}
      <div className="flex-1 overflow-auto flex relative">
        {/* Left Keyboard Keys Column */}
        <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-20 bg-[#121212] border-r border-[#222222] flex flex-col">
          {allNoteKeys.map((noteKey) => {
            const isAccidental = noteKey.includes('#');
            const isC = noteKey.startsWith('C');
            const isPressed = activeNotePressed === noteKey;

            return (
              <div
                key={noteKey}
                onMouseDown={() => setActiveNotePressed(noteKey)}
                onMouseUp={() => setActiveNotePressed(null)}
                onTouchStart={() => setActiveNotePressed(noteKey)}
                onTouchEnd={() => setActiveNotePressed(null)}
                className={`h-6 border-b border-[#222222] px-1.5 flex items-center justify-between text-[10px] cursor-pointer transition-all ${
                  isPressed
                    ? 'bg-[#00FF41] text-black shadow-[0_0_10px_#00FF41]'
                    : isAccidental
                    ? 'bg-black text-[#555555] hover:bg-[#1A1A1A]'
                    : 'bg-[#1A1A1A] text-white hover:bg-[#252525]'
                }`}
              >
                <span className={`font-bold ${isC ? 'text-[#D4AF37]' : ''}`}>{noteKey}</span>
                {isC && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
              </div>
            );
          })}
        </div>

        {/* Note Step Grid Column */}
        <div className="flex-1 bg-black relative min-w-[640px]">
          {allNoteKeys.map((noteKey) => {
            const isAccidental = noteKey.includes('#');
            return (
              <div
                key={noteKey}
                className={`h-6 border-b border-[#1A1A1A] flex relative ${
                  isAccidental ? 'bg-black/60' : 'bg-[#121212]/30'
                }`}
              >
                {Array.from({ length: stepsCount }).map((_, stepIdx) => {
                  const stepNum = stepIdx + 1;
                  const cellKey = `${noteKey}-${stepNum}`;
                  const isNotePlaced = placedNotes.has(cellKey);
                  const isBarStart = stepNum % 16 === 1;
                  const isBeatStart = stepNum % 4 === 1;

                  return (
                    <div
                      key={stepNum}
                      onClick={() => handleCellClick(noteKey, stepNum)}
                      className={`h-full flex-1 border-r hover:bg-white/10 cursor-pointer transition-colors relative ${
                        isBarStart
                          ? 'border-[#333333]'
                          : isBeatStart
                          ? 'border-[#222222]'
                          : 'border-[#161616]'
                      }`}
                    >
                      {isNotePlaced && (
                        <div
                          className="absolute inset-0.5 rounded border shadow-sm transition-all"
                          style={{
                            backgroundColor: accentColor,
                            borderColor: accentColor,
                            boxShadow: `0 0 6px ${accentColor}`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Velocity Lane */}
      <div className="h-14 bg-[#121212] border-t border-[#222222] p-2 flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#555555] font-bold w-16 shrink-0">VELOCITY</span>
        <div className="flex-1 h-full bg-black border border-[#222222] rounded p-1 flex items-end gap-1">
          {Array.from({ length: stepsCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#222222] hover:bg-[#00FF41] rounded-t transition-colors cursor-pointer"
              style={{
                height: `${((i * 7) % 60) + 40}%`,
                backgroundColor: i % 4 === 0 ? accentColor : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
