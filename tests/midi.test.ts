import assert from 'node:assert';
import {
  Midi,
  analyzeMidiFile,
  convertMidiToProject,
  exportProjectToMidi,
  programNumberToCategory,
  categoryToProgramAndChannel,
  validateMidiHeaderBytes,
} from '../src/utils/midiConverter';
import {
  ProjectState,
  TrackData,
  ClipRegion,
  MidiNote,
  TICKS_PER_BEAT,
  createMidiNote,
} from '../src/types/daw';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('========================================');
console.log('--- 1. Testing GM Instrument Mapping ---');
console.log('========================================');

test('Channel 10 maps to drums regardless of program number', () => {
  assert.strictEqual(programNumberToCategory(0, 9), 'drums');
  assert.strictEqual(programNumberToCategory(25, 9), 'drums');
  assert.strictEqual(programNumberToCategory(0, 10), 'drums');
});

test('Program numbers map to correct instrument categories', () => {
  assert.strictEqual(programNumberToCategory(0, 0), 'piano'); // Acoustic Grand
  assert.strictEqual(programNumberToCategory(4, 0), 'electric-piano'); // Rhodes
  assert.strictEqual(programNumberToCategory(16, 0), 'blues-organ'); // Organ
  assert.strictEqual(programNumberToCategory(27, 0), 'clean-guitar'); // Clean guitar
  assert.strictEqual(programNumberToCategory(29, 0), 'guitar'); // Overdrive guitar
  assert.strictEqual(programNumberToCategory(33, 0), 'bass'); // Electric bass
  assert.strictEqual(programNumberToCategory(48, 0), 'strings'); // String ensemble
  assert.strictEqual(programNumberToCategory(56, 0), 'horns'); // Trumpet
  assert.strictEqual(programNumberToCategory(61, 0), 'horns'); // Brass section
  assert.strictEqual(programNumberToCategory(80, 0), 'lead-vocal'); // Synth lead
});

test('categoryToProgramAndChannel returns standard GM definitions', () => {
  const piano = categoryToProgramAndChannel('piano');
  assert.strictEqual(piano.programNumber, 0);
  assert.strictEqual(piano.midiChannel, 1);

  const drums = categoryToProgramAndChannel('drums');
  assert.strictEqual(drums.midiChannel, 10);

  const bass = categoryToProgramAndChannel('bass');
  assert.strictEqual(bass.programNumber, 33);
  assert.strictEqual(bass.midiChannel, 2);
});

console.log('========================================');
console.log('--- 2. Testing MIDI Pre-Flight Validation ---');
console.log('========================================');

test('Rejects buffers smaller than 14 bytes', () => {
  const tiny = new Uint8Array([0x4d, 0x54, 0x68, 0x64]);
  const res = validateMidiHeaderBytes(tiny);
  assert.strictEqual(res.valid, false);
  assert.match(res.error || '', /too small/i);
});

test('Rejects files without MThd magic header', () => {
  const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const res = validateMidiHeaderBytes(garbage);
  assert.strictEqual(res.valid, false);
  assert.match(res.error || '', /MThd/i);
});

test('Accepts valid 14-byte MThd header', () => {
  const validHeader = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x01, // format 1
    0x00, 0x02, // 2 tracks
    0x01, 0xe0, // 480 PPQ
  ]);
  const res = validateMidiHeaderBytes(validHeader);
  assert.strictEqual(res.valid, true);
});

console.log('========================================');
console.log('--- 3. Testing Format 0 MIDI Import ---');
console.log('========================================');

