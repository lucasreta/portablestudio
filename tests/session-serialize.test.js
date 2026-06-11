import { describe, it, expect } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  serializeTrack,
  serializeSession,
  isValidSessionData,
  SESSION_VERSION,
  normalizeSessionData,
} from '../js/core/session-serialize.js';
import { createSessionSnapshot } from '../js/core/session-service.js';

describe('session-serialize', () => {
  it('round-trips array buffers through base64', () => {
    const original = new Uint8Array([0, 127, 255, 42, 99]).buffer;
    const restored = base64ToArrayBuffer(arrayBufferToBase64(original));
    expect(new Uint8Array(restored)).toEqual(new Uint8Array(original));
  });

  it('serializes track without live audio nodes', () => {
    const track = {
      id: 0,
      name: 'KICK',
      presetId: 'kick',
      type: 'drum',
      color: '#f15a29',
      playingClipId: 1,
      clips: [{ id: 1, name: 'Clip', startStep: 0, lengthBars: 1, lengthSteps: 16, loop: true, steps: [1, 0, 0, 0] }],
      isPolyphonic: false,
      effects: { volume: 1, reverb: 0, delay: 0, filter: 0, distortion: 0 },
      sampleSettings: { playbackRate: 1, start: 0, end: 1, volume: 1, reverse: false },
      loadedFileName: null,
      _rawFileData: null,
    };
    const serialized = serializeTrack(track);
    expect(serialized.playingClipId).toBe(1);
    expect(serialized.sampleBase64).toBeNull();
    expect(serialized.instrument).toBeUndefined();
  });

  it('serializes full session with transport and aps format', () => {
    const data = serializeSession([], { bpm: 140, masterVolume: 0.7, transportPlaying: true });
    expect(data.version).toBe(SESSION_VERSION);
    expect(data.format).toBe('aps');
    expect(data.bpm).toBe(140);
    expect(isValidSessionData(data)).toBe(true);
  });

  it('rejects invalid session data', () => {
    expect(isValidSessionData(null)).toBe(false);
    expect(isValidSessionData({ version: 99 })).toBe(false);
  });

  it('creates a valid session snapshot from state, transport, and editor metadata', () => {
    const data = createSessionSnapshot(
      [{ id: 0, name: 'T', presetId: 'kick', type: 'drum', color: '#f15a29', playingClipId: null, clips: [], isPolyphonic: false, effects: {}, sampleSettings: {}, loadedFileName: null }],
      { bpm: 132, masterVolume: 0.8, transportPlaying: false },
      { gridDivision: 8, pianoRollOctave: 3, pianoRollScale: 'minor', pianoRollRoot: 'C' },
    );

    expect(data.bpm).toBe(132);
    expect(data.masterVolume).toBe(0.8);
    expect(data.gridDivision).toBe(8);
    expect(data.pianoRollScale).toBe('minor');
    expect(isValidSessionData(data)).toBe(true);
  });

  it('normalizes legacy v1 pattern sessions into clip structures', () => {
    const legacy = {
      version: 1,
      format: 'aps',
      formatVersion: 1,
      bpm: 120,
      masterVolume: 0.9,
      gridDivision: 16,
      pianoRollOctave: 4,
      pianoRollScale: 'chromatic',
      pianoRollRoot: 'C',
      tracks: [
        {
          id: 1,
          name: 'Legacy',
          type: 'drum',
          presetId: 'kick',
          patterns: [[1, 0, 1, 0], [0, 1, 0, 1]],
          activeClip: 1,
        },
      ],
    };

    const normalized = normalizeSessionData(legacy);
    expect(normalized.tracks[0].clips).toHaveLength(2);
    expect(normalized.tracks[0].clips[0].steps).toEqual([1, 0, 1, 0]);
    expect(normalized.tracks[0].playingClipId).toBe(1);
  });
});
