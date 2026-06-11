/** @type {object[]} */
export let tracks = [];

export let gridDivision = 16;
export let pianoRollOctave = 4;
export let pianoRollScale = 'chromatic';
export let pianoRollRoot = 'C';

/** @type {number | null} */
export let editingTrackId = null;
/** @type {number | null} */
export let editingClipId = null;
/** @type {object | null} */
export let editingClip = null;

export function setTracks(next) {
  tracks = next;
}

export function addTrack(track) {
  tracks.push(track);
}

export function removeTrack(trackId) {
  tracks = tracks.filter((t) => t.id !== trackId);
}

export function getTrack(trackId) {
  return tracks.find((t) => t.id === trackId);
}

export function getClip(trackId, clipId) {
  const track = getTrack(trackId);
  return track?.clips?.find((c) => c.id === clipId) ?? null;
}

export function startEditing(trackId, clipId, clipCopy) {
  editingTrackId = trackId;
  editingClipId = clipId;
  editingClip = clipCopy;
}

export function stopEditing() {
  editingTrackId = null;
  editingClipId = null;
  editingClip = null;
}

export function setEditingClip(clip) {
  editingClip = clip;
}

export function setGridDivision(d) {
  gridDivision = d;
}

export function setPianoRollOctave(o) {
  pianoRollOctave = o;
}

export function setPianoRollScale(s) {
  pianoRollScale = s;
}

export function setPianoRollRoot(r) {
  pianoRollRoot = r;
}