test('Parses Format 0 multi-channel file and creates tracks', () => {
  // Format 0 SMF with channel 0 (piano) and channel 9 (drums)
  const header = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0];
  // Track chunk: delta=0, Ch 0 NoteOn C4(60) vel 90
  // delta=0, Ch 9 NoteOn Kick(36) vel 110
  // delta=240, Ch 0 NoteOff C4
  // delta=0, Ch 9 NoteOff Kick
  // delta=0, End of Track
  const trackData = [
    0x00, 0x90, 0x3c, 0x5a,
    0x00, 0x99, 0x24, 0x6e,
    0x81, 0x70, 0x80, 0x3c, 0x00,
    0x00, 0x89, 0x24, 0x00,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, trackData.length];
  const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackData]);

  const analysisRes = analyzeMidiFile(fileBytes, 'Format0Test.mid');
  assert.strictEqual(analysisRes.success, true);
  if (!analysisRes.success) return;

  assert.strictEqual(analysisRes.analysis.trackCount, 2);
  assert.strictEqual(analysisRes.analysis.totalNotes, 2);
  assert.strictEqual(analysisRes.analysis.sourcePPQ, 480);

  const converted = convertMidiToProject(analysisRes.midi, { fileName: 'Format0Test.mid' });
  assert.strictEqual(converted.project.tracks.length, 2);

  const pianoTrack = converted.project.tracks.find((t) => t.category === 'piano');
  assert.ok(pianoTrack, 'Piano track should exist');
  assert.strictEqual(pianoTrack?.regions[0].notes.length, 1);
  assert.strictEqual(pianoTrack?.regions[0].notes[0].pitch, 60);

  // Scaled from 480 PPQ to 960 PPQ: duration 240 * (960 / 480) = 480
  assert.strictEqual(pianoTrack?.regions[0].notes[0].durationTicks, 480);

  const drumTrack = converted.project.tracks.find((t) => t.category === 'drums');
  assert.ok(drumTrack, 'Drum track should exist');
  assert.strictEqual(drumTrack?.regions[0].notes.length, 1);
  assert.strictEqual(drumTrack?.regions[0].notes[0].pitch, 36);
});

console.log('========================================');
console.log('--- 4. Testing Note-On Velocity 0 as Note-Off ---');
console.log('========================================');

test('Note-On with velocity 0 is correctly handled as Note-Off', () => {
  const header = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0];
  const trackData = [
    0x00, 0x90, 0x3c, 0x64, // Note On C4 vel 100
    0x81, 0x70, 0x90, 0x3c, 0x00, // Note On C4 vel 0 (acts as note off)
    0x00, 0xff, 0x2f, 0x00,
  ];
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, trackData.length];
  const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackData]);

  const analysisRes = analyzeMidiFile(fileBytes, 'VelZeroTest.mid');
  assert.strictEqual(analysisRes.success, true);
  if (!analysisRes.success) return;

  assert.strictEqual(analysisRes.analysis.totalNotes, 1);
  const converted = convertMidiToProject(analysisRes.midi);
  const note = converted.project.tracks[0].regions[0].notes[0];
  assert.strictEqual(note.pitch, 60);
  assert.strictEqual(note.durationTicks, 480); // 240 ticks * 2x scale = 480 ticks
});

console.log('========================================');
console.log('--- 5. Testing Non-Standard PPQ Scaling ---');
console.log('========================================');

test('Converts 192 PPQ file to 960 PPQ without timing drift', () => {
  // PPQ = 192 (0x00C0)
  const header = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0xc0];
  // Note on at delta=0, off at delta=192 (quarter note)
  // Variable length 192: 0x81 0x40
  const trackData = [
    0x00, 0x90, 0x40, 0x60, // E4
    0x81, 0x40, 0x80, 0x40, 0x00,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, trackData.length];
  const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackData]);

  const analysisRes = analyzeMidiFile(fileBytes, 'PPQ192Test.mid');
  assert.strictEqual(analysisRes.success, true);
  if (!analysisRes.success) return;

  assert.strictEqual(analysisRes.analysis.sourcePPQ, 192);
  const converted = convertMidiToProject(analysisRes.midi);
  const note = converted.project.tracks[0].regions[0].notes[0];
  // 192 * (960 / 192) = 960 ticks = 1 quarter note exactly!
  assert.strictEqual(note.durationTicks, 960);
});

console.log('========================================');
console.log('--- 6. Testing Polyphony & Simultaneous Notes ---');
console.log('========================================');

