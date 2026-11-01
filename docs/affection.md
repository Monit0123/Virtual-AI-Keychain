# A quiet hello — inactivity and affectionate greeting

## Try it now

1. Refresh the running port-8080 preview to **Face studio · 11**.
2. Keep **Gentle motion** on for the full sequence.
3. In **A quiet hello**, click **Preview left-alone mood**. Wait about two seconds: the face becomes sad, avoiding eye contact with its gaze down-right.
4. Optionally enable **browser speech** before submitting a greeting.
5. Type **Hi, Moni**, **Hi, Daddy**, or **Moni**, then click **Say hello** or press Enter.
6. Watch the gaze slowly lift, warm red cheeks gradually appear, then a gentle smile and small rising pink/red hearts. The greeting caption is **Hi, Mommy**. With speech enabled, the browser attempts that exact line once.
7. Use A/B/Home or **Reset mood** to end the scene. Any greeting speech owned by the scene is cancelled too.

No microphone permission, hardware, API key, paid service or local installation is needed to run this visual study. The input is explicitly a **typed simulation**, not actual speech detection. Browser speech availability and voice quality vary; a system/browser voice is not your recorded voice. Some system voices require downloads or network access, so speech is not guaranteed offline. The facial animation and typed greeting need no cloud AI.

## Behaviour and timing

- Inactivity threshold: **90 minutes** since the last ordinary pointer/key interaction or explicit application action. Automated blinking, gaze and personality scheduling do not count as user activity.
- The timer is a page-session monotonic timestamp, not persistent storage. Reload resets it; browser/OS sleep can affect elapsed time. No physical device sleep/wake behaviour is implemented.
- The emotional layer renders over **IDLE only**. It suppresses automatic expression cycling and cancels temporary EXPRESSING when it takes over, but does not replace photos, audio, errors or pending AI screens. Those operations must end/return home before an idle face can be displayed.
- The demo panel deliberately exempts typed wake-phrase input from resetting the withdrawn mood; otherwise typing the greeting would clear the effect before submission. Other normal controls clear the mood immediately.
- Sadness fades in over 1.8 seconds; the gaze points down-right with a small frown and subdued blue-green colour.
- After a valid greeting: gaze rises over two seconds, shyness builds from 1.3–4.7 seconds, the smile develops from 3.9–7.8 seconds, hearts emerge after 6.5 seconds, and **Hi, Mommy** is requested once around 7.3 seconds.
- Soft radial red/pink cheek gradients build rather than flashing. Warm eye colours interpolate continuously. Eyes retain ordinary blinking; mouth motion accompanies the illustrative greeting but is not synchronized to browser TTS phonemes.
- Hearts are drawn behind the face, rise gently, then fade out by 16 seconds. A quieter happy/blushing mood remains until ordinary interaction or another inactivity cycle.
- Matching is case/punctuation-insensitive but requires a complete approved phrase. It is not substring matching: “Monica” or “not Moni” will not trigger it.
- No genuine feelings or awareness are inferred: “ignored” is a programmed aesthetic behaviour, not a sensed emotional condition or a request for attention.

## Architecture and limitations

`preview/affection.js` contains a pure, timestamp-driven emotional controller plus cheek/heart rendering functions. This adds **no ninth primary state**: the existing state manager still owns the application screen. Rendering uses the existing 4× supersampling pipeline and non-blocking animation loop. The scene's speech is opt-in, cancellable, and best-effort; error/end callbacks are owner-checked so a stale utterance cannot update a newer scene.

`preview/index.html` connects typed input, interaction tracking, optional speech and the visual layer. `tests/affection.test.cjs` checks timer boundaries, input matching, staged emotion, single/stale greeting behaviour, reduced motion and red-pixel rendering. `tests/render.test.cjs` executes the integrated preview scripts against a real canvas and verifies the greeting produces blush/heart pixels while staying in IDLE. All 49 JavaScript tests pass. These are controller/raster checks, **not a real-browser speech or microphone test**.

Gentle motion Off uses the completed facial pose without floating hearts or animated mouth motion. The voice still follows its time-based explicit greeting, if enabled. The ESP32-S3 C++ checkpoint remains unchanged and IDLE-only. Porting this behaviour later will require an actual inactivity clock, wake-phrase/microphone design, audio output, and embedded rendering/performance tests; browser gradients and speech are not firmware implementations.


