import {
  TIMELINE_BARS, TIMELINE_STEPS,
  INSTRUMENT_PRESETS, GRID_DIVISIONS,
} from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import {
  stopTrack,
  addTrackFromPreset,
  removeTrackById,
} from '../core/session-actions.js';
import { getPresetIdsByCategory } from '../core/tracks.js';
import { requestAutosave } from '../core/session-service.js';
import {
  ensureArrangementClip,
  getArrangementMarkers,
  pitchLaneFraction,
} from '../core/arrangement.js';
import { setPlayheadListener, getArrangementStep } from '../core/scheduler.js';
import { loadAudioIntoClip } from '../core/audio-clip.js';
import {
  startClipRecording, stopClipRecording, isRecording, getRecordingTarget, cancelRecording,
} from '../core/recorder.js';
import { loadSampleFile } from '../core/sample.js';
import * as state from '../state.js';
import { openTrackEditor, refreshEditorGrid } from './midi-editor.js';
import { openSampleEditor } from './sample-editor.js';
import { openEffectsPanel } from './effects-panel.js';

export function updateTimelineUI() {
  const step = getArrangementStep();
  const pct = (step / TIMELINE_STEPS) * 100;
  document.querySelectorAll('.arrangement-playhead').forEach((el) => {
    el.style.left = `${pct}%`;
  });
}

function renderLaneContent(track) {
  const markers = getArrangementMarkers(track);
  const midiValues = markers.filter((m) => m.kind === 'note').map((m) => m.midi);
  const parts = [];

  markers.forEach((m) => {
    const left = (m.start / TIMELINE_STEPS) * 100;
    const width = Math.max((m.duration / TIMELINE_STEPS) * 100, 0.4);
    if (m.kind === 'note') {
      const frac = pitchLaneFraction(m.midi, midiValues);
      const top = 8 + frac * 70;
      parts.push(`<div class="arr-note" style="left:${left}%;width:${width}%;top:${top}%;background:${track.color}" title="${m.pitch}"></div>`);
    } else if (m.kind === 'hit') {
      parts.push(`<div class="arr-hit" style="left:${left}%;background:${track.color}"></div>`);
    } else if (m.kind === 'audio') {
      parts.push(`<div class="arr-audio" style="left:${left}%;width:${width}%;background:${track.color}" title="Audio"></div>`);
    }
  });

  return parts.join('');
}

export function buildSessionUI() {
  const container = document.getElementById('tracksContainer');
  container.innerHTML = '';

  const ruler = document.createElement('div');
  ruler.className = 'timeline-ruler panel rounded-t-2xl px-2 py-1 flex';
  ruler.innerHTML = `<div class="timeline-label-col"></div><div class="timeline-grid-col flex-1 flex relative">${Array.from({ length: TIMELINE_BARS }, (_, i) => `<div class="timeline-bar-label flex-1 text-center text-[9px] text-zinc-600">${i + 1}</div>`).join('')}<div class="arrangement-playhead" style="left:${(getArrangementStep() / TIMELINE_STEPS) * 100}%"></div></div>`;
  container.appendChild(ruler);

  if (state.tracks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'panel rounded-b-2xl p-6 text-center text-zinc-500 text-sm';
    empty.innerHTML = 'No tracks yet. Tap <strong class="text-zinc-300">+ Add Track</strong> to get started.';
    container.appendChild(empty);
    return;
  }

  state.tracks.forEach((track) => {
    ensureArrangementClip(track);
    const preset = INSTRUMENT_PRESETS[track.presetId];
    const clip = track.clips[0];
    const row = document.createElement('div');
    row.className = 'timeline-track panel border-l-4 overflow-hidden';
    row.style.borderLeftColor = track.color;

    const sampleRow = (track.type === 'sampler' || track.type === 'sampleInstrument')
      ? `<div class="px-3 py-1 flex flex-wrap gap-2 border-b border-zinc-800 items-center">
          <button class="load-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}">Load</button>
          <button class="edit-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}" ${track.loadedFileName ? '' : 'disabled'}>Sample</button>
          ${track.type === 'sampleInstrument' ? `<span class="text-[9px] text-zinc-600">Root: ${track.sampleSettings?.rootKey || 'C3'}</span>` : ''}
          <span class="text-[10px] text-zinc-500 truncate">${track.loadedFileName || 'No sample'}</span>
        </div>`
      : '';

    row.innerHTML = `
      <div class="timeline-track-header flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${track.color}"></div>
          <span class="font-bold text-xs truncate">${track.name}</span>
          <span class="text-[9px] text-zinc-600">${preset?.label || ''}</span>
        </div>
        <div class="flex gap-1 shrink-0">
          ${track.type === 'audio'
    ? `<button class="record-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-orange-400" data-track="${track.id}" data-clip="${clip.id}">REC</button>`
    : `<button class="edit-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">Edit</button>`}
          <button class="fx-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">FX</button>
          <button class="stop-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700" data-track="${track.id}">STOP</button>
          <button class="remove-track-btn text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-red-400" data-track="${track.id}">✕</button>
        </div>
      </div>
      ${sampleRow}
      <div class="timeline-lane-wrap">
        <div class="arrangement-lane" data-track="${track.id}">
          <div class="arrangement-playhead" style="left:${(getArrangementStep() / TIMELINE_STEPS) * 100}%"></div>
          ${renderLaneContent(track)}
        </div>
      </div>`;

    container.appendChild(row);
  });

  bindSessionEvents();
  updateTimelineUI();
}

