import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClip, setClipLengthBars, setClipStartStep, resetClipIdCounter,
} from '../js/core/clips.js';
import { STEPS_PER_BAR, TIMELINE_STEPS } from '../js/core/constants.js';

describe('clips', () => {
  beforeEach(() => resetClipIdCounter());

  it('creates clip with bar length', () => {
    const clip = createClip('melodic', { lengthBars: 2 });
    expect(clip.lengthSteps).toBe(2 * STEPS_PER_BAR);
    expect(clip.notes).toEqual([]);
  });

  it('resizes clip in bars', () => {
    const clip = createClip('drum');
    setClipLengthBars(clip, 4, 'drum');
    expect(clip.lengthBars).toBe(4);
    expect(clip.steps).toHaveLength(4 * STEPS_PER_BAR);
  });

  it('clamps clip start on timeline', () => {
    const clip = createClip('drum', { lengthBars: 2 });
    setClipStartStep(clip, 999, TIMELINE_STEPS);
    expect(clip.startStep).toBeLessThanOrEqual(TIMELINE_STEPS - clip.lengthSteps);
  });
});
