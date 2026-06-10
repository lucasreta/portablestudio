/**
 * @param {AudioBuffer} buffer
 * @param {{ playbackRate?: number, start?: number, end?: number, reverse?: boolean }} settings
 * @returns {AudioBuffer}
 */
export function processSampleBuffer(buffer, settings) {
  const { start = 0, end = 1, reverse = false } = settings;
  const sampleRate = buffer.sampleRate;
  const startFrame = Math.floor(start * buffer.length);
  const endFrame = Math.floor(end * buffer.length);
  const sliceLength = Math.max(1, endFrame - startFrame);

  let working = buffer;
  if (reverse) {
    const reversed = Tone.getContext().createBuffer(
      buffer.numberOfChannels,
      sliceLength,
      sampleRate,
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = reversed.getChannelData(ch);
      for (let i = 0; i < sliceLength; i++) {
        dst[i] = src[startFrame + sliceLength - 1 - i];
      }
    }
    working = reversed;
  } else if (start > 0 || end < 1) {
    const trimmed = Tone.getContext().createBuffer(
      buffer.numberOfChannels,
      sliceLength,
      sampleRate,
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(startFrame, endFrame));
    }
    working = trimmed;
  }

  return working;
}

/**
 * @param {object} track
 * @param {File} file
 */
export async function loadSampleFile(track, file) {
  const buf = await file.arrayBuffer();
  const audioBuf = await Tone.getContext().decodeAudioData(buf.slice(0));
  track._rawFileData = buf;
  track._rawBuffer = audioBuf;
  applySampleSettings(track);
  track.loadedFileName = file.name;
  return file.name;
}

/**
 * @param {object} track
 * @param {ArrayBuffer} fileData
 * @param {string} fileName
 */
export async function loadSampleFromBuffer(track, fileData, fileName) {
  const audioBuf = await Tone.getContext().decodeAudioData(fileData.slice(0));
  track._rawFileData = fileData;
  track._rawBuffer = audioBuf;
  track.loadedFileName = fileName;
  applySampleSettings(track);
}

/**
 * @param {object} track
 */
export function applySampleSettings(track) {
  if (!track._rawBuffer || !track.player) return;
  const processed = processSampleBuffer(track._rawBuffer, track.sampleSettings);
  track.player.buffer = processed;
}