test('Preserves simultaneous notes in polyphonic chords', () => {
  const m = new Midi();
  m.header.fromJSON({ ...m.header.toJSON(), ppq: 960 });
  m.header.setTempo(120);
  const track = m.addTrack();
  track.name = 'Chords';

  // 3-note chord: C4 (60), E4 (64), G4 (67) at tick 0, duration 960
  track.addNote({ midi: 60, ticks: 0, durationTicks: 960, velocity: 0.8 });
  track.addNote({ midi: 64, ticks: 0, durationTicks: 960, velocity: 0.8 });
  track.addNote({ midi: 67, ticks: 0, durationTicks: 960, velocity: 0.8 });

  const bytes = m.toArray();
  const analysisRes = analyzeMidiFile(bytes, 'PolyphonyTest.mid');
  assert.strictEqual(analysisRes.success, true);
  if (!analysisRes.success) return;

  assert.strictEqual(analysisRes.analysis.totalNotes, 3);
  const converted = convertMidiToProject(analysisRes.midi);
  const notes = converted.project.tracks[0].regions[0].notes;
  assert.strictEqual(notes.length, 3);

  const pitches = notes.map((n) => n.pitch).sort((a, b) => a - b);
  assert.deepStrictEqual(pitches, [60, 64, 67]);
  notes.forEach((n) => {
    assert.strictEqual(n.startTick, 0);
    assert.strictEqual(n.durationTicks, 960);
  });
});

console.log('========================================');
console.log('--- 7. Testing Round-Trip Export and Re-Import ---');
console.log('========================================');

