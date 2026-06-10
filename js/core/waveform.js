/**
 * Downsample channel data into min/max peak pairs for waveform drawing.
 * @param {Float32Array} channelData
 * @param {number} bucketCount
 * @returns {Float32Array} pairs of [min, max] per bucket
 */
export function computeWaveformPeaks(channelData, bucketCount) {
  const peaks = new Float32Array(bucketCount * 2);
  const blockSize = Math.max(1, Math.floor(channelData.length / bucketCount));

  for (let i = 0; i < bucketCount; i++) {
    let min = 1;
    let max = -1;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    for (let j = start; j < end; j++) {
      const v = channelData[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (end <= start) {
      min = 0;
      max = 0;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  return peaks;
}

/**
 * Mix multi-channel buffer to mono peaks.
 * @param {AudioBuffer} buffer
 * @param {number} [bucketCount=512]
 */
export function peaksFromAudioBuffer(buffer, bucketCount = 512) {
  const length = buffer.length;
  const buckets = Math.min(bucketCount, Math.max(32, Math.floor(length / 64)));
  const mixed = new Float32Array(length);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mixed[i] += data[i];
  }
  const scale = 1 / buffer.numberOfChannels;
  for (let i = 0; i < length; i++) mixed[i] *= scale;

  return { peaks: computeWaveformPeaks(mixed, buckets), bucketCount: buckets };
}

/**
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}`;
  if (seconds < 10) return `${secs}.${String(ms).padStart(2, '0')}s`;
  return `${secs}s`;
}

/**
 * Clamp trim range so start < end with minimum gap.
 * @param {number} start
 * @param {number} end
 * @param {number} [minGap=0.01]
 */
export function clampTrimRange(start, end, minGap = 0.01) {
  let s = Math.max(0, Math.min(1, start));
  let e = Math.max(0, Math.min(1, end));
  if (e - s < minGap) {
    if (s + minGap <= 1) e = s + minGap;
    else s = e - minGap;
  }
  return { start: s, end: e };
}
