import { DEFAULT_BPM, DEFAULT_MASTER_VOLUME } from '../core/constants.js';
import { startAudio, setMasterVolume } from '../core/audio.js';
import { startScheduler, stopScheduler } from '../core/scheduler.js';
import { stopAllClips } from '/js/core/session-actions.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';

let bpmInput = null;
let masterVol = null;

export function setupTransport() {
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  bpmInput = document.getElementById('bpm');
  masterVol = document.getElementById('masterVol');
  const stopAllBtn = document.getElementById('stopAllBtn');

  playBtn.addEventListener('click', async () => {
    await startAudio();
    Tone.Transport.bpm.value = parseFloat(bpmInput.value) || DEFAULT_BPM;
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
      startScheduler(state.tracks);
    }
    requestAutosave();
  });

  stopBtn.addEventListener('click', () => {
    Tone.Transport.stop();
    stopScheduler();
    requestAutosave();
  });

  bpmInput.addEventListener('change', () => {
    Tone.Transport.bpm.value = parseFloat(bpmInput.value) || DEFAULT_BPM;
    requestAutosave();
  });

  masterVol.addEventListener('input', () => {
    setMasterVolume(parseFloat(masterVol.value));
    requestAutosave();
  });

  stopAllBtn.addEventListener('click', stopAllClips);

  document.addEventListener('keydown', async (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      await startAudio();
      if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
        stopScheduler();
      } else {
        Tone.Transport.bpm.value = parseFloat(bpmInput.value) || DEFAULT_BPM;
        Tone.Transport.start();
        startScheduler(state.tracks);
      }
      requestAutosave();
    }
    if (e.key.toLowerCase() === 's') stopAllClips();
  });
}

export function getTransportSnapshot() {
  return {
    bpm: parseFloat(bpmInput?.value) || DEFAULT_BPM,
    masterVolume: parseFloat(masterVol?.value) || DEFAULT_MASTER_VOLUME,
    transportPlaying: typeof Tone !== 'undefined' && Tone.Transport?.state === 'started',
  };
}

export function setTransportSnapshot({ bpm, masterVolume }) {
  if (bpmInput) bpmInput.value = String(bpm ?? DEFAULT_BPM);
  if (masterVol) masterVol.value = String(masterVolume ?? DEFAULT_BPM);
}
