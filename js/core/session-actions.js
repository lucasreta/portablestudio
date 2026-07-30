import { getMasterGain } from './audio.js';
import { createTrack, disposeTrack } from './tracks.js';
import { createClip, setClipLengthBars } from './clips.js';
import { requestAutosave } from './session-service.js';
import { startAudioClipPlayback, stopAudioClipPlayback } from './audio-clip.js';
import * as state from '../state.js';
import { TIMELINE_STEPS, STEPS_PER_BAR } from './constants.js';

export function launchClip(trackId, clipId) {
  const track = state.getTrack(trackId);
  const clip = state.getClip(trackId, clipId);
  if (!track || !clip) return null;

  if (track.type === 'audio') {
    const wasPlaying = clip.playing;
    track.clips.forEach((c) => {
      c.playing = false;
      stopAudioClipPlayback(c);
    });

    if (wasPlaying) {
      track.playingClipId = null;
    } else {
      clip.playing = true;
      track.playingClipId = clipId;
      if (clip.hasRecording) startAudioClipPlayback(clip, track.chain.input);
    }
  } else if (clip.playing) {
    clip.playing = false;
    clip.playStep = 0;
    track.playingClipId = null;
  } else {
    track.clips.forEach((c) => { c.playing = false; c.playStep = 0; });
    clip.playing = true;
    clip.playStep = 0;
    track.playingClipId = clipId;
  }

  requestAutosave();
  return clip;
}

export function stopTrack(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return null;

  track.clips.forEach((c) => {
    c.playing = false;
    if (track.type === 'audio') stopAudioClipPlayback(c);
  });
  track.playingClipId = null;

  requestAutosave();
  return track;
}

export function stopAllClips() {
  state.tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      clip.playing = false;
      if (track.type === 'audio') stopAudioClipPlayback(clip);
    });
    track.playingClipId = null;
  });

  requestAutosave();
  return state.tracks;
}

export function addTrackFromPreset(presetId) {
  const track = createTrack(getMasterGain(), presetId);
  state.addTrack(track);
  requestAutosave();
  return track;
}

export function removeTrackById(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return false;

  disposeTrack(track);
  state.removeTrack(trackId);
  requestAutosave();
  return true;
}

export function addClipToTrack(trackId) {
  const track = state.getTrack(trackId);
  if (!track) return null;

  const lastEnd = Math.max(0, ...track.clips.map((c) => c.startStep + c.lengthSteps));
  const clip = createClip(track.type, { startStep: Math.min(lastEnd, TIMELINE_STEPS - STEPS_PER_BAR) });
  track.clips.push(clip);
  requestAutosave();
  return clip;
}

export function removeClipFromTrack(trackId, clipId) {
  const track = state.getTrack(trackId);
  if (!track) return null;

  const clipIndex = track.clips.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return null;

  if (track.playingClipId === clipId) {
    track.playingClipId = null;
  }

  const [removed] = track.clips.splice(clipIndex, 1);
  if (track.type === 'audio' && removed) {
    stopAudioClipPlayback(removed);
  }

  requestAutosave();
  return removed;
}

export function toggleClipLoop(trackId, clipId) {
  const clip = state.getClip(trackId, clipId);
  if (!clip) return null;
  clip.loop = !clip.loop;
  requestAutosave();
  return clip;
}

export function setClipLength(trackId, clipId, bars) {
  const track = state.getTrack(trackId);
  const clip = state.getClip(trackId, clipId);
  if (!track || !clip) return null;
  setClipLengthBars(clip, bars, track.type);
  requestAutosave();
  return clip;
}
