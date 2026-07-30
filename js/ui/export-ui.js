import {
  renderSessionToBuffer,
  audioBufferToMp3Blob,
  audioBufferToWavBlob,
  downloadBlob,
} from '../core/audio-export.js';
import { exportSessionToAps, parseApsFile } from '../core/aps-file.js';
import {
  applySessionData,
  requestAutosave,
} from '../core/session-service.js';
import { getTransportSnapshot } from './transport.js';
import { getEditorSnapshot } from '../state.js';
import { buildSessionUI } from './session.js';
import { updateSessionBar } from './session-manager.js';
import * as state from '../state.js';

function syncTransportControls(transport) {
  if (!transport) return;
  const bpmEl = document.getElementById('bpm');
  const masterEl = document.getElementById('masterVol');
  if (bpmEl) bpmEl.value = String(transport.bpm);
  if (masterEl) masterEl.value = String(transport.masterVolume);
}

export function setupExportUI() {
  document.getElementById('exportMp3Btn').addEventListener('click', () => exportAudio('mp3'));
  document.getElementById('exportWavBtn').addEventListener('click', () => exportAudio('wav'));
  document.getElementById('exportApsBtn').addEventListener('click', exportAps);
  document.getElementById('importApsBtn').addEventListener('click', () => {
    document.getElementById('importApsInput').click();
  });
  document.getElementById('importApsInput').addEventListener('change', importAps);
}

async function exportAudio(format) {
  const status = document.getElementById('exportStatus');
  status.textContent = 'Rendering…';
  try {
    const transport = getTransportSnapshot();
    const bars = parseInt(document.getElementById('exportBars')?.value || '4', 10);
    const buffer = await renderSessionToBuffer(state.tracks, { bpm: transport.bpm, bars });
    if (format === 'mp3') {
      if (typeof lamejs === 'undefined') throw new Error('MP3 encoder not loaded.');
      const blob = audioBufferToMp3Blob(buffer);
      downloadBlob(blob, 'portable-studio-export.mp3');
    } else {
      downloadBlob(audioBufferToWavBlob(buffer), 'portable-studio-export.wav');
    }
    status.textContent = 'Exported!';
    setTimeout(() => { status.textContent = ''; }, 2500);
  } catch (err) {
    status.textContent = 'Export failed';
    alert(err.message);
  }
}

function exportAps() {
  const name = document.getElementById('exportApsName')?.value.trim() || 'session';
  exportSessionToAps(state.tracks, getTransportSnapshot(), getEditorSnapshot(), name);
  document.getElementById('exportStatus').textContent = 'Saved .aps file';
  setTimeout(() => { document.getElementById('exportStatus').textContent = ''; }, 2500);
}

async function importAps(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = await parseApsFile(file);
    const transport = await applySessionData(data);
    syncTransportControls(transport);
    buildSessionUI();
    updateSessionBar();
    requestAutosave();
    alert(`Loaded ${file.name}`);
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
  e.target.value = '';
}
