import { describe, it, expect } from 'vitest';
import { noteNameToMidi, midiToNoteName } from '../js/core/scales.js';

describe('scales', () => {
  it('converts natural note names to MIDI', () => {
    expect(noteNameToMidi('C4')).toBe(60);
    expect(noteNameToMidi('A0')).toBe(21);
  });

  it('handles flats and sharps via enharmonics', () => {
    expect(noteNameToMidi('Eb3')).toBe(51);
    expect(noteNameToMidi('D#3')).toBe(51);
    expect(noteNameToMidi('F#4')).toBe(66);
    expect(noteNameToMidi('Gb4')).toBe(66);
  });

  it('falls back safely for invalid names', () => {
    expect(noteNameToMidi('H4')).toBe(60);
    expect(noteNameToMidi('')).toBe(60);
  });

  it('round-trips through midiToNoteName for natural/sharp names', () => {
    expect(midiToNoteName(noteNameToMidi('C#3'))).toBe('C#3');
    expect(midiToNoteName(noteNameToMidi('Eb3'))).toBe('Eb3');
  });
});
