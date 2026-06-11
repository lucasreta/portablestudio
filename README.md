# Portable Studio

A lightweight browser-based audio studio designed to run on a phone via [Termux](https://termux.dev/) and Python's built-in HTTP server. Sample audio, sequence drums and melodies, edit patterns in a piano roll, shape samples, and add per-track effects — no install beyond a folder and a browser.

## Features

- **Arrangement view** — Ableton-style timeline: drag clips, set length (1–8 bars), toggle loop
- **Add tracks on demand** — kick, snare, hi-hat, tom, clap, piano, bass, synth, sampler
- **Piano roll** — full note range with octave scroll, scale filter, grid snap (1–16/bar), drag notes and extend length
- **Step sequencer** — edit drum and sampler trigger patterns
- **Sampler** — load your own audio files; visual waveform trimmer, pitch, reverse, and volume
- **Effects per track** — volume, reverb, delay, filter, distortion
- **Transport** — BPM, play/stop, master volume; `Space` toggles play, `S` stops all clips
- **Local sessions** — autosaves to browser storage; save named sessions and reload later
- **Export** — render to MP3/WAV; save/load `.aps` session files for use in any browser

## Quick start (Termux)

```bash
# Clone or copy the project folder to your phone
cd portablestudio

# Serve locally (default port 8000)
python -m http.server 8000
```

Open `http://localhost:8000` in your phone browser (or `http://<device-ip>:8000` from another device on the same network).

> **Tip:** Tap **PLAY** once to unlock the Web Audio context (required on mobile).

## Project structure

```
portablestudio/
├── index.html          # App shell
├── css/styles.css      # Studio UI styles
├── js/
│   ├── main.js         # Entry point
│   ├── state.js        # Shared app state
│   ├── core/           # Audio engine, patterns, instruments, effects
│   └── ui/             # Session, transport, editors
├── tests/              # Vitest unit tests
└── package.json
```

## Development

### Run tests

```bash
npm install
npm test
```

Tests cover pattern logic, constants, and sample math helpers.

### Add a new instrument

1. Add a preset in `js/core/constants.js` under `INSTRUMENT_PRESETS`
2. If it needs a custom synth, add a case in `js/core/instruments.js` → `createInstrument()`
3. The **+ Add Track** menu picks it up automatically

## Usage tips

| Action | How |
|--------|-----|
| Add track | **+ Add Track** → pick instrument |
| Launch clip | Tap a clip slot (not the ✎ button) |
| Edit pattern | Tap **✎** on a clip — edits without launching it |
| Save / load sessions | **Sessions** — autosave is on by default; use **Save As** for named sessions |
| Load sample | **Load** on a sampler track |
| Edit sample sound | **Sample** — drag waveform handles to trim, or use sliders |
| Track effects | **FX** on any track |
| Remove track | **✕** on track header |

## Dependencies (CDN)

- [Tone.js](https://tonejs.github.io/) — Web Audio synthesis and scheduling
- [Tailwind CSS](https://tailwindcss.com/) — utility styling (CDN)

No build step is required to run the app; only `npm` is needed for tests.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.

## License

MIT
