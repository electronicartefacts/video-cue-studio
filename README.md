# Video Cue Studio

**Watch. Mark. Align. Export.** A free, browser-based visual cue mapping instrument by Electronic Artefacts.

Video Cue Studio helps composers, sound designers, editors, and audiovisual artists place and refine timing cues against a locally loaded video. It is deliberately not a video editor, DAW, cloud service, or automatic scene detector.

## Privacy

Your media never leaves your device. The app uses the browser's local `File` and `URL.createObjectURL()` APIs; it has no backend, account, analytics, uploads, or tracking. If a browser cannot render a video codec, the optional FFmpeg WebAssembly engine is loaded on demand and creates a compatible preview entirely in the browser. Project metadata may be saved in the browser's local storage only to preserve the active mapping.

## Workflow

1. Import a video supported by your browser.
2. Play it and press **M** (or MARK) to capture raw cues without stopping playback.
3. Select a cue to pause and seek to it; drag it on the timeline while watching the image scrub.
4. Use the SPEED selector (0.25× to 2×) for fast passages, then use the frame controls or arrow keys for a small visual nudge and validate it.

For timeline calibration, drag a cue normally for a fast reposition. Hold it for two seconds before moving to enter **Precision Drag**; each horizontal pixel then moves the cue at one fiftieth of the normal timeline scale while the displayed frame follows the cue.
5. Export TXT, CSV, or a reopenable JSON project.

## Cue layers

Every project starts with one `CUES` layer. Add, rename, recolor, hide, or select layers for separate manual passes such as structure, gaze, impact, or light. Each marker belongs to exactly one layer; number keys select layers by their displayed order, and `M` writes directly to the active layer. TXT, CSV, JSON, and Logic exports retain the project markers across layers.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play / pause |
| `M` | Add marker |
| `Left` / `Right` | Nudge selected marker by an estimated 1/30 second |
| `Cmd/Ctrl + Z` | Undo |

## Logic Pro export

Validate the cues you want to transfer, choose the **same sample rate as the Logic project** (48 kHz or 44.1 kHz), then select **EXPORT**. The download is a mono, silent 16-bit PCM WAV marker carrier: each validated cue is written as a standard RIFF `cue ` point, with a `LIST` / `adtl` / `labl` label. The binary structure is `RIFF/WAVE → fmt  → data → cue  → LIST/adtl/labl`; a PCM cue uses a zero playlist position and `Math.round(timeSeconds × sampleRate)` as its actual sample offset. The silent `data` section is allocated directly as binary PCM rather than as a JavaScript sample array (a five-minute 48 kHz carrier is about 28.8 MB of PCM).

In Logic Pro, use **Navigate → Other → Import Marker from Audio File**, choose the exported WAV, then verify alignment against your video before a critical session.

This feature relies on standard WAV audio markers, but Logic Pro compatibility is not validated automatically by this browser application. Always test the exported carrier in your target Logic Pro workflow.

## Video compatibility and precision

The direct player accepts browser-readable `video/*` files. If a format or codec (including a video track in a `.mov` or MP4 container) is not visually decodable, Video Cue Studio offers to prepare an H.264 MP4 preview locally through FFmpeg WebAssembly; no media is transferred to a server. Very large files still require sufficient browser memory. HTML video seeks in seconds, so the frame nudge is an estimated 30 fps increment and is intentionally not advertised as guaranteed frame-perfect decoding.

## Run locally

Open `index.html` in a modern browser, or serve this directory with any static server. No install, build step, or environment variables are required.

## GitHub Pages

The included GitHub Actions workflow deploys the static files to GitHub Pages whenever `main` changes. In the GitHub repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.

## License

MIT. See [LICENSE](LICENSE).
