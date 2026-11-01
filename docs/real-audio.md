# Real audio playback — Face studio · 22

This supersedes the silent browser playback described in the previous milestone. **The browser now plays actual generated WAV recordings.** The portable C++/Wokwi checkpoint is unchanged and does not yet output hardware audio.

## Try it

1. Refresh the port-8080 preview to **Face studio · 22**.
2. Return home. Click **Enable sound / load recordings** once. Browser autoplay rules require a user gesture; allow sound/unmute your browser and Mac if necessary.
3. Wait for “All 4 indexed recordings are decoded locally.”
4. Choose `voice_001`, `voice_002` or `voice_003`, then click **Play selected voice**. Or choose **Random voice**. Clicking Play also attempts to unlock audio, so preloading is optional for direct clicks.
5. Hear the recording while the talking face and progress remain responsive. Natural end returns to IDLE. **Cancel voice**, Home, A hold or A+B stops the sound immediately.
6. B's personality reaction can use the real recordings once sound is enabled. Before audio has been unlocked, it presents a recoverable instruction to enable sound rather than pretending to play.

The voice is a **generated placeholder selected by the user**, not the user's actual voice. File details and exact durations are in `preview/voice/README.md`.

## Replacing a recording

Choose a message ID, then pick your own file under **Replace selected message with your own local recording**. Files up to 40 MiB are accepted provisionally; successful browser audio decoding is required. WAV is a good portable choice; MP3/M4A/OGG support varies by browser. The selected file is read as bytes and decoded locally, never uploaded. Actual playback is cancelled before replacement. Invalid replacements preserve the existing playable buffer. Concurrent replacements are versioned to prevent an older decode overwriting a newer choice.

Replacements are page-session-only, independent of internet status. Reload restores the bundled defaults. To permanently change local defaults, replace the corresponding `preview/voice/*.wav` file. Keep private recordings out of public source control and shared simulator projects. Duration is discovered from decoded audio, but permanent replacements should also update `durationMs` in `preview/voice/index.js`. See the [recording catalogue guide](recording-catalogue.md).

## Offline meaning

The app loads bundled files through same-origin relative URLs, not a cloud provider. **Enable sound / load recordings** decodes all indexed recordings into memory. Those decoded recordings and local replacements can then play with no further download, regardless of the app's simulated Wi-Fi switch. Reloading/closing the page discards the decoded buffers; this is not an installed offline PWA and does not promise a cold reload without access to the preview server. A future hardware implementation would read recordings from local flash/SD.

## Implementation

`preview/audio-player.js` implements the existing player contract using Web Audio:

- `unlock()` creates/resumes an AudioContext from an explicit user gesture.
- `prepare()` fetches local WAV bytes and decodes them. `preload()` prepares all defaults.
- `start()` owns one asynchronous loading/playing session with the state manager's owner ID. Its continuation checks ownership before creating/starting an output node.
- `progress()` reports the real decoded duration and AudioContext clock, not a pretend timer.
- `update()` emits owned completion/error events for the state manager. Media loading has a 20-second timeout; playback also has a conservative safety timeout.
- `stop()` clears ownership/pending events, removes the end callback, stops the actual source and disconnects it. Reusable decoded buffers remain cached; shared in-flight loading may finish as a background cache operation, but cannot start cancelled playback.
- `replace()` decodes a local replacement atomically. Failed or superseded decodes cannot replace an already working clip.

`preview/index.html` injects this real player and synchronizes the progress UI. Mock adapters remain in `preview/voices.js` for deterministic core tests and explicit fault injection; **they are no longer the browser's playback backend**. The optional file-health controls are labelled tests, distinct from actual network/decode error handling. Microphone input and cloud AI remain simulated. The talking mouth is expressive, not phoneme-synchronized.

## Verification

- `npm test`: **80 automated tests pass**, including real-asset WAV parsing and non-silent PCM checks, actual-duration progress, source creation/stop/disconnect, cancellation during asynchronous loading, no extra fetch after decoding, missing/invalid audio, autoplay denial, timeouts and atomic local replacement. Web Audio lifecycle unit tests use an injected context, so they are not substitutes for browser testing.
- A separate headless Chromium run exercised the **actual browser AudioContext**, decoded all three real WAVs, advanced the playback clock, waited for `hello` to finish and return to IDLE, cancelled another source, recovered from the corrupt-file test, and decoded/played a file-picker replacement. No page runtime errors were reported.
- The sandbox's headless run does **not** verify audible speaker volume/quality, Safari-specific policies, or ESP32-S3 hardware. Listen on your Mac for that final check. If blocked, click Enable sound, check site sound permissions, and return home before retrying.


### Recorded wake greeting update

Face studio · 20 adds the fourth local file, `voice/greeting.wav`, for the dedicated **Hi, Mommy** cue. Enable sound now preloads all four assets. The greeting uses the selected generated voice (not browser TTS), is enabled by default, and shares the decoded audio cache while keeping its own cancellable owner. Choose the `greeting` slot in the file picker to replace it. The three-message random catalogue remains unchanged. See the latest section of `docs/affection.md`. All 82 automated tests and the actual-browser greeting/replacement/cancel check pass.
