import {
  TRACK_COLORS, INSTRUMENT_PRESETS, EFFECT_DEFAULTS, CLIPS_PER_TRACK,
} from './constants.js';
import { createEmptyPatterns } from './patterns.js';
import { createInstrument } from './instruments.js';
import { createEffectsChain } from './effects.js';

let nextTrackId = 0;

/**
 * @param {import('tone').Gain} masterGain
 * @param {string} presetId
 */
export function createTrack(masterGain, presetId) {
  const preset = INSTRUMENT_PRESETS[presetId];
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);

  const id = nextTrackId++;
  const color = TRACK_COLORS[id % TRACK_COLORS.length];
  const effects = { ...EFFECT_DEFAULTS };
  const chain = createEffectsChain(masterGain, effects);

  const track = {
    id,
    name: preset.label.toUpperCase(),
    presetId,
    type: preset.type,
    color,
    activeClip: null,
    patterns: createEmptyPatterns(preset.type, preset.isPolyphonic),
    isPolyphonic: preset.isPolyphonic || false,
    noteRange: preset.noteRange || [],
    effects,
    chain,
    instrument: null,
    player: null,
    sampleSettings: {
      playbackRate: 1,
      start: 0,
      end: 1,
      volume: 1,
      reverse: false,
    },
    loadedFileName: null,
  };

  if (preset.type === 'sampler') {
    track.player = new Tone.Player().connect(chain.input);
  } else {
    track.instrument = createInstrument(presetId, chain.input);
  }

  return track;
}

/**
 * @param {object} track
 * @param {import('tone').Gain} masterGain
 */
export function disposeTrack(track) {
  track.instrument?.dispose();
  track.player?.dispose();
  Object.values(track.chain?.nodes || {}).forEach((node) => node.dispose?.());
}

/**
 * @returns {string[]}
 */
export function getPresetIdsByCategory() {
  const categories = {};
  for (const [id, preset] of Object.entries(INSTRUMENT_PRESETS)) {
    const cat = preset.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id, label: preset.label });
  }
  return categories;
}

/** Reset ID counter (for tests). */
export function resetTrackIdCounter() {
  nextTrackId = 0;
}

/** @param {number} next */
export function setTrackIdCounter(next) {
  nextTrackId = next;
}
