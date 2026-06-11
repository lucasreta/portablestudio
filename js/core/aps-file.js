import { serializeSession } from './session-serialize.js';

const APS_MIME = 'application/x-portable-studio';

/**
 * @param {object} sessionData
 * @param {string} [filename='session.aps']
 */
export function downloadApsFile(sessionData, filename = 'session.aps') {
  const name = filename.endsWith('.aps') ? filename : `${filename}.aps`;
  const json = JSON.stringify(sessionData, null, 2);
  const blob = new Blob([json], { type: APS_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {object[]} tracks
 * @param {object} transport
 * @param {object} editor
 * @param {string} filename
 */
export function exportSessionToAps(tracks, transport, editor, filename) {
  const data = serializeSession(tracks, transport, editor);
  downloadApsFile(data, filename);
}

/**
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function parseApsFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.tracks) throw new Error('Invalid .aps file — missing tracks.');
  return data;
}
