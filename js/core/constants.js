export const STEPS_PER_BAR = 16;
export const STEPS_PER_CLIP = 16; // legacy alias
export const CLIPS_PER_TRACK = 4; // default starter clips
export const TIMELINE_BARS = 8;
export const TIMELINE_STEPS = STEPS_PER_BAR * TIMELINE_BARS;
export const DEFAULT_BPM = 128;
export const DEFAULT_MASTER_VOLUME = 0.85;
export const SESSION_VERSION = 2;
export const APS_FORMAT = 'aps';
export const APS_FORMAT_VERSION = 2;

/** Grid cells per bar: 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth */
export const GRID_DIVISIONS = [1, 2, 4, 8, 16];
export const DEFAULT_GRID_DIVISION = 16;

export const CLIP_LENGTH_BARS_OPTIONS = [1, 2, 4, 8];

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
    duration: '8n',
    velocity: 0.75,
  },
  bass: {
    label: 'Bass',
    type: 'melodic',
    category: 'keys',
    isPolyphonic: false,
    duration: '8n',
    velocity: 0.95,
  },
  synth: {
    label: 'Synth',
    type: 'melodic',
    category: 'keys',
    isPolyphonic: true,
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
