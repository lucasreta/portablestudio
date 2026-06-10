/** @type {object[]} */
export let tracks = [];

/** @type {number | null} */
export let editingTrackId = null;
/** @type {number | null} */
export let editingClipId = null;
/** @type {Array | null} */
export let editingPattern = null;

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

export function startEditing(trackId, clipId, pattern) {
  editingTrackId = trackId;
  editingClipId = clipId;
  editingPattern = pattern;
}

export function stopEditing() {
  editingTrackId = null;
  editingClipId = null;
  editingPattern = null;
}

export function setEditingPattern(pattern) {
  editingPattern = pattern;
}
