import { STEPS_PER_CLIP } from '../core/constants.js';
import { startAudio } from '../core/audio.js';
import {
  toggleMelodicNote, toggleDrumStep, isNoteActiveAtStep, createEmptyPattern,
} from '../core/patterns.js';
import { triggerTrackSound } from '../core/instruments.js';
import { requestAutosave } from '../core/session-service.js';
import * as state from '../state.js';

export function openMidiEditor(trackId, clipId) {
  const track = state.getTrack(trackId);
  if (!track) return;
  if (track.type === 'sampler') return;

  const pattern = JSON.parse(JSON.stringify(track.patterns[clipId]));
  state.startEditing(trackId, clipId, pattern);

  document.getElementById('modalTrackName').textContent = track.name;
  document.getElementById('modalClipInfo').textContent = `Clip ${clipId + 1} • ${STEPS_PER_CLIP} steps`;

  document.getElementById('midiModal').classList.remove('hidden');

  if (track.type === 'melodic') renderPianoRoll(track);
  else renderStepSequencer(track);
}

function renderPianoRoll(track) {
  const container = document.getElementById('pianoRollContainer');
  container.innerHTML = '';
  container.className = 'piano-roll min-w-[620px]';

  const notes = track.noteRange;
  const isPoly = track.isPolyphonic;

  const headerRow = document.createElement('div');
  headerRow.style.gridColumn = `1 / span ${STEPS_PER_CLIP + 1}`;
  headerRow.className = 'flex text-[9px] text-zinc-500 mb-0.5';
  headerRow.innerHTML = `<div class="w-[52px]"></div>${
    Array.from({ length: STEPS_PER_CLIP }, (_, i) => `<div class="flex-1 text-center">${i + 1}</div>`).join('')
  }`;
  container.appendChild(headerRow);

  notes.forEach((note) => {
    const row = document.createElement('div');
    row.style.display = 'contents';

    const label = document.createElement('div');
    label.className = 'note-label text-xs';
    label.textContent = note;
    row.appendChild(label);

    for (let step = 0; step < STEPS_PER_CLIP; step++) {
      const cell = document.createElement('div');
      cell.className = 'roll-cell';
      if (isNoteActiveAtStep(state.editingPattern[step], note, isPoly)) {
        cell.classList.add('active');
      }
      cell.addEventListener('click', () => {
        state.setEditingPattern(toggleMelodicNote(state.editingPattern, step, note, isPoly));
        cell.classList.toggle('active');
      });
      row.appendChild(cell);
    }
    container.appendChild(row);
  });
}

function renderStepSequencer(track) {
  const container = document.getElementById('pianoRollContainer');
  container.innerHTML = '';
  container.className = 'step-sequencer';

  for (let step = 0; step < STEPS_PER_CLIP; step++) {
    const cell = document.createElement('div');
    cell.className = 'step-cell';
    cell.textContent = step + 1;
    if (state.editingPattern[step]) cell.classList.add('active');
    cell.addEventListener('click', () => {
      state.setEditingPattern(toggleDrumStep(state.editingPattern, step));
      cell.classList.toggle('active');
    });
    container.appendChild(cell);
  }
}

function saveChanges() {
  const track = state.getTrack(state.editingTrackId);
  if (!track || !state.editingPattern) return;
  track.patterns[state.editingClipId] = state.editingPattern;
  closeMidiModal();
  requestAutosave();
}

function clearCurrentClip() {
  const track = state.getTrack(state.editingTrackId);
  if (!track || !state.editingPattern) return;
  state.setEditingPattern(createEmptyPattern(track.type, track.isPolyphonic));
  if (track.type === 'melodic') renderPianoRoll(track);
  else renderStepSequencer(track);
}

function closeMidiModal() {
  document.getElementById('midiModal').classList.add('hidden');
  state.stopEditing();
}

async function previewCurrentClip() {
  await startAudio();
  const track = state.getTrack(state.editingTrackId);
  if (!track || !state.editingPattern) return;

  let step = 0;
  const interval = setInterval(() => {
    const val = state.editingPattern[step];
    if (val) triggerTrackSound(track, val, Tone.now());
    step++;
    if (step >= STEPS_PER_CLIP) clearInterval(interval);
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

/** Open editor when double-tapping a clip slot (melodic/drum). */
export function bindClipEditOnLongPress() {
  document.getElementById('tracksContainer').addEventListener('contextmenu', (e) => {
    const slot = e.target.closest('.clip-slot');
    if (!slot) return;
    e.preventDefault();
    const trackId = parseInt(slot.dataset.track, 10);
    const clipId = parseInt(slot.dataset.clip, 10);
    openMidiEditor(trackId, clipId);
  });
}
