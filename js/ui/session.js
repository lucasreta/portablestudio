import { CLIPS_PER_TRACK, INSTRUMENT_PRESETS } from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import { createTrack, disposeTrack, getPresetIdsByCategory } from '../core/tracks.js';
import { getMasterGain } from '../core/audio.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';
import { openMidiEditor } from './midi-editor.js';
import { openSampleEditor } from './sample-editor.js';
import { openEffectsPanel } from './effects-panel.js';
import { loadSampleFile } from '../core/sample.js';

export function launchClip(trackId, clipId) {
  const track = state.getTrack(trackId);
  if (!track) return;
  track.activeClip = track.activeClip === clipId ? null : clipId;
  updateClipUI();
  requestAutosave();
}

export function stopTrack(trackId) {
  const track = state.getTrack(trackId);
  if (track) {
    track.activeClip = null;
    updateClipUI();
    requestAutosave();
  }
}

export function stopAllClips() {
  state.tracks.forEach((t) => { t.activeClip = null; });
  updateClipUI();
  requestAutosave();
}

function updateClipUI() {
  document.querySelectorAll('.clip-slot').forEach((slot) => {
    const t = parseInt(slot.dataset.track, 10);
    const c = parseInt(slot.dataset.clip, 10);
    const track = state.getTrack(t);
    slot.classList.toggle('active', track && track.activeClip === c);
  });
}

export function addTrackFromPreset(presetId) {
  const track = createTrack(getMasterGain(), presetId);
  state.addTrack(track);
  buildSessionUI();
  requestAutosave();
}

export function removeTrackById(trackId) {
  const track = state.getTrack(trackId);
  if (track) disposeTrack(track);
  state.removeTrack(trackId);
  buildSessionUI();
  requestAutosave();
}

export function buildSessionUI() {
  const container = document.getElementById('tracksContainer');
  container.innerHTML = '';

  if (state.tracks.length === 0) {
    container.innerHTML = `
      <div class="panel rounded-2xl p-6 text-center text-zinc-500 text-sm">
        No tracks yet. Tap <strong class="text-zinc-300">+ Add Track</strong> to get started.
      </div>`;
    return;
  }

  state.tracks.forEach((track) => {
    const preset = INSTRUMENT_PRESETS[track.presetId];
    const trackEl = document.createElement('div');
    trackEl.className = 'panel rounded-2xl overflow-hidden border-l-4';
    trackEl.style.borderLeftColor = track.color;

    const sampleBtns = track.type === 'sampler'
      ? `<div class="px-3 pb-2 flex flex-wrap items-center gap-2">
          <button class="load-sample-btn text-xs py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-medium" data-track="${track.id}">📁 Load</button>
          <button class="edit-sample-btn text-xs py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-medium" data-track="${track.id}" ${track.loadedFileName ? '' : 'disabled'}>✂️ Sample</button>
          <span class="filename-${track.id} text-[10px] text-zinc-500 truncate max-w-[140px]">${track.loadedFileName || 'No sample'}</span>
        </div>`
      : '';

    const clips = Array.from({ length: CLIPS_PER_TRACK }, (_, c) => `
      <div class="clip-slot rounded-xl text-center px-2 py-3 cursor-pointer text-xs font-medium relative" data-track="${track.id}" data-clip="${c}">
        <span class="clip-label">CLIP ${c + 1}</span>
        <button type="button" class="clip-edit-btn" data-track="${track.id}" data-clip="${c}" title="Edit clip">✎</button>
      </div>`).join('');

    trackEl.innerHTML = `
      <div class="track-header px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-x-3 flex-wrap">
          <div class="w-3 h-3 rounded-full shrink-0" style="background-color:${track.color}"></div>
          <span class="font-bold text-sm tracking-wider">${track.name}</span>
          <span class="text-[9px] text-zinc-600 uppercase">${preset?.label || ''}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="fx-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400" data-track="${track.id}">FX</button>
          <button class="stop-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400" data-track="${track.id}">STOP</button>
          <button class="remove-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-red-900/40 border border-zinc-700 text-red-400" data-track="${track.id}">✕</button>
        </div>
      </div>
      ${sampleBtns}
      <div class="px-3 pb-3 pt-1 grid grid-cols-4 gap-2">${clips}</div>`;

    container.appendChild(trackEl);
  });

  bindSessionEvents();
  updateClipUI();
}

function bindSessionEvents() {
  document.querySelectorAll('.clip-slot').forEach((slot) => {
    slot.addEventListener('click', async (e) => {
      if (e.target.closest('.clip-edit-btn')) return;
      await startAudio();
      launchClip(parseInt(slot.dataset.track, 10), parseInt(slot.dataset.clip, 10));
    });
  });

  document.querySelectorAll('.clip-edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trackId = parseInt(btn.dataset.track, 10);
      const clipId = parseInt(btn.dataset.clip, 10);
      openMidiEditor(trackId, clipId);
    });
  });

  document.querySelectorAll('.stop-track-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopTrack(parseInt(btn.dataset.track, 10));
    });
  });

  document.querySelectorAll('.remove-track-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Remove this track?')) removeTrackById(parseInt(btn.dataset.track, 10));
    });
  });

  document.querySelectorAll('.load-sample-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await startAudio();
      const trackId = parseInt(btn.dataset.track, 10);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        try {
          await loadSampleFile(state.getTrack(trackId), file);
          buildSessionUI();
          requestAutosave();
        } catch (err) {
          alert(`Failed to load sample: ${err.message}`);
        }
      };
      input.click();
    });
  });

  document.querySelectorAll('.edit-sample-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSampleEditor(parseInt(btn.dataset.track, 10));
    });
  });

  document.querySelectorAll('.fx-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEffectsPanel(parseInt(btn.dataset.track, 10));
    });
  });
}

export function setupAddTrackMenu() {
  const menu = document.getElementById('addTrackMenu');
  const btn = document.getElementById('addTrackBtn');
  const categories = getPresetIdsByCategory();

  let html = '';
  for (const [category, presets] of Object.entries(categories)) {
    html += `<div class="text-[10px] uppercase tracking-wider text-zinc-500 px-3 pt-2 pb-1">${category}</div>`;
    presets.forEach(({ id, label }) => {
      html += `<button class="add-preset-btn w-full text-left px-3 py-2 text-sm hover:bg-zinc-800" data-preset="${id}">${label}</button>`;
    });
  }
  menu.innerHTML = html;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));

  menu.querySelectorAll('.add-preset-btn').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      await startAudio();
      addTrackFromPreset(el.dataset.preset);
      menu.classList.add('hidden');
    });
  });
}
