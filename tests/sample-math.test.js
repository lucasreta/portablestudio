import { describe, it, expect } from 'vitest';

/** Pure helpers mirrored from sample processing logic (testable without Web Audio). */
function computeSliceFrames(length, start, end) {
  const startFrame = Math.floor(start * length);
  const endFrame = Math.floor(end * length);
  return { startFrame, endFrame, sliceLength: Math.max(1, endFrame - startFrame) };
}

function resampleLength(sourceLength, playbackRate) {
  return Math.floor(sourceLength / playbackRate);
}

describe('sample math', () => {
  it('computes trim frames', () => {
    const { startFrame, endFrame, sliceLength } = computeSliceFrames(1000, 0.1, 0.5);
    expect(startFrame).toBe(100);
    expect(endFrame).toBe(500);
    expect(sliceLength).toBe(400);
  });

  it('ensures minimum slice length', () => {
    const { sliceLength } = computeSliceFrames(100, 0.5, 0.5);
    expect(sliceLength).toBe(1);
  });

  it('computes resampled length from playback rate', () => {
    expect(resampleLength(1000, 2)).toBe(500);
    expect(resampleLength(1000, 0.5)).toBe(2000);
    expect(resampleLength(1000, 1)).toBe(1000);
  });
});
