import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TrackData,
  MidiNote,
  createMidiNote,
  noteNameToPitch,
  pitchToNoteName,
  clampPitch,
  clampVelocity,
  TICKS_PER_BEAT,
  TICKS_PER_16TH_STEP,
  formatBarBeatTick,
} from '../types/daw';
import {
  PenTool,
  Eraser,
  MousePointer,
  ChevronLeft,
  ChevronRight,
  Music,
  Trash2,
  Undo,
  Redo,
  Grid,
  Sliders,
} from 'lucide-react';
import { getTrackColor } from '../config/theme';

interface PianoRollViewProps {
  tracks: TrackData[];
  selectedTrackId: string | null;
  selectedRegionId?: string | null;
  onSelectTrack: (id: string) => void;
  onSelectRegion?: (trackId: string, regionId: string) => void;
  onUpdateNotes: (trackId: string, regionId: string, notes: MidiNote[]) => void;
}

const NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'] as const;
const OCTAVES = [4, 3, 2];
const ROW_HEIGHT_PX = 26; // Height per semitone row
const STEP_WIDTH_PX = 36; // Width per 16th step (240 ticks)
const PX_PER_TICK = STEP_WIDTH_PX / TICKS_PER_16TH_STEP; // 0.15 px per tick

// Supported Quantize / Snap resolutions in integer ticks
const QUANTIZE_OPTIONS: { label: string; ticks: number }[] = [
  { label: '1/4 (BEAT)', ticks: TICKS_PER_BEAT }, // 960 ticks
  { label: '1/8 (8TH)', ticks: TICKS_PER_BEAT / 2 }, // 480 ticks
  { label: '1/16 (16TH)', ticks: TICKS_PER_16TH_STEP }, // 240 ticks
  { label: '1/32 (32ND)', ticks: TICKS_PER_16TH_STEP / 2 }, // 120 ticks
  { label: 'OFF (FINE)', ticks: 30 }, // 30 ticks high-precision
];

interface DragOperation {
  type: 'move' | 'resize' | 'velocity';
  noteId: string;
  startX: number;
  startY: number;
  initialStartTick: number;
  initialPitch: number;
  initialDurationTicks: number;
  initialVelocity: number;
  currentDeltaTicks: number;
  currentDeltaPitch: number;
  currentDeltaDurationTicks: number;
  currentVelocity: number;
}

