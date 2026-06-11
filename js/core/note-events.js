/**
 * @typedef {{ id: string, pitch: string, start: number, duration: number, velocity: number }} NoteEvent
 */

let noteId = 0;

export function createNoteId() {
  return `n${noteId++}`;
}

export function resetNoteIdCounter() {
  noteId = 0;
}

/**
 * @param {NoteEvent[]} notes
 * @param {string} pitch
 * @param {number} start
 * @param {number} duration
 * @param {number} [velocity=0.8]
 */
export function addNote(notes, pitch, start, duration, velocity = 0.8) {
  const next = notes.filter((n) => !(n.pitch === pitch && n.start === start));
  next.push({ id: createNoteId(), pitch, start, duration, velocity });
  return next;
}

/**
 * @param {NoteEvent[]} notes
 * @param {string} id
 */
export function removeNote(notes, id) {
  return notes.filter((n) => n.id !== id);
}

/**
 * @param {NoteEvent[]} notes
 * @param {string} id
 * @param {Partial<NoteEvent>} patch
 */
export function updateNote(notes, id, patch) {
  return notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

/**
 * @param {NoteEvent[]} notes
 * @param {number} step
 * @returns {NoteEvent[]}
 */
export function getNotesStartingAt(notes, step) {
  return notes.filter((n) => n.start === step);
}

/**
 * Migrate legacy step pattern to note events.
 * @param {Array} pattern
 * @param {boolean} isPolyphonic
 */
export function patternToNotes(pattern, isPolyphonic = true) {
  const notes = [];
  pattern.forEach((stepData, start) => {
    if (!stepData) return;
    if (isPolyphonic && Array.isArray(stepData)) {
      stepData.forEach((pitch) => {
        notes.push({ id: createNoteId(), pitch, start, duration: 1, velocity: 0.8 });
      });
    } else if (typeof stepData === 'string') {
      notes.push({ id: createNoteId(), pitch: stepData, start, duration: 1, velocity: 0.8 });
    }
  });
  return notes;
}

/**
 * @param {number} lengthSteps
 */
export function createEmptyNotes(lengthSteps) {
  return [];
}
