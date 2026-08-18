import { STEPS_PER_BAR, TIMELINE_BARS } from './constants.js';

let nextClipId = 0;

/** @typedef {'drum'|'melodic'|'sampler'|'sampleInstrument'|'audio'} ClipTrackType */

/**
 * @param {ClipTrackType} type
 * @param {object} [opts]
 */
export function createClip(type, opts = {}) {
  const lengthBars = opts.lengthBars ?? TIMELINE_BARS;
  const lengthSteps = lengthBars * STEPS_PER_BAR;
  const id = opts.id ?? nextClipId++;
  if (id >= nextClipId) nextClipId = id + 1;

  return {
    id,
    name: opts.name ?? 'Arrangement',
    startStep: opts.startStep ?? 0,
    lengthBars,
    lengthSteps,
    loop: opts.loop ?? false,
    playing: opts.playing ?? false,
    playStep: 0,
    steps: (type === 'melodic' || type === 'sampleInstrument') ? null : type === 'audio' ? null : createEmptySteps(lengthSteps),
    notes: (type === 'melodic' || type === 'sampleInstrument') ? [] : null,
    audioFileName: type === 'audio' ? null : undefined,
    hasRecording: false,
  };
}

/**
 * @param {number} lengthSteps
 */
export function createEmptySteps(lengthSteps) {
  return Array.from({ length: lengthSteps }, () => 0);
}

/**
 * @param {'drum'|'melodic'|'sampler'} type
 * @param {number} [count]
 */
export function createDefaultClips(type, count = 1) {
  return Array.from({ length: count }, (_, i) => createClip(type, {
    name: 'Arrangement',
    startStep: 0,
    lengthBars: TIMELINE_BARS,
    loop: false,
  }));
}

/**
 * @param {object} clip
 * @param {number} lengthBars
 */
export function setClipLengthBars(clip, lengthBars, type) {
  const lengthSteps = lengthBars * STEPS_PER_BAR;
  clip.lengthBars = lengthBars;
  clip.lengthSteps = lengthSteps;
  if (type === 'melodic' || type === 'sampleInstrument') {
    clip.notes = (clip.notes || []).filter((n) => n.start < lengthSteps);
  } else if (type === 'audio') {
    // audio clip length can follow recording duration later
  } else {
    const prev = clip.steps || [];
    clip.steps = createEmptySteps(lengthSteps);
    for (let i = 0; i < Math.min(prev.length, lengthSteps); i++) clip.steps[i] = prev[i];
  }
}

/**
 * @param {object} clip
 * @param {number} startStep
 * @param {number} timelineSteps
 */
export function setClipStartStep(clip, startStep, timelineSteps) {
  const maxStart = Math.max(0, timelineSteps - clip.lengthSteps);
  clip.startStep = Math.max(0, Math.min(maxStart, startStep));
}

export function resetClipIdCounter() {
  nextClipId = 0;
}

/** @param {number} next */
export function setClipIdCounter(next) {
  nextClipId = next;
}
