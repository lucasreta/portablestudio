import { STEPS_PER_CLIP, STEPS_PER_BAR } from './constants.js';

/** @typedef {'drum' | 'melodic' | 'sampler'} TrackType */

export function createEmptyStep(trackType) {
  if (trackType === 'drum' || trackType === 'sampler') return 0;
  return null;
}

export function createEmptyPattern(trackType, lengthSteps = STEPS_PER_CLIP) {
  return Array.from({ length: lengthSteps }, () => createEmptyStep(trackType));
}

export function createEmptyPatterns(trackType, count = 4, lengthSteps = STEPS_PER_CLIP) {
  return Array.from({ length: count }, () => createEmptyPattern(trackType, lengthSteps));
}

export function toggleDrumStep(steps, step) {
  const next = steps.slice();
  next[step] = next[step] ? 0 : 1;
  return next;
}

export function clearSteps(steps) {
  return steps.map(() => 0);
}

export function isStepTriggered(stepValue) {
  if (stepValue === null || stepValue === 0 || stepValue === false) return false;
  if (Array.isArray(stepValue)) return stepValue.length > 0;
  return true;
}

/** Legacy melodic toggle — used only in migration */
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

export function isNoteActiveAtStep(stepData, note, isPolyphonic) {
  if (isPolyphonic) return Array.isArray(stepData) && stepData.includes(note);
  return stepData === note;
}

export function clearPattern(pattern) {
  return pattern.map(() => null);
}

export function barsToSteps(bars) {
  return bars * STEPS_PER_BAR;
}
