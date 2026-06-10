import { updateEffectsChain } from '../core/effects.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';

let editingFxTrackId = null;

export function openEffectsPanel(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return;

  editingFxTrackId = trackId;
  const fx = track.effects;

  document.getElementById('fxModalTitle').textContent = `${track.name} — Effects`;
  document.getElementById('fxVolume').value = fx.volume;
  document.getElementById('fxReverb').value = fx.reverb;
  document.getElementById('fxDelay').value = fx.delay;
  document.getElementById('fxFilter').value = fx.filter;
  document.getElementById('fxDistortion').value = fx.distortion;

  document.getElementById('fxModal').classList.remove('hidden');
}

function closeFxPanel() {
  document.getElementById('fxModal').classList.add('hidden');
  editingFxTrackId = null;
}

function readFxFromForm() {
  return {
    volume: parseFloat(document.getElementById('fxVolume').value),
    reverb: parseFloat(document.getElementById('fxReverb').value),
    delay: parseFloat(document.getElementById('fxDelay').value),
    filter: parseFloat(document.getElementById('fxFilter').value),
    distortion: parseFloat(document.getElementById('fxDistortion').value),
  };
}

function applyFx() {
  const track = state.getTrack(editingFxTrackId);
  if (!track) return;
  const patch = readFxFromForm();
  track.effects = { ...track.effects, ...patch };
  updateEffectsChain(track.chain, patch);
}

export function setupFxModal() {
  document.getElementById('fxCloseBtn').addEventListener('click', closeFxPanel);
  document.getElementById('fxSaveBtn').addEventListener('click', () => {
    applyFx();
    closeFxPanel();
    requestAutosave();
  });

  ['fxVolume', 'fxReverb', 'fxDelay', 'fxFilter', 'fxDistortion'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      applyFx();
      requestAutosave();
    });
  });

  document.getElementById('fxModal').addEventListener('click', (e) => {
    if (e.target.id === 'fxModal') closeFxPanel();
  });
}
