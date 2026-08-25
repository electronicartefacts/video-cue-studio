/**
 * Builds a standard RIFF/WAVE marker carrier for Logic Pro import.
 * The PCM data is zero-filled in one ArrayBuffer: no JavaScript sample array is made.
 */
const text = new TextEncoder();
const fourCC = (view, offset, value) => { for (let index = 0; index < 4; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
const padded = (size) => size + (size & 1);
const cleanLabel = (label, index) => (String(label || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 240) || `Cue ${String(index + 1).padStart(2, '0')}`);

export function createLogicMarkerWavBuffer({ duration, markers, sampleRate = 48000 }) {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error('A positive integer sample rate is required.');
  if (!Array.isArray(markers) || markers.length === 0) throw new Error('At least one marker is required for a Logic marker carrier.');
  const ordered = markers
    .map((marker) => ({ ...marker, time: Number(marker.time) }))
    .filter((marker) => Number.isFinite(marker.time))
    .sort((a, b) => a.time - b.time);
  if (!ordered.length) throw new Error('No valid marker time is available.');

  const requestedSamples = Math.max(0, Math.ceil(Number(duration) * sampleRate) || 0);
  const lastMarkerSamples = Math.max(...ordered.map((marker) => Math.max(0, Math.round(marker.time * sampleRate))));
  const totalSamples = Math.max(requestedSamples, lastMarkerSamples);
  const dataSize = totalSamples * 2; // mono PCM 16-bit
  if (dataSize > 0xFFFFFFFF) throw new Error('This video is too long for a standard RIFF/WAVE export.');

  const cues = ordered.map((marker, index) => ({ id: index + 1, sampleOffset: Math.min(totalSamples, Math.max(0, Math.round(marker.time * sampleRate))), label: cleanLabel(marker.label, index) }));
  const labelChunks = cues.map((cue) => ({ cue, bytes: text.encode(`${cue.label}\0`) }));
  const fmtSize = 16;
  const cueSize = 4 + cues.length * 24;
  const adtlContentSize = 4 + labelChunks.reduce((size, item) => size + 8 + padded(4 + item.bytes.length), 0);
  const totalSize = 12 + (8 + fmtSize) + (8 + dataSize) + (8 + cueSize) + (8 + adtlContentSize);
  if (totalSize > 0xFFFFFFFF + 8) throw new Error('This export exceeds the RIFF/WAVE size limit.');

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;
  fourCC(view, offset, 'RIFF'); offset += 4; view.setUint32(offset, totalSize - 8, true); offset += 4; fourCC(view, offset, 'WAVE'); offset += 4;
  fourCC(view, offset, 'fmt '); offset += 4; view.setUint32(offset, fmtSize, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2; view.setUint16(offset, 1, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4; view.setUint32(offset, sampleRate * 2, true); offset += 4;
  view.setUint16(offset, 2, true); offset += 2; view.setUint16(offset, 16, true); offset += 2;
  fourCC(view, offset, 'data'); offset += 4; view.setUint32(offset, dataSize, true); offset += 4 + dataSize;
  fourCC(view, offset, 'cue '); offset += 4; view.setUint32(offset, cueSize, true); offset += 4; view.setUint32(offset, cues.length, true); offset += 4;
  // A PCM WAVE file with one data chunk has no playlist position.  Keeping
  // dwPosition at zero is important: the actual cue time is the sample offset.
  // Writing the offset in both fields can make readers that combine them place
  // every marker late (sometimes by the cue time a second time).
  for (const cue of cues) { view.setUint32(offset, cue.id, true); offset += 4; view.setUint32(offset, 0, true); offset += 4; fourCC(view, offset, 'data'); offset += 4; view.setUint32(offset, 0, true); offset += 4; view.setUint32(offset, 0, true); offset += 4; view.setUint32(offset, cue.sampleOffset, true); offset += 4; }
  fourCC(view, offset, 'LIST'); offset += 4; view.setUint32(offset, adtlContentSize, true); offset += 4; fourCC(view, offset, 'adtl'); offset += 4;
  for (const { cue, bytes } of labelChunks) { const size = 4 + bytes.length; fourCC(view, offset, 'labl'); offset += 4; view.setUint32(offset, size, true); offset += 4; view.setUint32(offset, cue.id, true); offset += 4; new Uint8Array(buffer, offset, bytes.length).set(bytes); offset += bytes.length; if (size & 1) { view.setUint8(offset, 0); offset += 1; } }
  return { buffer, cues, totalSamples, sampleRate };
}

export function createLogicMarkerWav(options) {
  const { buffer } = createLogicMarkerWavBuffer(options);
  return new Blob([buffer], { type: 'audio/wav' });
}
