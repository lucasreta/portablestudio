import {
  TIMELINE_BARS, TIMELINE_STEPS, STEPS_PER_BAR,
  INSTRUMENT_PRESETS, GRID_DIVISIONS, CLIP_LENGTH_BARS_OPTIONS,
} from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import {
  launchClip,
  stopTrack,
  stopAllClips,
  addTrackFromPreset,
  removeTrackById,
  addClipToTrack as addClipToTrackAction,
  removeClipFromTrack,
  toggleClipLoop,
  setClipLength,
} from '../core/session-actions.js';
import { setClipLengthBars, setClipStartStep } from '../core/clips.js';
import { snapStep } from '../core/grid.js';
import * as state from '../state.js';
import { openClipEditor, refreshEditorGrid } from './midi-editor.js';
import { openSampleEditor } from './sample-editor.js';
import { openEffectsPanel } from './effects-panel.js';
import { loadSampleFile } from '../core/sample.js';
import {
  startAudioClipPlayback, stopAudioClipPlayback, loadAudioIntoClip,
} from '../core/audio-clip.js';
import {
  startClipRecording, stopClipRecording, isRecording, getRecordingTarget, cancelRecording,
} from '../core/recorder.js';

function updateTimelineUI() {
  document.querySelectorAll('.timeline-clip').forEach((el) => {
    const track = state.getTrack(parseInt(el.dataset.track, 10));
    const clip = track?.clips?.find((c) => c.id === parseInt(el.dataset.clip, 10));
    el.classList.toggle('timeline-clip-playing', !!clip?.playing);
  });
}

function addClipToTrack(trackId) {
  const clip = addClipToTrackAction(trackId);
  if (clip) buildSessionUI();
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

    const sampleRow = (track.type === 'sampler' || track.type === 'sampleInstrument')
      ? `<div class="px-3 py-1 flex flex-wrap gap-2 border-b border-zinc-800 items-center">
          <button class="load-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}">📁 Load</button>
          <button class="edit-sample-btn text-[10px] py-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700" data-track="${track.id}" ${track.loadedFileName ? '' : 'disabled'}>✂️ Sample</button>
          ${track.type === 'sampleInstrument' ? `<span class="text-[9px] text-zinc-600">Root: ${track.sampleSettings?.rootKey || 'C3'} • piano roll = pitch</span>` : ''}
          <span class="text-[10px] text-zinc-500 truncate">${track.loadedFileName || 'No sample'}</span>
        </div>`
      : '';

    const audioRow = track.type === 'audio'
      ? `<div class="px-3 py-1 flex flex-wrap gap-2 border-b border-zinc-800 items-center text-[9px] text-zinc-500">
          Tap ⏺ on a clip to record • launch clip to hear recording
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
        ${track.type === 'audio' ? `<button type="button" class="clip-record-btn ${clip.hasRecording ? 'has-audio' : ''}" data-track="${track.id}" data-clip="${clip.id}" title="Record">⏺</button>` : `<button type="button" class="clip-edit-btn" data-track="${track.id}" data-clip="${clip.id}">✎</button>`}
        <button type="button" class="clip-remove-btn" data-track="${track.id}" data-clip="${clip.id}" title="Remove">✕</button>
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
      ${audioRow}
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
      if (e.target.closest('.clip-edit-btn, .clip-loop-btn, .clip-length-select, .clip-resize-handle, .clip-record-btn')) return;
      await startAudio();
      launchClip(parseInt(el.dataset.track, 10), parseInt(el.dataset.clip, 10));
      updateTimelineUI();
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
      const clip = toggleClipLoop(parseInt(btn.dataset.track, 10), parseInt(btn.dataset.clip, 10));
      if (clip) {
        btn.classList.toggle('active', clip.loop);
      }
    });
  });

  document.querySelectorAll('.clip-length-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      e.stopPropagation();
      const clip = setClipLength(parseInt(sel.dataset.track, 10), parseInt(sel.dataset.clip, 10), parseInt(sel.value, 10));
      if (clip) {
        buildSessionUI();
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

  document.querySelectorAll('.clip-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const removed = removeClipFromTrack(parseInt(btn.dataset.track, 10), parseInt(btn.dataset.clip, 10));
      if (removed) {
        buildSessionUI();
      }
    });
  });

  document.querySelectorAll('.clip-record-btn').forEach((btn) => {
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
          btn.textContent = '⏺';
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
        document.querySelectorAll('.clip-record-btn').forEach((b) => {
          b.classList.remove('recording');
          b.textContent = '⏺';
        });
        btn.classList.add('recording');
        btn.textContent = '⏹';
        await startClipRecording(trackId, clipId);
      } catch (err) {
        alert(`Mic access failed: ${err.message}`);
        btn.classList.remove('recording');
        btn.textContent = '⏺';
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

function bindClipDrag() {
  document.querySelectorAll('.timeline-clip').forEach((el) => {
    let dragging = false;
    let startX = 0;
    let origStart = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.clip-edit-btn, .clip-loop-btn, .clip-length-select, .clip-resize-handle, .clip-record-btn')) return;
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
