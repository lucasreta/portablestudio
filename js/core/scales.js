const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const SCALE_PRESETS = {
  chromatic: { label: 'All notes (chromatic)', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  major: { label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  pentatonic: { label: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  blues: { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
};

/**
 * @param {number} midi
 * @returns {string}
 */
export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

const ENHARMONIC = {
  Db: 'C#',
  'D#': 'Eb',
  Eb: 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  Ab: 'Ab',
  'A#': 'Bb',
  Bb: 'Bb',
};

/**
 * @param {string} noteName e.g. C4, Eb3, D#3
 * @returns {number}
 */
export function noteNameToMidi(noteName) {
  const m = String(noteName || '').match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) return 60;
  const name = ENHARMONIC[m[1]] || m[1];
  const noteIdx = NOTE_NAMES.indexOf(name);
  if (noteIdx < 0) return 60;
  const octave = parseInt(m[2], 10);
  return (octave + 1) * 12 + noteIdx;
}

/**
 * @param {number} lowMidi
 * @param {number} highMidi
 * @param {string} [scaleId='chromatic']
 * @param {string} [root='C']
 * @returns {string[]}
 */
export function getVisibleNotes(lowMidi, highMidi, scaleId = 'chromatic', root = 'C') {
  const scale = SCALE_PRESETS[scaleId] || SCALE_PRESETS.chromatic;
  const rootName = ENHARMONIC[root] || root;
  const rootIdx = NOTE_NAMES.indexOf(rootName) >= 0 ? NOTE_NAMES.indexOf(rootName) : 0;
  const notes = [];
  for (let midi = highMidi; midi >= lowMidi; midi--) {
    const pc = ((midi % 12) + 12) % 12;
    const rel = (pc - rootIdx + 12) % 12;
    if (scale.intervals.includes(rel)) notes.push(midiToNoteName(midi));
  }
  return notes;
}

export function getScaleOptions() {
  return Object.entries(SCALE_PRESETS).map(([id, s]) => ({ id, label: s.label }));
}
