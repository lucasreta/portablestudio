export const SESSION_VERSION = 1;

/**
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * @param {object} track
 * @returns {object}
 */
export function serializeTrack(track) {
  return {
    id: track.id,
    name: track.name,
    presetId: track.presetId,
    type: track.type,
    color: track.color,
    activeClip: track.activeClip,
    patterns: track.patterns,
    isPolyphonic: track.isPolyphonic,
    noteRange: track.noteRange,
    effects: { ...track.effects },
    sampleSettings: { ...track.sampleSettings },
    loadedFileName: track.loadedFileName,
    sampleBase64: track._rawFileData ? arrayBufferToBase64(track._rawFileData) : null,
  };
}

/**
 * @param {object[]} tracks
 * @param {{ bpm: number, masterVolume: number, transportPlaying: boolean }} transport
 * @returns {object}
 */
export function serializeSession(tracks, transport) {
  return {
    version: SESSION_VERSION,
    bpm: transport.bpm,
    masterVolume: transport.masterVolume,
    transportPlaying: transport.transportPlaying,
    tracks: tracks.map(serializeTrack),
  };
}

/**
 * @param {object} data
 * @returns {boolean}
 */
export function isValidSessionData(data) {
  return !!(data
    && data.version === SESSION_VERSION
    && Array.isArray(data.tracks));
}
