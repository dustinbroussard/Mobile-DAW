import type { Midi as MidiType } from '@tonejs/midi';
import * as ToneMidiModule from '@tonejs/midi';
import {
  ProjectState,
  TrackData,
  ClipRegion,
  MidiNote,
  InstrumentCategory,
  TICKS_PER_BEAT,
  clampPitch,
  clampVelocity,
} from '../types/daw';

export type Midi = MidiType;

// Universal Midi constructor for Vite browser bundle, tsx runtime, and Node ESM
export const Midi = (
  (ToneMidiModule as unknown as { Midi?: typeof MidiType; default?: { Midi?: typeof MidiType } }).Midi ||
  (ToneMidiModule as unknown as { default?: { Midi?: typeof MidiType } }).default?.Midi ||
  ToneMidiModule
) as unknown as typeof MidiType;


/**
 * General MIDI (GM1) Program Number to DAW InstrumentCategory mapper
 */
export function programNumberToCategory(
  programNumber: number = 0,
  channel: number = 0
): InstrumentCategory {
  // Channel 10 (0-indexed channel 9) is General MIDI standard Percussion/Drums
  if (channel === 9 || channel === 10) {
    return 'drums';
  }

  const p = Math.max(0, Math.min(127, Math.round(programNumber)));

  // 0 - 7: Piano
  if (p === 4 || p === 5) return 'electric-piano'; // Rhodes / Electric Piano
  if (p <= 7) return 'piano'; // Acoustic & Grand Piano

  // 8 - 15: Chromatic Percussion
  if (p <= 15) return 'piano';

  // 16 - 23: Organ
  if (p <= 23) return 'blues-organ';

  // 24 - 31: Guitar
  if (p === 27) return 'clean-guitar'; // Electric Guitar (clean)
  if (p <= 31) return 'guitar'; // Acoustic, Overdrive, Distortion

  // 32 - 39: Bass
  if (p <= 39) return 'bass';

  // 40 - 47: Solo Strings
  if (p <= 47) return 'strings';

  // 48 - 55: Ensemble
  if (p === 52 || p === 53 || p === 54) return 'lead-vocal'; // Choir / Voice
  if (p <= 55) return 'strings';

  // 56 - 71: Brass & Reeds / Woodwinds
  if (p <= 71) return 'horns';

  // 72 - 79: Pipes / Flutes
  if (p <= 79) return 'horns';

  // 80 - 87: Synth Lead
  if (p <= 87) return 'lead-vocal';

  // 88 - 95: Synth Pad
  if (p <= 95) return 'strings';

  // 112 - 119: Percussive
  if (p >= 112 && p <= 119) return 'drums';

  // Default fallback
  return 'piano';
}

/**
 * Map InstrumentCategory to standard GM Program Number and recommended MIDI Channel
 */
export function categoryToProgramAndChannel(category: InstrumentCategory): {
  programNumber: number;
  midiChannel: number;
} {
  switch (category) {
    case 'drums':
      return { programNumber: 0, midiChannel: 10 }; // GM Drums (Ch 10)
    case 'electric-piano':
      return { programNumber: 4, midiChannel: 8 }; // Electric Piano 1 (Rhodes)
    case 'blues-organ':
      return { programNumber: 16, midiChannel: 7 }; // Drawbar Organ
    case 'clean-guitar':
      return { programNumber: 27, midiChannel: 3 }; // Clean Electric Guitar
    case 'guitar':
      return { programNumber: 29, midiChannel: 4 }; // Overdriven Guitar
    case 'bass':
      return { programNumber: 33, midiChannel: 2 }; // Electric Bass (finger)
    case 'strings':
      return { programNumber: 48, midiChannel: 5 }; // String Ensemble 1
    case 'horns':
      return { programNumber: 61, midiChannel: 6 }; // Brass Section
    case 'lead-vocal':
      return { programNumber: 80, midiChannel: 11 }; // Lead 1 (square)
    case 'piano':
    default:
      return { programNumber: 0, midiChannel: 1 }; // Acoustic Grand Piano
  }
}

export interface MidiTrackSummary {
  index: number;
  name: string;
  channel: number; // 1-16 (1-indexed for display)
  programNumber: number; // 0-127
  category: InstrumentCategory;
  noteCount: number;
  durationBars: number;
}

export interface MidiAnalysisResult {
  fileName: string;
  format: number; // 0, 1, or 2
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  sourcePPQ: number;
  trackCount: number;
  totalNotes: number;
  estimatedTotalBars: number;
  tracks: MidiTrackSummary[];
  hasMultiChannelTracks: boolean;
  warnings: string[];
}

