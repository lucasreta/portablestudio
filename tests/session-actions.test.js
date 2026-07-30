import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../js/core/audio-clip.js', () => ({
  startAudioClipPlayback: vi.fn(),
  stopAudioClipPlayback: vi.fn(),
}));

vi.mock('../js/core/session-service.js', () => ({
  requestAutosave: vi.fn(),
}));

vi.mock('../js/core/audio.js', () => ({
  getMasterGain: vi.fn(() => ({})),
}));

import { launchClip } from '../js/core/session-actions.js';
import { startAudioClipPlayback, stopAudioClipPlayback } from '../js/core/audio-clip.js';
import * as state from '../js/state.js';

describe('launchClip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.setTracks([
      {
        id: 1,
        type: 'audio',
        playingClipId: null,
        chain: { input: {} },
        clips: [
          { id: 10, playing: false, hasRecording: true },
          { id: 11, playing: false, hasRecording: true },
        ],
      },
    ]);
  });

  it('toggles an audio clip off when clicked while playing', () => {
    const track = state.getTrack(1);
    track.clips[0].playing = true;
    track.playingClipId = 10;

    launchClip(1, 10);

    expect(track.clips[0].playing).toBe(false);
    expect(track.playingClipId).toBeNull();
    expect(startAudioClipPlayback).not.toHaveBeenCalled();
    expect(stopAudioClipPlayback).toHaveBeenCalled();
  });

  it('starts an audio clip when clicked while stopped', () => {
    const track = state.getTrack(1);

    launchClip(1, 10);

    expect(track.clips[0].playing).toBe(true);
    expect(track.playingClipId).toBe(10);
    expect(startAudioClipPlayback).toHaveBeenCalled();
  });
});
