import {
  TIMELINE_BARS, TIMELINE_STEPS, STEPS_PER_BAR,
} from './constants.js';
import { createClip, createEmptySteps, setClipLengthBars } from './clips.js';
import { createNoteId } from './note-events.js';
import { noteNameToMidi } from './scales.js';

/**
 * Flatten / expand a track into a single full-timeline arrangement clip.
 * Keeps notes and steps at absolute timeline positions.
 * @param {object} track
 */
export function ensureArrangementClip(track) {
  if (!track) return null;

  if (!Array.isArray(track.clips) || track.clips.length === 0) {
    const clip = createClip(track.type, {
      name: 'Arrangement',
      startStep: 0,
      lengthBars: TIMELINE_BARS,
      loop: false,
    });
    track.clips = [clip];
    track.playingClipId = null;
    return clip;
  }

  if (track.clips.length === 1) {
    const clip = track.clips[0];
    expandClipToTimeline(clip, track.type);
    clip.name = 'Arrangement';
    clip.loop = false;
    clip.startStep = 0;
    return clip;
  }

  const merged = createClip(track.type, {
    name: 'Arrangement',
    startStep: 0,
    lengthBars: TIMELINE_BARS,
    loop: false,
  });

  if (track.type === 'melodic' || track.type === 'sampleInstrument') {
    const notes = [];
    track.clips.forEach((clip) => {
      (clip.notes || []).forEach((n) => {
        const start = clip.startStep + n.start;
        if (start >= TIMELINE_STEPS) return;
        const duration = Math.max(1, Math.min(n.duration, TIMELINE_STEPS - start));
        notes.push({
          id: n.id || createNoteId(),
          pitch: n.pitch,
          start,
          duration,
          velocity: n.velocity ?? 0.8,
        });
      });
    });
    merged.notes = notes;
  } else if (track.type === 'audio') {
    // Prefer first recorded audio region; keep absolute start.
    const withAudio = track.clips.find((c) => c.hasRecording || c._rawBuffer) || track.clips[0];
    merged.audioFileName = withAudio.audioFileName ?? null;
    merged.hasRecording = !!withAudio.hasRecording;
    merged._rawBuffer = withAudio._rawBuffer;
    merged._rawFileData = withAudio._rawFileData;
    merged.player = withAudio.player;
    merged.startStep = Math.min(withAudio.startStep || 0, TIMELINE_STEPS - STEPS_PER_BAR);
    // Keep length from source when present.
    if (withAudio.lengthBars) {
      setClipLengthBars(merged, Math.min(withAudio.lengthBars, TIMELINE_BARS), 'audio');
      merged.startStep = Math.min(withAudio.startStep || 0, TIMELINE_STEPS - merged.lengthSteps);
    }
  } else {
    const steps = createEmptySteps(TIMELINE_STEPS);
    track.clips.forEach((clip) => {
      (clip.steps || []).forEach((val, i) => {
        const abs = clip.startStep + i;
        if (abs < TIMELINE_STEPS && val) steps[abs] = 1;
      });
    });
    merged.steps = steps;
  }

  // Dispose extra clip players we are dropping.
  track.clips.forEach((c) => {
    if (c !== merged && c.player && c.player !== merged.player) {
      try { c.player.dispose?.(); } catch { /* ignore */ }
    }
  });

  track.clips = [merged];
  track.playingClipId = null;
  return merged;
}

/**
 * @param {object} clip
 * @param {string} type
 */
function expandClipToTimeline(clip, type) {
  if (clip.startStep !== 0 && (type === 'melodic' || type === 'sampleInstrument')) {
    clip.notes = (clip.notes || []).map((n) => ({
      ...n,
      start: n.start + clip.startStep,
    })).filter((n) => n.start < TIMELINE_STEPS);
    clip.startStep = 0;
  } else if (clip.startStep !== 0 && type !== 'audio') {
    const next = createEmptySteps(TIMELINE_STEPS);
    (clip.steps || []).forEach((val, i) => {
      const abs = clip.startStep + i;
      if (abs < TIMELINE_STEPS) next[abs] = val ? 1 : 0;
    });
    clip.steps = next;
    clip.startStep = 0;
    clip.lengthBars = TIMELINE_BARS;
    clip.lengthSteps = TIMELINE_STEPS;
    return;
  }

  if (type === 'audio') {
    clip.startStep = clip.startStep || 0;
    if (!clip.lengthBars || clip.lengthBars < 1) {
      setClipLengthBars(clip, 1, type);
    }
    return;
  }

  if (clip.lengthBars !== TIMELINE_BARS || clip.lengthSteps !== TIMELINE_STEPS) {
    setClipLengthBars(clip, TIMELINE_BARS, type);
  }
  clip.startStep = 0;
}

/**
 * Absolute timeline note/hit markers for arrangement rendering.
 * @param {object} track
 * @returns {{ kind: 'note'|'hit'|'audio', start: number, duration: number, pitch?: string, midi?: number, clipId: number }[]}
 */
export function getArrangementMarkers(track) {
  ensureArrangementClip(track);
  const markers = [];

  (track.clips || []).forEach((clip) => {
    if (track.type === 'melodic' || track.type === 'sampleInstrument') {
      (clip.notes || []).forEach((n) => {
        markers.push({
          kind: 'note',
          start: clip.startStep + n.start,
          duration: n.duration,
          pitch: n.pitch,
          midi: noteNameToMidi(n.pitch),
          clipId: clip.id,
          noteId: n.id,
        });
      });
    } else if (track.type === 'audio') {
      if (clip.hasRecording || clip._rawBuffer) {
        markers.push({
          kind: 'audio',
          start: clip.startStep,
          duration: clip.lengthSteps,
          clipId: clip.id,
        });
      }
    } else {
      (clip.steps || []).forEach((val, i) => {
        if (!val) return;
        markers.push({
          kind: 'hit',
          start: clip.startStep + i,
          duration: 1,
          clipId: clip.id,
        });
      });
    }
  });

  return markers;
}

/**
 * Vertical placement 0..1 for a MIDI note within a track lane.
 * @param {number} midi
 * @param {number[]} midiValues
 */
export function pitchLaneFraction(midi, midiValues) {
  if (!midiValues.length) return 0.5;
  const min = Math.min(...midiValues);
  const max = Math.max(...midiValues);
  if (max === min) return 0.5;
  // Higher pitch nearer the top.
  return 1 - (midi - min) / (max - min);
}