test('Exported project with edited notes and metadata re-imports identically', () => {
  // Construct a project state representing manual edits made by user
  const editedProject: ProjectState = {
    id: 'proj-edited-test',
    name: 'Cyber Groove Anthem',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bpm: 135,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    keySignature: 'F Minor',
    totalBars: 16,
    loopStartBar: 1,
    loopEndBar: 9,
    sectionMarkers: [{ id: 'm1', bar: 1, label: 'INTRO' }],
    selectedTrackId: 't1',
    transport: {
      isPlaying: false,
      isRecording: false,
      isLooping: true,
      currentBar: 1,
      currentBeat: 1,
      currentTick: 0,
      metronomeOn: false,
    },
    tracks: [
      {
        id: 't1',
        trackNumber: 1,
        name: 'Grand Piano Lead',
        category: 'piano',
        trackType: 'midi',
        midiChannel: 1,
        programNumber: 0,
        muted: false,
        soloed: false,
        armed: false,
        volume: 85,
        pan: -10,
        regions: [
          {
            id: 'r1',
            name: 'Piano Verse 1',
            startBar: 1,
            lengthBars: 8,
            type: 'midi',
            notes: [
              createMidiNote(60, 0, 480, 100, 'p1'), // C4
              createMidiNote(63, 480, 480, 110, 'p2'), // Eb4
              createMidiNote(67, 960, 960, 120, 'p3'), // G4
            ],
          },
        ],
      },
      {
        id: 't2',
        trackNumber: 2,
        name: '808 Drum Machine',
        category: 'drums',
        trackType: 'midi',
        midiChannel: 10,
        programNumber: 0,
        muted: false,
        soloed: false,
        armed: false,
        volume: 90,
        pan: 0,
        regions: [
          {
            id: 'r2',
            name: '808 Beat',
            startBar: 1,
            lengthBars: 8,
            type: 'midi',
            notes: [
              createMidiNote(36, 0, 240, 127, 'd1'), // Bass Drum
              createMidiNote(38, 960, 240, 115, 'd2'), // Snare Drum
            ],
          },
        ],
      },
      {
        id: 't3',
        trackNumber: 3,
        name: 'Sub Bass',
        category: 'bass',
        trackType: 'midi',
        midiChannel: 2,
        programNumber: 38, // Synth Bass 1
        muted: false,
        soloed: false,
        armed: false,
        volume: 80,
        pan: 0,
        regions: [
          {
            id: 'r3',
            name: 'Bass Riff',
            startBar: 1,
            lengthBars: 8,
            type: 'midi',
            notes: [
              createMidiNote(36, 0, 720, 105, 'b1'), // C2
              createMidiNote(39, 960, 480, 108, 'b2'), // Eb2
            ],
          },
        ],
      },
    ],
  };

  // 1. Export project to standard MIDI binary
  const midiBytes = exportProjectToMidi(editedProject);
  assert.ok(midiBytes instanceof Uint8Array, 'Export must produce Uint8Array');
  assert.ok(midiBytes.length > 50, 'Exported bytes must be non-empty');

  // Verify header magic bytes
  assert.strictEqual(midiBytes[0], 0x4d); // 'M'
  assert.strictEqual(midiBytes[1], 0x54); // 'T'
  assert.strictEqual(midiBytes[2], 0x68); // 'h'
  assert.strictEqual(midiBytes[3], 0x64); // 'd'

  // 2. Re-import the exported MIDI binary
  const analysisRes = analyzeMidiFile(midiBytes, 'Cyber_Groove.mid');
  assert.strictEqual(analysisRes.success, true);
  if (!analysisRes.success) return;

  assert.strictEqual(analysisRes.analysis.bpm, 135, 'Tempo must be preserved at 135 BPM');
  assert.strictEqual(analysisRes.analysis.timeSignatureNumerator, 4);
  assert.strictEqual(analysisRes.analysis.timeSignatureDenominator, 4);
  assert.strictEqual(analysisRes.analysis.sourcePPQ, 960, 'PPQ resolution must be 960');
  assert.strictEqual(analysisRes.analysis.trackCount, 3, 'Must have 3 tracks');
  assert.strictEqual(analysisRes.analysis.totalNotes, 7, 'Must have 3 + 2 + 2 = 7 notes total');

  // 3. Convert to ProjectState and verify exact notes
  const reimported = convertMidiToProject(analysisRes.midi, { fileName: 'Cyber_Groove.mid' });
  const pTracks = reimported.project.tracks;

  // Track 1 (Piano)
  const piano = pTracks.find((t) => t.category === 'piano');
  assert.ok(piano, 'Grand piano track must exist');
  assert.strictEqual(piano?.regions[0].notes.length, 3);
  assert.strictEqual(piano?.regions[0].notes[0].pitch, 60);
  assert.strictEqual(piano?.regions[0].notes[0].startTick, 0);
  assert.strictEqual(piano?.regions[0].notes[0].durationTicks, 480);
  assert.strictEqual(piano?.regions[0].notes[0].velocity, 100);

  assert.strictEqual(piano?.regions[0].notes[1].pitch, 63);
  assert.strictEqual(piano?.regions[0].notes[1].startTick, 480);
  assert.strictEqual(piano?.regions[0].notes[1].durationTicks, 480);
  assert.strictEqual(piano?.regions[0].notes[1].velocity, 110);

  // Track 2 (Drums)
  const drums = pTracks.find((t) => t.category === 'drums');
  assert.ok(drums, 'Drums track must exist');
  assert.strictEqual(drums?.midiChannel, 10, 'Drum channel must be 10');
  assert.strictEqual(drums?.regions[0].notes.length, 2);
  assert.strictEqual(drums?.regions[0].notes[0].pitch, 36);
  assert.strictEqual(drums?.regions[0].notes[0].startTick, 0);
  assert.strictEqual(drums?.regions[0].notes[0].durationTicks, 240);
  assert.strictEqual(drums?.regions[0].notes[0].velocity, 127);

  // Track 3 (Bass)
  const bass = pTracks.find((t) => t.category === 'bass');
  assert.ok(bass, 'Bass track must exist');
  assert.strictEqual(bass?.regions[0].notes.length, 2);
  assert.strictEqual(bass?.regions[0].notes[0].pitch, 36);
  assert.strictEqual(bass?.regions[0].notes[0].startTick, 0);
  assert.strictEqual(bass?.regions[0].notes[0].durationTicks, 720);
  assert.strictEqual(bass?.regions[0].notes[0].velocity, 105);
});

console.log('========================================');
console.log('--- 8. Testing Malformed Input Files ---');
console.log('========================================');

test('Handles corrupted random data without throwing exception', () => {
  const randomBytes = new Uint8Array([12, 45, 99, 128, 255, 0, 14, 55, 90, 88, 12, 11, 4, 1]);
  const res = analyzeMidiFile(randomBytes, 'corrupted.mid');
  if (res.success === false) {
    assert.match(res.error, /invalid midi format/i);
  } else {
    assert.fail('Expected parse error on corrupted input');
  }
});

test('Handles truncated file ending abruptly', () => {
  // Valid header, but zero tracks follow
  assert.doesNotThrow(() => {
    const truncated = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00, 0x02, 0x01, 0xe0,
    ]);
    const res = analyzeMidiFile(truncated, 'truncated.mid');
    if ('error' in res) {
      assert.ok(res.error);
    } else {
      assert.strictEqual(res.analysis.totalNotes, 0);
    }
  });
});

console.log('========================================');
console.log(`MIDI Test Suite Completed: ${passed} passed, ${failed} failed.`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
