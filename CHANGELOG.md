# Changelog

All notable changes to Portable Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Clip remove button on timeline clips.
- Root-level agent instruction file to ensure future changes are added to `CHANGELOG.md`.

### Changed
- Tracks now start with a single clip by default.
- Playing clips are more visibly highlighted in the timeline.

### Fixed
- App boot failure from invalid export UI imports (`getSessionSnapshot` / transport / editor snapshots).
- Missing imports that broke Add Track and autosave after recording or sample load.
- Audio clips can be toggled off by clicking the same clip again.
- Dragging a timeline clip no longer also launches it.
- Resizing a clip no longer permanently deletes notes/steps until the drag is released.
- Scheduler follows the live track list after tracks are added or removed.
- Transport Stop also stops independent audio clip players.
- STOP ALL and the `S` shortcut refresh clip playing highlights.
- Space / `S` shortcuts ignore keystrokes while typing in text fields.
- Sample Instrument Preview triggers the pitched voice pool instead of a no-op player.
- Clip editor Save preserves live playhead / playback state; draft note edits no longer autosave stale data.
- APS import syncs BPM and master volume controls in the UI.
- Master volume restore uses the correct default when snapshot values are missing.
- Sharp/flat note names convert correctly for sample pitch mapping.
- Legacy v1 drum patterns pad to a full bar of steps on migration.

---

## [2.1.0] — 2026-06-10

### Added

- **Audio Track** — Record from the microphone into clips (⏺ on each clip); launch clip to play back.
- **Sample Instrument** — Ableton-style sampler: load audio, map notes on the piano roll to pitched triggers with note length; root key + fine-tune in sample editor.
- Polyphonic sample voice pool for overlapping notes.
- Clip audio stored in `.aps` / autosave per audio clip.

---

## [2.0.0] — 2026-06-10

### Added

- **Arrangement timeline** — Ableton/GarageBand-style session view with horizontal lanes per track and an 8-bar ruler.
- **Clip blocks** on the timeline:
  - Drag clips to reposition them along the timeline.
  - Resize clips via the right-edge handle or a length dropdown (1, 2, 4, or 8 bars).
  - Toggle per-clip **loop** (↻) or one-shot playback.
  - **+ Clip** button to add more clips per track.
- **Grid division selector** — Snap editor to 1, 2, 4, 8, or 16 cells per bar.
- **Canvas piano roll** for melodic tracks:
  - Tap to add/remove notes.
  - Drag notes to change pitch and timing.
  - Drag the right edge to extend note length beyond a single grid cell.
  - Octave scroll (◀ Oct / Oct ▶).
  - Scale filter dropdown: chromatic, major, minor, pentatonic, blues, dorian.
- **Note event model** — Melodic clips store `{ pitch, start, duration, velocity }` instead of per-step on/off only.
- **Audio export** — Offline render to **MP3** (lamejs) or **WAV**.
- **`.aps` session files** — Export/import portable session files for use across browsers and devices. Includes tracks, clips, notes, FX, samples, BPM, and editor settings.
- **Session format v2** — Bumped `SESSION_VERSION` to 2; v1 localStorage sessions auto-migrate on load.
- New core modules: `clips.js`, `note-events.js`, `scales.js`, `grid.js`, `aps-file.js`, `audio-export.js`.
- New UI modules: `piano-roll.js`, `export-ui.js`.
- Tests for clips, note events, and updated session serialization.

### Changed

- Tracks now use a **`clips[]` array** instead of a fixed `patterns[4]` grid.
- Scheduler uses per-clip playheads for launch-style looping playback.
- MIDI editor renamed internally to clip editor; supports variable-length drum/sampler step sequencers.
- `index.html` widened arrangement and export sections; added lamejs CDN for MP3 encoding.

---

## [1.2.0] — 2026-06-10

### Added

- **Local session persistence** via `localStorage`:
  - Autosave (~400 ms debounce) on every meaningful change.
  - Restore last active session on page load (tracks, patterns, active clips, BPM, master volume).
