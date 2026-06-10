import { DEFAULT_BPM } from '../core/constants.js';
import { startAudio, setMasterVolume } from '../core/audio.js';
import { startScheduler, stopScheduler } from '../core/scheduler.js';
import { stopAllClips } from './session.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';

export function setupTransport() {
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  const bpmInput = document.getElementById('bpm');
  const masterVol = document.getElementById('masterVol');
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
