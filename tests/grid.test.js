import { describe, it, expect } from 'vitest';
import {
  getGridCells,
  stepsPerGridCell,
  toggleGridCell,
  isGridCellActive,
  usesBlackKeyStyle,
} from '../js/core/grid.js';

describe('grid', () => {
  it('maps 4/bar to 4 cells per bar', () => {
    const cells = getGridCells(16, 4);
    expect(cells).toHaveLength(4);
    expect(cells.map((c) => c.label)).toEqual([1, 2, 3, 4]);
    expect(stepsPerGridCell(4)).toBe(4);
  });

  it('maps 2/bar to 2 cells per bar', () => {
    const cells = getGridCells(16, 2);
    expect(cells).toHaveLength(2);
    expect(cells.map((c) => c.label)).toEqual([1, 2]);
  });

  it('toggles a coarse cell block', () => {
    const steps = Array(16).fill(0);
    const next = toggleGridCell(steps, 4, 4);
    expect(isGridCellActive(next, 4, 4)).toBe(true);
    expect(next.slice(4, 8).every((s) => s === 1)).toBe(true);
  });

  it('uses black key style for 4+ divisions', () => {
    expect(usesBlackKeyStyle(4)).toBe(true);
    expect(usesBlackKeyStyle(2)).toBe(false);
  });
});
