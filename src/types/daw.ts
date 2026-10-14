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

export const TICKS_PER_BEAT = 960; // Standard MIDI 960 PPQ

export interface ClipRegion {
  id: string;
  name: string;
  startBar: number; // 1-indexed
  lengthBars: number;
  type: TrackType;
  notesCount?: number;
  patternType?: 'chords' | 'melody' | 'drum-beat' | 'bassline' | 'riff' | 'sustained';
}

export interface TrackData {
  id: string;
  trackNumber: number; // Numeric, e.g. 1, 2, 3
  name: string;
  category: InstrumentCategory;
  trackType: TrackType;
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
 * - Arrangement & structure (tracks, sectionMarkers, selectedTrackId)
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

  // Authoritative Playback Transport
  transport: TransportState;
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
