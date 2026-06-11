import { STEPS_PER_BAR } from './constants.js';

/**
 * Steps per grid cell at given division (cells per bar).
 * @param {number} division
 */
export function stepsPerGridCell(division) {
  return Math.max(1, Math.floor(STEPS_PER_BAR / division));
}

/**
 * Snap step index to grid.
 * @param {number} step
 * @param {number} division
 */
export function snapStep(step, division) {
  const cell = stepsPerGridCell(division);
  return Math.round(step / cell) * cell;
}

/**
 * @param {number} lengthSteps
 * @param {number} division
 */
export function getGridStepCount(lengthSteps, division) {
  const cell = stepsPerGridCell(division);
  return Math.ceil(lengthSteps / cell);
}

/**
 * Tone duration string for N sixteenth-note steps.
 * @param {number} steps
 */
export function stepsToToneDuration(steps) {
  if (steps <= 0) return '16n';
  return `${steps}*16n`;
}
