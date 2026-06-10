import { getMasterGain, setMasterVolume } from './core/audio.js';
import { DEFAULT_MASTER_VOLUME } from './core/constants.js';
import { initSessionService, loadActiveSession } from './core/session-service.js';
import { buildSessionUI, setupAddTrackMenu } from './ui/session.js';
import { setupTransport } from './ui/transport.js';
import { setupMidiModal, bindClipEditOnLongPress } from './ui/midi-editor.js';
import { setupSampleModal } from './ui/sample-editor.js';
import { setupFxModal } from './ui/effects-panel.js';
import { setupSessionManager, updateSessionBar } from './ui/session-manager.js';

async function init() {
  getMasterGain();
  initSessionService();
  setupSessionManager();
  setupAddTrackMenu();
  setupTransport();
  setupMidiModal();
  setupSampleModal();
  setupFxModal();
  bindClipEditOnLongPress();

  await loadActiveSession();
  buildSessionUI();
  updateSessionBar();

  const mv = document.getElementById('masterVol');
  if (mv) setMasterVolume(parseFloat(mv.value) || DEFAULT_MASTER_VOLUME);
}

window.addEventListener('load', init);
