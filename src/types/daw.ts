export type ViewMode = 'tracks' | 'piano-roll' | 'mixer' | 'project';

export type InstrumentCategory = 
  | 'piano' 
  | 'drums' 
  | 'electric-piano' 
  | 'lead-vocal' 
  | 'guitar' 
  | 'clean-guitar' 
  | 'bass' 
  | 'strings' 
  | 'horns' 
  | 'blues-organ';

export type TrackType = 'midi' | 'audio';

// Standard MIDI 960 PPQ resolution (ticks per quarter note)
export const TICKS_PER_BEAT = 960;
// 16th-note step resolution in ticks (960 / 4 = 240)
export const TICKS_PER_16TH_STEP = 240;

/**
 * Concrete MIDI Note Event
 * Represents a musical note with integer ticks independent of screen pixel coordinates.
 */
export interface MidiNote {
  id: string; // Stable unique identifier (e.g. "note-1730000000-abc")
  pitch: number; // MIDI pitch number: 0 - 127 (e.g. 60 = Middle C / C4, 48 = C3)
  startTick: number; // Integer tick offset from start of clip region (0-indexed)
  durationTicks: number; // Integer duration in ticks (e.g. 240 = 16th note, 960 = quarter note)
  velocity: number; // 1 - 127 (standard default 100)
}

export interface ClipRegion {
  id: string;
  name: string;
  startBar: number; // 1-indexed in arrangement timeline
  lengthBars: number;
  type: TrackType;
  notes: MidiNote[]; // Real MIDI note events for MIDI tracks
  notesCount?: number;
  patternType?: 'chords' | 'melody' | 'drum-beat' | 'bassline' | 'riff' | 'sustained';
}

export interface TrackData {
  id: string;
  trackNumber: number; // Numeric, 1, 2, 3...
  name: string;
  category: InstrumentCategory;
  trackType: TrackType;
  midiChannel?: number; // 1 - 16 (channel 10 standard for drums)
  programNumber?: number; // 0 - 127 General MIDI instrument preset
  muted: boolean;
  soloed: boolean;
  armed: boolean;
  volume: number; // 0 - 100
  pan: number; // -50 (L) to +50 (R)
  regions: ClipRegion[];
}

/**
 * Transport engine playback and recording state
 */
export interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  currentBar: number;
  currentBeat: number;
  currentTick: number; // 0 - 959 ticks per beat (960 PPQ)
  metronomeOn: boolean;
}

export interface SectionMarker {
  id: string;
  bar: number;
  label: string;
}

/**
 * Authoritative Single Project State Model
 * Encapsulates all musical and composition state:
 * - Identification & metadata (id, name, timestamps)
 * - Timing metadata (bpm, timeSignature, keySignature, arrangement length & loop range)
 * - Arrangement & structure (tracks, sectionMarkers, selectedTrackId, selectedRegionId)
 * - Realtime transport playback engine state
 */
export interface ProjectState {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;

  // Authoritative Timing & Musical Metadata
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  keySignature: string;
  totalBars: number;
  loopStartBar: number;
  loopEndBar: number;

  // Authoritative Arrangement & Tracks
  tracks: TrackData[];
  sectionMarkers: SectionMarker[];
  selectedTrackId: string | null;
  selectedRegionId?: string | null;

  // Authoritative Playback Transport
  transport: TransportState;
}

/* -------------------------------------------------------------------------- */
/* Timing & MIDI Pitch Conversion Utilities                                   */
/* -------------------------------------------------------------------------- */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Converts MIDI pitch number (0 - 127) to note name with octave (e.g. 60 -> "C4", 48 -> "C3")
 */
export function pitchToNoteName(pitch: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(pitch)));
  const noteName = NOTE_NAMES[clamped % 12];
  const octave = Math.floor(clamped / 12) - 1; // 60 / 12 - 1 = 4
  return `${noteName}${octave}`;
}

/**
 * Converts note name with octave (e.g. "C4", "F#3", "Bb2") to MIDI pitch (0 - 127)
 */
export function noteNameToPitch(name: string): number {
  const match = name.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return 60; // Default Middle C

  let note = match[1];
  const octave = parseInt(match[2], 10);

  // Normalize flats to sharps
  if (note === 'DB') note = 'C#';
  else if (note === 'EB') note = 'D#';
  else if (note === 'GB') note = 'F#';
  else if (note === 'AB') note = 'G#';
  else if (note === 'BB') note = 'A#';

  const noteIndex = NOTE_NAMES.indexOf(note as (typeof NOTE_NAMES)[number]);
  if (noteIndex === -1) return 60;

  const pitch = (octave + 1) * 12 + noteIndex;
  return Math.max(0, Math.min(127, pitch));
}

/**
 * Convert 1-indexed step (e.g. 1 to 32) to integer tick offset from clip start
 */
export function stepToTick(step: number, stepResolutionTicks: number = TICKS_PER_16TH_STEP): number {
  return Math.max(0, (step - 1) * stepResolutionTicks);
}

/**
 * Convert tick offset to 1-indexed step number
 */
export function tickToStep(tick: number, stepResolutionTicks: number = TICKS_PER_16TH_STEP): number {
  return Math.max(1, Math.floor(Math.max(0, tick) / stepResolutionTicks) + 1);
}

/**
 * Clamp MIDI velocity between 1 and 127
 */
export function clampVelocity(velocity: number): number {
  return Math.max(1, Math.min(127, Math.round(velocity)));
}

/**
 * Clamp MIDI pitch between 0 and 127
 */
export function clampPitch(pitch: number): number {
  return Math.max(0, Math.min(127, Math.round(pitch)));
}

/**
 * Helper to construct a typed MidiNote with validation
 */
export function createMidiNote(
  pitch: number,
  startTick: number,
  durationTicks: number = TICKS_PER_16TH_STEP,
  velocity: number = 100,
  id?: string
): MidiNote {
  return {
    id: id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    pitch: clampPitch(pitch),
    startTick: Math.max(0, Math.round(startTick)),
    durationTicks: Math.max(1, Math.round(durationTicks)),
    velocity: clampVelocity(velocity),
  };
}

/**
 * Utility: Format playback position into Bar:Beat:Tick display string
 */
export function formatBarBeatTick(bar: number, beat: number, tick: number = 0): string {
  const b = String(Math.max(1, bar)).padStart(3, '0');
  const bt = String(Math.max(1, beat)).padStart(2, '0');
  const tk = String(Math.floor(tick / 10)).padStart(2, '0');
  return `${b}:${bt}:${tk}`;
}

/**
 * Utility: Calculate total elapsed time in seconds from Bar, Beat, Tick, BPM, and Time Signature
 */
export function calculatePlaybackSeconds(
  bar: number,
  beat: number,
  tick: number,
  bpm: number,
  numerator: number
): number {
  if (bpm <= 0) return 0;
  const totalBeats = (bar - 1) * numerator + (beat - 1) + tick / TICKS_PER_BEAT;
  return (totalBeats * 60) / bpm;
}

/**
 * Utility: Format time in seconds to mm:ss.s timecode string
 */
export function formatTimecode(seconds: number): string {
  const nonNeg = Math.max(0, seconds);
  const mins = Math.floor(nonNeg / 60);
  const secs = Math.floor(nonNeg % 60);
  const tenths = Math.floor((nonNeg % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
