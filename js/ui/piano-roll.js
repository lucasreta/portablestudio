import { getVisibleNotes } from '../core/scales.js';
import {
  snapStep, stepsPerGridCell, getGridCells, usesBlackKeyStyle,
} from '../core/grid.js';
import { STEPS_PER_BAR } from '../core/constants.js';
import { addNote, removeNote, updateNote } from '../core/note-events.js';
import * as state from '../state.js';

const NOTE_COL = 44;
const ROW_H = 18;
const COL_W = 28;

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

    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
    canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
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

  _resize() {
    if (!this.clip) return;
    const notes = this.getNotes();
    const cols = this.gridCells.length;
    const w = NOTE_COL + cols * COL_W;
    const h = notes.length * ROW_H + 28;
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
    return NOTE_COL + colIndex * COL_W;
  }

  _stepToCol(step) {
    return Math.floor(step / this.cellSize);
  }

  draw() {
    if (!this.clip) return;
    const { ctx, w, h, notes, gridCells } = this;
    const blackKeys = usesBlackKeyStyle(this.division);

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, w, h);

    gridCells.forEach((cell, col) => {
      const x = this._colX(col);
      const isBarStart = cell.startStep % STEPS_PER_BAR === 0;
      ctx.fillStyle = blackKeys ? '#222' : '#2e2e2e';
      if (!blackKeys) ctx.fillStyle = '#353535';
      ctx.fillRect(x, 24, COL_W - 1, h - 24);
      if (isBarStart) {
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    });

    notes.forEach((note, ri) => {
      const y = 28 + ri * ROW_H;
      ctx.fillStyle = ri % 2 ? '#1a1a1a' : '#161616';
      ctx.fillRect(0, y, w, ROW_H);
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(note, NOTE_COL - 4, y + 13);
    });

    (this.clip.notes || []).forEach((n) => {
      const ri = notes.indexOf(n.pitch);
      if (ri < 0) return;
      const col = this._stepToCol(n.start);
      const colEnd = this._stepToCol(n.start + n.duration - 1);
      const x = this._colX(col) + 1;
      const y = 28 + ri * ROW_H + 2;
      const nw = Math.max((colEnd - col + 1) * COL_W - 2, COL_W - 2);
      ctx.fillStyle = '#00d26a';
      ctx.fillRect(x, y, nw, ROW_H - 4);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + nw - 4, y, 4, ROW_H - 4);
    });

    gridCells.forEach((cell, col) => {
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(cell.label), this._colX(col) + COL_W / 2, 16);
      if (cell.barIndex > 0 && cell.label === 1) {
        ctx.fillStyle = '#555';
        ctx.font = '8px sans-serif';
        ctx.fillText(`B${cell.barIndex + 1}`, this._colX(col) + COL_W / 2, h - 4);
      }
    });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _hit(x, y) {
    const notes = this.notes;
    for (const n of this.clip.notes || []) {
      const ri = notes.indexOf(n.pitch);
      if (ri < 0) continue;
      const col = this._stepToCol(n.start);
      const colEnd = this._stepToCol(n.start + n.duration - 1);
      const nx = this._colX(col);
      const ny = 28 + ri * ROW_H;
      const nw = (colEnd - col + 1) * COL_W;
      if (x >= nx + nw - 8 && x <= nx + nw && y >= ny && y <= ny + ROW_H) {
        return { type: 'resize', note: n };
      }
      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + ROW_H) {
        return { type: 'move', note: n, ox: n.start, oy: n.pitch };
      }
    }
    if (x < NOTE_COL || y < 28) return null;
    const col = Math.floor((x - NOTE_COL) / COL_W);
    if (col < 0 || col >= this.gridCells.length) return null;
    const step = this.gridCells[col].startStep;
    const ri = Math.floor((y - 28) / ROW_H);
    const pitch = notes[ri];
    if (!pitch) return null;
    return { type: 'add', step, pitch, col };
  }

  _down(e) {
    if (!this.clip) return;
    const p = this._pos(e);
    const hit = this._hit(p.x, p.y);
    if (!hit) return;
    this.drag = { ...hit, startX: p.x, startY: p.y };
    this.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  _move(e) {
    if (!this.drag || !this.clip) return;
    const p = this._pos(e);
    const cell = this.cellSize;

    if (this.drag.type === 'resize') {
      const col = Math.max(
        this._stepToCol(this.drag.note.start) + 1,
        Math.floor((p.x - NOTE_COL) / COL_W),
      );
      const endStep = Math.min((col + 1) * cell, this.clip.lengthSteps);
      const dur = Math.max(cell, endStep - this.drag.note.start);
      this.clip.notes = updateNote(this.clip.notes, this.drag.note.id, { duration: dur });
      this.draw();
      this.onChange();
    } else if (this.drag.type === 'move') {
      const dx = Math.round((p.x - this.drag.startX) / COL_W);
      const dy = Math.round((p.y - this.drag.startY) / ROW_H);
      const notes = this.notes;
      const oi = notes.indexOf(this.drag.oy);
      const ni = Math.max(0, Math.min(notes.length - 1, oi - dy));
      const origCol = this._stepToCol(this.drag.ox);
      const newCol = Math.max(0, Math.min(this.gridCells.length - 1, origCol + dx));
      const newStart = this.gridCells[newCol].startStep;
      this.clip.notes = updateNote(this.clip.notes, this.drag.note.id, {
        start: snapStep(newStart, this.division),
        pitch: notes[ni],
      });
      this.draw();
      this.onChange();
    }
  }

  _up() {
    if (!this.drag) return;
    if (this.drag.type === 'add') {
      const existing = (this.clip.notes || []).find(
        (n) => n.pitch === this.drag.pitch && n.start === this.drag.step,
      );
      if (existing) {
        this.clip.notes = removeNote(this.clip.notes, existing.id);
      } else {
        this.clip.notes = addNote(
          this.clip.notes || [],
          this.drag.pitch,
          this.drag.step,
          this.cellSize,
        );
      }
      this.draw();
      this.onChange();
    }
    this.drag = null;
  }

  scrollOctave(delta) {
    this.setOctave(Math.max(1, Math.min(7, this.octave + delta)));
  }
}