function bindSessionEvents() {
  document.querySelectorAll('.arrangement-lane').forEach((lane) => {
    lane.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const trackId = parseInt(lane.dataset.track, 10);
      const track = state.getTrack(trackId);
      if (!track || track.type === 'audio') return;
      openTrackEditor(trackId);
    });
  });

  document.querySelectorAll('.edit-track-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTrackEditor(parseInt(btn.dataset.track, 10));
    });
  });

  document.querySelectorAll('.stop-track-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopTrack(parseInt(btn.dataset.track, 10));
      updateTimelineUI();
    });
  });

  document.querySelectorAll('.remove-track-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Remove this track?')) {
        removeTrackById(parseInt(btn.dataset.track, 10));
        buildSessionUI();
      }
    });
  });

  document.querySelectorAll('.record-track-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const trackId = parseInt(btn.dataset.track, 10);
      const clipId = parseInt(btn.dataset.clip, 10);
      const track = state.getTrack(trackId);
      const clip = state.getClip(trackId, clipId);
      if (!track || track.type !== 'audio' || !clip) return;

      await startAudio();

      if (isRecording() && getRecordingTarget()?.clipId === clipId) {
        try {
          btn.classList.remove('recording');
          btn.textContent = 'REC';
          const { arrayBuffer } = await stopClipRecording();
          await loadAudioIntoClip(clip, arrayBuffer, `take-${Date.now()}.webm`);
          buildSessionUI();
          requestAutosave();
        } catch (err) {
          alert(`Recording failed: ${err.message}`);
          cancelRecording();
        }
        return;
      }

      if (isRecording()) {
        alert('Stop the current recording first.');
        return;
      }

      try {
        document.querySelectorAll('.record-track-btn').forEach((b) => {
          b.classList.remove('recording');
          b.textContent = 'REC';
        });
        btn.classList.add('recording');
        btn.textContent = 'STOP';
        await startClipRecording(trackId, clipId);
      } catch (err) {
        alert(`Mic access failed: ${err.message}`);
        btn.classList.remove('recording');
        btn.textContent = 'REC';
      }
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
          const tr = state.getTrack(trackId);
          await loadSampleFile(tr, file);
          if (tr.type === 'sampleInstrument' && !tr.sampleSettings.rootKey) {
            tr.sampleSettings.rootKey = 'C3';
          }
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
      buildSessionUI();
      menu.classList.add('hidden');
    });
  });
}

export function setupGridSelector() {
  const sel = document.getElementById('gridDivision');
  if (!sel) return;
  sel.innerHTML = GRID_DIVISIONS.map((d) => `<option value="${d}" ${state.gridDivision === d ? 'selected' : ''}>1/${d} bar</option>`).join('');
  sel.addEventListener('change', () => {
    const division = parseInt(sel.value, 10);
    refreshEditorGrid(division);
  });
}

export function setupArrangementPlayhead() {
  setPlayheadListener(() => updateTimelineUI());
  document.addEventListener('studio:arrangement-changed', () => buildSessionUI());
}
