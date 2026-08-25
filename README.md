# Video Cue Studio

**Watch. Mark. Align. Export.** A free, browser-based visual cue mapping instrument by Electronic Artefacts.

Video Cue Studio helps composers, sound designers, editors, and audiovisual artists place and refine timing cues against a locally loaded video. It is deliberately not a video editor, DAW, cloud service, or automatic scene detector.

## Privacy

Your media never leaves your device. The app uses the browser's local `File` and `URL.createObjectURL()` APIs; it has no backend, account, analytics, uploads, or tracking. If a browser cannot render a video codec, the optional FFmpeg WebAssembly engine is loaded on demand and creates a compatible preview entirely in the browser. Project metadata may be saved in the browser's local storage only to preserve the active mapping.

## Workflow

1. Import a video supported by your browser.
2. Play it and press **M** (or MARK) to capture raw cues without stopping playback.
3. Select a cue to pause and seek to it; drag it on the timeline while watching the image scrub.
4. Use the frame controls or arrow keys for a small visual nudge, then validate it.
5. Export TXT, CSV, or a reopenable JSON project.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play / pause |
| `M` | Add marker |
| `Left` / `Right` | Nudge selected marker by an estimated 1/30 second |
| `Cmd/Ctrl + Z` | Undo |

## Video compatibility and precision

The direct player accepts browser-readable `video/*` files. If a format or codec (including a video track in a `.mov` or MP4 container) is not visually decodable, Video Cue Studio offers to prepare an H.264 MP4 preview locally through FFmpeg WebAssembly; no media is transferred to a server. Very large files still require sufficient browser memory. HTML video seeks in seconds, so the frame nudge is an estimated 30 fps increment and is intentionally not advertised as guaranteed frame-perfect decoding.

## Run locally

Open `index.html` in a modern browser, or serve this directory with any static server. No install, build step, or environment variables are required.

## GitHub Pages

The included GitHub Actions workflow deploys the static files to GitHub Pages whenever `main` changes. In the GitHub repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.

## License

MIT. See [LICENSE](LICENSE).
