# Real generated placeholder recordings

These files contain **generated speech in the selected placeholder voice**, not recordings of the user:

| ID / file | Actual duration | Message |
| --- | --- | --- |
| `voice_001.wav` | 17.116 s | A little encouragement and reminder to take one step at a time. |
| `voice_002.wav` | 12.332 s | “Hi, Mommy” and a short friendly hello. |
| `voice_003.wav` | 13.468 s | Encouragement to recognize small accomplishments and be kind to yourself. |
| `voice_004.wav` | 0.932 s | Dedicated “Hi, Mommy” for the left-alone → shy → happy greeting. |

Format: PCM WAV, 24 kHz, mono, 16-bit. Generated for this prototype after the user selected a voice. These are genuine non-silent audio assets; the browser decodes and plays them through Web Audio. No paid AI provider or runtime speech API is involved in playing these files.

## Replace later

In Face studio · 22, choose the message ID, then **Replace selected message with your own local recording**. The browser decodes it locally; no upload occurs. A successful replacement applies only to this page session. Reload restores the generated defaults. Unsupported/corrupt replacements leave the working default intact.

For a permanent local replacement, overwrite the corresponding WAV with your own valid WAV file. Do not copy sensitive recordings into a public repository. Web Audio reads the file's real duration; the mock catalogue durations are not used to end real playback. Other encodings can be loaded through the picker when supported by the browser; permanent files are listed in the separate `index.js` catalogue. Update its duration metadata and set `generated:false` when replacing a bundled placeholder.

This does not implement the ESP32-S3 speaker, I2S, SD/flash storage or an embedded WAV decoder. Hardware audio is a separate milestone.

The `voice_004` slot can also be replaced using the same local recording picker. It is excluded from random personal-message selection, and plays once at the affectionate greeting cue while the primary state stays IDLE. It uses a separate cancellable source sharing the decoded Web Audio cache, not browser text-to-speech.

## Catalogue and additions

`index.js` is the separate recording index: stable IDs, filenames, measured durations, optional categories and personal/greeting roles. See [the step-by-step Mac/phone recording guide](../../docs/recording-catalogue.md) for additions, replacements and `npm run voices:check`. Adding `voice_005` needs only its file and an index row, not edits to playback code.
