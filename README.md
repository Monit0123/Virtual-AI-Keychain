# Virtual AI Keychain

## Current incremental checkpoint: Milestone 1 — IDLE

Start with **[the Milestone 1 guide](docs/milestone-1.md)** for the new C++ state-manager implementation and exact Wokwi instructions. Only IDLE is enabled in this checkpoint. The older browser preview and animated-face sketch below are retained as exploratory demos; they are **not** the new validated application architecture.

A software-first, personalised companion project. No hardware purchases are needed for the first step.

## Hardware target: ESP32-S3

**ESP32-S3 is the intended MCU**, superseding the earlier S2 target. The browser preview is graphics-only. The current Wokwi diagram uses a classic ESP32 as a simulation stand-in; it does not validate S3 firmware, pin assignments, memory, or performance.

**Do not copy the simulator wiring to an S3 board.** GPIO23 does not exist on ESP32-S3, and other pins may be reserved for flash/PSRAM or board functions. The current sketch's SPI pins are simulator-only. Before making an S3 firmware build, choose the exact S3 board definition and verify its exposed pins, flash/PSRAM configuration, USB pins, boot-strapping requirements, and display wiring against its schematic. No hardware purchase is needed to make that decision.

Keep the animation loop cooperative and non-blocking; a second core is not required for the face. The browser's 4× supersampling is a visual study, not an S3 performance claim. A RGB565 128 × 128 framebuffer alone uses 32 KiB. Do not assume PSRAM is fitted until the board/module is specified. Cloud AI remains optional; offline eyes, photos, and recordings remain the goal.

## Start here: animated face in Wokwi

This first demo runs in your browser on an Apple Silicon Mac. It needs no local installations, paid API, microphone access, or physical electronics. Wokwi may ask you to sign in to save your project; use its free browser workflow, not a paid integration.

1. Open **https://wokwi.com/projects/new/esp32** in Safari or Chrome. If that link changes, open https://wokwi.com/, choose **ESP32**, then a new **ESP32 Arduino** project.
2. Open this repository's [`sketch.ino`](wokwi/animated-face/sketch.ino). Copy its **entire contents** into Wokwi's `sketch.ino` tab, replacing the starter code. Do not paste Markdown fences.
3. Open Wokwi's `diagram.json` tab. Replace its contents with [`diagram.json`](wokwi/animated-face/diagram.json). This adds and wires the screen and button automatically.
4. Use the editor's file/tab menu to create `libraries.txt`, then paste [`libraries.txt`](wokwi/animated-face/libraries.txt). If file creation is not available, use **Library Manager → +** and add **Adafruit ILI9341**, **Adafruit GFX Library**, and **Adafruit BusIO**, and **Adafruit SSD1351 library** instead.
5. Click the green **▶ Start simulation** button. Allow the first compilation to finish.
6. Look for two coloured eyes and a straight neutral mouth. Watch for blinking, gentle random gaze movements, and a new expression every six seconds.
7. Click the green simulated pushbutton to immediately select the next expression. The sequence is neutral → happy → sad → sleepy → surprised → angry → neutral. Holding the button should only advance once. Clicking restarts the six-second automatic-change timer.
8. Save the project if you want to return to it. Keep personal photos, voice recordings, and secrets out of shared/public simulator projects.

### What to check

- Watch for at least 40 seconds: all six expressions should appear and the eyes should blink repeatedly.
- Press the button several times: each distinct press should advance one expression.
- Keep it pressed for two seconds: it should not rapidly cycle.
- Check the serial monitor for `Face ready!` and expression-change messages.

The animation uses `millis()` rather than blocking delays, so button handling can continue during blinks. Screen refresh targets approximately 30 frames per second; SPI transfers and simulator performance may lower the actual frame rate.

### Wiring (already included in the diagram)

| Simulator ESP32 pin (not S2 wiring) | Destination |
| --- | --- |
| 3V3 | TFT VCC and LED |
| GND | TFT GND |
| GPIO14 | TFT SCK |
| GPIO23 | TFT MOSI |
| GPIO19 | TFT MISO |
| GPIO5 | TFT CS |
| GPIO27 | TFT D/C |
| GPIO26 | TFT RST |
| GPIO18 | Pushbutton side 1 |
| GND | Pushbutton side 2 |

The button uses the ESP32's internal pull-up resistor: pressed means LOW.

### 1.5-inch RGB OLED target versus simulation

The intended display is a **1.5-inch diagonal, 128 × 128 RGB OLED**, not a 1.8 × 1.8-inch visible panel. A common module uses an **SSD1351 controller and 128 × 128 pixels**, but confirm your exact module's controller and resolution before eventual hardware integration. No purchase is needed now.

