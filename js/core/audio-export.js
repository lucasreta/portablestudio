import { STEPS_PER_BAR } from './constants.js';
import { triggerClipAtStep, createInstrument } from './instruments.js';
import { createEffectsChain } from './effects.js';
import { processSampleBuffer } from './sample.js';
import { createSampleVoicePool } from './sample-voices.js';

/**
 * @param {object[]} tracks
 * @param {{ bpm: number, bars: number }} options
 */
export async function renderSessionToBuffer(tracks, options = {}) {
  const bpm = options.bpm ?? 128;
  const bars = options.bars ?? 4;
  const totalSteps = bars * STEPS_PER_BAR;
  const duration = Tone.Time(`${totalSteps}*16n`).toSeconds();

  return Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm;
    const master = new Tone.Gain(0.9).toDestination();

    const liveTracks = tracks.map((trackData) => {
      const chain = createEffectsChain(master, trackData.effects || {});
      let instrument = null;
      let player = null;
      let voicePool = null;
      if (trackData.type === 'sampler' && trackData._rawBuffer) {
        player = new Tone.Player().connect(chain.input);
        player.buffer = processSampleBuffer(trackData._rawBuffer, trackData.sampleSettings || {});
      } else if (trackData.type === 'sampleInstrument' && trackData._rawBuffer) {
        voicePool = createSampleVoicePool(chain.input);
        voicePool.setBuffer(processSampleBuffer(trackData._rawBuffer, trackData.sampleSettings || {}));
      } else if (!['sampler', 'sampleInstrument', 'audio'].includes(trackData.type)) {
        instrument = createInstrument(trackData.presetId, chain.input);
      }
      return { ...trackData, instrument, player, voicePool, chain };
    });

    liveTracks.forEach((trackData) => {
      if (trackData.type !== 'audio') return;
      (trackData.clips || []).forEach((clip) => {
        if (!clip._rawBuffer) return;
        const p = new Tone.Player(clip._rawBuffer).connect(trackData.chain.input);
        transport.schedule((time) => p.start(time), `${clip.startStep}*16n`);
      });
    });

    for (let step = 0; step < totalSteps; step++) {
      transport.schedule((time) => {
        liveTracks.forEach((trackData) => {
          if (trackData.type === 'audio') return;
          (trackData.clips || []).forEach((clip) => {
            if (step < clip.startStep || step >= clip.startStep + clip.lengthSteps) return;
            const pos = step - clip.startStep;
            triggerClipAtStep(trackData, pos, time, clip);
          });
        });
      }, `${step}*16n`);
    }
  }, duration);
}

export function audioBufferToWavBlob(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = length * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

export function audioBufferToMp3Blob(buffer, kbps = 128) {
  if (typeof lamejs === 'undefined') throw new Error('MP3 encoder not loaded.');
  const ch = buffer.numberOfChannels;
  const left = buffer.getChannelData(0);
  const right = ch > 1 ? buffer.getChannelData(1) : left;
  const mp3encoder = new lamejs.Mp3Encoder(ch, buffer.sampleRate, kbps);
  const block = 1152;
  const mp3Data = [];
  for (let i = 0; i < left.length; i += block) {
    const lChunk = new Int16Array(block);
    const rChunk = new Int16Array(block);
    for (let j = 0; j < block && i + j < left.length; j++) {
      lChunk[j] = Math.max(-32768, Math.min(32767, Math.floor(left[i + j] * 32767)));
      rChunk[j] = Math.max(-32768, Math.min(32767, Math.floor(right[i + j] * 32767)));
    }
    const buf = ch > 1
      ? mp3encoder.encodeBuffer(lChunk, rChunk)
      : mp3encoder.encodeBuffer(lChunk);
    if (buf.length) mp3Data.push(buf);
  }
  const end = mp3encoder.flush();
  if (end.length) mp3Data.push(end);
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
