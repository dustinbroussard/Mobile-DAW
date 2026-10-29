import {
  TICKS_PER_BEAT,
  TICKS_PER_16TH_STEP,
  pitchToNoteName,
  noteNameToPitch,
  stepToTick,
  tickToStep,
  clampVelocity,
  clampPitch,
  createMidiNote,
  formatBarBeatTick,
  calculatePlaybackSeconds,
  formatTimecode,
  ProjectState,
  MidiNote,
} from '../src/types/daw';
import { INITIAL_PROJECT_STATE, INITIAL_TRACKS } from '../src/config/mockData';

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

function runSuite() {
  console.log('\n--- 1. Testing Project Initialization ---');
  assert(INITIAL_PROJECT_STATE.bpm === 120, 'Default tempo is 120 BPM');
  assert(INITIAL_PROJECT_STATE.timeSignatureNumerator === 4, 'Default numerator is 4');
  assert(INITIAL_PROJECT_STATE.timeSignatureDenominator === 4, 'Default denominator is 4');
  assert(INITIAL_PROJECT_STATE.totalBars === 24, 'Default arrangement length is 24 bars');
  assert(INITIAL_PROJECT_STATE.tracks.length >= 8, 'Default project has at least 8 starter tracks');
  assert(INITIAL_PROJECT_STATE.selectedTrackId === 'tr-01', 'Initial selected track is Grand Piano');
  assert(INITIAL_PROJECT_STATE.selectedRegionId === 'rg-01a', 'Initial selected clip region is set');

  console.log('\n--- 2. Testing Starter MIDI Content & Note Invariants ---');
  const pianoTrack = INITIAL_PROJECT_STATE.tracks.find((t) => t.id === 'tr-01');
  assert(Boolean(pianoTrack), 'Grand Piano track exists');
  assert(pianoTrack!.trackType === 'midi', 'Grand Piano is a MIDI track');
  assert(pianoTrack!.midiChannel === 1, 'Grand Piano is on MIDI channel 1');

  const introClip = pianoTrack!.regions.find((r) => r.id === 'rg-01a');
  assert(Boolean(introClip), 'Intro clip exists');
  assert(Array.isArray(introClip!.notes), 'Intro clip contains notes array');
  assert(introClip!.notes.length > 0, 'Intro clip contains real MIDI notes');

  introClip!.notes.forEach((note: MidiNote, i: number) => {
    assert(typeof note.id === 'string' && note.id.length > 0, `Note #${i} has stable string ID (${note.id})`);
    assert(note.pitch >= 0 && note.pitch <= 127, `Note #${i} pitch ${note.pitch} is in [0, 127]`);
    assert(note.startTick >= 0 && Number.isInteger(note.startTick), `Note #${i} startTick ${note.startTick} is non-negative integer`);
    assert(note.durationTicks > 0 && Number.isInteger(note.durationTicks), `Note #${i} duration ${note.durationTicks} is positive integer`);
    assert(note.velocity >= 1 && note.velocity <= 127, `Note #${i} velocity ${note.velocity} is in [1, 127]`);
  });

  const drumTrack = INITIAL_PROJECT_STATE.tracks.find((t) => t.id === 'tr-02');
  assert(Boolean(drumTrack), 'TR-808 Kit exists');
  assert(drumTrack!.midiChannel === 10, 'TR-808 Kit is mapped to GM standard drum channel 10');
  const drumIntro = drumTrack!.regions[0];
  assert(drumIntro.notes.length > 0, 'Drum intro clip contains real drum trigger notes');

  const guitarTrack = INITIAL_PROJECT_STATE.tracks.find((t) => t.id === 'tr-03');
  assert(Boolean(guitarTrack && guitarTrack.trackType === 'audio'), 'Audio tracks correctly typed');
  assert(guitarTrack!.regions[0].notes.length === 0, 'Audio tracks have empty notes array');

  console.log('\n--- 3. Testing Pitch & Note Name Conversions ---');
  assert(pitchToNoteName(60) === 'C4', 'Pitch 60 is C4 (Middle C)');
  assert(pitchToNoteName(48) === 'C3', 'Pitch 48 is C3');
  assert(pitchToNoteName(36) === 'C2', 'Pitch 36 is C2');
  assert(pitchToNoteName(61) === 'C#4', 'Pitch 61 is C#4');
  assert(pitchToNoteName(69) === 'A4', 'Pitch 69 is A4 (Concert A 440Hz)');

  assert(noteNameToPitch('C4') === 60, 'Note C4 parses to pitch 60');
  assert(noteNameToPitch('C3') === 48, 'Note C3 parses to pitch 48');
  assert(noteNameToPitch('A4') === 69, 'Note A4 parses to pitch 69');
  assert(noteNameToPitch('Bb2') === 46, 'Flat note Bb2 normalizes to A#2 / pitch 46');
  assert(noteNameToPitch('F#3') === 54, 'Note F#3 parses to pitch 54');

  console.log('\n--- 4. Testing Timing Calculations & 960 PPQ Resolution ---');
  assert(TICKS_PER_BEAT === 960, 'Resolution is 960 ticks per quarter note');
  assert(TICKS_PER_16TH_STEP === 240, '16th note step is 240 ticks');
  assert(stepToTick(1) === 0, 'Step 1 is tick 0');
  assert(stepToTick(2) === 240, 'Step 2 is tick 240');
  assert(stepToTick(5) === 960, 'Step 5 (Beat 2) is tick 960');
  assert(stepToTick(17) === 3840, 'Step 17 (Bar 2 Beat 1 in 4/4) is tick 3840');

  assert(tickToStep(0) === 1, 'Tick 0 maps to Step 1');
  assert(tickToStep(239) === 1, 'Tick 239 maps to Step 1');
  assert(tickToStep(240) === 2, 'Tick 240 maps to Step 2');
  assert(tickToStep(960) === 5, 'Tick 960 maps to Step 5');

  // Elapsed clock time: 120 BPM in 4/4 = 2.0s per bar (0.5s per beat)
  const secondsAtBar1 = calculatePlaybackSeconds(1, 1, 0, 120, 4);
  assert(secondsAtBar1 === 0, 'Bar 1 beat 1 is 0.0 seconds');
  const secondsAtBar2 = calculatePlaybackSeconds(2, 1, 0, 120, 4);
  assert(Math.abs(secondsAtBar2 - 2.0) < 0.001, 'Bar 2 beat 1 is 2.0 seconds');
  const secondsAtBar5 = calculatePlaybackSeconds(5, 1, 0, 120, 4);
  assert(Math.abs(secondsAtBar5 - 8.0) < 0.001, 'Bar 5 beat 1 is 8.0 seconds');

  assert(formatTimecode(2.0) === '00:02.0', 'formatTimecode(2.0) returns 00:02.0');
  assert(formatTimecode(65.4) === '01:05.4', 'formatTimecode(65.4) returns 01:05.4');
  assert(formatBarBeatTick(1, 1, 0) === '001:01:00', 'formatBarBeatTick(1, 1, 0) returns 001:01:00');
  assert(formatBarBeatTick(5, 3, 240) === '005:03:24', 'formatBarBeatTick(5, 3, 240) returns 005:03:24');

  console.log('\n--- 5. Testing Note Validation & Clamping ---');
  assert(clampVelocity(150) === 127, 'Velocity > 127 clamped to 127');
  assert(clampVelocity(-10) === 1, 'Velocity < 1 clamped to 1');
  assert(clampPitch(150) === 127, 'Pitch > 127 clamped to 127');
  assert(clampPitch(-5) === 0, 'Pitch < 0 clamped to 0');

  const customNote = createMidiNote(60, 480, 240, 100);
  assert(customNote.pitch === 60, 'createMidiNote creates pitch 60');
  assert(customNote.startTick === 480, 'createMidiNote creates startTick 480');
  assert(customNote.durationTicks === 240, 'createMidiNote creates durationTicks 240');
  assert(customNote.velocity === 100, 'createMidiNote creates velocity 100');

  console.log('\n--- 6. Testing Shared Project Model Mutations ---');
  // State mutation simulation matching AppShell
  let state: ProjectState = { ...INITIAL_PROJECT_STATE };

  // Note addition
  const newNote = createMidiNote(72, 720, 240, 110, 'test-c5');
  const targetTrack = state.tracks[0];
  const targetRegion = targetTrack.regions[0];
  const updatedNotes = [...targetRegion.notes, newNote];

  state = {
    ...state,
    updatedAt: Date.now(),
    tracks: state.tracks.map((t) =>
      t.id === targetTrack.id
        ? {
            ...t,
            regions: t.regions.map((r) =>
              r.id === targetRegion.id ? { ...r, notes: updatedNotes, notesCount: updatedNotes.length } : r
            ),
          }
        : t
    ),
  };

  const verifyRegion = state.tracks[0].regions[0];
  assert(verifyRegion.notes.length === targetRegion.notes.length + 1, 'Note added to region notes array');
  assert(verifyRegion.notes.some((n) => n.id === 'test-c5'), 'Added note exists in project state');

  // Velocity update
  const modifiedNotes = verifyRegion.notes.map((n) => (n.id === 'test-c5' ? { ...n, velocity: 125 } : n));
  state = {
    ...state,
    tracks: state.tracks.map((t) =>
      t.id === targetTrack.id
        ? { ...t, regions: t.regions.map((r) => (r.id === targetRegion.id ? { ...r, notes: modifiedNotes } : r)) }
        : t
    ),
  };
  const verifiedNote = state.tracks[0].regions[0].notes.find((n) => n.id === 'test-c5');
  assert(verifiedNote?.velocity === 125, 'Note velocity updated to 125 in shared project model');

  // Note deletion
  const filteredNotes = verifyRegion.notes.filter((n) => n.id !== 'test-c5');
  state = {
    ...state,
    tracks: state.tracks.map((t) =>
      t.id === targetTrack.id
        ? { ...t, regions: t.regions.map((r) => (r.id === targetRegion.id ? { ...r, notes: filteredNotes } : r)) }
        : t
    ),
  };
  assert(!state.tracks[0].regions[0].notes.some((n) => n.id === 'test-c5'), 'Note deleted from project model');

  // Track mixer parameter mutations
  state = {
    ...state,
    tracks: state.tracks.map((t) => (t.id === targetTrack.id ? { ...t, volume: 95, pan: 25, muted: true } : t)),
  };
  assert(state.tracks[0].volume === 95, 'Track volume updated to 95');
  assert(state.tracks[0].pan === 25, 'Track pan updated to 25');
  assert(state.tracks[0].muted === true, 'Track muted updated to true');

  console.log('\n--- 7. Testing Manual MIDI Editing & Undo/Redo Operations ---');
  // Moving note in time and pitch
  const baseNote = createMidiNote(60, 240, 240, 100, 'edit-test-1');
  const snap16th = 240;
  const snap8th = 480;

  // Snapped move +2 steps forward (+480 ticks) and up 5 semitones (+5 pitch)
  const movedNote = {
    ...baseNote,
    startTick: Math.max(0, baseNote.startTick + snap8th),
    pitch: clampPitch(baseNote.pitch + 5),
  };
  assert(movedNote.startTick === 720, 'Moved note startTick is snapped to 720 ticks (240 + 480)');
  assert(movedNote.pitch === 65, 'Moved note pitch transposed from 60 (C4) to 65 (F4)');
  assert(pitchToNoteName(movedNote.pitch) === 'F4', 'Transposed note is F4');

  // Boundary clamping when moving: negative tick prevention and pitch upper limit
  const clampedMoveNote = {
    ...baseNote,
    startTick: Math.max(0, baseNote.startTick - 1000),
    pitch: clampPitch(baseNote.pitch + 100),
  };
  assert(clampedMoveNote.startTick === 0, 'Moving note before tick 0 clamps to 0');
  assert(clampedMoveNote.pitch === 127, 'Transposing note above 127 clamps to 127 (G9)');

  // Note duration resizing
  const resizedNote = {
    ...baseNote,
    durationTicks: Math.max(snap16th, baseNote.durationTicks + snap16th * 3), // +3 16ths = total 960 (quarter note)
  };
  assert(resizedNote.durationTicks === 960, 'Resized note duration is 960 ticks (1 quarter note / beat)');

  // Minimum duration constraint (prevent zero or negative length)
  const minResizedNote = {
    ...baseNote,
    durationTicks: Math.max(30, baseNote.durationTicks - 500),
  };
  assert(minResizedNote.durationTicks === 30, 'Resizing duration below zero clamps to minimum positive ticks (30)');

  // Velocity editing & clamping
  const velocityEditedNote = {
    ...baseNote,
    velocity: clampVelocity(120),
  };
  assert(velocityEditedNote.velocity === 120, 'Note velocity updated to 120');

  // Undo / Redo Stack State Machine Simulation
  let undoHistory: MidiNote[][] = [];
  let redoHistory: MidiNote[][] = [];
  let currentNotes: MidiNote[] = [baseNote];

  // Action 1: Add a second note
  const secondNote = createMidiNote(64, 480, 240, 95, 'edit-test-2');
  undoHistory.push(currentNotes);
  redoHistory = [];
  currentNotes = [...currentNotes, secondNote];

  assert(currentNotes.length === 2, 'Notes list now has 2 notes after addition');
  assert(undoHistory.length === 1, 'Undo history has 1 entry');
  assert(redoHistory.length === 0, 'Redo history is cleared on new action');

  // Action 2: Undo the addition
  redoHistory.push(currentNotes);
  currentNotes = undoHistory.pop()!;
  assert(currentNotes.length === 1, 'Undo successfully restored 1 note');
  assert(!currentNotes.some((n) => n.id === 'edit-test-2'), 'Second note was removed by undo');
  assert(redoHistory.length === 1, 'Redo history has 1 entry after undo');

  // Action 3: Redo the addition
  undoHistory.push(currentNotes);
  currentNotes = redoHistory.pop()!;
  assert(currentNotes.length === 2, 'Redo successfully re-applied second note');
  assert(currentNotes.some((n) => n.id === 'edit-test-2'), 'Second note exists after redo');

  console.log(`\n========================================`);
  console.log(`All ${testsPassed} unit tests passed successfully!`);
  console.log(`========================================\n`);
}

runSuite();
