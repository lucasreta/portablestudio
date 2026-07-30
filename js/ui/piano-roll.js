import { getVisibleNotes } from '../core/scales.js';
import {
  snapStep, stepsPerGridCell, getGridCells, usesBlackKeyStyle,
} from '../core/grid.js';
import { STEPS_PER_BAR } from '../core/constants.js';
import { addNote, removeNote, updateNote } from '../core/note-events.js';
import * as state from '../state.js';

const NOTE_COL = 44;
const ROW_H = 18;
const ROW_H_TOUCH = 26;
const COL_W = 28;
const COL_W_TOUCH = 36;
const RESIZE_HIT_MOUSE = 10;
const RESIZE_HIT_TOUCH = 28;
const TAP_MOVE_THRESHOLD_PX = 12;
const HEADER_H = 28;

/**
 * @param {'mouse' | 'touch' | 'pen' | string | null | undefined} pointerType
 * @param {boolean} [coarsePointer]
 */
export function isCoarsePointer(pointerType, coarsePointer = false) {
  return pointerType === 'touch' || coarsePointer;
}

/**
 * @param {boolean} coarse
 */
export function getPianoRollMetrics(coarse) {
  return {
    noteCol: NOTE_COL,
    rowH: coarse ? ROW_H_TOUCH : ROW_H,
    colW: coarse ? COL_W_TOUCH : COL_W,
    resizeHit: coarse ? RESIZE_HIT_TOUCH : RESIZE_HIT_MOUSE,
    headerH: HEADER_H,
  };
}

/**
 * Hit-test piano-roll coordinates against notes / empty cells.
 * @param {object} args
 * @param {number} args.x
 * @param {number} args.y
 * @param {string[]} args.visibleNotes
 * @param {object[]} args.clipNotes
 * @param {object[]} args.gridCells
 * @param {number} args.cellSize
 * @param {{ noteCol: number, rowH: number, colW: number, resizeHit: number, headerH: number }} args.metrics
 */
export function hitTestPianoRoll({
  x, y, visibleNotes, clipNotes, gridCells, cellSize, metrics,
}) {
  const { noteCol, rowH, colW, resizeHit, headerH } = metrics;

  for (const n of clipNotes || []) {
    const ri = visibleNotes.indexOf(n.pitch);
    if (ri < 0) continue;
    const col = Math.floor(n.start / cellSize);
    const colEnd = Math.floor((n.start + n.duration - 1) / cellSize);
    const nx = noteCol + col * colW;
    const ny = headerH + ri * rowH;
    const nw = (colEnd - col + 1) * colW;
    const handleW = Math.min(resizeHit, Math.max(8, nw * 0.45));

    if (x >= nx + nw - handleW && x <= nx + nw && y >= ny && y <= ny + rowH) {
      return { type: 'resize', note: n };
    }
    if (x >= nx && x <= nx + nw && y >= ny && y <= ny + rowH) {
      return { type: 'move', note: n, ox: n.start, oy: n.pitch };
    }
  }

  if (x < noteCol || y < headerH) return null;
  const col = Math.floor((x - noteCol) / colW);
  if (col < 0 || col >= gridCells.length) return null;
  const step = gridCells[col].startStep;
  const ri = Math.floor((y - headerH) / rowH);
  const pitch = visibleNotes[ri];
  if (!pitch) return null;
  return { type: 'add', step, pitch, col };
}

/**
 * @param {number} dx
 * @param {number} dy
 * @param {number} [threshold=TAP_MOVE_THRESHOLD_PX]
 */
export function exceededTapThreshold(dx, dy, threshold = TAP_MOVE_THRESHOLD_PX) {
  return Math.hypot(dx, dy) >= threshold;
}

