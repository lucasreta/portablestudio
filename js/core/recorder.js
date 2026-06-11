/** @type {{ mic: import('tone').UserMedia, recorder: import('tone').Recorder, trackId: number, clipId: number } | null} */
let activeRecording = null;

export function isRecording() {
  return activeRecording !== null;
}

export function getRecordingTarget() {
  return activeRecording ? { trackId: activeRecording.trackId, clipId: activeRecording.clipId } : null;
}

/**
 * @param {number} trackId
 * @param {number} clipId
 */
export async function startClipRecording(trackId, clipId) {
  if (activeRecording) throw new Error('Already recording');

  await Tone.start();
  const mic = new Tone.UserMedia();
  await mic.open();
  const recorder = new Tone.Recorder();
  mic.connect(recorder);
  await recorder.start();

  activeRecording = { mic, recorder, trackId, clipId };
  return activeRecording;
}

/**
 * @returns {Promise<{ arrayBuffer: ArrayBuffer, blob: Blob }>}
 */
export async function stopClipRecording() {
  if (!activeRecording) throw new Error('Not recording');

  const { mic, recorder } = activeRecording;
  const blob = await recorder.stop();
  mic.close();
  activeRecording = null;

  const arrayBuffer = await blob.arrayBuffer();
  return { arrayBuffer, blob };
}

export function cancelRecording() {
  if (!activeRecording) return;
  activeRecording.mic.close();
  activeRecording.recorder.stop().catch(() => {});
  activeRecording = null;
}
