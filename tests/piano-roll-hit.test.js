import { describe, it, expect } from 'vitest';
import {
  getPianoRollMetrics,
  hitTestPianoRoll,
  exceededTapThreshold,
  isCoarsePointer,
} from '../js/ui/piano-roll.js';
import { getGridCells } from '../js/core/grid.js';

describe('piano-roll hit testing', () => {
  const visibleNotes = ['D4', 'C4', 'B3'];
  const gridCells = getGridCells(16, 16);
  const cellSize = 1;

  it('detects coarse pointers for touch', () => {
    expect(isCoarsePointer('touch')).toBe(true);
    expect(isCoarsePointer('mouse')).toBe(false);
  });

  it('uses larger resize targets on coarse metrics', () => {
    const mouse = getPianoRollMetrics(false);
    const touch = getPianoRollMetrics(true);
    expect(touch.resizeHit).toBeGreaterThan(mouse.resizeHit);
    expect(touch.rowH).toBeGreaterThan(mouse.rowH);
  });

  it('hits resize on the right edge and move on the note body', () => {
    const metrics = getPianoRollMetrics(true);
    const note = { id: 'n1', pitch: 'C4', start: 0, duration: 4 };
    const resize = hitTestPianoRoll({
      x: metrics.noteCol + 4 * metrics.colW - 4,
      y: metrics.headerH + 1 * metrics.rowH + 2,
      visibleNotes,
      clipNotes: [note],
      gridCells,
      cellSize,
      metrics,
    });
    expect(resize?.type).toBe('resize');

    const move = hitTestPianoRoll({
      x: metrics.noteCol + metrics.colW,
      y: metrics.headerH + 1 * metrics.rowH + 2,
      visibleNotes,
      clipNotes: [note],
      gridCells,
      cellSize,
      metrics,
    });
    expect(move?.type).toBe('move');
  });

  it('treats small finger jitter as a tap', () => {
    expect(exceededTapThreshold(3, 4)).toBe(false);
    expect(exceededTapThreshold(10, 10)).toBe(true);
  });
});
