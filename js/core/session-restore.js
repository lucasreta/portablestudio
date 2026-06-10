import { INSTRUMENT_PRESETS } from './constants.js';
import { createEffectsChain, updateEffectsChain } from './effects.js';
import { createInstrument } from './instruments.js';
import { createEmptyPatterns } from './patterns.js';
import { applySampleSettings } from './sample.js';
import { base64ToArrayBuffer, isValidSessionData } from './session-serialize.js';
import { setTrackIdCounter } from './tracks.js';

/**
 * @param {import('tone').Gain} masterGain
 * @param {object} data
 * @returns {Promise<object[]>}
 */
export async function restoreTracksFromSession(masterGain, data) {
  if (!isValidSessionData(data)) return [];

  const tracks = [];
  let maxId = -1;

  for (const t of data.tracks) {
    const preset = INSTRUMENT_PRESETS[t.presetId];
    if (!preset) continue;

    const effects = { ...t.effects };
    const chain = createEffectsChain(masterGain, effects);

    const track = {
      id: t.id,
      name: t.name,
      presetId: t.presetId,
      type: t.type,
      color: t.color,
      activeClip: t.activeClip ?? null,
      patterns: t.patterns ?? createEmptyPatterns(preset.type, preset.isPolyphonic),
      isPolyphonic: t.isPolyphonic ?? preset.isPolyphonic ?? false,
      noteRange: t.noteRange ?? preset.noteRange ?? [],
      effects,
      chain,
      instrument: null,
      player: null,
      sampleSettings: { ...t.sampleSettings },
      loadedFileName: t.loadedFileName,
      _rawBuffer: null,
      _rawFileData: null,
    };

    if (preset.type === 'sampler') {
      track.player = new Tone.Player().connect(chain.input);
      if (t.sampleBase64) {
        const fileData = base64ToArrayBuffer(t.sampleBase64);
        track._rawFileData = fileData;
        track._rawBuffer = await Tone.getContext().decodeAudioData(fileData.slice(0));
        applySampleSettings(track);
      }
    } else {
      track.instrument = createInstrument(t.presetId, chain.input);
    }

    updateEffectsChain(chain, effects);
    tracks.push(track);
    if (t.id > maxId) maxId = t.id;
  }

  setTrackIdCounter(maxId + 1);
  return tracks;
}

/**
 * @param {object} data
 * @returns {{ bpm: number, masterVolume: number, transportPlaying: boolean }}
 */
export function restoreTransportFromSession(data) {
  return {
    bpm: data.bpm ?? 128,
    masterVolume: data.masterVolume ?? 0.85,
    transportPlaying: !!data.transportPlaying,
  };
}
