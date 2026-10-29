import { TrackData, SectionMarker, ProjectState, MidiNote, createMidiNote } from '../types/daw';

export const INITIAL_SECTION_MARKERS: SectionMarker[] = [
  { id: 'm1', bar: 1, label: 'INTRO' },
  { id: 'm2', bar: 5, label: 'VERSE 1' },
  { id: 'm3', bar: 9, label: 'CHORUS' },
  { id: 'm4', bar: 13, label: 'SOLO' },
  { id: 'm5', bar: 17, label: 'OUTRO' },
];

/* -------------------------------------------------------------------------- */
/* Real Starter MIDI Musical Patterns                                         */
/* -------------------------------------------------------------------------- */

// Grand Piano Intro Chords (Bar 1-4, C - Am - F - G)
const PIANO_INTRO_NOTES: MidiNote[] = [
  // Bar 1: C Major (C3=48, E3=52, G3=55, C4=60)
  createMidiNote(48, 0, 1800, 95, 'pno-1-1'),
  createMidiNote(52, 0, 1800, 90, 'pno-1-2'),
  createMidiNote(55, 0, 1800, 88, 'pno-1-3'),
  createMidiNote(60, 0, 1800, 92, 'pno-1-4'),
  createMidiNote(48, 1920, 1600, 90, 'pno-1-5'),
  createMidiNote(52, 1920, 1600, 85, 'pno-1-6'),
  createMidiNote(55, 1920, 1600, 86, 'pno-1-7'),
  createMidiNote(60, 1920, 1600, 90, 'pno-1-8'),

  // Bar 2: A Minor (A2=45, C3=48, E3=52, A3=57)
  createMidiNote(45, 3840, 1800, 92, 'pno-2-1'),
  createMidiNote(48, 3840, 1800, 88, 'pno-2-2'),
  createMidiNote(52, 3840, 1800, 86, 'pno-2-3'),
  createMidiNote(57, 3840, 1800, 90, 'pno-2-4'),
  createMidiNote(45, 5760, 1600, 88, 'pno-2-5'),
  createMidiNote(48, 5760, 1600, 84, 'pno-2-6'),
  createMidiNote(52, 5760, 1600, 85, 'pno-2-7'),
  createMidiNote(57, 5760, 1600, 88, 'pno-2-8'),

  // Bar 3: F Major (F2=41, C3=48, F3=53, A3=57)
  createMidiNote(41, 7680, 3600, 90, 'pno-3-1'),
  createMidiNote(48, 7680, 3600, 85, 'pno-3-2'),
  createMidiNote(53, 7680, 3600, 88, 'pno-3-3'),
  createMidiNote(57, 7680, 3600, 92, 'pno-3-4'),

  // Bar 4: G Major (G2=43, D3=50, G3=55, B3=59)
  createMidiNote(43, 11520, 3600, 94, 'pno-4-1'),
  createMidiNote(50, 11520, 3600, 88, 'pno-4-2'),
  createMidiNote(55, 11520, 3600, 90, 'pno-4-3'),
  createMidiNote(59, 11520, 3600, 96, 'pno-4-4'),
];

// TR-808 Beat Intro (Kick=36, Snare=38, Closed Hat=42, Open Hat=46)
const DRUM_INTRO_NOTES: MidiNote[] = [
  // Bar 1
  createMidiNote(36, 0, 240, 115, 'drm-1-k1'), // Kick beat 1
  createMidiNote(42, 0, 200, 90, 'drm-1-h1'),  // Hat
  createMidiNote(42, 480, 200, 80, 'drm-1-h2'),
  createMidiNote(38, 960, 240, 110, 'drm-1-s1'), // Snare beat 2
  createMidiNote(42, 960, 200, 95, 'drm-1-h3'),
  createMidiNote(42, 1440, 200, 80, 'drm-1-h4'),
  createMidiNote(36, 1920, 240, 112, 'drm-1-k2'), // Kick beat 3
  createMidiNote(36, 2400, 240, 105, 'drm-1-k3'), // Kick syncopation
  createMidiNote(42, 1920, 200, 90, 'drm-1-h5'),
  createMidiNote(42, 2400, 200, 85, 'drm-1-h6'),
  createMidiNote(38, 2880, 240, 110, 'drm-1-s2'), // Snare beat 4
  createMidiNote(42, 2880, 200, 95, 'drm-1-h7'),
  createMidiNote(46, 3360, 400, 90, 'drm-1-oh1'), // Open hat

  // Bar 2
  createMidiNote(36, 3840, 240, 118, 'drm-2-k1'),
  createMidiNote(42, 3840, 200, 90, 'drm-2-h1'),
  createMidiNote(42, 4320, 200, 80, 'drm-2-h2'),
  createMidiNote(38, 4800, 240, 110, 'drm-2-s1'),
  createMidiNote(42, 4800, 200, 95, 'drm-2-h3'),
  createMidiNote(36, 5760, 240, 110, 'drm-2-k2'),
  createMidiNote(42, 5760, 200, 90, 'drm-2-h5'),
  createMidiNote(38, 6720, 240, 112, 'drm-2-s2'),
  createMidiNote(42, 6720, 200, 95, 'drm-2-h7'),
  createMidiNote(42, 7200, 200, 85, 'drm-2-h8'),

  // Bar 3 & 4 continuation
  createMidiNote(36, 7680, 240, 115, 'drm-3-k1'),
  createMidiNote(38, 8640, 240, 110, 'drm-3-s1'),
  createMidiNote(36, 9600, 240, 112, 'drm-3-k2'),
  createMidiNote(38, 10560, 240, 110, 'drm-3-s2'),
  createMidiNote(36, 11520, 240, 118, 'drm-4-k1'),
  createMidiNote(38, 12480, 240, 112, 'drm-4-s1'),
  createMidiNote(38, 14400, 240, 115, 'drm-4-s2'),
];

