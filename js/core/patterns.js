import { STEPS_PER_CLIP, CLIPS_PER_TRACK } from './constants.js';

/** @typedef {'drum' | 'melodic' | 'sampler'} TrackType */

/**
 * @param {TrackType} trackType
 * @param {boolean} [isPolyphonic]
 * @returns {Array<null | 0 | 1 | string | string[]>}
 */
export function createEmptyStep(trackType, isPolyphonic = false) {
  if (trackType === 'drum' || trackType === 'sampler') return 0;
  if (trackType === 'melodic' && isPolyphonic) return null;
  return null;
}

/**
 * @param {TrackType} trackType
 * @param {boolean} [isPolyphonic]
 * @returns {Array}
 */
export function createEmptyPattern(trackType, isPolyphonic = false) {
  return Array.from({ length: STEPS_PER_CLIP }, () => createEmptyStep(trackType, isPolyphonic));
}

/**
 * @param {TrackType} trackType
 * @param {boolean} [isPolyphonic]
 * @returns {Array[]}
 */
export function createEmptyPatterns(trackType, isPolyphonic = false) {
  return Array.from({ length: CLIPS_PER_TRACK }, () => createEmptyPattern(trackType, isPolyphonic));
}

/**
 * @param {Array} pattern
 * @param {number} step
 * @param {string} note
 * @param {boolean} isPolyphonic
 * @returns {Array}
 */
export function toggleMelodicNote(pattern, step, note, isPolyphonic) {
  const next = pattern.slice();
  if (isPolyphonic) {
    if (!Array.isArray(next[step])) next[step] = [];
    const notes = [...next[step]];
    const idx = notes.indexOf(note);
    if (idx > -1) {
      notes.splice(idx, 1);
      next[step] = notes.length ? notes : null;
    } else {
      notes.push(note);
      next[step] = notes;
    }
  } else if (next[step] === note) {
    next[step] = null;
  } else {
    next[step] = note;
  }
  return next;
}

/**
 * @param {Array} pattern
 * @param {number} step
 * @returns {Array}
 */
export function toggleDrumStep(pattern, step) {
  const next = pattern.slice();
  next[step] = next[step] ? 0 : 1;
  return next;
}

/**
 * @param {Array} pattern
 * @returns {Array}
 */
export function clearPattern(pattern) {
  return pattern.map(() => null);
}

/**
 * @param {*} stepData
 * @param {string} note
 * @param {boolean} isPolyphonic
 * @returns {boolean}
 */
export function isNoteActiveAtStep(stepData, note, isPolyphonic) {
  if (isPolyphonic) return Array.isArray(stepData) && stepData.includes(note);
  return stepData === note;
}

/**
 * @param {*} stepValue
 * @returns {boolean}
 */
export function isStepTriggered(stepValue) {
  if (stepValue === null || stepValue === 0 || stepValue === false) return false;
  if (Array.isArray(stepValue)) return stepValue.length > 0;
  return true;
}
