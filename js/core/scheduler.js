import { triggerClipAtStep } from './instruments.js';
import * as state from '../state.js';

/** @type {number | null} */
let schedulerId = null;

/**
 * @param {object[]} [_tracks] Unused; scheduler always reads live tracks from state.
 */
export function startScheduler(_tracks) {
  if (schedulerId !== null) return;
  schedulerId = Tone.Transport.scheduleRepeat((time) => {
    state.getTracks().forEach((track) => {
      const clip = track.clips?.find((c) => c.id === track.playingClipId && c.playing);
      if (!clip) return;

      const pos = clip.playStep ?? 0;
      triggerClipAtStep(track, pos, time, clip);

      if (clip.loop) {
        clip.playStep = (pos + 1) % clip.lengthSteps;
      } else {
        const next = pos + 1;
        if (next >= clip.lengthSteps) {
          clip.playing = false;
          clip.playStep = 0;
          track.playingClipId = null;
        } else {
          clip.playStep = next;
        }
      }
    });
  }, '16n');
}

export function stopScheduler() {
  if (schedulerId !== null) {
    Tone.Transport.clear(schedulerId);
    schedulerId = null;
  }
}

export function resetClipPlayheads(tracks) {
  tracks.forEach((t) => {
    t.clips?.forEach((c) => { c.playStep = 0; });
  });
}