// Precision Bass Intro / Groove (C2=36, G2=43, A2=45, F2=41)
const BASS_INTRO_NOTES: MidiNote[] = [
  // Bar 1
  createMidiNote(36, 0, 720, 105, 'bss-1-1'),
  createMidiNote(36, 960, 480, 95, 'bss-1-2'),
  createMidiNote(43, 1920, 720, 100, 'bss-1-3'),
  createMidiNote(36, 2880, 480, 90, 'bss-1-4'),
  // Bar 2
  createMidiNote(45, 3840, 720, 105, 'bss-2-1'),
  createMidiNote(45, 4800, 480, 95, 'bss-2-2'),
  createMidiNote(48, 5760, 720, 100, 'bss-2-3'),
  createMidiNote(43, 6720, 480, 90, 'bss-2-4'),
  // Bar 3
  createMidiNote(41, 7680, 720, 105, 'bss-3-1'),
  createMidiNote(41, 8640, 480, 95, 'bss-3-2'),
  createMidiNote(48, 9600, 720, 100, 'bss-3-3'),
  // Bar 4
  createMidiNote(43, 11520, 720, 105, 'bss-4-1'),
  createMidiNote(43, 12480, 480, 95, 'bss-4-2'),
  createMidiNote(50, 13440, 720, 100, 'bss-4-3'),
];

// Orchestral Strings Pad (C4=60, E4=64, G4=67, A4=69, C5=72)
const STRINGS_PAD_NOTES: MidiNote[] = [
  createMidiNote(60, 0, 7680, 80, 'str-1-1'),
  createMidiNote(64, 0, 7680, 78, 'str-1-2'),
  createMidiNote(67, 0, 7680, 82, 'str-1-3'),
  createMidiNote(72, 0, 7680, 85, 'str-1-4'),
  createMidiNote(57, 7680, 7680, 82, 'str-2-1'),
  createMidiNote(60, 7680, 7680, 80, 'str-2-2'),
  createMidiNote(64, 7680, 7680, 82, 'str-2-3'),
  createMidiNote(69, 7680, 7680, 86, 'str-2-4'),
];

// Brass Horns Stabs (E4=64, G4=67, C5=72)
const BRASS_STABS_NOTES: MidiNote[] = [
  createMidiNote(64, 0, 360, 110, 'brs-1-1'),
  createMidiNote(67, 0, 360, 112, 'brs-1-2'),
  createMidiNote(72, 0, 360, 115, 'brs-1-3'),
  createMidiNote(64, 960, 360, 105, 'brs-1-4'),
  createMidiNote(67, 960, 360, 108, 'brs-1-5'),
  createMidiNote(72, 960, 360, 110, 'brs-1-6'),
  createMidiNote(65, 1920, 480, 115, 'brs-1-7'),
  createMidiNote(69, 1920, 480, 116, 'brs-1-8'),
  createMidiNote(72, 1920, 480, 120, 'brs-1-9'),
];

// Blues Hammond B3 Organ (C4=60, Eb4=63, F4=65, F#4=66, G4=67, Bb4=70)
const ORGAN_SWELL_NOTES: MidiNote[] = [
  createMidiNote(60, 0, 3840, 88, 'org-1-1'),
  createMidiNote(63, 0, 3840, 85, 'org-1-2'),
  createMidiNote(67, 0, 3840, 90, 'org-1-3'),
  createMidiNote(70, 0, 3840, 86, 'org-1-4'),
  createMidiNote(65, 3840, 3840, 92, 'org-2-1'),
  createMidiNote(68, 3840, 3840, 88, 'org-2-2'),
  createMidiNote(72, 3840, 3840, 94, 'org-2-3'),
];

