import { applySampleSettings } from '../core/sample.js';
import { startAudio } from '../core/audio.js';
import { triggerSampleInstrumentNote } from '../core/instruments.js';
import { WaveformTrimmer } from './waveform-trimmer.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';

let editingSampleTrackId = null;
/** @type {WaveformTrimmer | null} */
let waveformTrimmer = null;

function getCanvas() {
  return document.getElementById('sampleWaveformCanvas');
}

function ensureTrimmer() {
  if (!waveformTrimmer) {
    waveformTrimmer = new WaveformTrimmer(getCanvas(), {
      onTrimChange: (start, end) => {
        document.getElementById('sampleStart').value = start;
        document.getElementById('sampleEnd').value = end;
        updateTimeLabels();
        applyAndPreview();
      },
    });
  }
  return waveformTrimmer;
}

function updateTimeLabels() {
  const trimmer = waveformTrimmer;
  if (!trimmer) return;
  const labels = trimmer.getTimeLabels();
  document.getElementById('sampleTrimStartLabel').textContent = labels.start;
  document.getElementById('sampleTrimEndLabel').textContent = labels.end;
  document.getElementById('sampleTrimSelectionLabel').textContent = labels.selection;
}

function syncTrimmerFromSliders() {
  const start = parseFloat(document.getElementById('sampleStart').value) || 0;
  const end = parseFloat(document.getElementById('sampleEnd').value) || 1;
  waveformTrimmer?.setTrim(start, end);
  updateTimeLabels();
}

export function openSampleEditor(trackId) {
  const track = state.getTrack(trackId);
  if (!track || !['sampler', 'sampleInstrument'].includes(track.type) || !track._rawBuffer) return;

  editingSampleTrackId = trackId;
  const s = track.sampleSettings;

  document.getElementById('sampleModalTitle').textContent = track.name;
  document.getElementById('sampleFileName').textContent = track.loadedFileName || '';
  document.getElementById('sampleRate').value = s.playbackRate;
  document.getElementById('sampleStart').value = s.start;
  document.getElementById('sampleEnd').value = s.end;
  document.getElementById('sampleVolume').value = s.volume;
  document.getElementById('sampleReverse').checked = s.reverse;

  const rootWrap = document.getElementById('rootKeyWrap');
  const rootSel = document.getElementById('sampleRootKey');
  if (track.type === 'sampleInstrument') {
    rootWrap.classList.remove('hidden');
    rootSel.value = s.rootKey || 'C3';
  } else {
    rootWrap.classList.add('hidden');
  }

  document.getElementById('sampleModal').classList.remove('hidden');

  const trimmer = ensureTrimmer();
  requestAnimationFrame(() => {
    trimmer.load(track._rawBuffer, { start: s.start, end: s.end });
    updateTimeLabels();
  });
}

function closeSampleEditor() {
  document.getElementById('sampleModal').classList.add('hidden');
  editingSampleTrackId = null;
}

function readSettingsFromForm() {
  const track = state.getTrack(editingSampleTrackId);
  const settings = {
    playbackRate: parseFloat(document.getElementById('sampleRate').value) || 1,
    start: parseFloat(document.getElementById('sampleStart').value) || 0,
    end: parseFloat(document.getElementById('sampleEnd').value) || 1,
    volume: parseFloat(document.getElementById('sampleVolume').value) || 1,
    reverse: document.getElementById('sampleReverse').checked,
  };
  if (track?.type === 'sampleInstrument') {
    settings.rootKey = document.getElementById('sampleRootKey').value || 'C3';
  }
  return settings;
}

function applyAndPreview() {
  const track = state.getTrack(editingSampleTrackId);
  if (!track) return;
  track.sampleSettings = readSettingsFromForm();
  applySampleSettings(track);
}

async function previewSample() {
  await startAudio();
  applyAndPreview();
  const track = state.getTrack(editingSampleTrackId);
  if (!track) return;

  if (track.type === 'sampleInstrument') {
    const pitch = track.sampleSettings?.rootKey || 'C3';
    triggerSampleInstrumentNote(track, { pitch, duration: 8, velocity: 0.9 }, Tone.now());
    return;
  }

  if (track?.player?.loaded) track.player.start();
}

function saveSampleSettings() {
  applyAndPreview();
  closeSampleEditor();
  requestAutosave();
}

export function setupSampleModal() {
  document.getElementById('sampleSaveBtn').addEventListener('click', saveSampleSettings);
  document.getElementById('sampleCloseBtn').addEventListener('click', closeSampleEditor);
  document.getElementById('samplePreviewBtn').addEventListener('click', previewSample);

  document.getElementById('sampleStart').addEventListener('input', () => {
    syncTrimmerFromSliders();
    applyAndPreview();
  });
  document.getElementById('sampleEnd').addEventListener('input', () => {
    syncTrimmerFromSliders();
    applyAndPreview();
  });

  ['sampleRate', 'sampleVolume'].forEach((id) => {
    document.getElementById(id).addEventListener('input', applyAndPreview);
  });
  document.getElementById('sampleRootKey')?.addEventListener('change', applyAndPreview);
  document.getElementById('sampleReverse').addEventListener('change', applyAndPreview);

  document.getElementById('sampleModal').addEventListener('click', (e) => {
    if (e.target.id === 'sampleModal') closeSampleEditor();
  });

  window.addEventListener('resize', () => {
    const track = state.getTrack(editingSampleTrackId);
    if (!track?._rawBuffer || document.getElementById('sampleModal').classList.contains('hidden')) return;
    const s = readSettingsFromForm();
    const trimmer = ensureTrimmer();
    trimmer.load(track._rawBuffer, { start: s.start, end: s.end });
    updateTimeLabels();
  });
}
