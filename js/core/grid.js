import { STEPS_PER_BAR } from './constants.js';

/**
 * Sixteenth-note steps represented by one visible grid cell.
 * @param {number} division cells per bar (1, 2, 4, 8, 16)
 */
export function stepsPerGridCell(division) {
  return Math.max(1, Math.floor(STEPS_PER_BAR / division));
}

/**
 * @param {number} step
 * @param {number} division
 */
export function snapStep(step, division) {
  const cell = stepsPerGridCell(division);
  return Math.round(step / cell) * cell;
}

/**
 * Number of visible grid cells for a clip length.
 * @param {number} lengthSteps
 * @param {number} division
 */
export function getGridStepCount(lengthSteps, division) {
  const cell = stepsPerGridCell(division);
  return Math.ceil(lengthSteps / cell);
}

/**
 * @param {number} lengthSteps
 * @param {number} division
 * @returns {Array<{ cellIndex: number, startStep: number, cellSize: number, label: number, barIndex: number }>}
 */
export function getGridCells(lengthSteps, division) {
  const cell = stepsPerGridCell(division);
  const count = getGridStepCount(lengthSteps, division);
  return Array.from({ length: count }, (_, cellIndex) => ({
    cellIndex,
    startStep: cellIndex * cell,
    cellSize: Math.min(cell, lengthSteps - cellIndex * cell),
    label: (cellIndex % division) + 1,
    barIndex: Math.floor(cellIndex / division),
  }));
}

/** Black-key styling for finer grids (4+ cells per bar). */
export function usesBlackKeyStyle(division) {
  return division >= 4;
}

/**
 * @param {number[]} steps
 * @param {number} startStep
 * @param {number} cellSize
 */
export function isGridCellActive(steps, startStep, cellSize) {
  for (let i = startStep; i < startStep + cellSize && i < steps.length; i++) {
    if (steps[i]) return true;
  }
  return false;
}

/**
 * @param {number[]} steps
 * @param {number} startStep
 * @param {number} cellSize
 */
export function toggleGridCell(steps, startStep, cellSize) {
  const next = steps.slice();
  const turningOn = !isGridCellActive(next, startStep, cellSize);
  for (let i = startStep; i < startStep + cellSize && i < next.length; i++) {
    next[i] = turningOn ? 1 : 0;
  }
  return next;
}

export function stepsToToneDuration(steps) {
  if (steps <= 0) return '16n';
  return `${steps}*16n`;
}
