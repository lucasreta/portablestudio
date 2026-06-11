import { describe, it, expect } from 'vitest';
import { pitchToPlaybackRate } from '../js/core/sample-pitch.js';

describe('sample-pitch', () => {
  it('returns 1 for same pitch as root', () => {
    expect(pitchToPlaybackRate('C3', 'C3')).toBeCloseTo(1);
  });

  it('doubles rate for octave up', () => {
    expect(pitchToPlaybackRate('C4', 'C3')).toBeCloseTo(2);
  });

  it('applies base playback rate', () => {
    expect(pitchToPlaybackRate('C3', 'C3', 0.5)).toBeCloseTo(0.5);
  });
});
