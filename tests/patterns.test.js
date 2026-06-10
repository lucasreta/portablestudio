import { describe, it, expect } from 'vitest';
import {
  createEmptyPattern,
  createEmptyPatterns,
  toggleMelodicNote,
  toggleDrumStep,
  isNoteActiveAtStep,
  isStepTriggered,
} from '../js/core/patterns.js';
import { STEPS_PER_CLIP, CLIPS_PER_TRACK } from '../js/core/constants.js';

describe('patterns', () => {
  it('creates empty drum pattern with zeros', () => {
    const pattern = createEmptyPattern('drum');
    expect(pattern).toHaveLength(STEPS_PER_CLIP);
    expect(pattern.every((s) => s === 0)).toBe(true);
  });

  it('creates empty melodic pattern with nulls', () => {
    const pattern = createEmptyPattern('melodic');
    expect(pattern.every((s) => s === null)).toBe(true);
  });

  it('creates four clips per track', () => {
    const clips = createEmptyPatterns('drum');
    expect(clips).toHaveLength(CLIPS_PER_TRACK);
  });

  it('toggles drum steps', () => {
    let p = createEmptyPattern('drum');
    p = toggleDrumStep(p, 0);
    expect(p[0]).toBe(1);
    p = toggleDrumStep(p, 0);
    expect(p[0]).toBe(0);
  });

  it('toggles monophonic melodic notes', () => {
    let p = createEmptyPattern('melodic');
    p = toggleMelodicNote(p, 2, 'C2', false);
    expect(p[2]).toBe('C2');
    p = toggleMelodicNote(p, 2, 'C2', false);
    expect(p[2]).toBeNull();
    p = toggleMelodicNote(p, 2, 'C2', false);
    p = toggleMelodicNote(p, 2, 'D2', false);
    expect(p[2]).toBe('D2');
  });

  it('toggles polyphonic melodic notes', () => {
    let p = createEmptyPattern('melodic', true);
    p = toggleMelodicNote(p, 1, 'C3', true);
    p = toggleMelodicNote(p, 1, 'E3', true);
    expect(p[1]).toEqual(['C3', 'E3']);
    p = toggleMelodicNote(p, 1, 'C3', true);
    expect(p[1]).toEqual(['E3']);
    p = toggleMelodicNote(p, 1, 'E3', true);
    expect(p[1]).toBeNull();
  });

  it('detects active notes at step', () => {
    expect(isNoteActiveAtStep('C2', 'C2', false)).toBe(true);
    expect(isNoteActiveAtStep(['C3', 'G3'], 'G3', true)).toBe(true);
    expect(isNoteActiveAtStep(null, 'C2', false)).toBe(false);
  });

  it('detects triggered steps', () => {
    expect(isStepTriggered(0)).toBe(false);
    expect(isStepTriggered(1)).toBe(true);
    expect(isStepTriggered('C2')).toBe(true);
    expect(isStepTriggered([])).toBe(false);
    expect(isStepTriggered(['C3'])).toBe(true);
  });
});
