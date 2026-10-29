import {
  ProjectState,
  TrackData,
  MidiNote,
  createMidiNote,
  TICKS_PER_BEAT,
} from '../src/types/daw';
import { INITIAL_PROJECT_STATE } from '../src/config/mockData';
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  DAW_PROJECT_FILE_FORMAT,
} from '../src/types/projectFile';
import {
  exportProjectToJson,
  serializeProjectToFile,
  validateAndMigrateProjectFile,
  sanitizeProjectForExport,
  getProjectFingerprint,
} from '../src/utils/projectPersistence';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

function runPersistenceTests() {
  console.log('\n========================================');
  console.log('--- 1. Testing Populated Project Serialization & Round-Trip ---');
  console.log('========================================');

  // Populate test project with customized data
  const populatedProject: ProjectState = {
    ...INITIAL_PROJECT_STATE,
    id: 'test-proj-001',
    name: 'Neo-Tokyo Midnight Groove',
    bpm: 128,
    timeSignatureNumerator: 3,
    timeSignatureDenominator: 4,
    keySignature: 'D Minor',
    totalBars: 32,
    loopStartBar: 5,
    loopEndBar: 13,
    sectionMarkers: [
      { id: 'sec-1', bar: 1, label: 'INTRO' },
      { id: 'sec-2', bar: 5, label: 'VERSE' },
      { id: 'sec-3', bar: 13, label: 'CHORUS' },
    ],
    transport: {
      isPlaying: true, // Should be sanitized to false
      isRecording: true, // Should be sanitized to false
      currentBar: 8, // Should be sanitized to 1
      currentBeat: 2, // Should be sanitized to 1
      currentTick: 480, // Should be sanitized to 0
      isLooping: true,
      metronomeOn: true,
    },
  };

  // Add notes with specific pitch, velocity, and tick offsets
  const customNotes: MidiNote[] = [
    createMidiNote(60, 0, 480, 100), // C4
    createMidiNote(64, 480, 480, 115), // E4
    createMidiNote(67, 960, 960, 95), // G4
    createMidiNote(72, 1920, 1920, 127), // C5
  ];
  populatedProject.tracks[0].regions[0].notes = customNotes;

  // 1. Check Sanitization
  const sanitized = sanitizeProjectForExport(populatedProject);
  assert(sanitized.transport.isPlaying === false, 'Sanitization resets isPlaying to false');
  assert(sanitized.transport.isRecording === false, 'Sanitization resets isRecording to false');
  assert(sanitized.transport.currentBar === 1, 'Sanitization resets currentBar to 1');
  assert(sanitized.transport.currentBeat === 1, 'Sanitization resets currentBeat to 1');
  assert(sanitized.transport.currentTick === 0, 'Sanitization resets currentTick to 0');
  assert(sanitized.transport.isLooping === true, 'Sanitization preserves loop state');
  assert(sanitized.transport.metronomeOn === true, 'Sanitization preserves metronome setting');

  // 2. Serialize to file envelope
  const fileEnvelope = serializeProjectToFile(populatedProject, '1.2.0');
  assert(fileEnvelope.format === DAW_PROJECT_FILE_FORMAT, `Envelope has format "${DAW_PROJECT_FILE_FORMAT}"`);
  assert(fileEnvelope.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION, `Envelope has schemaVersion ${CURRENT_PROJECT_SCHEMA_VERSION}`);
  assert(fileEnvelope.appVersion === '1.2.0', 'Envelope carries appVersion');
  assert(typeof fileEnvelope.exportedAt === 'string', 'Envelope carries ISO exportedAt timestamp');

  // 3. Export to JSON string
  const jsonString = exportProjectToJson(populatedProject);
  assert(typeof jsonString === 'string' && jsonString.length > 500, 'JSON string successfully produced');

  // 4. Parse & Validate Round-Trip
  const parsedObj = JSON.parse(jsonString);
  const result = validateAndMigrateProjectFile(parsedObj);
  assert(result.success === true, 'validateAndMigrateProjectFile returns success: true');

  if (result.success) {
    const loaded = result.project;
    assert(loaded.id === populatedProject.id, `Project ID preserved: ${loaded.id}`);
    assert(loaded.name === 'Neo-Tokyo Midnight Groove', `Project name preserved: ${loaded.name}`);
    assert(loaded.bpm === 128, `BPM preserved: ${loaded.bpm}`);
    assert(loaded.timeSignatureNumerator === 3, 'Time signature numerator preserved');
    assert(loaded.timeSignatureDenominator === 4, 'Time signature denominator preserved');
    assert(loaded.keySignature === 'D Minor', 'Key signature preserved');
    assert(loaded.totalBars === 32, 'Total bars preserved');
    assert(loaded.loopStartBar === 5, 'Loop start bar preserved');
    assert(loaded.loopEndBar === 13, 'Loop end bar preserved');
    assert(loaded.sectionMarkers.length === 3, 'All 3 section markers preserved');
    assert(loaded.sectionMarkers[1].label === 'VERSE', 'Marker label preserved');
    assert(loaded.tracks.length === populatedProject.tracks.length, `All ${loaded.tracks.length} tracks preserved in identical order`);

    // Verify track metadata
    const loadedTrack0 = loaded.tracks[0];
    assert(loadedTrack0.name === populatedProject.tracks[0].name, 'Track name preserved');
    assert(loadedTrack0.category === populatedProject.tracks[0].category, 'Track category preserved');
    assert(loadedTrack0.trackType === populatedProject.tracks[0].trackType, 'Track type preserved');
    assert(loadedTrack0.volume === populatedProject.tracks[0].volume, 'Track volume preserved');
    assert(loadedTrack0.pan === populatedProject.tracks[0].pan, 'Track pan preserved');

    // Verify Note Data strictly
    const loadedNotes = loadedTrack0.regions[0].notes;
    assert(loadedNotes.length === 4, `All 4 custom notes preserved in region (got ${loadedNotes.length})`);
    assert(loadedNotes[0].pitch === 60, 'Note 0 pitch is 60 (C4)');
    assert(loadedNotes[0].startTick === 0, 'Note 0 startTick is 0');
    assert(loadedNotes[0].durationTicks === 480, 'Note 0 durationTicks is 480');
    assert(loadedNotes[0].velocity === 100, 'Note 0 velocity is 100');

    assert(loadedNotes[1].pitch === 64, 'Note 1 pitch is 64');
    assert(loadedNotes[1].startTick === 480, 'Note 1 startTick is 480');
    assert(loadedNotes[1].durationTicks === 480, 'Note 1 durationTicks is 480');
    assert(loadedNotes[1].velocity === 115, 'Note 1 velocity is 115');

    assert(loadedNotes[3].pitch === 72, 'Note 3 pitch is 72 (C5)');
    assert(loadedNotes[3].startTick === 1920, 'Note 3 startTick is 1920');
    assert(loadedNotes[3].durationTicks === 1920, 'Note 3 durationTicks is 1920');
    assert(loadedNotes[3].velocity === 127, 'Note 3 velocity is 127');
  }

  console.log('\n========================================');
  console.log('--- 2. Testing Empty / Minimal Project Serialization ---');
  console.log('========================================');

  const emptyProject: ProjectState = {
    id: 'empty-proj',
    name: 'Minimal Blank Project',
    createdAt: Date.now(),
    bpm: 100,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    keySignature: 'C Major',
    totalBars: 16,
    loopStartBar: 1,
    loopEndBar: 5,
    selectedTrackId: 'tr-empty-1',
    selectedRegionId: 'rg-empty-1',
    sectionMarkers: [],
    tracks: [
      {
        id: 'tr-empty-1',
        trackNumber: 1,
        name: 'Acoustic Piano',
        category: 'piano',
        trackType: 'midi',
        volume: 80,
        pan: 0,
        muted: false,
        soloed: false,
        armed: false,
        programNumber: 0,
        midiChannel: 1,
        regions: [
          {
            id: 'rg-empty-1',
            name: 'Empty Clip',
            startBar: 1,
            lengthBars: 4,
            type: 'midi',
            notes: [], // ZERO NOTES
          },
        ],
      },
    ],
    transport: {
      isPlaying: false,
      isRecording: false,
      currentBar: 1,
      currentBeat: 1,
      currentTick: 0,
      isLooping: true,
      metronomeOn: false,
    },
    updatedAt: Date.now(),
  };

  const emptyJson = exportProjectToJson(emptyProject);
  const emptyRes = validateAndMigrateProjectFile(JSON.parse(emptyJson));
  assert(emptyRes.success === true, 'Empty project with 0 notes serializes and validates cleanly');
  if (emptyRes.success) {
    assert(emptyRes.project.tracks.length === 1, 'Empty project has 1 track');
    assert(emptyRes.project.tracks[0].regions[0].notes.length === 0, 'Region has 0 notes');
    assert(emptyRes.project.sectionMarkers.length === 0, 'Empty markers array preserved');
  }

  console.log('\n========================================');
  console.log('--- 3. Testing Malformed & Invalid Files Handling ---');
  console.log('========================================');

  // 1. Non-object / null
  const nullRes = validateAndMigrateProjectFile(null);
  assert(nullRes.success === false, 'Rejects null input with error');
  if (nullRes.success === false) {
    assert(typeof nullRes.error === 'string', 'Returns readable error message for null');
  }

  const numberRes = validateAndMigrateProjectFile(12345);
  assert(numberRes.success === false, 'Rejects number input with error');

  const stringRes = validateAndMigrateProjectFile('random string');
  assert(stringRes.success === false, 'Rejects string input with error');

  // 2. Unrecognized format
  const invalidFormat = validateAndMigrateProjectFile({
    format: 'SOME_OTHER_FORMAT',
    schemaVersion: 1,
    project: {},
  });
  assert(invalidFormat.success === false, 'Rejects unknown format header');

  // 3. Incompatible future schema version
  const futureSchema = validateAndMigrateProjectFile({
    format: DAW_PROJECT_FILE_FORMAT,
    schemaVersion: 99,
    project: {},
  });
  assert(futureSchema.success === false, 'Rejects future schema version 99');
  if (futureSchema.success === false) {
    assert(futureSchema.error.includes('Unsupported project schema'), 'Informs user about newer unsupported schema');
  }

  // 4. Missing project property in envelope
  const missingProj = validateAndMigrateProjectFile({
    format: DAW_PROJECT_FILE_FORMAT,
    schemaVersion: 1,
  });
  assert(missingProj.success === false, 'Rejects envelope missing "project" object');

  // 5. Corrupted tracks: tracks is not an array
  const corruptedTracks = validateAndMigrateProjectFile({
    format: DAW_PROJECT_FILE_FORMAT,
    schemaVersion: 1,
    project: {
      tracks: 'not an array',
    },
  });
  assert(corruptedTracks.success === false, 'Rejects corrupted project where tracks is not an array');

  console.log('\n========================================');
  console.log('--- 4. Testing Automatic Repair & Range Clamping ---');
  console.log('========================================');

  // Out of range parameters should be safely clamped without crashing
  const outOfRangeInput = {
    format: DAW_PROJECT_FILE_FORMAT,
    schemaVersion: 1,
    project: {
      name: 'Extreme Clamping Test',
      bpm: 9999, // Should clamp to 240
      timeSignatureNumerator: 999, // Should default to 4
      timeSignatureDenominator: 7, // Invalid denominator, should default to 4
      tracks: [
        {
          id: 't-clamped',
          name: 'Clamped Track',
          category: 'piano',
          trackType: 'midi',
          volume: 500, // Should clamp to 100
          pan: -300, // Should clamp to -50
          regions: [
            {
              id: 'r-clamped',
              startBar: 1,
              lengthBars: 4,
              notes: [
                {
                  id: 'n-out',
                  pitch: 250, // Should clamp to 127
                  startTick: -100, // Should clamp to 0
                  durationTicks: -50, // Should repair to default TICKS_PER_BEAT
                  velocity: 500, // Should clamp to 127
                },
                {
                  id: 'n-low',
                  pitch: -20, // Should clamp to 0
                  startTick: 0,
                  durationTicks: 240,
                  velocity: -10, // Should clamp to 1
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const clampedRes = validateAndMigrateProjectFile(outOfRangeInput);
  assert(clampedRes.success === true, 'Repairs out-of-range values gracefully');
  if (clampedRes.success) {
    const p = clampedRes.project;
    assert(p.bpm === 240, `BPM clamped to 240 (got ${p.bpm})`);
    assert(p.timeSignatureNumerator === 4, 'Invalid numerator defaulted to 4');
    assert(p.timeSignatureDenominator === 4, 'Invalid denominator defaulted to 4');
    assert(p.tracks[0].volume === 100, `Track volume clamped to 100 (got ${p.tracks[0].volume})`);
    assert(p.tracks[0].pan === -50, `Track pan clamped to -50 (got ${p.tracks[0].pan})`);

    const note1 = p.tracks[0].regions[0].notes.find((n) => n.id === 'n-out')!;
    assert(Boolean(note1), 'Note n-out exists');
    assert(note1.pitch === 127, `Note pitch clamped to 127 (got ${note1.pitch})`);
    assert(note1.startTick === 0, `Negative startTick repaired to 0 (got ${note1.startTick})`);
    assert(note1.durationTicks > 0, `Negative duration repaired to positive ticks (got ${note1.durationTicks})`);
    assert(note1.velocity === 127, `Velocity clamped to 127 (got ${note1.velocity})`);

    const note2 = p.tracks[0].regions[0].notes.find((n) => n.id === 'n-low')!;
    assert(Boolean(note2), 'Note n-low exists');
    assert(note2.pitch === 0, `Note pitch clamped to 0 (got ${note2.pitch})`);
    assert(note2.velocity === 1, `Velocity clamped to minimum 1 (got ${note2.velocity})`);
  }

  console.log('\n========================================');
  console.log('--- 5. Testing Legacy Unversioned Migration Path ---');
  console.log('========================================');

  // An older raw ProjectState object without the wrapper envelope
  const legacyRawProject = {
    id: 'legacy-proj-99',
    name: 'Old Version Project',
    bpm: 110,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    tracks: [
      {
        id: 'legacy-t1',
        name: 'Legacy Piano',
        category: 'piano',
        trackType: 'midi',
        volume: 75,
        regions: [],
      },
    ],
  };

  const legacyRes = validateAndMigrateProjectFile(legacyRawProject);
  assert(legacyRes.success === true, 'Migrates unversioned project format to Schema v1');
  if (legacyRes.success) {
    assert(legacyRes.schemaVersion === 0, 'Records source schema version as 0 (legacy)');
    assert(legacyRes.project.name === 'Old Version Project', 'Preserves legacy project name');
    assert(legacyRes.project.tracks.length === 1, 'Preserves legacy tracks');
    assert(legacyRes.project.totalBars === 24, 'Fills in default totalBars');
    assert(legacyRes.project.transport.isPlaying === false, 'Initializes valid transport');
  }

  console.log('\n========================================');
  console.log('--- 6. Testing Project Fingerprinting & Dirty Detection ---');
  console.log('========================================');

  const p1 = { ...INITIAL_PROJECT_STATE, name: 'Project 1' };
  const p2 = { ...INITIAL_PROJECT_STATE, name: 'Project 1' };
  assert(getProjectFingerprint(p1) === getProjectFingerprint(p2), 'Identical projects have identical fingerprint');

  const pChanged = { ...p1, bpm: 135 };
  assert(getProjectFingerprint(p1) !== getProjectFingerprint(pChanged), 'Changing BPM alters fingerprint');

  const pPlaying = { ...p1, transport: { ...p1.transport, isPlaying: true, currentBar: 5 } };
  assert(getProjectFingerprint(p1) === getProjectFingerprint(pPlaying), 'Transient playback position changes do not falsely mark project dirty');

  console.log('\n========================================');
  console.log(`Persistence Test Suite Completed: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPersistenceTests();
