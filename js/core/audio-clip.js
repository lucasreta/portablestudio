import { applySampleSettings } from './sample.js';

/**
 * @param {object} clip
 * @param {import('tone').InputNode} destination
 */
export function ensureClipPlayer(clip, destination) {
  if (!clip._rawBuffer) return null;
  if (!clip.player) {
    clip.player = new Tone.Player().connect(destination);
  }
  clip.player.buffer = clip._rawBuffer;
  return clip.player;
}

/**
 * @param {object} clip
 * @param {import('tone').InputNode} destination
 */
export function startAudioClipPlayback(clip, destination) {
  const player = ensureClipPlayer(clip, destination);
  if (!player?.loaded) return;
  player.loop = clip.loop;
  player.start();
}

export function stopAudioClipPlayback(clip) {
  clip.player?.stop();
}

/**
 * @param {object} clip
 * @param {ArrayBuffer} fileData
 * @param {string} fileName
 */
export async function loadAudioIntoClip(clip, fileData, fileName) {
  const audioBuf = await Tone.getContext().decodeAudioData(fileData.slice(0));
  clip._rawFileData = fileData;
  clip._rawBuffer = audioBuf;
  clip.audioFileName = fileName;
  clip.hasRecording = true;
  if (clip.player) {
    clip.player.buffer = audioBuf;
  }
}
