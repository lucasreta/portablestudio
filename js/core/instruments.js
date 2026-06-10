import { INSTRUMENT_PRESETS } from './constants.js';

/**
 * @param {string} presetId
 * @param {import('tone').InputNode} destination
 */
export function createInstrument(presetId, destination) {
  switch (presetId) {
    case 'kick':
      return new Tone.MembraneSynth({
        octaves: 8,
        envelope: { attack: 0.001, decay: 0.55, sustain: 0.01, release: 0.6 },
      }).connect(destination);

    case 'snare':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 },
      }).connect(destination);

    case 'hats':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
      }).connect(destination);

    case 'tom':
      return new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
      }).connect(destination);

    case 'clap':
      return new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.08 },
      }).connect(destination);

    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
      }).connect(destination);

    case 'bass':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.008, decay: 0.25, sustain: 0.45, release: 0.5 },
        filterEnvelope: {
          attack: 0.01, decay: 0.18, sustain: 0.7, release: 0.4,
          baseFrequency: 180, octaves: 2.5,
        },
      }).connect(destination);

    case 'synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.025, decay: 0.35, sustain: 0.65, release: 1.1 },
      }).connect(destination);

    default:
      return new Tone.Synth().connect(destination);
  }
}

/**
 * @param {object} track
 * @param {*} stepValue
 * @param {number} time
 */
export function triggerTrackSound(track, stepValue, time) {
  if (!stepValue) return;

  const preset = INSTRUMENT_PRESETS[track.presetId];
  if (!preset) return;

  try {
    if (track.type === 'sampler') {
      if (track.player?.loaded) {
        const { playbackRate = 1, volume = 1 } = track.sampleSettings;
        track.player.playbackRate = playbackRate;
        track.player.volume.value = Tone.gainToDb(volume);
        track.player.start(time);
      }
      return;
    }

    if (track.type === 'drum') {
      const note = preset.note || 'C1';
      const duration = preset.duration || '8n';
      const velocity = preset.velocity ?? 1;
      if (preset.note) {
        track.instrument.triggerAttackRelease(note, duration, time, velocity);
      } else {
        track.instrument.triggerAttackRelease(duration, time, velocity);
      }
      return;
    }

    if (track.type === 'melodic') {
      const duration = preset.duration || '8n';
      const velocity = preset.velocity ?? 0.8;
      if (preset.isPolyphonic && Array.isArray(stepValue)) {
        track.instrument.triggerAttackRelease(stepValue, duration, time, velocity);
      } else if (typeof stepValue === 'string') {
        track.instrument.triggerAttackRelease(stepValue, duration, time, velocity);
      }
    }
  } catch {
    // ignore scheduling glitches
  }
}
