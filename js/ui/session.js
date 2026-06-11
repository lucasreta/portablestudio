import {
  TIMELINE_BARS, TIMELINE_STEPS, STEPS_PER_BAR,
  INSTRUMENT_PRESETS, GRID_DIVISIONS, CLIP_LENGTH_BARS_OPTIONS,
} from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import { createTrack, disposeTrack, getPresetIdsByCategory } from '../core/tracks.js';
import { getMasterGain } from '../core/audio.js';
import { requestAutosave } from '../core/session-service.js';
import { createClip, setClipLengthBars, setClipStartStep } from '../core/clips.js';
import { snapStep } from '../core/grid.js';
import * as state from '../state.js';
import { openClipEditor } from './midi-editor.js';
import { openSampleEditor } from './sample-editor.js';
import { openEffectsPanel } from './effects-panel.js';
import { loadSampleFile } from '../core/sample.js';

export function launchClip(trackId, clipId) {
  const track = state.getTrack(trackId);
  const clip = state.getClip(trackId, clipId);
  if (!track || !clip) return;

  if (clip.playing) {
    clip.playing = false;
    clip.playStep = 0;
    track.playingClipId = null;
  } else {
    track.clips.forEach((c) => { c.playing = false; c.playStep = 0; });
    clip.playing = true;
    clip.playStep = 0;
    track.playingClipId = clipId;
  }
  updateTimelineUI();
  requestAutosave();
}

export function stopTrack(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return;
  track.clips.forEach((c) => { c.playing = false; });
  track.playingClipId = null;
  updateTimelineUI();
  requestAutosave();
}

export function stopAllClips() {
  state.tracks.forEach((t) => {
    t.clips.forEach((c) => { c.playing = false; });
    t.playingClipId = null;
  });
  updateTimelineUI();
  requestAutosave();
}