Wokwi has no direct SSD1351 OLED simulation, so this demo uses its **ILI9341 colour TFT as a stand-in**. It displays a centred 128 × 128 RGB565 canvas at native resolution with unused black space around it. The simulator's physical screen size is not the final OLED's size. The default code uses an ILI9341 driver for simulation. An optional **SSD1351 hardware backend** is included: `USE_SSD1351_OLED` at the top of `sketch.ino` selects it. Leave this set to **0 in Wokwi**. Setting it to **1** selects the SSD1351 driver and fills its 128 × 128 panel, but only makes sense later with a confirmed SSD1351 module and verified electrical requirements and wiring. The simulator diagram is **not** a physical OLED wiring guide. This hardware path has not been tested on a device; do not buy hardware for this step.

Install **Adafruit SSD1351 library** as well if you later enable that backend. Physical inch dimensions are properties of the chosen module, not values firmware can set.

Expression names are now printed **only in the serial monitor**, not on the face. The face has a mouth: a smile for happy, a frown for sad, a small opening for sleepy, an O for surprised, an angular frown for angry, and a straight line for neutral. Colours also vary, but mouth/eye shapes convey emotion without relying on colour.

### Troubleshooting

- **Missing `Adafruit_ILI9341.h` or another header:** check the three library names above, then stop and restart the simulation.
- **Blank screen:** make sure the complete diagram was replaced, especially SPI clock=14, MOSI=23, CS=5, D/C=27, RST=26 and LED=3V3. Stop and restart after editing wiring.
- **Button does nothing:** click the simulated component, not a physical keyboard key. Check GPIO18 connects to `1.l` and GND to `2.l` (opposite electrical sides).
- **Compile error:** confirm you replaced the starter sketch rather than appending to it. Share the first error message if it persists.

## Scope and next steps

This step demonstrates only animated expressions and a simple input. It does **not** yet implement photos, audio, networking, or AI. Once it works, the next step is intentional interaction states before adding a colour gallery, mocked offline message playback, and optional mocked cloud AI. No paid service is needed. Offline eyes, local photos, and personal recordings remain the core design requirement.

Simulation cannot validate battery life, audio quality, charging safety, enclosure fit, water resistance, or real-world Wi-Fi reliability. Hardware selection and purchases are deferred.

## Reference projects and licensing

`123_Keychain`, `124_Video_Player`, and `126_PuzzleBox` are existing reference material. The new `wokwi/animated-face` demo is written independently and does not copy their sketches. Their presence here does not establish redistribution permission: check each original project's licence and dependencies before publishing or redistributing reference-derived work. Adafruit libraries have their own licence notices; retain and review them when distributing firmware or source.

## Square display preview (no rectangular TFT)

For a genuinely square display preview, open `preview/index.html` directly in your Mac's browser. It uses a **128 × 128 RGB canvas**, displayed at 2× zoom, with eyes, mouths, blinking, gaze movement and a next-expression button. No installation or server is needed. The page runs offline.

This is a separate JavaScript graphics preview, **not the Arduino sketch or an electronics simulation**. Wokwi's existing diagram still uses a rectangular ILI9341 because there is no built-in SSD1351 RGB OLED part. A real SSD1351 simulation would require additional custom-chip work, not merely changing the diagram's display name. Neither browser pixels nor Wokwi can guarantee a physical 1.5-inch size on your Mac.

### Face studio polish

The browser preview now includes six individually selectable expressions (neutral, happy, sad, surprised, sleepy, angry), a cycle toggle and a gentle-motion toggle. Geometry and restrained colours interpolate over 650 ms, gaze uses elapsed-time smoothing, and blinks use eased closing/opening rather than linear snapping. Rendering uses 4× supersampling downsampled to 128 × 128 plus smooth browser enlargement, rather than pixelated scaling. Reduced-motion system preferences disable ambient motion by default; use the Gentle motion control to change this. These improvements are browser-preview-only; the Arduino renderer does not yet implement the same supersampling or expression morphing. The physical OLED remains a hardware target, not a verified simulation.

### Coordinated idle animation (browser preview)

`preview/animation.js` is the single animation controller. Expression morphing owns face geometry, blinking owns eye openness, and idle behaviour owns gaze. New blink/gaze actions wait during expression transitions; an already-active blink finishes normally. Rapid expression selections start from the current interpolated pose, avoiding abrupt resets. Idle behaviour includes variable blink intervals, occasional follow-up blinks, randomized gaze pauses and occasional returns to centre. All timing is non-blocking.