export const PianoRollView: React.FC<PianoRollViewProps> = ({
  tracks,
  selectedTrackId,
  selectedRegionId,
  onSelectTrack,
  onSelectRegion,
  onUpdateNotes,
}) => {
  const [activeTool, setActiveTool] = useState<'draw' | 'select' | 'erase'>('draw');
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [activeNotePressed, setActiveNotePressed] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [quantizeIndex, setQuantizeIndex] = useState<number>(2); // Default to 1/16 (240 ticks)

  // Live dragging / resizing interaction state
  const [dragOp, setDragOp] = useState<DragOperation | null>(null);

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState<MidiNote[][]>([]);
  const [redoStack, setRedoStack] = useState<MidiNote[][]>([]);

  // DOM Refs for synchronized horizontal scrolling
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const velocityContainerRef = useRef<HTMLDivElement>(null);

  const currentTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];
  const accentColor = currentTrack ? getTrackColor(currentTrack.category) : '#00FF41';

  // Active clip region
  const currentRegion =
    currentTrack?.regions.find((r) => r.id === selectedRegionId) ||
    currentTrack?.regions[0];

  const activeNotes = currentRegion?.notes || [];
  const activeSnapTicks = QUANTIZE_OPTIONS[quantizeIndex].ticks;

  // Total bars and ticks for current clip (default to 2 bars = 7680 ticks if unspecified)
  const clipLengthBars = currentRegion?.lengthBars || 2;
  const totalClipTicks = clipLengthBars * 4 * TICKS_PER_BEAT;
  const total16thSteps = clipLengthBars * 16;
  const totalGridWidthPx = total16thSteps * STEP_WIDTH_PX;

  // Clear undo/redo stacks when switching track or region
  const lastTargetRef = useRef<string>('');
  useEffect(() => {
    const targetKey = `${currentTrack?.id || ''}:${currentRegion?.id || ''}`;
    if (lastTargetRef.current !== targetKey) {
      lastTargetRef.current = targetKey;
      setUndoStack([]);
      setRedoStack([]);
      setSelectedNoteId(null);
      setDragOp(null);
    }
  }, [currentTrack?.id, currentRegion?.id]);

  // Generate visible semitone note keys from top (highest pitch) to bottom (lowest pitch)
  const allNoteKeys: string[] = [];
  OCTAVES.forEach((oct) => {
    const currentOct = oct + octaveOffset;
    NOTES.forEach((n) => {
      allNoteKeys.push(`${n}${currentOct}`);
    });
  });

  // Map of pitch -> rowIndex for visible rows
  const pitchToRowMap = new Map<number, number>();
  allNoteKeys.forEach((key, idx) => {
    const p = noteNameToPitch(key);
    pitchToRowMap.set(p, idx);
  });

  // Authoritative notes mutation with history logging
  const commitNotesChange = useCallback(
    (newNotes: MidiNote[], recordHistory: boolean = true) => {
      if (!currentTrack || !currentRegion) return;

      if (recordHistory) {
        setUndoStack((prev) => [...prev.slice(-25), activeNotes]);
        setRedoStack([]);
      }

      onUpdateNotes(currentTrack.id, currentRegion.id, newNotes);
    },
    [currentTrack, currentRegion, activeNotes, onUpdateNotes]
  );

  // Undo Action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !currentTrack || !currentRegion) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev, activeNotes]);
    setUndoStack(newUndoStack);
    onUpdateNotes(currentTrack.id, currentRegion.id, previous);
  }, [undoStack, activeNotes, currentTrack, currentRegion, onUpdateNotes]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !currentTrack || !currentRegion) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, activeNotes]);
    setRedoStack(newRedoStack);
    onUpdateNotes(currentTrack.id, currentRegion.id, next);
  }, [redoStack, activeNotes, currentTrack, currentRegion, onUpdateNotes]);

  // Delete Selected Note Action
  const handleDeleteSelectedNote = useCallback(() => {
    if (!selectedNoteId || !currentTrack || !currentRegion) return;
    const nextNotes = activeNotes.filter((n) => n.id !== selectedNoteId);
    commitNotesChange(nextNotes, true);
    setSelectedNoteId(null);
  }, [selectedNoteId, activeNotes, commitNotesChange, currentTrack, currentRegion]);

  // Keyboard shortcut listener (Delete/Backspace, Undo Ctrl/Cmd+Z, Redo Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or select
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteId) {
          e.preventDefault();
          handleDeleteSelectedNote();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, handleDeleteSelectedNote, handleUndo, handleRedo]);

  // Synchronize horizontal scrolling between note grid and bottom velocity lane
  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (velocityContainerRef.current) {
      velocityContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleVelocityScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Click on empty grid background: add note in Draw mode or clear selection in Select mode
  const handleGridBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack || !currentRegion || currentTrack.trackType !== 'midi') return;
    if (dragOp !== null) return; // Ignore if completing a drag

    const gridRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - gridRect.left;
    const clickY = e.clientY - gridRect.top;

    const rowIndex = Math.floor(clickY / ROW_HEIGHT_PX);
    if (rowIndex < 0 || rowIndex >= allNoteKeys.length) return;

    const clickedKey = allNoteKeys[rowIndex];
    const pitch = noteNameToPitch(clickedKey);

    const rawTick = clickX / PX_PER_TICK;
    const snappedStartTick = Math.max(
      0,
      Math.min(totalClipTicks - activeSnapTicks, Math.floor(rawTick / activeSnapTicks) * activeSnapTicks)
    );

    if (activeTool === 'select') {
      setSelectedNoteId(null);
    } else if (activeTool === 'draw') {
      // Default duration is the current quantize resolution (at least 240 ticks if fine snap)
      const durationTicks = Math.max(activeSnapTicks, activeSnapTicks <= 30 ? TICKS_PER_16TH_STEP : activeSnapTicks);
      const newNote = createMidiNote(pitch, snappedStartTick, durationTicks, 100);

      const nextNotes = [...activeNotes, newNote];
      commitNotesChange(nextNotes, true);
      setSelectedNoteId(newNote.id);
    }
  };

  // Pointer Down on Note Body (Initiates Move Drag or Erase)
  const handleNotePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: MidiNote) => {
    e.stopPropagation();

    if (activeTool === 'erase') {
      const nextNotes = activeNotes.filter((n) => n.id !== note.id);
      commitNotesChange(nextNotes, true);
      if (selectedNoteId === note.id) setSelectedNoteId(null);
      return;
    }

    // Set selection
    setSelectedNoteId(note.id);

    // Capture pointer for smooth dragging even beyond window boundaries
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragOp({
      type: 'move',
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initialStartTick: note.startTick,
      initialPitch: note.pitch,
      initialDurationTicks: note.durationTicks,
      initialVelocity: note.velocity,
      currentDeltaTicks: 0,
      currentDeltaPitch: 0,
      currentDeltaDurationTicks: 0,
      currentVelocity: note.velocity,
    });
  };

  // Pointer Down on Note Resize Handle (Initiates Duration Resize)
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: MidiNote) => {
    e.stopPropagation();

    if (activeTool === 'erase') return;

    setSelectedNoteId(note.id);
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragOp({
      type: 'resize',
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initialStartTick: note.startTick,
      initialPitch: note.pitch,
      initialDurationTicks: note.durationTicks,
      initialVelocity: note.velocity,
      currentDeltaTicks: 0,
      currentDeltaPitch: 0,
      currentDeltaDurationTicks: 0,
      currentVelocity: note.velocity,
    });
  };

  // Pointer Move (Calculates snapped delta in real time)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOp) return;

    const deltaX = e.clientX - dragOp.startX;
    const deltaY = e.clientY - dragOp.startY;

    if (dragOp.type === 'move') {
      // Calculate delta ticks snapped to quantization
      const rawDeltaTicks = deltaX / PX_PER_TICK;
      const snappedDeltaTicks = Math.round(rawDeltaTicks / activeSnapTicks) * activeSnapTicks;

      // Calculate vertical delta pitch (-deltaY because top is higher pitch)
      const semitonesChange = -Math.round(deltaY / ROW_HEIGHT_PX);

      // Bounds clamping
      const targetStartTick = Math.max(
        0,
        Math.min(totalClipTicks - dragOp.initialDurationTicks, dragOp.initialStartTick + snappedDeltaTicks)
      );
      const effectiveDeltaTicks = targetStartTick - dragOp.initialStartTick;

      const targetPitch = clampPitch(dragOp.initialPitch + semitonesChange);
      const effectiveDeltaPitch = targetPitch - dragOp.initialPitch;

      setDragOp((prev) =>
        prev
          ? {
              ...prev,
              currentDeltaTicks: effectiveDeltaTicks,
              currentDeltaPitch: effectiveDeltaPitch,
            }
          : null
      );
    } else if (dragOp.type === 'resize') {
      // Duration resizing snapped to quantization
      const rawDeltaTicks = deltaX / PX_PER_TICK;
      const snappedDeltaTicks = Math.round(rawDeltaTicks / activeSnapTicks) * activeSnapTicks;

      const minDuration = Math.max(30, activeSnapTicks <= 30 ? 60 : activeSnapTicks);
      const maxDuration = totalClipTicks - dragOp.initialStartTick;
      const candidateDuration = Math.max(minDuration, Math.min(maxDuration, dragOp.initialDurationTicks + snappedDeltaTicks));
      const effectiveDeltaDuration = candidateDuration - dragOp.initialDurationTicks;

      setDragOp((prev) =>
        prev
          ? {
              ...prev,
              currentDeltaDurationTicks: effectiveDeltaDuration,
            }
          : null
      );
    }
  };

  // Pointer Up (Commits change to authoritative project model and pushes undo history)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOp) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already lost
    }

    const {
      type,
      noteId,
      initialStartTick,
      initialPitch,
      initialDurationTicks,
      currentDeltaTicks,
      currentDeltaPitch,
      currentDeltaDurationTicks,
    } = dragOp;

    let hasChanged = false;

    if (type === 'move') {
      if (currentDeltaTicks !== 0 || currentDeltaPitch !== 0) {
        hasChanged = true;
        const newStartTick = Math.max(0, initialStartTick + currentDeltaTicks);
        const newPitch = clampPitch(initialPitch + currentDeltaPitch);

        const nextNotes = activeNotes.map((n) =>
          n.id === noteId ? { ...n, startTick: newStartTick, pitch: newPitch } : n
        );
        commitNotesChange(nextNotes, true);
      }
    } else if (type === 'resize') {
      if (currentDeltaDurationTicks !== 0) {
        hasChanged = true;
        const newDuration = Math.max(30, initialDurationTicks + currentDeltaDurationTicks);
        const nextNotes = activeNotes.map((n) =>
          n.id === noteId ? { ...n, durationTicks: newDuration } : n
        );
        commitNotesChange(nextNotes, true);
      }
    }

    setDragOp(null);
  };

  // Pointer Cancel / Escape
  const handlePointerCancel = () => {
    setDragOp(null);
  };

  // Velocity Lane Interaction
  const handleVelocityLanePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: MidiNote) => {
    e.stopPropagation();
    setSelectedNoteId(note.id);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const frac = 1 - (e.clientY - rect.top) / rect.height;
    const newVel = clampVelocity(frac * 127);

    setDragOp({
      type: 'velocity',
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initialStartTick: note.startTick,
      initialPitch: note.pitch,
      initialDurationTicks: note.durationTicks,
      initialVelocity: note.velocity,
      currentDeltaTicks: 0,
      currentDeltaPitch: 0,
      currentDeltaDurationTicks: 0,
      currentVelocity: newVel,
    });
  };

  const handleVelocityLanePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOp || dragOp.type !== 'velocity') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const frac = 1 - (e.clientY - rect.top) / rect.height;
    const newVel = clampVelocity(frac * 127);

    setDragOp((prev) => (prev ? { ...prev, currentVelocity: newVel } : null));
  };

  const handleVelocityLanePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOp || dragOp.type !== 'velocity') return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (dragOp.currentVelocity !== dragOp.initialVelocity) {
      const nextNotes = activeNotes.map((n) =>
        n.id === dragOp.noteId ? { ...n, velocity: dragOp.currentVelocity } : n
      );
      commitNotesChange(nextNotes, true);
    }
    setDragOp(null);
  };

  // Precision Velocity Adjustment for Selected Note
  const handleAdjustSelectedVelocity = (deltaOrExact: number, isExact: boolean = false) => {
    if (!selectedNoteId) return;
    const target = activeNotes.find((n) => n.id === selectedNoteId);
    if (!target) return;

    const newVelocity = clampVelocity(isExact ? deltaOrExact : target.velocity + deltaOrExact);
    if (newVelocity === target.velocity) return;

    const nextNotes = activeNotes.map((n) =>
      n.id === selectedNoteId ? { ...n, velocity: newVelocity } : n
    );
    commitNotesChange(nextNotes, true);
  };

  const selectedNote = activeNotes.find((n) => n.id === selectedNoteId);

  return (
    <div className="flex flex-col flex-1 bg-black text-white font-mono overflow-hidden select-none">
      {/* 1. TOP PIANO ROLL TOOLBAR */}
      <div className="bg-[#121212] border-b border-[#222222] px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 z-30">
        {/* Track & Region Selectors */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#D4AF37] font-bold flex items-center gap-1 shrink-0">
            <Music className="w-3.5 h-3.5" /> PIANO ROLL:
          </span>
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

          {/* Region Switcher */}
          {currentTrack && currentTrack.regions.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-xs">
              <span className="text-[10px] text-[#555555]">CLIP:</span>
              <select
                value={currentRegion?.id || ''}
                onChange={(e) => onSelectRegion?.(currentTrack.id, e.target.value)}
                className="bg-black text-white text-xs px-2 py-1 rounded border border-[#222222] focus:outline-none"
              >
                {currentTrack.regions.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#121212] text-white">
                    {r.name} (Bars {r.startBar}-{r.startBar + r.lengthBars - 1})
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-[10px] text-[#555555] bg-black px-1.5 py-0.5 rounded border border-[#222222] shrink-0">
            {activeNotes.length} {activeNotes.length === 1 ? 'NOTE' : 'NOTES'}
          </span>
        </div>

        {/* Center: Editing Tools & Quantization Snap */}
        <div className="flex items-center gap-2">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-black border border-[#222222] p-0.5 rounded">
            <button
              onClick={() => setActiveTool('draw')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-all ${
                activeTool === 'draw'
                  ? 'bg-[#00FF41] text-black font-bold shadow-[0_0_8px_#00FF41]'
                  : 'text-[#555555] hover:text-white'
              }`}
              title="Draw Note (Click grid to add note, drag note to move, drag edge to resize)"
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
              title="Select & Edit Note (Click note to select, drag to move, drag right edge to resize)"
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
              title="Erase Note (Click note to delete)"
            >
              <Eraser className="w-3.5 h-3.5" /> ERASE
            </button>
          </div>

          {/* Explicit Configurable Quantization Selector */}
          <div className="flex items-center gap-1 bg-black border border-[#222222] px-2 py-0.5 rounded text-[10px]">
            <Grid className="w-3 h-3 text-[#00E5FF]" />
            <span className="text-[#555555] hidden sm:inline">SNAP:</span>
            <select
              value={quantizeIndex}
              onChange={(e) => setQuantizeIndex(Number(e.target.value))}
              className="bg-transparent text-[#00E5FF] font-bold focus:outline-none cursor-pointer"
            >
              {QUANTIZE_OPTIONS.map((opt, i) => (
                <option key={i} value={i} className="bg-[#121212] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Undo / Redo Toolbar Controls */}
          <div className="flex items-center gap-0.5 bg-black border border-[#222222] p-0.5 rounded">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-30 disabled:hover:bg-[#161616] flex items-center justify-center text-white transition-colors"
              title="Undo Note Edit (Ctrl/Cmd+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-30 disabled:hover:bg-[#161616] flex items-center justify-center text-white transition-colors"
              title="Redo Note Edit (Ctrl+Y / Cmd+Shift+Z)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Octave Shift & Delete Note Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Delete Selected Note Button */}
          {selectedNoteId && (
            <button
              onClick={handleDeleteSelectedNote}
              className="px-2 py-1 bg-[#1A1A1A] hover:bg-[#FF3B30]/20 border border-[#FF3B30] text-[#FF3B30] rounded text-xs font-bold flex items-center gap-1 transition-colors"
              title="Delete Selected Note (Delete/Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" /> DELETE
            </button>
          )}

          {/* Octave Range Controller */}
          <div className="flex items-center gap-1 bg-black border border-[#222222] p-0.5 rounded text-xs">
            <span className="text-[10px] text-[#555555] px-1 hidden sm:inline">OCTAVE</span>
            <button
              onClick={() => setOctaveOffset((prev) => Math.max(-2, prev - 1))}
              disabled={octaveOffset <= -2}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-30 flex items-center justify-center"
              title="Shift down octave"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="w-5 text-center font-bold text-[#D4AF37] text-xs">
              {octaveOffset >= 0 ? `+${octaveOffset}` : octaveOffset}
            </span>
            <button
              onClick={() => setOctaveOffset((prev) => Math.min(2, prev + 1))}
              disabled={octaveOffset >= 2}
              className="w-6 h-6 rounded bg-[#161616] hover:bg-[#222222] disabled:opacity-30 flex items-center justify-center"
              title="Shift up octave"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SELECTED NOTE STATUS STRIP (Provides tactile feedback for mobile and desktop) */}
      <div className="bg-[#161616] border-b border-[#222222] px-3 py-1 text-[10px] flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-3">
          {selectedNote ? (
            <>
              <span className="text-[#00FF41] font-bold">
                NOTE: {pitchToNoteName(selectedNote.pitch)} (Pitch {selectedNote.pitch})
              </span>
              <span className="text-[#555555]">|</span>
              <span className="text-white">
                START: {formatBarBeatTick(
                  Math.floor(selectedNote.startTick / (4 * TICKS_PER_BEAT)) + 1,
                  Math.floor((selectedNote.startTick % (4 * TICKS_PER_BEAT)) / TICKS_PER_BEAT) + 1,
                  selectedNote.startTick % TICKS_PER_BEAT
                )} ({selectedNote.startTick}t)
              </span>
              <span className="text-[#555555]">|</span>
              <span className="text-white">
                LEN: {selectedNote.durationTicks}t ({Math.round((selectedNote.durationTicks / TICKS_PER_16TH_STEP) * 10) / 10} steps)
              </span>
            </>
          ) : (
            <span className="text-[#777777] italic">
              Tap empty grid to create note. Drag note to move pitch/time. Drag right handle to resize duration.
            </span>
          )}
        </div>

        {/* Selected Note Velocity Slider & Quick Steppers */}
        {selectedNote && (
          <div className="flex items-center gap-1.5 shrink-0 bg-black border border-[#222222] px-2 py-0.5 rounded">
            <Sliders className="w-3 h-3 text-[#00E5FF]" />
            <span className="text-[9px] text-[#888888]">VELOCITY:</span>
            <span className="text-white font-bold w-6 text-right">{selectedNote.velocity}</span>
            <button
              onClick={() => handleAdjustSelectedVelocity(-5)}
              className="w-4 h-4 rounded bg-[#1A1A1A] hover:bg-[#252525] flex items-center justify-center text-[9px] text-[#00E5FF]"
              title="Decrease velocity -5"
            >
              -
            </button>
            <input
              type="range"
              min="1"
              max="127"
              value={selectedNote.velocity}
              onChange={(e) => handleAdjustSelectedVelocity(Number(e.target.value), true)}
              className="w-16 h-1 accent-[#00FF41] cursor-pointer"
            />
            <button
              onClick={() => handleAdjustSelectedVelocity(5)}
              className="w-4 h-4 rounded bg-[#1A1A1A] hover:bg-[#252525] flex items-center justify-center text-[9px] text-[#00FF41]"
              title="Increase velocity +5"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* 3. AUDIO TRACK NOTICE (if user switched to an audio track) */}
      {currentTrack && currentTrack.trackType === 'audio' && (
        <div className="bg-[#1A1A1A] border-b border-[#333333] px-4 py-2 text-xs text-[#00E5FF] flex items-center justify-between shrink-0">
          <span>
            ℹ️ {currentTrack.name} is an Audio Track. Switch to a MIDI instrument track above to draw and edit notes.
          </span>
        </div>
      )}

      {/* 4. MAIN PIANO ROLL GRID AREA */}
      <div
        className="flex-1 overflow-auto flex relative touch-none"
        ref={gridContainerRef}
        onScroll={handleGridScroll}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Left Sticky Keyboard Keys Column */}
        <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-20 bg-[#121212] border-r border-[#222222] flex flex-col shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
          {allNoteKeys.map((noteKey) => {
            const isAccidental = noteKey.includes('#');
            const isC = noteKey.startsWith('C') && !isAccidental;
            const pitch = noteNameToPitch(noteKey);
            const isPressed = activeNotePressed === noteKey;

            // Check if note is currently dragging over this row
            const isDragRowTarget =
              dragOp &&
              dragOp.type === 'move' &&
              clampPitch(dragOp.initialPitch + dragOp.currentDeltaPitch) === pitch;

            return (
              <div
                key={noteKey}
                onMouseDown={() => setActiveNotePressed(noteKey)}
                onMouseUp={() => setActiveNotePressed(null)}
                onTouchStart={() => setActiveNotePressed(noteKey)}
                onTouchEnd={() => setActiveNotePressed(null)}
                className={`border-b border-[#222222] px-1.5 flex items-center justify-between text-[10px] cursor-pointer transition-all ${
                  isPressed || isDragRowTarget
                    ? 'bg-[#00FF41] text-black shadow-[0_0_10px_#00FF41]'
                    : isAccidental
                    ? 'bg-black text-[#555555] hover:bg-[#1A1A1A]'
                    : 'bg-[#1A1A1A] text-white hover:bg-[#252525]'
                }`}
                style={{ height: `${ROW_HEIGHT_PX}px` }}
                title={`Pitch ${pitch} (${noteKey})`}
              >
                <span className={`font-bold ${isC ? 'text-[#D4AF37]' : ''}`}>{noteKey}</span>
                {isC && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
              </div>
            );
          })}
        </div>

        {/* Note Grid Matrix Column */}
        <div
          className="relative bg-black select-none"
          style={{
            width: `${totalGridWidthPx}px`,
            height: `${allNoteKeys.length * ROW_HEIGHT_PX}px`,
          }}
          onClick={handleGridBackgroundClick}
        >
          {/* Background Row Bands */}
          {allNoteKeys.map((noteKey, rowIdx) => {
            const isAccidental = noteKey.includes('#');
            const isC = noteKey.startsWith('C') && !isAccidental;

            return (
              <div
                key={noteKey}
                className={`absolute left-0 right-0 border-b pointer-events-none ${
                  isC ? 'border-[#333333]' : 'border-[#161616]'
                } ${isAccidental ? 'bg-[#080808]' : 'bg-[#121212]/30'}`}
                style={{
                  top: `${rowIdx * ROW_HEIGHT_PX}px`,
                  height: `${ROW_HEIGHT_PX}px`,
                }}
              />
            );
          })}

          {/* Background Vertical Step & Bar Grid Lines */}
          {Array.from({ length: total16thSteps }).map((_, stepIdx) => {
            const stepNum = stepIdx + 1;
            const isBarStart = stepNum % 16 === 1;
            const isBeatStart = stepNum % 4 === 1;

            return (
              <div
                key={stepNum}
                className={`absolute top-0 bottom-0 pointer-events-none ${
                  isBarStart
                    ? 'border-r-2 border-[#333333]'
                    : isBeatStart
                    ? 'border-r border-[#222222]'
                    : 'border-r border-[#141414]'
                }`}
                style={{
                  left: `${(stepIdx + 1) * STEP_WIDTH_PX}px`,
                }}
              >
                {/* Bar Number label at the top of bar lines */}
                {isBarStart && (
                  <span className="absolute top-1 left-1 text-[8px] font-mono text-[#555555] font-bold">
                    Bar {Math.floor(stepIdx / 16) + 1}
                  </span>
                )}
              </div>
            );
          })}

          {/* Active MIDI Notes (Rendered as genuine continuous MIDI events) */}
          {activeNotes.map((note) => {
            const isBeingDragged = dragOp && dragOp.noteId === note.id;

            // Compute effective position and dimensions with live drag offsets
            const effectivePitch = isBeingDragged && dragOp.type === 'move'
              ? clampPitch(dragOp.initialPitch + dragOp.currentDeltaPitch)
              : note.pitch;

            const effectiveStartTick = isBeingDragged && dragOp.type === 'move'
              ? Math.max(0, dragOp.initialStartTick + dragOp.currentDeltaTicks)
              : note.startTick;

            const effectiveDurationTicks = isBeingDragged && dragOp.type === 'resize'
              ? Math.max(30, dragOp.initialDurationTicks + dragOp.currentDeltaDurationTicks)
              : note.durationTicks;

            const effectiveVelocity = isBeingDragged && dragOp.type === 'velocity'
              ? dragOp.currentVelocity
              : note.velocity;

            const rowIdx = pitchToRowMap.get(effectivePitch);
            // If note is shifted outside visible octaves, don't render off-grid
            if (rowIdx === undefined) return null;

            const noteLeftPx = effectiveStartTick * PX_PER_TICK;
            const noteWidthPx = Math.max(12, effectiveDurationTicks * PX_PER_TICK);
            const noteTopPx = rowIdx * ROW_HEIGHT_PX + 2;
            const noteHeightPx = ROW_HEIGHT_PX - 4;

            const isSelected = selectedNoteId === note.id;

            return (
              <div
                key={note.id}
                onPointerDown={(e) => handleNotePointerDown(e, note)}
                className={`absolute rounded-[3px] flex items-center justify-between text-[8px] font-bold select-none transition-shadow ${
                  activeTool === 'erase' ? 'cursor-pointer hover:bg-[#FF3B30]' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{
                  left: `${noteLeftPx}px`,
                  top: `${noteTopPx}px`,
                  width: `${noteWidthPx}px`,
                  height: `${noteHeightPx}px`,
                  backgroundColor: accentColor,
                  opacity: Math.max(0.45, effectiveVelocity / 127),
                  border: isSelected ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.4)',
                  boxShadow: isSelected
                    ? '0 0 10px #FFFFFF, inset 0 0 4px rgba(255,255,255,0.8)'
                    : `0 0 6px ${accentColor}80`,
                  zIndex: isSelected ? 15 : isBeingDragged ? 14 : 10,
                }}
                title={`${pitchToNoteName(effectivePitch)} | Start: ${effectiveStartTick}t | Len: ${effectiveDurationTicks}t | Vel: ${effectiveVelocity}`}
              >
                {/* Note Label (Pitch) */}
                <span className="text-black pl-1 font-bold uppercase truncate pointer-events-none drop-shadow-sm">
                  {noteWidthPx > 24 ? pitchToNoteName(effectivePitch) : ''}
                </span>

                {/* Right Edge Duration Resize Handle */}
                {activeTool !== 'erase' && (
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, note)}
                    className="h-full w-3 -mr-[1px] rounded-r-[2px] cursor-ew-resize hover:bg-white/40 active:bg-white/70 flex items-center justify-center shrink-0 transition-colors"
                    title="Drag to resize note duration"
                  >
                    <div className="w-[2px] h-2.5 bg-black/40 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. BOTTOM VELOCITY LANE (Interactive stalks for editing velocities 1-127) */}
      <div className="h-16 bg-[#121212] border-t border-[#222222] flex items-center shrink-0 z-20">
        {/* Left Sticky Label */}
        <div className="w-16 sm:w-20 shrink-0 h-full border-r border-[#222222] bg-[#121212] flex flex-col justify-center px-1.5 text-[9px] font-mono shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
          <span className="text-[#888888] font-bold">VELOCITY</span>
          <span className="text-[7px] text-[#555555]">DRAG STEM</span>
        </div>

        {/* Scrollable Velocity Stalks Area */}
        <div
          className="flex-1 h-full bg-black relative overflow-x-auto overflow-y-hidden"
          ref={velocityContainerRef}
          onScroll={handleVelocityScroll}
          onPointerMove={handleVelocityLanePointerMove}
          onPointerUp={handleVelocityLanePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div
            className="relative h-full select-none"
            style={{ width: `${totalGridWidthPx}px` }}
          >
            {/* Step Grid Reference Lines in Velocity Lane */}
            {Array.from({ length: total16thSteps }).map((_, stepIdx) => (
              <div
                key={stepIdx}
                className="absolute top-0 bottom-0 border-r border-[#141414] pointer-events-none"
                style={{ left: `${(stepIdx + 1) * STEP_WIDTH_PX}px` }}
              />
            ))}

            {/* Velocity Stems for each note in region */}
            {activeNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const isDraggingVel = dragOp && dragOp.type === 'velocity' && dragOp.noteId === note.id;
              const effectiveVel = isDraggingVel ? dragOp.currentVelocity : note.velocity;

              const noteLeftPx = note.startTick * PX_PER_TICK;
              const stalkHeightPct = (effectiveVel / 127) * 100;

              return (
                <div
                  key={note.id}
                  onPointerDown={(e) => handleVelocityLanePointerDown(e, note)}
                  className="absolute bottom-0 w-3 cursor-ns-resize group"
                  style={{
                    left: `${noteLeftPx}px`,
                    height: '100%',
                  }}
                  title={`${pitchToNoteName(note.pitch)}: Velocity ${effectiveVel}`}
                >
                  {/* Vertical Stalk */}
                  <div
                    className="w-1 mx-auto rounded-t transition-all"
                    style={{
                      height: `${stalkHeightPct}%`,
                      backgroundColor: isSelected ? '#FFFFFF' : accentColor,
                      boxShadow: isSelected ? '0 0 8px #FFFFFF' : 'none',
                    }}
                  />

                  {/* Top Knob Handle */}
                  <div
                    className="absolute w-2 h-2 -ml-0.5 rounded-full border border-black transition-all"
                    style={{
                      bottom: `calc(${stalkHeightPct}% - 4px)`,
                      left: '50%',
                      backgroundColor: isSelected ? '#FFFFFF' : accentColor,
                      boxShadow: isSelected ? '0 0 6px #FFFFFF' : 'none',
                    }}
                  />

                  {/* Numeric Tooltip on Hover or Drag */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1 py-0.5 bg-black/90 border border-[#333333] rounded text-[8px] font-bold text-white pointer-events-none ${
                      isDraggingVel || isSelected ? 'block' : 'hidden group-hover:block'
                    }`}
                  >
                    {effectiveVel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
