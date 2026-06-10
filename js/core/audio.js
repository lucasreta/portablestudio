import { DEFAULT_MASTER_VOLUME } from './constants.js';

let audioStarted = false;
/** @type {import('tone').Gain | null} */
let masterGain = null;

export async function startAudio() {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
}

export function isAudioStarted() {
  return audioStarted;
}

export function getMasterGain() {
  if (!masterGain) {
    masterGain = new Tone.Gain(DEFAULT_MASTER_VOLUME).toDestination();
  }
  return masterGain;
}

export function setMasterVolume(value) {
  getMasterGain().gain.value = value;
}
