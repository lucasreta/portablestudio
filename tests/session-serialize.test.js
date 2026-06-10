import { describe, it, expect } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  serializeTrack,
  serializeSession,
  isValidSessionData,
  SESSION_VERSION,
} from '../js/core/session-serialize.js';

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
      activeClip: 1,
      patterns: [[1, 0, 0, 0]],
      isPolyphonic: false,
      noteRange: [],
      effects: { volume: 1, reverb: 0, delay: 0, filter: 0, distortion: 0 },
      sampleSettings: { playbackRate: 1, start: 0, end: 1, volume: 1, reverse: false },
      loadedFileName: null,
      _rawFileData: null,
    };
    const serialized = serializeTrack(track);
    expect(serialized.activeClip).toBe(1);
    expect(serialized.sampleBase64).toBeNull();
    expect(serialized.instrument).toBeUndefined();
  });

  it('serializes full session with transport', () => {
    const data = serializeSession([], { bpm: 140, masterVolume: 0.7, transportPlaying: true });
    expect(data.version).toBe(SESSION_VERSION);
    expect(data.bpm).toBe(140);
    expect(data.transportPlaying).toBe(true);
    expect(isValidSessionData(data)).toBe(true);
  });

  it('rejects invalid session data', () => {
    expect(isValidSessionData(null)).toBe(false);
    expect(isValidSessionData({ version: 99 })).toBe(false);
  });
});