export class PianoRollEditor {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onChange = opts.onChange || (() => {});
    this.clip = null;
    this.octave = 4;
    this.scale = 'chromatic';
    this.root = 'C';
    this.division = 16;
    this.drag = null;
    this.dpr = window.devicePixelRatio || 1;
    this.gridCells = [];
    this.coarse = typeof window !== 'undefined'
      && !!window.matchMedia?.('(pointer: coarse)')?.matches;
    this.metrics = getPianoRollMetrics(this.coarse);

    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this._down, { passive: false });
    window.addEventListener('pointermove', this._move, { passive: false });
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  load(clip, view = {}) {
    this.clip = clip;
    this.octave = view.octave ?? state.pianoRollOctave;
    this.scale = view.scale ?? state.pianoRollScale;
    this.root = view.root ?? state.pianoRollRoot;
    this.division = view.division ?? state.gridDivision;
    this.gridCells = getGridCells(clip.lengthSteps, this.division);
    this._resize();
    this.draw();
  }

  setOctave(o) {
    this.octave = o;
    state.setPianoRollOctave(o);
    this._resize();
    this.draw();
  }

  setScale(s) {
    this.scale = s;
    state.setPianoRollScale(s);
    this._resize();
    this.draw();
  }

  setDivision(d) {
    this.division = d;
    state.setGridDivision(d);
    if (this.clip) {
      this.gridCells = getGridCells(this.clip.lengthSteps, d);
      this._resize();
    }
    this.draw();
  }

  getNotes() {
    const low = (this.octave - 1) * 12;
    const high = (this.octave + 2) * 12 + 11;
    return getVisibleNotes(low, high, this.scale, this.root);
  }

  _hitMetrics(pointerType) {
    const base = this.metrics;
    if (!isCoarsePointer(pointerType, false)) return base;
    // Expand only the resize hit slop for this gesture; keep layout stable.
    return { ...base, resizeHit: Math.max(base.resizeHit, RESIZE_HIT_TOUCH) };
  }

  _resize() {
    if (!this.clip) return;
    this.metrics = getPianoRollMetrics(this.coarse);
    const notes = this.getNotes();
    const { noteCol, rowH, colW, headerH } = this.metrics;
    const cols = this.gridCells.length;
    const w = noteCol + cols * colW;
    const h = notes.length * rowH + headerH;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.notes = notes;
    this.cellSize = stepsPerGridCell(this.division);
  }

  _colX(colIndex) {
    return this.metrics.noteCol + colIndex * this.metrics.colW;
  }

  _stepToCol(step) {
    return Math.floor(step / this.cellSize);
  }

  draw() {
    if (!this.clip) return;
    const { ctx, w, h, notes, gridCells, metrics } = this;
    const { rowH, colW, headerH } = metrics;
    const blackKeys = usesBlackKeyStyle(this.division);
    const gripW = Math.max(4, Math.round(metrics.resizeHit * 0.35));

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, w, h);

    gridCells.forEach((cell, col) => {
      const x = this._colX(col);
      const isBarStart = cell.startStep % STEPS_PER_BAR === 0;
      ctx.fillStyle = blackKeys ? '#222' : '#353535';
      ctx.fillRect(x, headerH - 4, colW - 1, h - (headerH - 4));
      if (isBarStart) {
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    });

    notes.forEach((note, ri) => {
      const y = headerH + ri * rowH;
      ctx.fillStyle = ri % 2 ? '#1a1a1a' : '#161616';
      ctx.fillRect(0, y, w, rowH);
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(note, metrics.noteCol - 4, y + Math.round(rowH * 0.7));
    });

    (this.clip.notes || []).forEach((n) => {
      const ri = notes.indexOf(n.pitch);
      if (ri < 0) return;
      const col = this._stepToCol(n.start);
      const colEnd = this._stepToCol(n.start + n.duration - 1);
      const x = this._colX(col) + 1;
      const y = headerH + ri * rowH + 2;
      const nw = Math.max((colEnd - col + 1) * colW - 2, colW - 2);
      ctx.fillStyle = '#00d26a';
      ctx.fillRect(x, y, nw, rowH - 4);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + nw - gripW, y, gripW, rowH - 4);
    });

    gridCells.forEach((cell, col) => {
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(cell.label), this._colX(col) + colW / 2, 16);
      if (cell.barIndex > 0 && cell.label === 1) {
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.fillText(`B${cell.barIndex + 1}`, this._colX(col) + colW / 2, h - 4);
      }
    });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const scaleX = (this.w || r.width) / Math.max(1, r.width);
    const scaleY = (this.h || r.height) / Math.max(1, r.height);
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };
  }

  _hit(x, y, metrics = this.metrics) {
    return hitTestPianoRoll({
      x,
      y,
      visibleNotes: this.notes,
      clipNotes: this.clip?.notes || [],
      gridCells: this.gridCells,
      cellSize: this.cellSize,
      metrics,
    });
  }

  _down(e) {
    if (!this.clip) return;
    const hitMetrics = this._hitMetrics(e.pointerType);
    const p = this._pos(e);
    const hit = this._hit(p.x, p.y, hitMetrics);
    if (!hit) return;

    this.drag = {
      ...hit,
      startX: p.x,
      startY: p.y,
      pointerId: e.pointerId,
      moved: false,
      noteId: hit.note?.id ?? null,
      metrics: hitMetrics,
    };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture failures on detached nodes.
    }
    e.preventDefault();
  }

  _move(e) {
    if (!this.drag || !this.clip) return;
    if (this.drag.pointerId != null && e.pointerId !== this.drag.pointerId) return;

    const p = this._pos(e);
    if (exceededTapThreshold(p.x - this.drag.startX, p.y - this.drag.startY)) {
      this.drag.moved = true;
    }

    // Tap candidates do not mutate until pointerup (avoids jitter moves on mobile).
    if (!this.drag.moved && (this.drag.type === 'move' || this.drag.type === 'resize')) {
      e.preventDefault();
      return;
    }

    const cell = this.cellSize;
    const { colW, rowH, noteCol } = this.drag.metrics || this.metrics;

    if (this.drag.type === 'resize') {
      const note = (this.clip.notes || []).find((n) => n.id === this.drag.noteId) || this.drag.note;
      const col = Math.max(
        this._stepToCol(note.start) + 1,
        Math.floor((p.x - noteCol) / colW),
      );
      const endStep = Math.min((col + 1) * cell, this.clip.lengthSteps);
      const dur = Math.max(cell, endStep - note.start);
      this.clip.notes = updateNote(this.clip.notes, note.id, { duration: dur });
      this.draw();
      this.onChange();
    } else if (this.drag.type === 'move') {
      const dx = Math.round((p.x - this.drag.startX) / colW);
      const dy = Math.round((p.y - this.drag.startY) / rowH);
      const notes = this.notes;
      const oi = notes.indexOf(this.drag.oy);
      const ni = Math.max(0, Math.min(notes.length - 1, oi - dy));
      const origCol = this._stepToCol(this.drag.ox);
      const newCol = Math.max(0, Math.min(this.gridCells.length - 1, origCol + dx));
      const newStart = this.gridCells[newCol].startStep;
      this.clip.notes = updateNote(this.clip.notes, this.drag.noteId, {
        start: snapStep(newStart, this.division),
        pitch: notes[ni],
      });
      this.draw();
      this.onChange();
    }

    e.preventDefault();
  }

  _up(e) {
    if (!this.drag) return;
    if (e && this.drag.pointerId != null && e.pointerId !== this.drag.pointerId) return;

    const drag = this.drag;
    this.drag = null;

    if (drag.type === 'add') {
      const existing = (this.clip.notes || []).find(
        (n) => n.pitch === drag.pitch && n.start === drag.step,
      );
      if (existing) {
        this.clip.notes = removeNote(this.clip.notes, existing.id);
      } else {
        this.clip.notes = addNote(
          this.clip.notes || [],
          drag.pitch,
          drag.step,
          this.cellSize,
        );
      }
      this.draw();
      this.onChange();
      return;
    }

    // Tap on an existing note (no meaningful drag) removes it — needed for mobile toggle.
    if (!drag.moved && (drag.type === 'move' || drag.type === 'resize') && drag.noteId) {
      this.clip.notes = removeNote(this.clip.notes, drag.noteId);
      this.draw();
      this.onChange();
    }
  }

  scrollOctave(delta) {
    this.setOctave(Math.max(1, Math.min(7, this.octave + delta)));
  }
}
