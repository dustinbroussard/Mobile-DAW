import {
  ProjectState,
  TrackData,
  ClipRegion,
  MidiNote,
  SectionMarker,
  TICKS_PER_BEAT,
  clampPitch,
  clampVelocity,
} from '../types/daw';
import {
  DAW_PROJECT_FILE_FORMAT,
  CURRENT_PROJECT_SCHEMA_VERSION,
  DAW_PROJECT_FILE_EXTENSION,
  ProjectFileV1,
  ProjectValidationResult,
} from '../types/projectFile';

export const AUTOSAVE_STORAGE_KEY = 'daw_studio_project_autosave_v1';
export const AUTOSAVE_TIMESTAMP_KEY = 'daw_studio_project_autosave_timestamp_v1';

/**
 * Prepares project state for clean serialization.
 * Resets transient playback/recording flags while preserving loop & metronome settings.
 */
export function sanitizeProjectForExport(project: ProjectState): ProjectState {
  return {
    ...project,
    transport: {
      ...project.transport,
      isPlaying: false,
      isRecording: false,
      currentBar: 1,
      currentBeat: 1,
      currentTick: 0,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Creates a normalized signature string to detect unsaved changes.
 */
export function getProjectFingerprint(project: ProjectState): string {
  const sanitized = sanitizeProjectForExport(project);
  // Exclude updatedAt from dirty checking so timestamp updates don't falsely trigger dirty state
  const { updatedAt: _, ...rest } = sanitized;
  return JSON.stringify(rest);
}

/**
 * Serializes project state into the versioned ProjectFileV1 JSON structure.
 */
export function serializeProjectToFile(
  project: ProjectState,
  appVersion = '1.0.0'
): ProjectFileV1 {
  const sanitizedProject = sanitizeProjectForExport(project);

  return {
    format: DAW_PROJECT_FILE_FORMAT,
    schemaVersion: 1,
    appVersion,
    exportedAt: new Date().toISOString(),
    project: sanitizedProject,
  };
}

/**
 * Generates an export-ready JSON string with clean 2-space indentation.
 */
export function exportProjectToJson(project: ProjectState): string {
  const fileData = serializeProjectToFile(project);
  return JSON.stringify(fileData, null, 2);
}

/**
 * Triggers a browser download of the project as a `.dawproj` (JSON) file.
 * Returns the downloaded filename.
 */
export function downloadProjectFile(
  project: ProjectState,
  customFilename?: string
): string {
  const jsonContent = exportProjectToJson(project);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });

  // Generate safe filename from project name if not specified
  let safeName = customFilename?.trim();
  if (!safeName) {
    const sanitizedTitle = project.name
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    safeName = `${sanitizedTitle || 'daw_project'}${DAW_PROJECT_FILE_EXTENSION}`;
  } else if (!safeName.endsWith(DAW_PROJECT_FILE_EXTENSION) && !safeName.endsWith('.json')) {
    safeName = `${safeName}${DAW_PROJECT_FILE_EXTENSION}`;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return safeName;
}

/**
 * Validates, repairs non-fatal anomalies, and migrates project data.
 */
export function validateAndMigrateProjectFile(rawInput: unknown): ProjectValidationResult {
  const warnings: string[] = [];

  if (rawInput === null || typeof rawInput !== 'object') {
    return {
      success: false,
      error: 'Invalid file format: content is not a valid JSON object.',
    };
  }

  const candidate = rawInput as Record<string, unknown>;

  // Check if this is a wrapped ProjectFile envelope or a raw ProjectState
  let candidateProject: Record<string, unknown>;
  let sourceSchemaVersion = 1;

  if (candidate.format === DAW_PROJECT_FILE_FORMAT) {
    // Valid envelope format
    const version = Number(candidate.schemaVersion);
    if (!Number.isInteger(version) || version <= 0) {
      return {
        success: false,
        error: `Invalid schema version in project file: expected positive integer, got ${candidate.schemaVersion}`,
      };
    }

    if (version > CURRENT_PROJECT_SCHEMA_VERSION) {
      return {
        success: false,
        error: `Unsupported project schema (v${version}). This application supports up to schema v${CURRENT_PROJECT_SCHEMA_VERSION}. Please update the application.`,
      };
    }

    sourceSchemaVersion = version;

    if (!candidate.project || typeof candidate.project !== 'object') {
      return {
        success: false,
        error: 'Project file is missing the required "project" state data object.',
      };
    }

    candidateProject = candidate.project as Record<string, unknown>;
  } else if (Array.isArray(candidate.tracks) && typeof candidate.bpm === 'number') {
    // Raw legacy ProjectState without envelope (unversioned migration path)
    warnings.push('Legacy unversioned project format detected; migrating to Schema v1.');
    candidateProject = candidate;
    sourceSchemaVersion = 0; // Legacy schema
  } else {
    return {
      success: false,
      error: 'Unrecognized file format: expected a valid DAW Studio project (.dawproj) file.',
    };
  }

  // Validate Project Identity & Musical Properties
  const id = typeof candidateProject.id === 'string' && candidateProject.id ? candidateProject.id : `proj-${Date.now()}`;
  const name = typeof candidateProject.name === 'string' && candidateProject.name.trim() ? candidateProject.name.trim() : 'Untitled Project';

  const bpmRaw = Number(candidateProject.bpm);
  const bpm = Number.isFinite(bpmRaw) ? Math.min(240, Math.max(40, Math.round(bpmRaw))) : 120;
  if (bpmRaw !== bpm) {
    warnings.push(`Project BPM (${bpmRaw}) was clamped to valid range [40, 240] (${bpm}).`);
  }

  const numRaw = Number(candidateProject.timeSignatureNumerator);
  const timeSignatureNumerator = Number.isInteger(numRaw) && numRaw >= 1 && numRaw <= 32 ? numRaw : 4;

  const denRaw = Number(candidateProject.timeSignatureDenominator);
  const timeSignatureDenominator = [1, 2, 4, 8, 16, 32].includes(denRaw) ? denRaw : 4;

  const keySignature = typeof candidateProject.keySignature === 'string' && candidateProject.keySignature.trim()
    ? candidateProject.keySignature.trim()
    : 'C Major';

  const totalBarsRaw = Number(candidateProject.totalBars);
  const totalBars = Number.isInteger(totalBarsRaw) && totalBarsRaw >= 1 ? Math.min(256, Math.max(4, totalBarsRaw)) : 24;

  const loopStartBarRaw = Number(candidateProject.loopStartBar);
  const loopStartBar = Number.isInteger(loopStartBarRaw) && loopStartBarRaw >= 1 ? Math.min(totalBars, loopStartBarRaw) : 1;

  const loopEndBarRaw = Number(candidateProject.loopEndBar);
  const loopEndBar = Number.isInteger(loopEndBarRaw) && loopEndBarRaw > loopStartBar
    ? Math.min(totalBars, loopEndBarRaw)
    : Math.min(totalBars, loopStartBar + 4);

  // Validate Tracks
  if (!Array.isArray(candidateProject.tracks)) {
    return {
      success: false,
      error: 'Corrupted project data: "tracks" field is not an array.',
    };
  }

  const validatedTracks: TrackData[] = [];

  for (let tIdx = 0; tIdx < candidateProject.tracks.length; tIdx++) {
    const rawTrack = candidateProject.tracks[tIdx];
    if (!rawTrack || typeof rawTrack !== 'object') {
      warnings.push(`Skipped invalid track at index ${tIdx}.`);
      continue;
    }

    const tr = rawTrack as Record<string, unknown>;
    const trackId = typeof tr.id === 'string' && tr.id ? tr.id : `tr-${tIdx + 1}-${Date.now()}`;
    const trackName = typeof tr.name === 'string' && tr.name ? tr.name : `Track ${tIdx + 1}`;
    const category = typeof tr.category === 'string' ? (tr.category as TrackData['category']) : 'piano';
    const trackType = tr.trackType === 'audio' ? 'audio' : 'midi';

    const volumeRaw = Number(tr.volume);
    const volume = Number.isFinite(volumeRaw) ? Math.min(100, Math.max(0, Math.round(volumeRaw))) : 80;

    const panRaw = Number(tr.pan);
    const pan = Number.isFinite(panRaw) ? Math.min(50, Math.max(-50, Math.round(panRaw))) : 0;

    const muted = Boolean(tr.muted);
    const soloed = Boolean(tr.soloed);
    const armed = Boolean(tr.armed);

    const programNumberRaw = Number(tr.programNumber);
    const programNumber = Number.isInteger(programNumberRaw) ? Math.min(127, Math.max(0, programNumberRaw)) : 0;

    const midiChannelRaw = Number(tr.midiChannel);
    const midiChannel = Number.isInteger(midiChannelRaw) ? Math.min(16, Math.max(1, midiChannelRaw)) : (tIdx % 16) + 1;

    const trackNumberRaw = Number(tr.trackNumber);
    const trackNumber = Number.isInteger(trackNumberRaw) && trackNumberRaw >= 1 ? trackNumberRaw : tIdx + 1;

    // Validate Clip Regions for this track
    const rawRegions = Array.isArray(tr.regions) ? tr.regions : [];
    const validatedRegions: ClipRegion[] = [];

    for (let rIdx = 0; rIdx < rawRegions.length; rIdx++) {
      const rawReg = rawRegions[rIdx];
      if (!rawReg || typeof rawReg !== 'object') continue;

      const reg = rawReg as Record<string, unknown>;
      const regionId = typeof reg.id === 'string' && reg.id ? reg.id : `rg-${trackId}-${rIdx + 1}`;
      const regionName = typeof reg.name === 'string' && reg.name ? reg.name : `${trackName} Region ${rIdx + 1}`;
      const startBar = Number.isInteger(Number(reg.startBar)) && Number(reg.startBar) >= 1 ? Number(reg.startBar) : 1;
      const lengthBars = Number.isInteger(Number(reg.lengthBars)) && Number(reg.lengthBars) >= 1 ? Number(reg.lengthBars) : 4;
      const regType = reg.type === 'audio' ? 'audio' : 'midi';

      // Validate MIDI Note Events
      const rawNotes = Array.isArray(reg.notes) ? reg.notes : [];
      const validatedNotes: MidiNote[] = [];

      for (let nIdx = 0; nIdx < rawNotes.length; nIdx++) {
        const rawNote = rawNotes[nIdx];
        if (!rawNote || typeof rawNote !== 'object') continue;

        const note = rawNote as Record<string, unknown>;
        const noteId = typeof note.id === 'string' && note.id ? note.id : `note-${regionId}-${nIdx + 1}`;
        const rawPitch = Number(note.pitch);
        const pitch = Number.isFinite(rawPitch) ? clampPitch(Math.round(rawPitch)) : 60;

        const startTickRaw = Number(note.startTick);
        const startTick = Number.isInteger(startTickRaw) && startTickRaw >= 0 ? startTickRaw : 0;

        const durRaw = Number(note.durationTicks);
        const durationTicks = Number.isInteger(durRaw) && durRaw > 0 ? durRaw : TICKS_PER_BEAT;

        const rawVel = Number(note.velocity);
        const velocity = Number.isFinite(rawVel) ? clampVelocity(Math.round(rawVel)) : 90;

        validatedNotes.push({
          id: noteId,
          pitch,
          startTick,
          durationTicks,
          velocity,
        });
      }

      // Sort notes chronologically by startTick, then pitch
      validatedNotes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);

      validatedRegions.push({
        id: regionId,
        name: regionName,
        startBar,
        lengthBars,
        type: regType,
        notes: validatedNotes,
      });
    }

    validatedTracks.push({
      id: trackId,
      trackNumber,
      name: trackName,
      category,
      trackType,
      volume,
      pan,
      muted,
      soloed,
      armed,
      programNumber,
      midiChannel,
      regions: validatedRegions,
    });
  }

  // Validate Section Markers
  const rawMarkers = Array.isArray(candidateProject.sectionMarkers) ? candidateProject.sectionMarkers : [];
  const validatedMarkers: SectionMarker[] = [];

  for (let mIdx = 0; mIdx < rawMarkers.length; mIdx++) {
    const rawM = rawMarkers[mIdx];
    if (!rawM || typeof rawM !== 'object') continue;
    const m = rawM as Record<string, unknown>;

    const markerId = typeof m.id === 'string' && m.id ? m.id : `marker-${mIdx + 1}`;
    const bar = Number.isInteger(Number(m.bar)) && Number(m.bar) >= 1 ? Number(m.bar) : 1;
    const label = typeof m.label === 'string' && m.label ? m.label : `SECTION ${mIdx + 1}`;

    validatedMarkers.push({ id: markerId, bar, label });
  }

  // Transport State Validation
  const rawTrans = (candidateProject.transport || {}) as Record<string, unknown>;
  const transport = {
    isPlaying: false, // Always initialize paused when importing
    isRecording: false,
    currentBar: 1,
    currentBeat: 1,
    currentTick: 0,
    isLooping: Boolean(rawTrans.isLooping ?? true),
    metronomeOn: Boolean(rawTrans.metronomeOn ?? false),
  };

  const selectedTrackId =
    typeof candidateProject.selectedTrackId === 'string' &&
    validatedTracks.some((t) => t.id === candidateProject.selectedTrackId)
      ? candidateProject.selectedTrackId
      : validatedTracks[0]?.id || null;

  const activeTrack = validatedTracks.find((t) => t.id === selectedTrackId);
  const selectedRegionId =
    typeof candidateProject.selectedRegionId === 'string' &&
    activeTrack?.regions.some((r) => r.id === candidateProject.selectedRegionId)
      ? candidateProject.selectedRegionId
      : activeTrack?.regions[0]?.id || null;

  const createdAt = Number.isFinite(Number(candidateProject.createdAt))
    ? Number(candidateProject.createdAt)
    : Date.now();

  const finalProject: ProjectState = {
    id,
    name,
    createdAt,
    updatedAt: Date.now(),
    bpm,
    timeSignatureNumerator,
    timeSignatureDenominator,
    keySignature,
    totalBars,
    loopStartBar,
    loopEndBar,
    selectedTrackId,
    selectedRegionId,
    sectionMarkers: validatedMarkers,
    tracks: validatedTracks,
    transport,
  };

  return {
    success: true,
    project: finalProject,
    schemaVersion: sourceSchemaVersion,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Parses and validates an uploaded project file from an HTML <input type="file" />.
 */
export async function readProjectFromFile(file: File): Promise<ProjectValidationResult> {
  try {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Could not parse "${file.name}": File is not valid JSON.`,
      };
    }

    return validateAndMigrateProjectFile(parsed);
  } catch (err) {
    return {
      success: false,
      error: `Failed to read file "${file.name}": ${(err as Error).message}`,
    };
  }
}

/**
 * Saves project state to browser localStorage for autosave / session recovery.
 */
export function saveProjectToLocalStorage(project: ProjectState): boolean {
  try {
    const file = serializeProjectToFile(project);
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(file));
    localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, Date.now().toString());
    return true;
  } catch (e) {
    console.warn('DAW Project autosave to localStorage failed (storage quota or disabled):', e);
    return false;
  }
}

/**
 * Loads project state from browser localStorage if available and valid.
 */
export function loadProjectFromLocalStorage(): { project: ProjectState; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const result = validateAndMigrateProjectFile(parsed);
    if (!result.success) return null;

    const timestampStr = localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY);
    const timestamp = timestampStr ? Number(timestampStr) : Date.now();

    return {
      project: result.project,
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Clears the autosaved project from localStorage.
 */
export function clearLocalStorageAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('Failed to clear autosave:', e);
  }
}
