import { getVisibleNotes, noteNameToMidi, midiToNoteName } from '../core/scales.js';
import { snapStep, stepsPerGridCell } from '../core/grid.js';
import { addNote, removeNote, updateNote } from '../core/note-events.js';
import * as state from '../state.js';

const NOTE_COL = 44;
const ROW_H = 18;
const COL_W = 22;

export class PianoRollEditor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onChange?: () => void }} [opts]
   */
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

    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
    canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
  }

  /**
   * @param {object} clip
   * @param {object} view
   */
  load(clip, view = {}) {
    this.clip = clip;
    this.octave = view.octave ?? state.pianoRollOctave;
    this.scale = view.scale ?? state.pianoRollScale;
    this.root = view.root ?? state.pianoRollRoot;
    this.division = view.division ?? state.gridDivision;
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
    const steps = this.clip.lengthSteps;
    const w = NOTE_COL + steps * COL_W;
    const h = notes.length * ROW_H + 24;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.notes = notes;
    this.steps = steps;
  }

  draw() {
    if (!this.clip) return;
    const { ctx, w, h, notes, steps } = this;
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, w, h);

    const cell = stepsPerGridCell(this.division);

    for (let s = 0; s <= steps; s += cell) {
      const x = NOTE_COL + s * COL_W;
      ctx.strokeStyle = s % 16 === 0 ? '#444' : '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    notes.forEach((note, ri) => {
      const y = 24 + ri * ROW_H;
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
      const x = NOTE_COL + n.start * COL_W + 1;
      const y = 24 + ri * ROW_H + 2;
      const nw = Math.max(COL_W * n.duration - 2, COL_W - 2);
      ctx.fillStyle = '#00d26a';
      ctx.fillRect(x, y, nw, ROW_H - 4);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + nw - 4, y, 4, ROW_H - 4);
    });

    for (let s = 0; s < steps; s++) {
      ctx.fillStyle = '#555';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      if (s % cell === 0) ctx.fillText(String(s + 1), NOTE_COL + s * COL_W + COL_W / 2, 14);
    }
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
      const nx = NOTE_COL + n.start * COL_W;
      const ny = 24 + ri * ROW_H;
      const nw = n.duration * COL_W;
      if (x >= nx + nw - 8 && x <= nx + nw && y >= ny && y <= ny + ROW_H) {
        return { type: 'resize', note: n };
      }
      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + ROW_H) {
        return { type: 'move', note: n, ox: n.start, oy: n.pitch };
      }
    }
    if (x < NOTE_COL || y < 24) return null;
    const step = snapStep(Math.floor((x - NOTE_COL) / COL_W), this.division);
    const ri = Math.floor((y - 24) / ROW_H);
    const pitch = notes[ri];
    if (!pitch) return null;
    return { type: 'add', step, pitch };
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
    const cell = stepsPerGridCell(this.division);

    if (this.drag.type === 'resize') {
      const nx = p.x - NOTE_COL;
      const endStep = snapStep(Math.max(this.drag.note.start + cell, Math.ceil(nx / COL_W)), this.division);
      const dur = Math.min(endStep - this.drag.note.start, this.steps - this.drag.note.start);
      this.clip.notes = updateNote(this.clip.notes, this.drag.note.id, { duration: Math.max(cell, dur) });
      this.draw();
      this.onChange();
    } else if (this.drag.type === 'move') {
      const dx = Math.round((p.x - this.drag.startX) / COL_W);
      const dy = Math.round((p.y - this.drag.startY) / ROW_H);
      const notes = this.notes;
      const oi = notes.indexOf(this.drag.oy);
      const ni = Math.max(0, Math.min(notes.length - 1, oi - dy));
      const newStart = snapStep(Math.max(0, Math.min(this.steps - this.drag.note.duration, this.drag.ox + dx)), this.division);
      this.clip.notes = updateNote(this.clip.notes, this.drag.note.id, {
        start: newStart,
        pitch: notes[ni],
      });
      this.draw();
      this.onChange();
    }
  }

  _up(e) {
    if (!this.drag) return;
    if (this.drag.type === 'add') {
      const existing = (this.clip.notes || []).find((n) => n.pitch === this.drag.pitch && n.start === this.drag.step);
      if (existing) {
        this.clip.notes = removeNote(this.clip.notes, existing.id);
      } else {
        const cell = stepsPerGridCell(this.division);
        this.clip.notes = addNote(this.clip.notes || [], this.drag.pitch, this.drag.step, cell);
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
