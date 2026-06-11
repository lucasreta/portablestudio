import {
  SESSION_VERSION, APS_FORMAT, APS_FORMAT_VERSION,
  DEFAULT_GRID_DIVISION,
} from './constants.js';
import { createDefaultClips } from './clips.js';
import { patternToNotes } from './note-events.js';
import { STEPS_PER_BAR } from './constants.js';

export { SESSION_VERSION };

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function serializeClip(clip, type) {
  return {
    id: clip.id,
    name: clip.name,
    startStep: clip.startStep,
    lengthBars: clip.lengthBars,
    lengthSteps: clip.lengthSteps,
    loop: clip.loop,
    playing: clip.playing,
    playStep: clip.playStep ?? 0,
    steps: type === 'melodic' ? null : clip.steps,
    notes: type === 'melodic' ? clip.notes : null,
  };
}

export function serializeTrack(track) {
  return {
    id: track.id,
    name: track.name,
    presetId: track.presetId,
    type: track.type,
    color: track.color,
    playingClipId: track.playingClipId,
    clips: (track.clips || []).map((c) => serializeClip(c, track.type)),
    isPolyphonic: track.isPolyphonic,
    effects: { ...track.effects },
    sampleSettings: { ...track.sampleSettings },
    loadedFileName: track.loadedFileName,
    sampleBase64: track._rawFileData ? arrayBufferToBase64(track._rawFileData) : null,
  };
}

export function serializeSession(tracks, transport, editor = {}) {
  return {
    format: APS_FORMAT,
    formatVersion: APS_FORMAT_VERSION,
    version: SESSION_VERSION,
    bpm: transport.bpm,
    masterVolume: transport.masterVolume,
    transportPlaying: transport.transportPlaying,
    gridDivision: editor.gridDivision ?? DEFAULT_GRID_DIVISION,
    pianoRollOctave: editor.pianoRollOctave ?? 4,
    pianoRollScale: editor.pianoRollScale ?? 'chromatic',
    pianoRollRoot: editor.pianoRollRoot ?? 'C',
    tracks: tracks.map(serializeTrack),
  };
}

export function isValidSessionData(data) {
  return !!(data && Array.isArray(data.tracks)
    && (data.version === SESSION_VERSION || data.version === 1 || data.format === APS_FORMAT));
}

/** Migrate v1 track (patterns[]) to v2 clips[] */
export function migrateTrackV1(t) {
  const type = t.type;
  const clips = [];

  if (Array.isArray(t.patterns)) {
    t.patterns.forEach((pattern, i) => {
      const clip = {
        id: i,
        name: `Clip ${i + 1}`,
        startStep: i * STEPS_PER_BAR,
        lengthBars: 1,
        lengthSteps: STEPS_PER_BAR,
        loop: true,
        playing: t.activeClip === i,
        steps: null,
        notes: null,
      };
      if (type === 'melodic') {
        clip.notes = patternToNotes(pattern, t.isPolyphonic);
      } else {
        clip.steps = pattern.map((s) => (s ? 1 : 0));
      }
      clips.push(clip);
    });
  } else {
    return t.clips || createDefaultClips(type);
  }
  return clips;
}

export function normalizeSessionData(data) {
  if (!data) return null;
  const normalized = { ...data, version: SESSION_VERSION };
  normalized.tracks = (data.tracks || []).map((t) => {
    if (t.clips) return t;
    return {
      ...t,
      playingClipId: t.activeClip ?? t.playingClipId ?? null,
      clips: migrateTrackV1(t),
    };
  });
  return normalized;
}
