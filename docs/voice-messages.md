> Historical milestone 18: the silent mock described below has been superseded by [real audio playback](real-audio.md) and the [indexed recording catalogue](recording-catalogue.md). Current IDs/files are `voice_001`–`voice_004`.

# Personal voice-message system — Face studio · 18

## Intended experience

Button/action → choose a local recording ID → talking facial expression and playback progress → finish → IDLE. Cancellation or failure stops the owned player. Playback must not need Wi-Fi; this prototype demonstrates the lifecycle **silently**, not real audio output.

## Catalogue

Defined once in `preview/voices.js` and shared with the personality selector:

| ID | Title | Intended local file | Default simulated duration |
| --- | --- | --- | --- |
| `comfort` | A little encouragement | `voice/comfort.wav` | 5 seconds |
| `hello` | Just saying hello | `voice/hello.wav` | 3.5 seconds |
| `proud` | A proud-of-you moment | `voice/proud.wav` | 4.5 seconds |

The paths describe where eventual personal recordings will be stored; **no actual audio files are bundled or fetched**. Ready/missing/corrupt refer to an injected mock-file table, not checks of real WAV bytes. The only speech elsewhere in this app is the separately opt-in browser greeting voice, which is unrelated to personal recordings and does not replace them.

## Try it

1. Refresh the running preview to **Face studio · 18**.
2. Return home. In Simulator controls choose a **Voice-message ID**.
3. Leave simulated file condition **Ready**. Click **Play selected voice (mock)**.
4. Watch the talking expression, on-screen progress line, and larger simulator progress bar. No sound should play. It returns to the home face after the configured duration.
5. Optionally enter a selected-message duration between **1 and 30 seconds**. Random selection uses each catalogue entry's default duration.
6. Try **Random voice (mock)** repeatedly from home: ready files are selected locally, avoiding the last successfully selected recording where possible. B's personal-surprise repertoire also includes voice messages, using the same catalogue.
7. Use **Cancel voice**, Home/cancel, A hold or A+B during playback. Playback stops and no late completion can redraw it.
8. Turn simulated internet off and repeat: local selection and playback timing are unaffected.
9. Set the chosen file condition to **Missing** or **Corrupted** and play it. Expect a friendly recoverable error, not pretend playback.
10. Restore Ready and use **Retry once** for a retryable audio error, or dismiss/Home and choose another message. Change a playing recording's mock condition to Corrupted to test mid-play failure cleanup.

## Separation of responsibilities

- **`MockVoiceLibrary`**: stable IDs, titles, intended file paths, mock health validation and random choice. Random selection skips missing/corrupt entries; selecting an unavailable specific ID fails explicitly.
- **`MockVoicePlayer`**: `start(id, owner, now, durationOverride)`, `update(now)`, `stop()`. It owns one timed session and emits at most one completion/failure. It never mutates application state or renders.
- **Central state manager**: admits voice requests from IDLE, gives each activity a new owner ID, starts/stops the player on entry/exit, rejects unowned/stale events, and handles structured audio errors. Only a defined event changes the active state.
- **Renderer and facial animation**: existing talking pose plus progress. Mouth movement is illustrative, not phoneme/audio synchronization.
- **Input adapter**: named button/menu actions; no raw primary-state assignment.

Every transition stops the old player session. Completion emits owned `PLAYBACK_FINISHED`; file failure emits owned `AUDIO_FAILURE`. The mock is polled by the non-blocking main animation loop and uses no timers or blocking delays. Home clears pending ownership, so cancelled or duplicate callbacks cannot reopen the old screen.

Missing/corrupt/invalid-duration errors carry category, failed operation, retryability and a friendly message. Retry is user-requested, limited to once per failed-operation chain and revalidates the selected mock file. No automatic retry loop is introduced.

A future real adapter must read and validate local bytes, schedule actual output without blocking, report owned completion/failure, and truly release audio hardware/decoder resources on stop. Its real decoding, timing, file-format support, speaker quality and ESP32-S3 memory/storage requirements need independent tests. Clearing the mock session does not prove physical audio cleanup.

## Tests and limitations

Run `npm test` (or first `npm ci` if developer dependencies are missing). All **74 tests** pass.

`tests/voices.test.cjs` checks:

- Unique IDs and local path associations.
- Specific selection and automatic return from playback, offline.
- Random selection without immediate repeats or unavailable files.
- Configurable duration and invalid-duration recovery.
- Cancel stopping the session; late completion/failure rejection.
- Unknown/missing/corrupt file handling with recoverable errors.
- Corruption during playback and safe retry after restoration.
- All-files-unavailable behaviour and busy-state rejection.

These validate injected missing/corrupt states, **not detection of real corrupted recordings**. There is no recording upload, microphone capture, WAV decoder, speaker output, real personal voice playback, or cloud dependency. The separate ESP32-S3 C++ checkpoint remains IDLE-only and unchanged. No hardware purchase is needed for this step.