Verification: run `node --test tests/animation.test.cjs` (Node's built-in test runner; no packages). The tests cover all six expression targets, interrupted morphs, channel coordination, reduced motion, auto cycling, long frame gaps, and **two simulated minutes without input and with expression cycling disabled**, verifying that gaze and blinks continue. These are deterministic controller tests, not real-time browser, ESP32, or physical OLED verification.

To check visually: refresh the preview, turn **Cycle expressions Off**, leave **Gentle motion On**, then leave it untouched for two minutes. The face should keep blinking and looking around while staying in the selected expression. Click expressions rapidly to check smooth retargeting. Turning Gentle motion Off intentionally disables ambient animation and makes expression changes immediate for reduced motion. The Arduino firmware still uses the earlier independent animation implementation and has not yet received this coordinated controller.

## Companion behaviour states (browser prototype)

The single controller in `preview/companion.js` owns the active screen and action lifecycle. `requestAnimationFrame()` calls its non-blocking `tick(now)`; there are no delayed callbacks that can overwrite a cancelled action.

| State | Behaviour / exit |
| --- | --- |
| `IDLE` | Animated neutral face; optional randomized expression every six idle seconds. |
| `EXPRESSING` | Smoothly morph to selected expression; return to idle after 4.5 seconds. |
| `SHOWING_PHOTO` | Show a locally preloaded photo, centre-cropped to the square display; Home exits. |
| `PLAYING_VOICE` | Clearly labelled silent five-second mock with waveform/progress; return to idle. |
| `LISTENING` | Typed question stands in for microphone input; submit or time out after 20 seconds. |
| `WAITING_FOR_AI` | Mock waiting indicator; prewritten reply after 2.2 seconds, or error if offline. A non-mock timeout path is tested at ten seconds, but no API is implemented. |
| `SHOWING_RESPONSE` | Show mock response; Home or 15 seconds returns to idle. |
| `ERROR` | Explain missing media, no input, timeout, disconnect or injected failure; Recover/Home exits. |

Refresh the preview. Use **Preload a photo memory** to choose your own JPEG/PNG/WebP (under 8 MB), then **Show memory**. It is decoded locally, never uploaded, and held only for the current page session. No private memory photo is bundled in the repository, so the photo action intentionally errors until you preload one. The square preview crops the image; this is not yet a multi-photo gallery or flash/SD storage implementation.

Use **Home / cancel** before starting a different action while busy. Expressions can retarget each other smoothly; photo, voice and AI modes do not run on top of each other. Switch **Simulated internet available** off to test offline AI errors while local photo, expression and mocked voice states remain usable. Listening uses no microphone, voice plays no actual recording, and AI uses no cloud service. These state interactions are implemented in the browser prototype, not yet in the ESP32-S3 Arduino sketch.

Run `node --test tests/*.test.cjs` to verify animation and state flows, including cancellation, offline operation, missing media, timeout and error recovery.

### Face-first state presentation

All eight states now keep expressive eyes and a mouth on the device screen. Listening has attentive eyes; waiting has a thoughtful upward gaze; voice playback and responses have a gently animated speaking mouth; errors have a warm, concerned frown. Photo mode keeps the memory image behind a smiling face with a dark contrast overlay. No state replaces the face with labels, response text, waveforms or loading dots. Full mock responses, status explanations and playback progress remain **outside** the simulated device for testing and accessibility. Speaking-mouth animation is illustrative, not audio-synchronized. Reduced motion suppresses these gestures. `preview/state-face.js` contains the state-to-pose mapping; the firmware remains a separate implementation.

### Memory thought-cloud study (browser only)

Show memory uses a single eight-second choreography: the face shifts slightly bottom-left, blinks exactly once, then glances top-right with a surprised O mouth. Three thought dots emerge in sequence, a soft white cloud appears, and the photo fades across the cloud's entire interior (not a small rectangular card). The white perimeter remains visible. After a brief hold, the image/cloud silhouette expands smoothly to fill the square display, covering the face naturally. Transitions use quintic easing with zero velocity and acceleration at phase endpoints. The scene overrides ambient gaze and blink presentation to prevent conflicting gestures, while leaving the underlying animation pose untouched.

The scene is driven by elapsed state time, not delayed callbacks. Home cancels immediately and reopening restarts the sequence. Gentle motion Off shows the full-screen image immediately. Tests cover phase ordering, a single blink, reduced motion, restart timing, and renderer context cleanup. Visual smoothness has not been browser-automated or measured on ESP32 hardware. This is a browser-only visual study; the C++ milestone-1 checkpoint remains IDLE-only.

### Memory layout correction and pixel verification

The remembering face is now positioned below the cloud rather than underneath its painted area, with two visible eyes and a hollow O mouth. Preview scripts use a versioned URL to avoid mixing cached earlier assets. The final timeline remains full-screen until Home is selected.

`tests/render.test.cjs` executes the actual preview scripts against a real raster canvas and a minimal DOM harness. It checks both eye regions at the cloud stage and every output pixel after the full-screen reveal, using a solid-colour test image. This verifies canvas rendering, not an actual browser/physical OLED. Developer tests now use the dev dependency `@napi-rs/canvas`: run `npm ci && npm test` if you want to reproduce all 19 tests. No installation is required simply to open the preview or use Wokwi.

### Fast & bouncy tuning (Face studio · 03)

Latest timing supersedes the slower study above: expression morphs now take **280 ms** with slight spring overshoot. Memory reveal takes **3 seconds**: face settles in 420 ms, one quick blink at 120–300 ms, upward glance at 300–560 ms, dots at 450–750 ms, cloud at 700–1120 ms, photo fade at 1000–1800 ms, then full-screen expansion at 2000–3000 ms. The face uses a bounded back-easing spring; the cloud has a small damped-looking pop while the final photo zoom stays smooth. Reduced motion still shows the completed memory without bouncing. All 20 automated tests pass, including actual raster checks for eyes and final full-screen photo coverage. Physical ESP32-S3 performance is not measured by these browser changes.

### Slower pace, independent feature springs (Face studio · 04)

This supersedes the fast tuning above: memory reveal is back to **8 seconds**, and expression transitions to **650 ms**. Eyes lead the expression morph; the mouth follows 70 ms later, with both settling on the same clock. Eyes and mouth have separate small squash/stretch and vertical follow-through envelopes, while the memory face's overall bottom-left movement is smoothly eased, not bounced as a rigid block. The cloud retains its small entrance pop. The photo still fills the entire screen at eight seconds. Gentle motion Off disables all follow-through. Pixel tests still check eye visibility during the cloud stage and full-screen image coverage at the end. This is a browser visual change only, not an ESP32-S3 firmware change.

## Explicit transitions, priority and recovery

See **[State-management rules](docs/state-management.md)** for the browser controller's state/event table, event-priority ordering, cancellation ownership, structured errors and bounded retry. The active state is now private, completions are owner-checked, and Home is available from every state. This hardening does not advance the separate C++ checkpoint beyond milestone 1.

## Two-button interaction

See **[Controls and testing guide](docs/controls.md)**. Face studio · 08 adds A/B tap/hold controls with 30 ms debounce, 700 ms holds, chord-to-home, pressed feedback and no release double-trigger. The Wokwi milestone-1 checkpoint also includes two simulated buttons and a new required `Buttons.h` file, but keeps later states disabled.

## Companion personality

Face studio · 09 adds a capability-aware, non-repeating reaction bag for B taps, brief sleepy reactions, multiple session-local photos, three named silent voice mocks, short statuses and online-only mock AI invitations. A and all hold/chord controls stay deterministic; idle stays face-only. See **[Personality and completion checks](docs/personality.md)**. This remains browser-only; the C++ checkpoint is unchanged.

## A quiet hello — withdrawn, shy, then happy

Face studio · 10 adds a 90-minute inactivity mood: sad down-right gaze, followed by a slow look-up, red blush, warm smile and floating hearts when a typed **Hi, Moni**, **Hi, Daddy**, or **Moni** is submitted. Optional browser speech attempts **Hi, Mommy** once. Use **Preview left-alone mood** to test immediately. See [behaviour, timing and limitations](docs/affection.md). This is a browser-only study, not microphone recognition or ESP32-S3 firmware.


Face studio · 11 adds a slowly gathering and falling right-eye tear to the left-alone mood, with a gentle fade on greeting. Reduced motion disables the drop. All 49 automated tests pass.

Face studio · 12 replaces linear heart rows with independently randomized positions, sizes, emission times, speeds and gently swaying paths. The seed changes per greeting, not per frame, preserving smooth motion. All 51 tests pass.

## Compact display interface

Face studio · 13 adds a four-thumbnail gallery, full-screen photo viewer, small voice/listening/thinking indicators, paginated readable AI replies, tiny Wi-Fi status, friendly error screen and two-row Settings. The home face stays minimal. A/B gain contextual navigation, while A hold and both-button Home remain fixed. See **[Interface and control guide](docs/interface.md)**. All 55 tests pass; firmware remains at its separate checkpoint.

## One-photo gallery refinement

Face studio · 15 replaces the thumbnail grid with one image at a time, next/previous/random/Home controls, validated local decoding, and missing-image placeholders. See **[Gallery usage and failure tests](docs/gallery.md)**. All 62 tests pass. Browser prototype only; physical firmware/storage is unchanged.

Face studio · 16 starts with three bundled, attributed sample photographs, so the gallery works immediately. Returning home restores the previous face expression, gaze and paused blink/morph timing rather than resetting the animation. All 64 tests pass. See `preview/samples/ATTRIBUTION.md` and the gallery guide for details.

Face studio · 17 supports multi-photo selection or whole folders (including subfolders) with **no image-count cap**. Sequential imports resize retained previews, show progress and allow cancellation. Browser memory and the existing 8 MiB per-file/type validation still apply. All 67 tests pass; see the gallery guide.

## Personal voice-message lifecycle

Face studio · 18 adds a shared ID/file catalogue, specific/random selection, a replaceable silent mock player, configurable duration, progress/cancel controls and recoverable missing/corrupt-file tests. No real recording is bundled or played; file health is explicitly simulated. See **[Voice-message design and test steps](docs/voice-messages.md)**. All 74 tests pass; firmware remains unchanged.

## Real audio is now available

**Face studio · 19** replaces the silent browser player with actual Web Audio playback of three generated placeholder WAVs. Click **Enable sound / load recordings**, then play a specific/random message. Progress uses real audio duration; Home/Cancel stops actual sound. Replace any slot with a local recording through the file picker—no upload, session-only. See **[Real audio guide](docs/real-audio.md)**. All 80 tests pass, and an actual Chromium playback/cancel/replacement smoke check passed. Physical ESP32-S3 audio remains unimplemented.


**Face studio · 20** wires a dedicated generated **Hi, Mommy** recording into the left-alone greeting sequence, replacing browser TTS. It plays once with the smile/hearts, can be muted or replaced via the `greeting` slot, and cancels on Home. All 82 tests pass, plus an actual Chromium greeting/replacement/cancellation check.

Face studio · 21 adds a gentle post-blush snuggle: small head lean/tilt, cozy eyes and independent eye/mouth nuzzle follow-through during the soft smile. The recorded greeting and randomized hearts remain intact. All 86 tests pass, including the browser greeting smoke check.

## Indexed personal recordings — Face studio · 22

Record later on your Mac or phone. The preview now reads `preview/voice/index.js`: consistent `voice_001`–`voice_004` filenames, measured durations, optional categories, and a dedicated greeting role. Category selection and preload/random playback are index-driven. Add or replace assets without editing browser playback logic. Run `npm run voices:check` to validate files and WAV durations.

See the [step-by-step recording catalogue guide](docs/recording-catalogue.md) for private session replacements, permanent local files, new recordings and portable JSON export. Included clips remain generated placeholders. ESP32-S3 hardware audio and runtime asset updates are **not implemented** by this browser milestone.

## Real browser microphone wake input — Face studio · 23

Use **Start microphone** for actual permission-controlled speech input, and **Test speaker** for the recorded greeting through your browser output. Exact final wake phrases are “Moni”, “Hi, Moni”, and “Hi, Daddy”. On-device recognition is the default requirement; an online/browser recognition service is available only with explicit consent. Listening stops on wake or before speaker playback and must be manually re-armed. Typed testing and mock AI questions remain separate.

See [microphone setup, privacy, limitations and hardware verification](docs/microphone-wake.md). Browser support varies. Automated state/adapter tests are not proof of physical microphone pickup, acoustic wake accuracy, speaker audibility, or ESP32-S3 audio operation.

## Native macOS app

The native macOS simulator wraps the existing UI with AppKit/WebKit and replaces browser speech recognition with **Apple Speech + AVAudioEngine**. It requires macOS 13 or newer. A universal Apple Silicon/Intel DMG is built by `.github/workflows/macos-app.yml`; locally on a Mac, run `bash macos/build.sh` (Xcode Command Line Tools required).

See `macos/INSTALL.txt` for installation and permissions. This development build is ad-hoc signed, not Apple-notarized. Imported personal recordings persist privately in `~/Library/Application Support/VirtualKeychain/recordings/`; `voice_004` supplies the short wake greeting. The originals remain generated placeholders until you import your own audio. No personal audio is committed to Git.

Native speech requires both macOS Microphone and Speech Recognition permissions. On-device English recognition is required by default; Apple-service recognition is explicitly opt-in. Name accuracy, actual microphone pickup and speaker audibility must be tested on a real Mac. Native smoke tests validate UI loading, bundled WAV decoding, recording persistence and audio source lifecycle—not acoustic operation. This is not embedded ESP32-S3 firmware.
