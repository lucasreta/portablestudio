export const STEPS_PER_CLIP = 16;
export const CLIPS_PER_TRACK = 4;
export const DEFAULT_BPM = 128;
export const DEFAULT_MASTER_VOLUME = 0.85;

export const TRACK_COLORS = [
  '#f15a29', '#3b82f6', '#eab308', '#22c55e',
  '#a855f7', '#ec4899', '#06b6d4', '#f97316',
];

export const INSTRUMENT_PRESETS = {
  kick: {
    label: 'Kick Drum',
    type: 'drum',
    category: 'drums',
    note: 'C1',
    duration: '8n',
    velocity: 1.0,
  },
  snare: {
    label: 'Snare Drum',
    type: 'drum',
    category: 'drums',
    duration: '16n',
    velocity: 0.9,
  },
  hats: {
    label: 'Hi-Hat',
    type: 'drum',
    category: 'drums',
    duration: '32n',
    velocity: 0.55,
  },
  tom: {
    label: 'Tom',
    type: 'drum',
    category: 'drums',
    note: 'G1',
    duration: '8n',
    velocity: 0.85,
  },
  clap: {
    label: 'Clap',
    type: 'drum',
    category: 'drums',
    duration: '16n',
    velocity: 0.8,
  },
  piano: {
    label: 'Piano',
    type: 'melodic',
    category: 'keys',
    isPolyphonic: true,
    noteRange: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4'],
    duration: '8n',
    velocity: 0.75,
  },
  bass: {
    label: 'Bass',
    type: 'melodic',
    category: 'keys',
    isPolyphonic: false,
    noteRange: ['C1', 'D1', 'Eb1', 'F1', 'G1', 'Ab1', 'Bb1', 'C2', 'D2', 'Eb2', 'F2', 'G2'],
    duration: '8n',
    velocity: 0.95,
  },
  synth: {
    label: 'Synth',
    type: 'melodic',
    category: 'keys',
    isPolyphonic: true,
    noteRange: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'],
    duration: '4n',
    velocity: 0.6,
  },
  sampler: {
    label: 'Sampler',
    type: 'sampler',
    category: 'audio',
  },
};

export const EFFECT_DEFAULTS = {
  volume: 1,
  reverb: 0,
  delay: 0,
  filter: 0,
  distortion: 0,
};
