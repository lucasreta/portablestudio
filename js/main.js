import { getMasterGain, setMasterVolume } from './core/audio.js';
import { DEFAULT_MASTER_VOLUME } from './core/constants.js';
import { initSessionService, loadActiveSession } from './core/session-service.js';
import { buildSessionUI, setupAddTrackMenu, setupGridSelector } from './ui/session.js';
import { setupTransport } from './ui/transport.js';
import { setupMidiModal, bindClipEditOnLongPress } from './ui/midi-editor.js';
import { setupSampleModal } from './ui/sample-editor.js';
import { setupFxModal } from './ui/effects-panel.js';
import { setupSessionManager, updateSessionBar } from './ui/session-manager.js';
import { setupExportUI } from './ui/export-ui.js';

async function init() {
  getMasterGain();
  initSessionService();
  setupSessionManager();
  setupAddTrackMenu();
  setupGridSelector();
  setupTransport();
  setupMidiModal();
  setupSampleModal();
  setupFxModal();
  setupExportUI();
  bindClipEditOnLongPress();

  const transport = await loadActiveSession();
  if (transport) {
    const bpmEl = document.getElementById('bpm');
    const masterEl = document.getElementById('masterVol');
    if (bpmEl) bpmEl.value = String(transport.bpm);
    if (masterEl) masterEl.value = String(transport.masterVolume);
  }

  buildSessionUI();
  updateSessionBar();

  const mv = document.getElementById('masterVol');
  if (mv) setMasterVolume(parseFloat(mv.value) || DEFAULT_MASTER_VOLUME);
}

window.addEventListener('load', init);
