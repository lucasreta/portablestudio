import { STEPS_PER_BAR } from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import { toggleDrumStep, clearSteps } from '../core/patterns.js';
import { triggerClipAtStep } from '../core/instruments.js';
import { getScaleOptions } from '../core/scales.js';
import { requestAutosave } from '../core/session-service.js';
import { PianoRollEditor } from './piano-roll.js';
import * as state from '../state.js';

/** @type {PianoRollEditor | null} */
let pianoRoll = null;

function getPianoRoll() {
  if (!pianoRoll) {
    pianoRoll = new PianoRollEditor(document.getElementById('pianoRollCanvas'), {
      onChange: () => requestAutosave(),
    });
  }
  return pianoRoll;
}

export function openClipEditor(trackId, clipId) {
  const track = state.getTrack(trackId);
  const clip = state.getClip(trackId, clipId);
  if (!track || !clip) return;

  const copy = JSON.parse(JSON.stringify(clip));
  state.startEditing(trackId, clipId, copy);

  document.getElementById('modalTrackName').textContent = track.name;
  document.getElementById('modalClipInfo').textContent =
    `${clip.name} • ${clip.lengthBars} bar(s) • ${clip.loop ? 'loops' : 'one-shot'}`;

  setupEditorToolbar(track);
  document.getElementById('midiModal').classList.remove('hidden');

  if (track.type === 'melodic') {
    document.getElementById('pianoRollCanvas').classList.remove('hidden');
    document.getElementById('stepSeqContainer').classList.add('hidden');
    getPianoRoll().load(state.editingClip, {
      octave: state.pianoRollOctave,
      scale: state.pianoRollScale,
      division: state.gridDivision,
    });
  } else {
    document.getElementById('pianoRollCanvas').classList.add('hidden');
    document.getElementById('stepSeqContainer').classList.remove('hidden');
    renderStepSequencer(track);
  }
}

function setupEditorToolbar(track) {
  const scaleSel = document.getElementById('rollScale');
  const gridSel = document.getElementById('rollGrid');
  if (scaleSel && track.type === 'melodic') {
    scaleSel.innerHTML = getScaleOptions()
      .map((s) => `<option value="${s.id}" ${state.pianoRollScale === s.id ? 'selected' : ''}>${s.label}</option>`)
      .join('');
    scaleSel.onchange = () => {
      state.setPianoRollScale(scaleSel.value);
      getPianoRoll().setScale(scaleSel.value);
      requestAutosave();
    };
  }
  if (gridSel) {
    gridSel.value = String(state.gridDivision);
    gridSel.onchange = () => {
      state.setGridDivision(parseInt(gridSel.value, 10));
      if (track.type === 'melodic') getPianoRoll().setDivision(state.gridDivision);
      requestAutosave();
    };
  }
  document.getElementById('octaveDown').onclick = () => {
    getPianoRoll().scrollOctave(-1);
    requestAutosave();
  };
  document.getElementById('octaveUp').onclick = () => {
    getPianoRoll().scrollOctave(1);
    requestAutosave();
  };
}

function renderStepSequencer(track) {
  const container = document.getElementById('stepSeqContainer');
  container.innerHTML = '';
  const steps = state.editingClip.lengthSteps;

  for (let step = 0; step < steps; step++) {
    const cell = document.createElement('div');
    cell.className = 'step-cell';
    if (step % STEPS_PER_BAR === 0) cell.classList.add('step-cell-bar');
    cell.textContent = (step % STEPS_PER_BAR) + 1;
    if (state.editingClip.steps?.[step]) cell.classList.add('active');
    cell.addEventListener('click', () => {
      state.editingClip.steps = toggleDrumStep(state.editingClip.steps, step);
      cell.classList.toggle('active');
      requestAutosave();
    });
    container.appendChild(cell);
  }
}

function saveChanges() {
  const track = state.getTrack(state.editingTrackId);
  const idx = track?.clips?.findIndex((c) => c.id === state.editingClipId);
  if (!track || idx < 0 || !state.editingClip) return;
  track.clips[idx] = { ...state.editingClip, id: state.editingClipId };
  closeMidiModal();
  requestAutosave();
}

function clearCurrentClip() {
  const track = state.getTrack(state.editingTrackId);
  if (!track || !state.editingClip) return;
  if (track.type === 'melodic') {
    state.editingClip.notes = [];
    getPianoRoll().load(state.editingClip);
  } else {
    state.editingClip.steps = clearSteps(state.editingClip.steps);
    renderStepSequencer(track);
  }
}

function closeMidiModal() {
  document.getElementById('midiModal').classList.add('hidden');
  state.stopEditing();
}

async function previewCurrentClip() {
  await startAudio();
  const track = state.getTrack(state.editingTrackId);
  if (!track || !state.editingClip) return;

  let step = 0;
  const len = state.editingClip.lengthSteps;
  const interval = setInterval(() => {
    triggerClipAtStep(track, step, Tone.now(), state.editingClip);
    step++;
    if (step >= len) clearInterval(interval);
  }, 120);
}

export function setupMidiModal() {
  document.getElementById('saveModalBtn').addEventListener('click', saveChanges);
  document.getElementById('closeModalBtn').addEventListener('click', closeMidiModal);
  document.getElementById('clearClipBtn').addEventListener('click', clearCurrentClip);
  document.getElementById('previewBtn').addEventListener('click', previewCurrentClip);
  document.getElementById('midiModal').addEventListener('click', (e) => {
    if (e.target.id === 'midiModal') closeMidiModal();
  });
}

export function bindClipEditOnLongPress() {
  document.getElementById('tracksContainer').addEventListener('contextmenu', (e) => {
    const clip = e.target.closest('.timeline-clip');
    if (!clip) return;
    e.preventDefault();
    openClipEditor(parseInt(clip.dataset.track, 10), parseInt(clip.dataset.clip, 10));
  });
}
