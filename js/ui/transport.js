import { DEFAULT_BPM, DEFAULT_MASTER_VOLUME } from '../core/constants.js';
import { startAudio, setMasterVolume } from '../core/audio.js';
import { startScheduler, stopScheduler, resetClipPlayheads } from '../core/scheduler.js';
import { stopAllClips } from '../core/session-actions.js';
import { stopAudioClipPlayback } from '../core/audio-clip.js';
import { requestAutosave } from '../core/session-service.js';
import { updateTimelineUI } from './session.js';
import * as state from '../state.js';

let bpmInput = null;
let masterVol = null;

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function stopPlayingAudioClips() {
  state.getTracks().forEach((track) => {
    if (track.type !== 'audio') return;
    track.clips?.forEach((clip) => {
      stopAudioClipPlayback(clip);
      clip.playing = false;
      clip._audioStartedForCycle = false;
    });
    track.playingClipId = null;
  });
}

function stopTransport() {
  Tone.Transport.stop();
  stopScheduler();
  stopPlayingAudioClips();
  resetClipPlayheads(state.getTracks());
  updateTimelineUI();
  requestAutosave();
}

async function startTransport() {
  await startAudio();
  Tone.Transport.bpm.value = parseFloat(bpmInput.value) || DEFAULT_BPM;
  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
    startScheduler(state.tracks);
  }
  requestAutosave();
}

export function setupTransport() {
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
  bpmInput = document.getElementById('bpm');
  masterVol = document.getElementById('masterVol');
  const stopAllBtn = document.getElementById('stopAllBtn');

  playBtn.addEventListener('click', () => startTransport());
  stopBtn.addEventListener('click', () => stopTransport());

  bpmInput.addEventListener('change', () => {
    Tone.Transport.bpm.value = parseFloat(bpmInput.value) || DEFAULT_BPM;
    requestAutosave();
  });

  masterVol.addEventListener('input', () => {
    setMasterVolume(parseFloat(masterVol.value));
    requestAutosave();
  });

  stopAllBtn.addEventListener('click', () => {
    stopAllClips();
    updateTimelineUI();
  });

  document.addEventListener('keydown', async (e) => {
    if (isTypingTarget(e.target)) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (Tone.Transport.state === 'started') {
        stopTransport();
      } else {
        await startTransport();
      }
    }
    if (e.key.toLowerCase() === 's') {
      stopAllClips();
      updateTimelineUI();
    }
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
  if (masterVol) masterVol.value = String(masterVolume ?? DEFAULT_MASTER_VOLUME);
}