function updateTimelineUI() {
  document.querySelectorAll('.timeline-clip').forEach((el) => {
    const track = state.getTrack(parseInt(el.dataset.track, 10));
    const clip = track?.clips?.find((c) => c.id === parseInt(el.dataset.clip, 10));
    el.classList.toggle('timeline-clip-playing', !!clip?.playing);
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

function addClipToTrack(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return;
  const lastEnd = Math.max(0, ...track.clips.map((c) => c.startStep + c.lengthSteps));
  const clip = createClip(track.type, { startStep: Math.min(lastEnd, TIMELINE_STEPS - STEPS_PER_BAR) });
  track.clips.push(clip);
  buildSessionUI();
  requestAutosave();
}

export function buildSessionUI() {
  const container = document.getElementById('tracksContainer');
  container.innerHTML = '';

  const ruler = document.createElement('div');
  ruler.className = 'timeline-ruler panel rounded-t-2xl px-2 py-1 flex';
  ruler.innerHTML = `<div class="timeline-label-col"></div><div class="timeline-grid-col flex-1 flex">${Array.from({ length: TIMELINE_BARS }, (_, i) => `<div class="timeline-bar-label flex-1 text-center text-[9px] text-zinc-600">${i + 1}</div>`).join('')}</div>`;
  container.appendChild(ruler);

  if (state.tracks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'panel rounded-b-2xl p-6 text-center text-zinc-500 text-sm';
    empty.innerHTML = 'No tracks yet. Tap <strong class="text-zinc-300">+ Add Track</strong> to get started.';
    container.appendChild(empty);
    return;
  }

  state.tracks.forEach((track) => {
    const preset = INSTRUMENT_PRESETS[track.presetId];
    const row = document.createElement('div');
    row.className = 'timeline-track panel border-l-4 overflow-hidden';
    row.style.borderLeftColor = track.color;

    const sampleRow = track.type === 'sampler'
      ? `<div class="px-3 py-1 flex flex-wrap gap-2 border-b border-zinc-800">
          <button class="load-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}">📁 Load</button>
          <button class="edit-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}" ${track.loadedFileName ? '' : 'disabled'}>✂️ Sample</button>
          <span class="text-[10px] text-zinc-500 truncate">${track.loadedFileName || 'No sample'}</span>
        </div>`
      : '';

    const clipsHtml = track.clips.map((clip) => {
      const left = (clip.startStep / TIMELINE_STEPS) * 100;
      const width = (clip.lengthSteps / TIMELINE_STEPS) * 100;
      return `<div class="timeline-clip ${clip.playing ? 'timeline-clip-playing' : ''}"
        data-track="${track.id}" data-clip="${clip.id}"
        style="left:${left}%;width:${width}%"
        title="${clip.name} • ${clip.lengthBars} bar(s)${clip.loop ? ' • loop' : ''}">
        <span class="timeline-clip-name">${clip.name}</span>
        <button type="button" class="clip-edit-btn" data-track="${track.id}" data-clip="${clip.id}">✎</button>
        <button type="button" class="clip-loop-btn ${clip.loop ? 'active' : ''}" data-track="${track.id}" data-clip="${clip.id}" title="Loop">↻</button>
        <select class="clip-length-select" data-track="${track.id}" data-clip="${clip.id}">
          ${CLIP_LENGTH_BARS_OPTIONS.map((b) => `<option value="${b}" ${clip.lengthBars === b ? 'selected' : ''}>${b}b</option>`).join('')}
        </select>
        <span class="clip-resize-handle" data-track="${track.id}" data-clip="${clip.id}"></span>
      </div>`;
    }).join('');

    row.innerHTML = `
      <div class="timeline-track-header flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${track.color}"></div>
          <span class="font-bold text-xs truncate">${track.name}</span>
          <span class="text-[9px] text-zinc-600">${preset?.label || ''}</span>
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="add-clip-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">+ Clip</button>
          <button class="fx-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">FX</button>
          <button class="stop-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">STOP</button>
          <button class="remove-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-red-400" data-track="${track.id}">✕</button>
        </div>
      </div>
      ${sampleRow}
      <div class="timeline-lane-wrap">
        <div class="timeline-lane" data-track="${track.id}">${clipsHtml}</div>
      </div>`;

    container.appendChild(row);
  });

  bindSessionEvents();
  updateTimelineUI();
}

function bindSessionEvents() {
  document.querySelectorAll('.timeline-clip').forEach((el) => {
    el.addEventListener('click', async (e) => {
      if (e.target.closest('.clip-edit-btn, .clip-loop-btn, .clip-length-select, .clip-resize-handle')) return;
      await startAudio();
      launchClip(parseInt(el.dataset.track, 10), parseInt(el.dataset.clip, 10));
    });
  });

  document.querySelectorAll('.clip-edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openClipEditor(parseInt(btn.dataset.track, 10), parseInt(btn.dataset.clip, 10));
    });
  });

  document.querySelectorAll('.clip-loop-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const clip = state.getClip(parseInt(btn.dataset.track, 10), parseInt(btn.dataset.clip, 10));
      if (clip) {
        clip.loop = !clip.loop;
        btn.classList.toggle('active', clip.loop);
        requestAutosave();
      }
    });
  });

  document.querySelectorAll('.clip-length-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      e.stopPropagation();
      const track = state.getTrack(parseInt(sel.dataset.track, 10));
      const clip = state.getClip(parseInt(sel.dataset.track, 10), parseInt(sel.dataset.clip, 10));
      if (track && clip) {
        setClipLengthBars(clip, parseInt(sel.value, 10), track.type);
        buildSessionUI();
        requestAutosave();
      }
    });
  });

  bindClipDrag();
  bindClipResize();

  document.querySelectorAll('.add-clip-btn').forEach((btn) => {
    btn.addEventListener('click', () => addClipToTrack(parseInt(btn.dataset.track, 10)));
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

function bindClipDrag() {
  document.querySelectorAll('.timeline-clip').forEach((el) => {
    let dragging = false;
    let startX = 0;
    let origStart = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.clip-edit-btn, .clip-loop-btn, .clip-length-select, .clip-resize-handle')) return;
      dragging = true;
      startX = e.clientX;
      const clip = state.getClip(parseInt(el.dataset.track, 10), parseInt(el.dataset.clip, 10));
      origStart = clip?.startStep ?? 0;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const lane = el.parentElement;
      const laneW = lane.getBoundingClientRect().width;
      const dx = e.clientX - startX;
      const dSteps = Math.round((dx / laneW) * TIMELINE_STEPS);
      const clip = state.getClip(parseInt(el.dataset.track, 10), parseInt(el.dataset.clip, 10));
      if (!clip) return;
      setClipStartStep(clip, snapStep(origStart + dSteps, 1), TIMELINE_STEPS);
      el.style.left = `${(clip.startStep / TIMELINE_STEPS) * 100}%`;
    });

    el.addEventListener('pointerup', () => {
      if (dragging) {
        dragging = false;
        requestAutosave();
      }
    });
  });
}

function bindClipResize() {
  document.querySelectorAll('.clip-resize-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const trackId = parseInt(handle.dataset.track, 10);
      const clipId = parseInt(handle.dataset.clip, 10);
      const track = state.getTrack(trackId);
      const clip = state.getClip(trackId, clipId);
      const el = handle.closest('.timeline-clip');
      const lane = el.parentElement;
      const startX = e.clientX;
      const origBars = clip.lengthBars;

      const onMove = (ev) => {
        const laneW = lane.getBoundingClientRect().width;
        const dx = ev.clientX - startX;
        const dBars = Math.round((dx / laneW) * TIMELINE_BARS);
        const newBars = CLIP_LENGTH_BARS_OPTIONS.reduce((best, b) => {
          const target = Math.max(1, origBars + dBars);
          return Math.abs(b - target) < Math.abs(best - target) ? b : best;
        }, origBars);
        setClipLengthBars(clip, newBars, track.type);
        el.style.width = `${(clip.lengthSteps / TIMELINE_STEPS) * 100}%`;
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        buildSessionUI();
        requestAutosave();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      handle.setPointerCapture(e.pointerId);
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

export function setupGridSelector() {
  const sel = document.getElementById('gridDivision');
  if (!sel) return;
  sel.innerHTML = GRID_DIVISIONS.map((d) => `<option value="${d}" ${state.gridDivision === d ? 'selected' : ''}>1/${d} bar</option>`).join('');
  sel.addEventListener('change', () => {
    state.setGridDivision(parseInt(sel.value, 10));
    requestAutosave();
  });
}
