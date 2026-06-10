import { STEPS_PER_CLIP } from './constants.js';
import { isStepTriggered } from './patterns.js';
import { triggerTrackSound } from './instruments.js';

let currentStep = 0;
/** @type {number | null} */
let schedulerId = null;

/**
 * @param {object[]} tracks
 */
export function startScheduler(tracks) {
  if (schedulerId !== null) return;
  currentStep = 0;
  schedulerId = Tone.Transport.scheduleRepeat((time) => {
    tracks.forEach((track) => {
      if (track.activeClip === null) return;
      const val = track.patterns[track.activeClip][currentStep % STEPS_PER_CLIP];
      if (isStepTriggered(val)) triggerTrackSound(track, val, time);
    });
    currentStep = (currentStep + 1) % STEPS_PER_CLIP;
  }, '16n');
}

export function stopScheduler() {
  if (schedulerId !== null) {
    Tone.Transport.clear(schedulerId);
    schedulerId = null;
  }
}

export function getCurrentStep() {
  return currentStep;
}

/** @param {number} step */
export function setCurrentStep(step) {
  currentStep = step;
}
