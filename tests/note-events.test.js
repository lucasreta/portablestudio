import { describe, it, expect } from 'vitest';
import { addNote, updateNote, patternToNotes } from '../js/core/note-events.js';

describe('note-events', () => {
  it('adds and updates notes', () => {
    let notes = addNote([], 'C4', 0, 2);
    expect(notes).toHaveLength(1);
    notes = updateNote(notes, notes[0].id, { duration: 4 });
    expect(notes[0].duration).toBe(4);
  });

  it('migrates legacy pattern to notes', () => {
    const pattern = [null, 'C3', null, ['Eb3', 'G3']];
    const notes = patternToNotes(pattern, true);
    expect(notes.some((n) => n.pitch === 'C3' && n.start === 1)).toBe(true);
    expect(notes.filter((n) => n.start === 3)).toHaveLength(2);
  });
});
