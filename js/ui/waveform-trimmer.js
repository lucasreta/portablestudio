import { peaksFromAudioBuffer, formatTime, clampTrimRange } from '../core/waveform.js';

const HANDLE_WIDTH = 14;
const WAVEFORM_COLOR = '#00d26a';
const WAVEFORM_DIM = '#3a3a3a';
const BG_COLOR = '#141414';
const SELECTION_FILL = 'rgba(0, 210, 106, 0.12)';
const DIM_OVERLAY = 'rgba(0, 0, 0, 0.55)';

/**
 * Interactive waveform trimmer bound to start/end fractions (0–1).
 */
export class WaveformTrimmer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onTrimChange?: (start: number, end: number) => void }} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTrimChange = options.onTrimChange || (() => {});
    this.peaks = null;
    this.bucketCount = 0;
    this.duration = 0;
    this.start = 0;
    this.end = 1;
    this.dragging = null;
    this.dpr = window.devicePixelRatio || 1;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  /**
   * @param {AudioBuffer} buffer
   * @param {{ start?: number, end?: number }} trim
   */
  load(buffer, trim = {}) {
    const { peaks, bucketCount } = peaksFromAudioBuffer(buffer);
    this.peaks = peaks;
    this.bucketCount = bucketCount;
    this.duration = buffer.duration;
    this.start = trim.start ?? 0;
    this.end = trim.end ?? 1;
    this._resize();
    this.draw();
  }

  setTrim(start, end) {
    const clamped = clampTrimRange(start, end);
    this.start = clamped.start;
    this.end = clamped.end;
    this.draw();
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = w;
    this.height = h;
  }

  draw() {
    if (!this.peaks) return;
    const { ctx, width, height, peaks, bucketCount, start, end } = this;
    const midY = height / 2;
    const amp = (height / 2) * 0.9;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    const startX = start * width;
    const endX = end * width;

    // Full waveform (dimmed)
    ctx.fillStyle = WAVEFORM_DIM;
    for (let i = 0; i < bucketCount; i++) {
      const x = (i / bucketCount) * width;
      const barW = Math.max(1, width / bucketCount);
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const y1 = midY - max * amp;
      const y2 = midY - min * amp;
      ctx.fillRect(x, y1, barW, Math.max(1, y2 - y1));
    }

    // Selected region waveform (bright)
    const startBucket = Math.floor(start * bucketCount);
    const endBucket = Math.ceil(end * bucketCount);
    ctx.fillStyle = WAVEFORM_COLOR;
    for (let i = startBucket; i < endBucket; i++) {
      const x = (i / bucketCount) * width;
      const barW = Math.max(1, width / bucketCount);
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const y1 = midY - max * amp;
      const y2 = midY - min * amp;
      ctx.fillRect(x, y1, barW, Math.max(1, y2 - y1));
    }

    // Selection highlight + dim overlays
    ctx.fillStyle = SELECTION_FILL;
    ctx.fillRect(startX, 0, endX - startX, height);
    ctx.fillStyle = DIM_OVERLAY;
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    // Trim lines
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    // Handles
    this._drawHandle(startX, true);
    this._drawHandle(endX, false);
  }

  _drawHandle(x, isStart) {
    const { ctx, height } = this;
    const hw = HANDLE_WIDTH;
    const hx = x - hw / 2;
    ctx.fillStyle = '#00d26a';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hx, 4, hw, height - 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f0f0f';
    const gripX = x + (isStart ? -2 : 2);
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(gripX - 1, height / 2 + i * 5 - 3, 2, 6);
    }
  }

  _fractionFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  _hitHandle(frac) {
    const startX = this.start;
    const endX = this.end;
    const threshold = HANDLE_WIDTH / Math.max(1, this.width);
    if (Math.abs(frac - startX) <= threshold) return 'start';
    if (Math.abs(frac - endX) <= threshold) return 'end';
    if (frac > startX && frac < endX) return 'move';
    return null;
  }

  _onPointerDown(e) {
    if (!this.peaks) return;
    const frac = this._fractionFromEvent(e);
    const hit = this._hitHandle(frac);
    if (!hit) return;
    this.dragging = hit;
    this.dragOffset = frac;
    if (hit === 'start') this.dragOffset = frac - this.start;
    else if (hit === 'end') this.dragOffset = frac - this.end;
    else this.dragOffset = frac - this.start;
    this.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this.dragging) return;
    const frac = this._fractionFromEvent(e);
    const selectionWidth = this.end - this.start;

    if (this.dragging === 'start') {
      const next = clampTrimRange(frac - this.dragOffset, this.end);
      this.start = next.start;
      this.end = next.end;
    } else if (this.dragging === 'end') {
      const next = clampTrimRange(this.start, frac - this.dragOffset);
      this.start = next.start;
      this.end = next.end;
    } else if (this.dragging === 'move') {
      let newStart = frac - this.dragOffset;
      let newEnd = newStart + selectionWidth;
      if (newStart < 0) {
        newStart = 0;
        newEnd = selectionWidth;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - selectionWidth;
      }
      const next = clampTrimRange(newStart, newEnd);
      this.start = next.start;
      this.end = next.end;
    }

    this.draw();
    this.onTrimChange(this.start, this.end);
  }

  _onPointerUp() {
    this.dragging = null;
  }

  getTimeLabels() {
    return {
      start: formatTime(this.start * this.duration),
      end: formatTime(this.end * this.duration),
      selection: formatTime((this.end - this.start) * this.duration),
      total: formatTime(this.duration),
    };
  }
}
