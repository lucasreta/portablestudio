import { EFFECT_DEFAULTS } from './constants.js';

/**
 * Build a per-track effects chain: instrument -> distortion -> filter -> delay -> reverb -> volume -> master
 * @param {import('tone').Destination | import('tone').Gain} destination
 * @param {Partial<typeof EFFECT_DEFAULTS>} settings
 */
export function createEffectsChain(destination, settings = {}) {
  const fx = { ...EFFECT_DEFAULTS, ...settings };

  const volume = new Tone.Gain(fx.volume);
  const reverb = new Tone.Reverb({ decay: 2.5, wet: fx.reverb });
  const delay = new Tone.FeedbackDelay('8n', 0.35);
  delay.wet.value = fx.delay;
  const filter = new Tone.Filter(1200, 'lowpass');
  filter.frequency.value = 200 + (1 - fx.filter) * 7800;
  const distortion = new Tone.Distortion(fx.distortion * 0.8);

  distortion.connect(filter);
  filter.connect(delay);
  delay.connect(reverb);
  reverb.connect(volume);
  volume.connect(destination);

  return {
    input: distortion,
    output: volume,
    nodes: { volume, reverb, delay, filter, distortion },
    settings: fx,
  };
}

/**
 * @param {{ nodes: object, settings: object }} chain
 * @param {Partial<typeof EFFECT_DEFAULTS>} patch
 */
export function updateEffectsChain(chain, patch) {
  const fx = { ...chain.settings, ...patch };
  chain.settings = fx;
  chain.nodes.volume.gain.value = fx.volume;
  chain.nodes.reverb.wet.value = fx.reverb;
  chain.nodes.delay.wet.value = fx.delay;
  chain.nodes.filter.frequency.value = 200 + (1 - fx.filter) * 7800;
  chain.nodes.distortion.distortion = fx.distortion * 0.8;
}