- **Sessions manager** UI — Save named sessions, load, delete; autosave slot always present.
- **Per-clip edit button (✎)** — Edit a clip without launching/playing it.
- Status bar showing current session name and save indicator.
- New modules: `session-serialize.js`, `session-storage.js`, `session-restore.js`, `session-service.js`, `session-manager.js`.
- Tests for session serialization (base64 round-trip, track shape, format validation).

### Changed

- Sample files store `_rawFileData` (ArrayBuffer) for persistence alongside decoded `_rawBuffer`.
- Transport, effects, sample editor, and pattern saves trigger autosave.

---

## [1.1.0] — 2026-06-10

### Added

- **Visual waveform trimmer** in the sample editor:
  - Canvas waveform display (green = selected region).
  - Drag left/right handles to trim; drag the middle to move the selection.
  - Time labels for start, selection duration, and end.
  - Synced with existing trim sliders.
- New modules: `waveform.js` (peak extraction), `waveform-trimmer.js` (canvas UI).
- Tests for waveform math and peak helpers.

### Changed

- Sample editor modal widened (`max-w-2xl`) to fit the waveform view.
- Playback rate applied at trigger time; trim/reverse baked into the processed buffer.

---

## [1.0.0] — 2026-06-10

### Added

- **Project refactor** — Split monolithic `index.html` into a modular ES module codebase:
  ```
  index.html          App shell
  css/styles.css      Styles
  js/main.js          Entry point
  js/state.js         Shared app state
  js/core/            Audio engine, patterns, instruments, effects, scheduler, samples
  js/ui/              Session, transport, MIDI editor, sample editor, effects panel
  tests/              Vitest unit tests
  package.json        Test runner
  README.md           Setup and usage docs
  ```
- **Empty project start** — No hardcoded tracks or patterns; user adds tracks on demand.
- **+ Add Track menu** with instrument presets:
  - Drums: kick, snare, hi-hat, tom, clap
  - Keys: piano, bass, synth
  - Audio: sampler
- **Session view** — 4 clip slots per track, 16 steps per clip; tap to launch/stop.
- **Piano roll editor** for melodic tracks (step grid, monophonic/polyphonic).
- **Step sequencer editor** for drum and sampler clips.
- **Sampler** — Load audio files; trim, pitch (playback rate), reverse, volume.
- **Per-track effects** — Volume, reverb, delay, filter, distortion (FX panel).
- **Transport** — BPM, play/stop, master volume; `Space` toggles play, `S` stops all clips.
- **Vitest** test suite for patterns, constants, and sample math.
- **README** with Termux + `python -m http.server` quick start.

### Removed

- Hardcoded demo tracks (KICK, SNARE, HATS, BASS, CHORDS, SAMPLER) and pre-filled patterns.
- Track-ID-based sound triggering (`track.id === 0` checks); replaced with preset-driven logic.

### Dependencies (CDN)

- [Tone.js](https://tonejs.github.io/) 14.8.49 — Web Audio synthesis and scheduling
- [Tailwind CSS](https://tailwindcss.com/) — Utility styling

---

## Summary by area

| Area | Highlights |
|------|------------|
| **Architecture** | Monolith → ES modules; no build step required to run |
| **Tracks & clips** | Empty start → add presets → timeline clips with drag, length, loop |
| **MIDI / piano roll** | Basic grid → canvas editor with duration, octaves, scales, grid snap |
| **Samples** | Load + sliders → visual waveform trimmer |
| **Effects** | Per-track chain: volume, reverb, delay, filter, distortion |
| **Persistence** | None → localStorage autosave + named sessions |
| **Portable files** | `.aps` export/import with embedded sample audio |
| **Audio export** | MP3 and WAV offline render |
| **Tests** | 0 → 26 Vitest tests across core logic |
| **Docs** | README + this changelog |

[2.0.0]: #200--2026-06-10
[1.2.0]: #120--2026-06-10
[1.1.0]: #110--2026-06-10
[1.0.0]: #100--2026-06-10
