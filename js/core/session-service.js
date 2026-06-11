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
let snapshotProvider = null;

export function setSessionStatusCallback(cb) {
  statusCallback = cb;
}

export function setSessionSnapshotProvider(provider) {
  snapshotProvider = provider;
}

function getSessionSnapshot() {
  if (!snapshotProvider) {
    throw new Error('Session snapshot provider is not configured.');
  }
  return snapshotProvider();
}

export function createSessionSnapshot(tracks, transport, editor = {}) {
  return serializeSession(tracks, transport, editor);
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
  setMasterVolume(transport.masterVolume);
  if (typeof Tone !== 'undefined') Tone.Transport.bpm.value = transport.bpm;

  return transport;
}

export async function loadActiveSession() {
  const id = getActiveSessionId();
  const data = loadSessionData(id);
  if (!data) return null;
  return applySessionData(data);
}

export async function loadSessionById(id) {
  const data = loadSessionData(id);
  if (!data) return null;
  setActiveSessionId(id);
  const transport = await applySessionData(data);
  requestAutosave();
  return transport;
}

export async function saveCurrentAsNew(name, snapshot) {
  const id = createSessionId();
  const data = snapshot ?? getSessionSnapshot();
  saveSessionData(id, name.trim() || 'Untitled', data);
  statusCallback('Saved');
  return id;
}

export function initSessionService() {
  initSessionStorage();
}