## Right-eye tear

The left-alone face now includes one small blue tear on the **viewer’s right**. It begins gathering about two seconds after the mood starts, then slides slowly down that cheek over 4.6 seconds with a faint wet trail, fades away, and repeats after a quiet pause. The droplet has a soft blue gradient and small highlight, rendered through the existing supersampled canvas. It does not introduce an animation timer or a new application state.

A valid greeting freezes any current drop and fades it out over 1.5 seconds while the eyes look up. Ordinary controls/reset clear the entire mood; reduced motion disables the tear. Tests verify right-cheek placement, gradual travel/fade, wake-up fade, reduced motion and renderer context restoration. Browser-only; no C++/hardware implementation is implied.

## Scattered heart field (Face studio · 12)

The old seven equally spaced, cyclic hearts are replaced by a bounded pool of 24 independently seeded particles per greeting. X position, starting height, birth time, size, rise speed, lifetime, sway, tilt, opacity and red/pink colour vary independently. Birth order is not tied to horizontal position; particles do not wrap and respawn as diagonal rows. Random values are chosen once on greeting entry, not every frame, so paths remain smooth and reproducible for tests. Each greeting receives a fresh seed. Individual fade-in/out and sideways drift remain gentle; global greeting timing is unchanged. Cancelling clears the particle pool, and reduced motion still hides hearts. New tests check diversity, non-monotonic emission positions, stable paths, continuous upward travel and cancellation. All 51 tests pass.


## Dedicated recorded greeting (Face studio · 20)

This supersedes browser text-to-speech above. A dedicated generated **`voice/greeting.wav`** says exactly **“Hi, Mommy”** in the selected placeholder voice. It plays once at the existing greeting cue (about 7.3 seconds after the accepted typed phrase), while the blush/smile/hearts continue in IDLE. The **Play recorded “Hi, Mommy” greeting** checkbox is on by default; disabling it mutes the greeting without affecting visuals. No SpeechSynthesis voice is used.

Enable sound once to preload all four recordings. Submitting an approved typed wake phrase also attempts to unlock sound in that explicit user gesture and prepare the greeting ahead of its cue. If blocked/missing/corrupt, a friendly caption reports it rather than falsely claiming playback. The greeting has separate source ownership sharing the main decoded cache; Home/reset/other device controls stop it and invalidate pending continuations. A replaced `greeting` slot is used automatically for the next greeting. Random personal-message selection still uses the three ordinary messages only.

Try: refresh, enable sound, preview left-alone mood, type **Hi, Moni** / **Hi, Daddy** / **Moni**, then submit. Watch the full sequence and listen for the short recording as the face smiles. Select **greeting — Hi, Mommy** in voice controls to replace it with your own local clip.

All **82 automated tests** pass. An actual Chromium run verified the dedicated recording source starts once while the app remains IDLE, completes, uses a local-file replacement on the next greeting, and stops on reset, with no page errors. Audible volume/quality on your Mac and real microphone wake-word recognition remain separate checks. The ESP32-S3 firmware is unchanged.

## Gentle snuggle (Face studio · 21)

After the blush has developed, the greeting face eases into a small, cozy snuggle: slight left lean and head tilt, softened smiling eyes, and two tiny cheek-nuzzle motions. Eyes and mouth retain separate, small follow-through offsets while cheeks move with the face; hearts remain behind it, not attached to its transform.

The snuggle starts about **5.6 seconds** after a valid greeting, settles in over 1.6 seconds, and slowly releases by 12.5 seconds. The smile, red blush, randomized hearts and recorded **Hi, Mommy** cue keep their existing timing. It is one finite gesture, not perpetual shaking or another primary state. Ordinary activity/Home cancels it, and Gentle motion Off disables all snuggle movement.

`snuggleFrame()` is a pure bounded, timestamp-based gesture; `applySnuggleTransform()` applies only within the face renderer's saved context. Tests cover phase ordering, smooth/bounded movement, independent feature follow-through, reduced motion, cancellation and canvas context restoration. All **86 tests** pass. The real Chromium greeting/replacement/cancel smoke check also passes with no page runtime errors. Browser-only; no ESP32-S3 firmware change is implied.
