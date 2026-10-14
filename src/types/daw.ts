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

export interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  currentBar: number;
  currentBeat: number;
  currentTick: number; // 0 - 959 ticks per beat (960 PPQ)
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  keySignature: string;
  metronomeOn: boolean;
}

export interface SectionMarker {
  id: string;
  bar: number;
  label: string;
}

/**
 * Authoritative Single Project State Model
 * Encapsulates all musical and composition state.
 */
export interface ProjectState {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  keySignature: string;
  tracks: TrackData[];
  sectionMarkers: SectionMarker[];
  selectedTrackId: string | null;
  transport: TransportState;
}
