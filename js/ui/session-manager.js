import {
  listSavedSessions,
  deleteSession,
  getActiveSessionId,
  getActiveSessionName,
  AUTOSAVE_ID,
} from '../core/session-storage.js';
import {
  loadSessionById,
  saveCurrentAsNew,
  requestAutosave,
  setSessionStatusCallback,
} from '../core/session-service.js';
import { buildSessionUI } from './session.js';

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function renderSessionList() {
  const list = document.getElementById('sessionList');
  const sessions = listSavedSessions();
  const activeId = getActiveSessionId();

  if (sessions.length === 0) {
    list.innerHTML = '<div class="text-sm text-zinc-500 px-3 py-4">No saved sessions yet.</div>';
    return;
  }

  list.innerHTML = sessions.map((s) => `
    <div class="session-row ${s.id === activeId ? 'session-row-active' : ''}" data-id="${s.id}">
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm truncate">${s.name}</div>
        <div class="text-[10px] text-zinc-500">${formatDate(s.updatedAt)}${s.id === activeId ? ' • current' : ''}</div>
      </div>
      <div class="flex gap-1 shrink-0">
        ${s.id !== activeId ? `<button class="load-session-btn text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700" data-id="${s.id}">Load</button>` : ''}
        ${s.id !== AUTOSAVE_ID ? `<button class="delete-session-btn text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-red-400" data-id="${s.id}">✕</button>` : ''}
      </div>
    </div>`).join('');

  list.querySelectorAll('.load-session-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await loadSessionById(btn.dataset.id);
      buildSessionUI();
      updateSessionBar();
      renderSessionList();
      closeSessionsModal();
    });
  });

  list.querySelectorAll('.delete-session-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this session?')) return;
      deleteSession(btn.dataset.id);
      renderSessionList();
      updateSessionBar();
    });
  });
}

function updateSessionBar() {
  document.getElementById('sessionNameLabel').textContent = getActiveSessionName();
}

function openSessionsModal() {
  renderSessionList();
  document.getElementById('sessionsModal').classList.remove('hidden');
}

function closeSessionsModal() {
  document.getElementById('sessionsModal').classList.add('hidden');
}

export function setupSessionManager() {
  setSessionStatusCallback((status) => {
    const el = document.getElementById('saveStatus');
    if (el) {
      el.textContent = status;
      el.classList.toggle('text-emerald-400', status === 'Saved');
      el.classList.toggle('text-zinc-500', status !== 'Saved');
    }
  });

  updateSessionBar();

  document.getElementById('sessionsBtn').addEventListener('click', openSessionsModal);
  document.getElementById('sessionsCloseBtn').addEventListener('click', closeSessionsModal);
  document.getElementById('sessionsModal').addEventListener('click', (e) => {
    if (e.target.id === 'sessionsModal') closeSessionsModal();
  });

  document.getElementById('saveSessionAsBtn').addEventListener('click', async () => {
    const name = document.getElementById('newSessionName').value.trim();
    if (!name) {
      alert('Enter a session name.');
      return;
    }
    await saveCurrentAsNew(name);
    document.getElementById('newSessionName').value = '';
    updateSessionBar();
    renderSessionList();
  });

  document.getElementById('saveSessionNowBtn').addEventListener('click', () => {
    requestAutosave();
  });
}

export { updateSessionBar };
