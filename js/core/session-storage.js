import { isValidSessionData } from './session-serialize.js';

const INDEX_KEY = 'portablestudio:index';
export const AUTOSAVE_ID = '__autosave__';

/** @type {string} */
let activeSessionId = AUTOSAVE_ID;
let saveTimer = null;

/**
 * @returns {{ activeId: string, sessions: Array<{ id: string, name: string, updatedAt: number }> }}
 */
function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { activeId: AUTOSAVE_ID, sessions: [] };
}

function writeIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function sessionKey(id) {
  return `portablestudio:session:${id}`;
}

export function getActiveSessionId() {
  return activeSessionId;
}

export function getActiveSessionName() {
  const index = readIndex();
  const entry = index.sessions.find((s) => s.id === activeSessionId);
  if (activeSessionId === AUTOSAVE_ID) return entry?.name || 'Autosave';
  return entry?.name || 'Untitled';
}

/**
 * @returns {Array<{ id: string, name: string, updatedAt: number }>}
 */
export function listSavedSessions() {
  return readIndex().sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * @param {string} id
 * @returns {object | null}
 */
export function loadSessionData(id) {
  try {
    const raw = localStorage.getItem(sessionKey(id));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return isValidSessionData(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} id
 * @param {string} name
 * @param {object} data
 */
export function saveSessionData(id, name, data) {
  const index = readIndex();
  const now = Date.now();
  const existing = index.sessions.find((s) => s.id === id);

  if (existing) {
    existing.name = name;
    existing.updatedAt = now;
  } else {
    index.sessions.push({ id, name, updatedAt: now });
  }

  index.activeId = id;
  activeSessionId = id;
  writeIndex(index);

  try {
    localStorage.setItem(sessionKey(id), JSON.stringify(data));
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Storage full — delete old sessions or use smaller samples.');
    }
    throw err;
  }
}

export function deleteSession(id) {
  if (id === AUTOSAVE_ID) return;
  localStorage.removeItem(sessionKey(id));
  const index = readIndex();
  index.sessions = index.sessions.filter((s) => s.id !== id);
  if (index.activeId === id) {
    index.activeId = AUTOSAVE_ID;
    activeSessionId = AUTOSAVE_ID;
  }
  writeIndex(index);
}

export function setActiveSessionId(id) {
  activeSessionId = id;
  const index = readIndex();
  index.activeId = id;
  writeIndex(index);
}

export function initSessionStorage() {
  const index = readIndex();
  activeSessionId = index.activeId || AUTOSAVE_ID;
  if (!index.sessions.find((s) => s.id === AUTOSAVE_ID)) {
    index.sessions.push({ id: AUTOSAVE_ID, name: 'Autosave', updatedAt: 0 });
    writeIndex(index);
  }
}

/**
 * @param {() => object} getSnapshot
 * @param {(status: string) => void} [onStatus]
 */
export function scheduleAutosave(getSnapshot, onStatus) {
  if (saveTimer) clearTimeout(saveTimer);
  onStatus?.('Saving…');
  saveTimer = setTimeout(() => {
    try {
      const data = getSnapshot();
      saveSessionData(activeSessionId, getActiveSessionName(), data);
      onStatus?.('Saved');
      setTimeout(() => onStatus?.(''), 2000);
    } catch (err) {
      onStatus?.('Save failed');
      console.error('Autosave failed:', err);
    }
  }, 400);
}

export function createSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
