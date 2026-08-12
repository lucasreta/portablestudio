import { triggerClipAtStep } from './instruments.js';
import { startAudioClipPlayback, stopAudioClipPlayback } from './audio-clip.js';
import { TIMELINE_STEPS } from './constants.js';
import { ensureArrangementClip } from './arrangement.js';
import * as state from '../state.js';

/** @type {number | null} */
let schedulerId = null;
let arrangementStep = 0;
/** @type {((step: number) => void) | null} */
let playheadListener = null;

export function setPlayheadListener(cb) {
  playheadListener = cb;
}

export function getArrangementStep() {
  return arrangementStep;
}

/**
 * Arrangement-mode scheduler: plays notes/hits by absolute timeline position.
 * @param {object[]} [_tracks]
 */
export function startScheduler(_tracks) {
  if (schedulerId !== null) return;
  arrangementStep = 0;
  playheadListener?.(0);

  state.getTracks().forEach((track) => {
    ensureArrangementClip(track);
    if (track.type === 'audio') {
      track.clips?.forEach((c) => {
        c._audioStartedForCycle = false;
        stopAudioClipPlayback(c);
      });
    }
  });

  schedulerId = Tone.Transport.scheduleRepeat((time) => {
    const step = arrangementStep % TIMELINE_STEPS;

    state.getTracks().forEach((track) => {
      ensureArrangementClip(track);
      (track.clips || []).forEach((clip) => {
        if (track.type === 'audio') {
          if (step === clip.startStep && (clip.hasRecording || clip._rawBuffer) && !clip._audioStartedForCycle) {
            stopAudioClipPlayback(clip);
            startAudioClipPlayback(clip, track.chain.input);
            clip._audioStartedForCycle = true;
          }
          if (step === 0) clip._audioStartedForCycle = false;
          return;
        }
        if (step < clip.startStep || step >= clip.startStep + clip.lengthSteps) return;
        triggerClipAtStep(track, step - clip.startStep, time, clip);
      });
    });

    arrangementStep = (arrangementStep + 1) % TIMELINE_STEPS;
    playheadListener?.(arrangementStep);
  }, '16n');
}

export function stopScheduler() {
  if (schedulerId !== null) {
    Tone.Transport.clear(schedulerId);
    schedulerId = null;
  }
  state.getTracks().forEach((track) => {
    if (track.type !== 'audio') return;
    track.clips?.forEach((clip) => {
      stopAudioClipPlayback(clip);
      clip._audioStartedForCycle = false;
    });
  });
  arrangementStep = 0;
  playheadListener?.(0);
}

export function resetClipPlayheads(tracks) {
  (tracks || state.getTracks()).forEach((t) => {
    t.clips?.forEach((c) => { c.playStep = 0; });
  });
  arrangementStep = 0;
  playheadListener?.(0);
}
