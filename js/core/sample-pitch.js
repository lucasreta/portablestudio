import { noteNameToMidi } from './scales.js';

/**
 * Playback rate from pitch relative to root key.
 * @param {string} pitch
 * @param {string} rootKey
 * @param {number} [baseRate=1]
 */
export function pitchToPlaybackRate(pitch, rootKey, baseRate = 1) {
  const rootMidi = noteNameToMidi(rootKey || 'C3');
  const noteMidi = noteNameToMidi(pitch);
  const semitones = noteMidi - rootMidi;
  return baseRate * (2 ** (semitones / 12));
}
