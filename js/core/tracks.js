import {
  TRACK_COLORS, INSTRUMENT_PRESETS, EFFECT_DEFAULTS,
} from './constants.js';
import { createDefaultClips } from './clips.js';
import { createInstrument } from './instruments.js';
import { createEffectsChain } from './effects.js';
import { createSampleVoicePool } from './sample-voices.js';

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
    playingClipId: null,
    clips: createDefaultClips(preset.type),
    isPolyphonic: preset.isPolyphonic || false,
    effects,
    chain,
    instrument: null,
    player: null,
    voicePool: null,
    sampleSettings: {
      playbackRate: 1,
      start: 0,
      end: 1,
      volume: 1,
      reverse: false,
      rootKey: preset.rootKey || 'C3',
    },
    loadedFileName: null,
  };

  if (preset.type === 'sampler') {
    track.player = new Tone.Player().connect(chain.input);
  } else if (preset.type === 'sampleInstrument') {
    track.voicePool = createSampleVoicePool(chain.input);
  } else if (preset.type === 'audio') {
    // per-clip players created on demand
  } else {
    track.instrument = createInstrument(presetId, chain.input);
  }

  return track;
}

export function disposeTrack(track) {
  track.instrument?.dispose();
  track.player?.dispose();
  track.voicePool?.dispose();
  track.clips?.forEach((c) => c.player?.dispose());
  Object.values(track.chain?.nodes || {}).forEach((node) => node.dispose?.());
}

export function getPresetIdsByCategory() {
  const categories = {};
  for (const [id, preset] of Object.entries(INSTRUMENT_PRESETS)) {
    const cat = preset.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id, label: preset.label });
  }
  return categories;
}

export function resetTrackIdCounter() {
  nextTrackId = 0;
}

export function setTrackIdCounter(next) {
  nextTrackId = next;
}
