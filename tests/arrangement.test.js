import { describe, it, expect, beforeEach } from 'vitest';
import {
  ensureArrangementClip,
  getArrangementMarkers,
  pitchLaneFraction,
} from '../js/core/arrangement.js';
import { resetClipIdCounter, createClip } from '../js/core/clips.js';
import { TIMELINE_BARS, TIMELINE_STEPS, STEPS_PER_BAR } from '../js/core/constants.js';

describe('arrangement', () => {
  beforeEach(() => resetClipIdCounter());

  it('creates a full-timeline arrangement clip when missing', () => {
    const track = { type: 'melodic', clips: [] };
    const clip = ensureArrangementClip(track);
    expect(track.clips).toHaveLength(1);
    expect(clip.lengthBars).toBe(TIMELINE_BARS);
    expect(clip.lengthSteps).toBe(TIMELINE_STEPS);
    expect(clip.startStep).toBe(0);
    expect(clip.loop).toBe(false);
  });

  it('merges multiple melodic clips into absolute notes', () => {
    const track = {
      type: 'melodic',
      clips: [
        createClip('melodic', {
          startStep: 0,
          lengthBars: 1,
          loop: true,
        }),
        createClip('melodic', {
          startStep: STEPS_PER_BAR,
          lengthBars: 1,
          loop: true,
        }),
      ],
    };
    track.clips[0].notes = [{ id: 'a', pitch: 'C4', start: 0, duration: 2, velocity: 0.8 }];
    track.clips[1].notes = [{ id: 'b', pitch: 'E4', start: 0, duration: 1, velocity: 0.8 }];

    const clip = ensureArrangementClip(track);
    expect(track.clips).toHaveLength(1);
    expect(clip.notes).toHaveLength(2);
    expect(clip.notes.find((n) => n.pitch === 'E4').start).toBe(STEPS_PER_BAR);
  });

  it('builds note and hit markers for the lane', () => {
    const melodic = {
      type: 'melodic',
      clips: [createClip('melodic')],
    };
    melodic.clips[0].notes = [{ id: 'n1', pitch: 'C4', start: 4, duration: 2, velocity: 0.8 }];
    expect(getArrangementMarkers(melodic)[0]).toMatchObject({ kind: 'note', start: 4, duration: 2 });

    const drum = {
      type: 'drum',
      clips: [createClip('drum')],
    };
    drum.clips[0].steps[2] = 1;
    expect(getArrangementMarkers(drum).some((m) => m.kind === 'hit' && m.start === 2)).toBe(true);
  });

  it('maps higher pitches nearer the top of the lane', () => {
    expect(pitchLaneFraction(72, [60, 72])).toBeCloseTo(0);
    expect(pitchLaneFraction(60, [60, 72])).toBeCloseTo(1);
  });
});