export const INITIAL_TRACKS: TrackData[] = [
  {
    id: 'tr-01',
    trackNumber: 1,
    name: 'Grand Piano',
    category: 'piano',
    trackType: 'midi',
    midiChannel: 1,
    programNumber: 0, // GM Acoustic Grand Piano
    muted: false,
    soloed: false,
    armed: false,
    volume: 82,
    pan: -10,
    regions: [
      {
        id: 'rg-01a',
        name: 'Piano Intro Chords',
        startBar: 1,
        lengthBars: 4,
        type: 'midi',
        notes: PIANO_INTRO_NOTES,
        notesCount: PIANO_INTRO_NOTES.length,
        patternType: 'chords',
      },
      {
        id: 'rg-01b',
        name: 'Verse Arp',
        startBar: 5,
        lengthBars: 4,
        type: 'midi',
        notes: [
          createMidiNote(48, 0, 240, 90, 'arp-1'),
          createMidiNote(52, 240, 240, 85, 'arp-2'),
          createMidiNote(55, 480, 240, 88, 'arp-3'),
          createMidiNote(60, 720, 240, 95, 'arp-4'),
          createMidiNote(48, 960, 240, 90, 'arp-5'),
          createMidiNote(52, 1200, 240, 85, 'arp-6'),
          createMidiNote(55, 1440, 240, 88, 'arp-7'),
          createMidiNote(60, 1680, 240, 95, 'arp-8'),
        ],
        notesCount: 8,
        patternType: 'melody',
      },
      {
        id: 'rg-01c',
        name: 'Chorus Piano Grand',
        startBar: 9,
        lengthBars: 4,
        type: 'midi',
        notes: PIANO_INTRO_NOTES.map((n, i) => ({ ...n, id: `pno-ch-${i}`, velocity: Math.min(127, n.velocity + 10) })),
        notesCount: PIANO_INTRO_NOTES.length,
        patternType: 'chords',
      },
      {
        id: 'rg-01d',
        name: 'Outro Chords',
        startBar: 17,
        lengthBars: 4,
        type: 'midi',
        notes: PIANO_INTRO_NOTES.slice(0, 8).map((n, i) => ({ ...n, id: `pno-out-${i}`, velocity: Math.max(40, n.velocity - 20) })),
        notesCount: 8,
        patternType: 'chords',
      },
    ],
  },
  {
    id: 'tr-02',
    trackNumber: 2,
    name: 'TR-808 Kit',
    category: 'drums',
    trackType: 'midi',
    midiChannel: 10, // GM Standard Drum Channel
    programNumber: 0,
    muted: false,
    soloed: false,
    armed: false,
    volume: 88,
    pan: 0,
    regions: [
      {
        id: 'rg-02a',
        name: 'Beat Intro',
        startBar: 1,
        lengthBars: 4,
        type: 'midi',
        notes: DRUM_INTRO_NOTES,
        notesCount: DRUM_INTRO_NOTES.length,
        patternType: 'drum-beat',
      },
      {
        id: 'rg-02b',
        name: 'Main Groove',
        startBar: 5,
        lengthBars: 8,
        type: 'midi',
        notes: DRUM_INTRO_NOTES.concat(DRUM_INTRO_NOTES.map((n, i) => ({ ...n, id: `drm-mg-${i}`, startTick: n.startTick + 15360 }))),
        notesCount: DRUM_INTRO_NOTES.length * 2,
        patternType: 'drum-beat',
      },
      {
        id: 'rg-02c',
        name: 'Solo Fill & Beat',
        startBar: 13,
        lengthBars: 4,
        type: 'midi',
        notes: DRUM_INTRO_NOTES,
        notesCount: DRUM_INTRO_NOTES.length,
        patternType: 'drum-beat',
      },
    ],
  },
  {
    id: 'tr-03',
    trackNumber: 3,
    name: 'Lead Guitar',
    category: 'guitar',
    trackType: 'audio',
    muted: false,
    soloed: false,
    armed: false,
    volume: 76,
    pan: 15,
    regions: [
      { id: 'rg-03a', name: 'Verse Riff', startBar: 5, lengthBars: 4, type: 'audio', notes: [], patternType: 'riff' },
      { id: 'rg-03b', name: 'Guitar Solo', startBar: 13, lengthBars: 4, type: 'audio', notes: [], patternType: 'melody' },
    ],
  },
  {
    id: 'tr-04',
    trackNumber: 4,
    name: 'Clean Rhythm',
    category: 'clean-guitar',
    trackType: 'audio',
    muted: false,
    soloed: false,
    armed: false,
    volume: 70,
    pan: -25,
    regions: [
      { id: 'rg-04a', name: 'Funk Strums', startBar: 1, lengthBars: 8, type: 'audio', notes: [], patternType: 'riff' },
      { id: 'rg-04b', name: 'Chorus Strums', startBar: 9, lengthBars: 8, type: 'audio', notes: [], patternType: 'riff' },
    ],
  },
  {
    id: 'tr-05',
    trackNumber: 5,
    name: 'Precision Bass',
    category: 'bass',
    trackType: 'midi',
    midiChannel: 2,
    programNumber: 33, // Electric Bass (finger)
    muted: false,
    soloed: false,
    armed: false,
    volume: 85,
    pan: 0,
    regions: [
      {
        id: 'rg-05a',
        name: 'Sub Bass Line',
        startBar: 1,
        lengthBars: 12,
        type: 'midi',
        notes: BASS_INTRO_NOTES,
        notesCount: BASS_INTRO_NOTES.length,
        patternType: 'bassline',
      },
      {
        id: 'rg-05b',
        name: 'Walking Bass Solo',
        startBar: 13,
        lengthBars: 4,
        type: 'midi',
        notes: BASS_INTRO_NOTES,
        notesCount: BASS_INTRO_NOTES.length,
        patternType: 'bassline',
      },
    ],
  },
  {
    id: 'tr-06',
    trackNumber: 6,
    name: 'Orchestral Strings',
    category: 'strings',
    trackType: 'midi',
    midiChannel: 3,
    programNumber: 48, // String Ensemble
    muted: false,
    soloed: false,
    armed: false,
    volume: 68,
    pan: 20,
    regions: [
      {
        id: 'rg-06a',
        name: 'Violin Pad',
        startBar: 9,
        lengthBars: 8,
        type: 'midi',
        notes: STRINGS_PAD_NOTES,
        notesCount: STRINGS_PAD_NOTES.length,
        patternType: 'sustained',
      },
    ],
  },
  {
    id: 'tr-07',
    trackNumber: 7,
    name: 'Brass Horns',
    category: 'horns',
    trackType: 'midi',
    midiChannel: 4,
    programNumber: 61, // Brass Section
    muted: false,
    soloed: false,
    armed: false,
    volume: 74,
    pan: -15,
    regions: [
      {
        id: 'rg-07a',
        name: 'Brass Stabs',
        startBar: 9,
        lengthBars: 4,
        type: 'midi',
        notes: BRASS_STABS_NOTES,
        notesCount: BRASS_STABS_NOTES.length,
        patternType: 'chords',
      },
      {
        id: 'rg-07b',
        name: 'Brass Chorus Outro',
        startBar: 13,
        lengthBars: 8,
        type: 'midi',
        notes: BRASS_STABS_NOTES,
        notesCount: BRASS_STABS_NOTES.length,
        patternType: 'chords',
      },
    ],
  },
  {
    id: 'tr-08',
    trackNumber: 8,
    name: 'Blues Hammond B3',
    category: 'blues-organ',
    trackType: 'midi',
    midiChannel: 5,
    programNumber: 16, // Drawbar Organ
    muted: false,
    soloed: false,
    armed: false,
    volume: 80,
    pan: 10,
    regions: [
      {
        id: 'rg-08a',
        name: 'Organ Leslie Swell',
        startBar: 5,
        lengthBars: 4,
        type: 'midi',
        notes: ORGAN_SWELL_NOTES,
        notesCount: ORGAN_SWELL_NOTES.length,
        patternType: 'sustained',
      },
      {
        id: 'rg-08b',
        name: 'Blues Licks',
        startBar: 13,
        lengthBars: 4,
        type: 'midi',
        notes: [
          createMidiNote(60, 0, 480, 95, 'blu-1'),
          createMidiNote(63, 480, 240, 90, 'blu-2'),
          createMidiNote(65, 720, 240, 92, 'blu-3'),
          createMidiNote(66, 960, 240, 98, 'blu-4'),
          createMidiNote(67, 1200, 480, 100, 'blu-5'),
          createMidiNote(70, 1680, 480, 95, 'blu-6'),
          createMidiNote(72, 2160, 960, 105, 'blu-7'),
        ],
        notesCount: 7,
        patternType: 'melody',
      },
    ],
  },
];

export const INITIAL_PROJECT_STATE: ProjectState = {
  id: 'proj-default-01',
  name: 'DEBIAN_SESSION_01.mid',
  createdAt: 1726000000000,
  updatedAt: 1726000000000,
  bpm: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  keySignature: 'C Major',
  totalBars: 24,
  loopStartBar: 1,
  loopEndBar: 9,
  tracks: INITIAL_TRACKS,
  sectionMarkers: INITIAL_SECTION_MARKERS,
  selectedTrackId: 'tr-01',
  selectedRegionId: 'rg-01a',
  transport: {
    isPlaying: false,
    isRecording: false,
    isLooping: true,
    currentBar: 1,
    currentBeat: 1,
    currentTick: 0,
    metronomeOn: true,
  },
};
