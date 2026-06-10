import { describe, it, expect } from 'vitest';
import {
  computeWaveformPeaks,
  clampTrimRange,
  formatTime,
} from '../js/core/waveform.js';

describe('waveform', () => {
  it('computes min/max peaks per bucket', () => {
    const data = new Float32Array([0, 0.5, -0.5, 1, -1, 0]);
    const peaks = computeWaveformPeaks(data, 2);
    expect(peaks[0]).toBe(-0.5);
    expect(peaks[1]).toBe(0.5);
    expect(peaks[2]).toBe(-1);
    expect(peaks[3]).toBe(1);
  });

  it('clamps trim range with minimum gap', () => {
    const { start, end } = clampTrimRange(0.5, 0.5);
    expect(end - start).toBeGreaterThanOrEqual(0.01);
    expect(start).toBeLessThan(end);
  });

  it('formats time for display', () => {
    expect(formatTime(0)).toBe('0.00s');
    expect(formatTime(2.5)).toBe('2.50s');
    expect(formatTime(65)).toBe('1:05');
  });
});
