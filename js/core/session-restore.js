import { INSTRUMENT_PRESETS, DEFAULT_GRID_DIVISION } from './constants.js';
import { createEffectsChain, updateEffectsChain } from './effects.js';
import { createInstrument } from './instruments.js';
import { createDefaultClips } from './clips.js';
import { applySampleSettings } from './sample.js';
import { createSampleVoicePool } from './sample-voices.js';
import { loadAudioIntoClip } from './audio-clip.js';
import {
  base64ToArrayBuffer,
  isValidSessionData,
  normalizeSessionData,
} from './session-serialize.js';
import { setTrackIdCounter } from './tracks.js';
import { setClipIdCounter } from './clips.js';
import { ensureArrangementClip } from './arrangement.js';
import * as state from '../state.js';

export async function restoreTracksFromSession(masterGain, data) {
  const normalized = normalizeSessionData(data);
  if (!isValidSessionData(normalized)) return [];

  const tracks = [];
  let maxTrackId = -1;
  let maxClipId = -1;

  for (const t of normalized.tracks) {
    const preset = INSTRUMENT_PRESETS[t.presetId];
    if (!preset) continue;

    const effects = { ...t.effects };
    const chain = createEffectsChain(masterGain, effects);

    const clips = (t.clips || createDefaultClips(preset.type)).map((c) => ({
      ...c,
      playing: false,
      player: null,
    }));

    let playingClipId = t.playingClipId ?? null;
    if (playingClipId == null && t.activeClip != null && clips[t.activeClip]) {
      playingClipId = clips[t.activeClip].id;
    }
    clips.forEach((c) => {
      c.playing = c.id === playingClipId;
      if (c.id > maxClipId) maxClipId = c.id;
    });

    const track = {
      id: t.id,
      name: t.name,
      presetId: t.presetId,
      type: t.type,
      color: t.color,
      playingClipId,
      clips,
      isPolyphonic: t.isPolyphonic ?? preset.isPolyphonic ?? false,
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
        rootKey: 'C3',
        ...t.sampleSettings,
      },
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
    } else if (preset.type === 'sampleInstrument') {
      track.voicePool = createSampleVoicePool(chain.input);
      if (t.sampleBase64) {
        const fileData = base64ToArrayBuffer(t.sampleBase64);
        track._rawFileData = fileData;
        track._rawBuffer = await Tone.getContext().decodeAudioData(fileData.slice(0));
        applySampleSettings(track);
      }
    } else if (preset.type === 'audio') {
      for (const clip of track.clips) {
        if (clip.audioBase64) {
          const fileData = base64ToArrayBuffer(clip.audioBase64);
          await loadAudioIntoClip(clip, fileData, clip.audioFileName || 'recording');
        }
      }
    } else {
      track.instrument = createInstrument(t.presetId, chain.input);
    }

    updateEffectsChain(chain, effects);
    ensureArrangementClip(track);
    tracks.push(track);
    if (t.id > maxTrackId) maxTrackId = t.id;
  }

  setTrackIdCounter(maxTrackId + 1);
  setClipIdCounter(maxClipId + 1);

  state.setGridDivision(normalized.gridDivision ?? DEFAULT_GRID_DIVISION);
  state.setPianoRollOctave(normalized.pianoRollOctave ?? 4);
  state.setPianoRollScale(normalized.pianoRollScale ?? 'chromatic');
  state.setPianoRollRoot(normalized.pianoRollRoot ?? 'C');

  return tracks;
}

export function restoreTransportFromSession(data) {
  const normalized = normalizeSessionData(data) || data;
  return {
    bpm: normalized?.bpm ?? 128,
    masterVolume: normalized?.masterVolume ?? 0.85,
    transportPlaying: !!normalized?.transportPlaying,
  };
}
