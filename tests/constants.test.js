import { describe, it, expect } from 'vitest';
import { INSTRUMENT_PRESETS, CLIPS_PER_TRACK, STEPS_PER_CLIP } from '../js/core/constants.js';

describe('constants', () => {
  it('defines expected instrument presets', () => {
    expect(INSTRUMENT_PRESETS.kick.type).toBe('drum');
    expect(INSTRUMENT_PRESETS.snare.type).toBe('drum');
    expect(INSTRUMENT_PRESETS.piano.type).toBe('melodic');
    expect(INSTRUMENT_PRESETS.sampler.type).toBe('sampler');
  });

  it('has melodic note ranges for piano and bass', () => {
    expect(INSTRUMENT_PRESETS.piano.noteRange.length).toBeGreaterThan(0);
    expect(INSTRUMENT_PRESETS.bass.isPolyphonic).toBe(false);
    expect(INSTRUMENT_PRESETS.piano.isPolyphonic).toBe(true);
  });

  it('uses 16 steps and 4 clips', () => {
    expect(STEPS_PER_CLIP).toBe(16);
    expect(CLIPS_PER_TRACK).toBe(4);
  });
});