export interface MidiImportOptions {
  fileName?: string;
  splitByChannel?: boolean; // Default true
  customProjectName?: string;
}

/**
 * Pre-validate MIDI file header bytes (must be at least 14 bytes and begin with 'MThd')
 */
export function validateMidiHeaderBytes(bytes: Uint8Array): { valid: boolean; error?: string } {
  if (bytes.length < 14) {
    return {
      valid: false,
      error: 'File is too small to be a valid Standard MIDI file (minimum 14 bytes required).',
    };
  }

  // Check 'MThd' magic signature: 0x4D, 0x54, 0x68, 0x64
  if (
    bytes[0] !== 0x4d ||
    bytes[1] !== 0x54 ||
    bytes[2] !== 0x68 ||
    bytes[3] !== 0x64
  ) {
    return {
      valid: false,
      error: "Invalid MIDI format: 'MThd' header chunk not found at start of file.",
    };
  }

  return { valid: true };
}

/**
 * Analyze an input MIDI file and extract musical metadata and tracks
 */
export function analyzeMidiFile(
  data: ArrayBuffer | Uint8Array,
  fileName: string = 'Imported Project'
): { success: true; analysis: MidiAnalysisResult; midi: Midi } | { success: false; error: string } {
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Pre-flight validation of binary header
    const headerCheck = validateMidiHeaderBytes(bytes);
    if (!headerCheck.valid) {
      return { success: false, error: headerCheck.error || 'Invalid MIDI file' };
    }

    const midi = new Midi(bytes);
    const warnings: string[] = [];

    // Header metadata
    const sourcePPQ = midi.header.ppq || 480;
    let bpm = 120;
    if (midi.header.tempos && midi.header.tempos.length > 0) {
      bpm = Math.round(midi.header.tempos[0].bpm);
      if (midi.header.tempos.length > 1) {
        warnings.push(
          `File contains ${midi.header.tempos.length} tempo changes. Project set to initial tempo (${bpm} BPM).`
        );
      }
    }

    let num = 4;
    let den = 4;
    if (midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
      const ts = midi.header.timeSignatures[0].timeSignature;
      if (Array.isArray(ts) && ts.length >= 2) {
        num = ts[0] || 4;
        den = ts[1] || 4;
      }
    }

    // Analyze individual tracks
    let totalNotes = 0;
    let maxTickInternal = 0;
    const ticksScale = TICKS_PER_BEAT / sourcePPQ;
    const ticksPerBar = num * TICKS_PER_BEAT;

    const trackSummaries: MidiTrackSummary[] = [];
    const usedChannels = new Set<number>();
    let hasMultiChannelTracks = false;

    // Filter tracks that contain notes or relevant events
    const activeTracks = midi.tracks.filter((t) => t.notes && t.notes.length > 0);
    const tracksToProcess = activeTracks.length > 0 ? activeTracks : midi.tracks;

    tracksToProcess.forEach((t, idx) => {
      const channelZero = t.channel !== undefined ? t.channel : 0;
      if (usedChannels.has(channelZero)) {
        hasMultiChannelTracks = true;
      }
      usedChannels.add(channelZero);

      const noteCount = t.notes ? t.notes.length : 0;
      totalNotes += noteCount;

      let trackMaxTick = 0;
      if (t.notes) {
        t.notes.forEach((n) => {
          const scaledEnd = Math.round((n.ticks + n.durationTicks) * ticksScale);
          if (scaledEnd > trackMaxTick) trackMaxTick = scaledEnd;
        });
      }

      if (trackMaxTick > maxTickInternal) {
        maxTickInternal = trackMaxTick;
      }

      const programNum = t.instrument && t.instrument.number !== undefined ? t.instrument.number : 0;
      const category = programNumberToCategory(programNum, channelZero);
      const trackName = t.name && t.name.trim() ? t.name.trim() : `Track ${idx + 1} (${category})`;

      trackSummaries.push({
        index: idx + 1,
        name: trackName,
        channel: channelZero + 1, // 1-indexed for user display
        programNumber: programNum,
        category,
        noteCount,
        durationBars: Math.max(1, Math.ceil(trackMaxTick / ticksPerBar)),
      });
    });

    const estimatedTotalBars = Math.max(8, Math.ceil(maxTickInternal / ticksPerBar));

    return {
      success: true,
      analysis: {
        fileName,
        format: midi.header.name ? 1 : 0, // General MIDI format estimation
        bpm: Math.max(20, Math.min(300, bpm)),
        timeSignatureNumerator: num,
        timeSignatureDenominator: den,
        sourcePPQ,
        trackCount: tracksToProcess.length,
        totalNotes,
        estimatedTotalBars,
        tracks: trackSummaries,
        hasMultiChannelTracks,
        warnings,
      },
      midi,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to parse MIDI file: ${message || 'Corrupted or unsupported MIDI structure'}`,
    };
  }
}

/**
 * Convert parsed Midi object into the authoritative ProjectState model
 */
export function convertMidiToProject(
  midi: Midi,
  options: MidiImportOptions = {}
): { project: ProjectState; warnings: string[] } {
  const warnings: string[] = [];
  const sourcePPQ = midi.header.ppq || 480;
  const ticksScale = TICKS_PER_BEAT / sourcePPQ;

  // 1. Project-level timing
  let bpm = 120;
  if (midi.header.tempos && midi.header.tempos.length > 0) {
    bpm = Math.round(midi.header.tempos[0].bpm);
  }
  bpm = Math.max(20, Math.min(300, bpm));

  let num = 4;
  let den = 4;
  if (midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
    const ts = midi.header.timeSignatures[0].timeSignature;
    if (Array.isArray(ts) && ts.length >= 2) {
      num = ts[0] || 4;
      den = ts[1] || 4;
    }
  }

  const ticksPerBar = num * TICKS_PER_BEAT;

  // 2. Active Tracks Conversion
  // Exclude empty meta tracks if there are other tracks with notes
  const activeTracks = midi.tracks.filter((t) => t.notes && t.notes.length > 0);
  const tracksToProcess = activeTracks.length > 0 ? activeTracks : midi.tracks;

  let globalMaxTick = 0;
  const projectTracks: TrackData[] = [];

  tracksToProcess.forEach((t, trackIdx) => {
    const channelZero = t.channel !== undefined ? t.channel : 0;
    const programNum = t.instrument && t.instrument.number !== undefined ? t.instrument.number : 0;
    const category = programNumberToCategory(programNum, channelZero);
    const trackId = `track-midi-${trackIdx + 1}-${Date.now().toString(36)}`;

    // Convert notes with scaled PPQ resolution to 960 PPQ
    const regionNotes: MidiNote[] = [];
    let trackMaxTick = 0;

    if (t.notes && t.notes.length > 0) {
      t.notes.forEach((note, noteIdx) => {
        const scaledStartTick = Math.max(0, Math.round(note.ticks * ticksScale));
        const scaledDurationTicks = Math.max(1, Math.round(note.durationTicks * ticksScale));
        const velocityInt = Math.max(1, Math.min(127, Math.round(note.velocity * 127)));
        const pitchInt = clampPitch(note.midi);

        const noteEndTick = scaledStartTick + scaledDurationTicks;
        if (noteEndTick > trackMaxTick) {
          trackMaxTick = noteEndTick;
        }

        regionNotes.push({
          id: `note-${trackIdx + 1}-${noteIdx + 1}-${scaledStartTick}`,
          pitch: pitchInt,
          startTick: scaledStartTick,
          durationTicks: scaledDurationTicks,
          velocity: velocityInt,
        });
      });
    }

    if (trackMaxTick > globalMaxTick) {
      globalMaxTick = trackMaxTick;
    }

    // Determine region length in bars
    const regionLengthBars = Math.max(4, Math.ceil(trackMaxTick / ticksPerBar));

    // Construct region
    const defaultRegion: ClipRegion = {
      id: `region-${trackIdx + 1}-1`,
      name: t.name && t.name.trim() ? t.name.trim() : `${category.toUpperCase()} CLIP`,
      startBar: 1,
      lengthBars: regionLengthBars,
      type: 'midi',
      notes: regionNotes,
      notesCount: regionNotes.length,
      patternType: category === 'drums' ? 'drum-beat' : category === 'bass' ? 'bassline' : 'melody',
    };

    const trackName =
      t.name && t.name.trim()
        ? t.name.trim()
        : `${category.charAt(0).toUpperCase() + category.slice(1)} ${trackIdx + 1}`;

    projectTracks.push({
      id: trackId,
      trackNumber: trackIdx + 1,
      name: trackName,
      category,
      trackType: 'midi',
      midiChannel: channelZero + 1, // 1-16
      programNumber: programNum,
      muted: false,
      soloed: false,
      armed: false,
      volume: 80,
      pan: 0,
      regions: [defaultRegion],
    });
  });

  // Calculate arrangement bounds
  const totalBars = Math.max(8, Math.ceil(globalMaxTick / ticksPerBar) + 2);

  // Generate clean section markers based on arrangement
  const sectionMarkers = [
    { id: 'm1', bar: 1, label: 'INTRO' },
    { id: 'm2', bar: Math.max(2, Math.min(totalBars, 5)), label: 'SECTION A' },
  ];
  if (totalBars >= 12) {
    sectionMarkers.push({ id: 'm3', bar: 9, label: 'SECTION B' });
  }

  const projectName =
    options.customProjectName ||
    (midi.header.name && midi.header.name.trim()
      ? midi.header.name.trim()
      : options.fileName
      ? options.fileName.replace(/\.(mid|midi)$/i, '')
      : 'Imported MIDI Project');

  const selectedTrackId = projectTracks.length > 0 ? projectTracks[0].id : null;
  const selectedRegionId =
    projectTracks.length > 0 && projectTracks[0].regions.length > 0
      ? projectTracks[0].regions[0].id
      : null;

  const project: ProjectState = {
    id: `proj-midi-${Date.now()}`,
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bpm,
    timeSignatureNumerator: num,
    timeSignatureDenominator: den,
    keySignature: 'C Major',
    totalBars,
    loopStartBar: 1,
    loopEndBar: Math.min(totalBars, 5),
    tracks: projectTracks,
    sectionMarkers,
    selectedTrackId,
    selectedRegionId,
    transport: {
      isPlaying: false,
      isRecording: false,
      isLooping: false,
      currentBar: 1,
      currentBeat: 1,
      currentTick: 0,
      metronomeOn: false,
    },
  };

  return { project, warnings };
}

/**
 * Export the actual current ProjectState (with live edits) to a standard MIDI Format 1 file
 */
export function exportProjectToMidi(project: ProjectState): Uint8Array {
  const midi = new Midi();

  // 1. Header & Song Metadata
  // Set to standard 960 PPQ resolution
  midi.header.fromJSON({ ...midi.header.toJSON(), ppq: TICKS_PER_BEAT });
  midi.header.name = project.name;

  // Set tempo
  const bpm = Math.max(20, Math.min(300, project.bpm || 120));
  midi.header.setTempo(bpm);

  // Set Time Signature
  const num = Math.max(1, Math.min(32, project.timeSignatureNumerator || 4));
  const den = Math.max(1, Math.min(32, project.timeSignatureDenominator || 4));
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [num, den],
  });

  const ticksPerBar = num * TICKS_PER_BEAT;

  // 2. Export each track and its genuine edited notes
  project.tracks.forEach((track, _trackIndex) => {
    // Only export MIDI tracks or tracks with MIDI notes
    const isMidi = track.trackType === 'midi';
    const totalNotes = track.regions.reduce(
      (sum, r) => sum + (r.notes ? r.notes.length : 0),
      0
    );

    // If it's an audio track with 0 notes, we skip it or create an empty track marker
    if (!isMidi && totalNotes === 0) {
      return;
    }

    const midiTrack = midi.addTrack();
    midiTrack.name = track.name;

    // Channel mapping: Channel 10 for drums, or user track channel (0-indexed in @tonejs/midi)
    let channelZero = 0;
    if (track.category === 'drums' || track.midiChannel === 10) {
      channelZero = 9; // Drum channel in General MIDI is channel 10 (0-indexed 9)
    } else if (track.midiChannel && track.midiChannel >= 1 && track.midiChannel <= 16) {
      channelZero = track.midiChannel - 1;
    } else {
      const def = categoryToProgramAndChannel(track.category);
      channelZero = def.midiChannel - 1;
    }
    midiTrack.channel = channelZero;

    // Instrument program assignment
    let programNumber = 0;
    if (track.programNumber !== undefined && track.programNumber >= 0 && track.programNumber <= 127) {
      programNumber = track.programNumber;
    } else {
      const def = categoryToProgramAndChannel(track.category);
      programNumber = def.programNumber;
    }
    midiTrack.instrument.number = programNumber;

    // Write all note events from all regions across timeline
    track.regions.forEach((region) => {
      if (!region.notes || region.notes.length === 0) return;

      const regionStartTick = Math.max(0, (region.startBar - 1) * ticksPerBar);

      region.notes.forEach((note) => {
        const absoluteTick = Math.max(0, regionStartTick + note.startTick);
        const duration = Math.max(1, note.durationTicks);
        const velocityNorm = clampVelocity(note.velocity) / 127;
        const pitch = clampPitch(note.pitch);

        midiTrack.addNote({
          midi: pitch,
          ticks: absoluteTick,
          durationTicks: duration,
          velocity: velocityNorm,
        });
      });
    });
  });

  return midi.toArray();
}

/**
 * Trigger browser file download of the project as a standard .mid file
 */
export function downloadMidiFile(project: ProjectState, customFileName?: string): void {
  const bytes = exportProjectToMidi(project);
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const cleanName = (customFileName || project.name || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${cleanName}.mid`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
