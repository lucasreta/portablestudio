import { getMasterGain, setMasterVolume } from './audio.js';
import { DEFAULT_BPM, DEFAULT_MASTER_VOLUME } from './constants.js';
import { disposeTrack } from './tracks.js';
import { serializeSession } from './session-serialize.js';
import {
  initSessionStorage,
  scheduleAutosave,
  loadSessionData,
  saveSessionData,
  getActiveSessionId,
  getActiveSessionName,
  setActiveSessionId,
  AUTOSAVE_ID,
  createSessionId,
} from './session-storage.js';
import { restoreTracksFromSession, restoreTransportFromSession } from './session-restore.js';
import * as state from '../state.js';

let statusCallback = () => {};

export function setSessionStatusCallback(cb) {
  statusCallback = cb;
}

export function getTransportSnapshot() {
  const bpmEl = document.getElementById('bpm');
  const masterEl = document.getElementById('masterVol');
  return {
    bpm: parseFloat(bpmEl?.value) || DEFAULT_BPM,
    masterVolume: parseFloat(masterEl?.value) ?? DEFAULT_MASTER_VOLUME,
    transportPlaying: typeof Tone !== 'undefined' && Tone.Transport?.state === 'started',
  };
}

export function getSessionSnapshot() {
  return serializeSession(state.tracks, getTransportSnapshot());
}

export function requestAutosave() {
  scheduleAutosave(getSessionSnapshot, statusCallback);
}

export function clearAllTracks() {
  state.tracks.forEach((t) => disposeTrack(t));
  state.setTracks([]);
}

/**
 * @param {object} data
 */
export async function applySessionData(data) {
  clearAllTracks();
  const masterGain = getMasterGain();
  const tracks = await restoreTracksFromSession(masterGain, data);
  state.setTracks(tracks);

  const transport = restoreTransportFromSession(data);
  const bpmEl = document.getElementById('bpm');
  const masterEl = document.getElementById('masterVol');
  if (bpmEl) bpmEl.value = String(transport.bpm);
  if (masterEl) masterEl.value = String(transport.masterVolume);
  setMasterVolume(transport.masterVolume);
  if (typeof Tone !== 'undefined') Tone.Transport.bpm.value = transport.bpm;

  return transport;
}

export async function loadActiveSession() {
  const id = getActiveSessionId();
  const data = loadSessionData(id);
  if (data) await applySessionData(data);
}

export async function loadSessionById(id) {
  const data = loadSessionData(id);
  if (!data) return false;
  setActiveSessionId(id);
  await applySessionData(data);
  requestAutosave();
  return true;
}

export async function saveCurrentAsNew(name) {
  const id = createSessionId();
  const data = getSessionSnapshot();
  saveSessionData(id, name.trim() || 'Untitled', data);
  statusCallback('Saved');
  return id;
}

export function initSessionService() {
  initSessionStorage();
}
