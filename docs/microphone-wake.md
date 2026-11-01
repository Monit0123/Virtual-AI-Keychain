# Real microphone and speaker path — Face studio · 23

This browser preview now has a **real speech-input adapter**, not just a text box. Audio output uses the existing Web Audio recording player and your computer/phone's selected output device. This is not ESP32-S3 firmware, a dedicated wake-word model, or proof of embedded audio operation.

## Try it on your Mac or phone

1. Open the live preview over **HTTPS**. For a locally served Mac preview, `http://localhost:8080` is also a trusted development origin. An ordinary remote HTTP/LAN address may not allow microphone access.
2. Unmute the device. Click **Test speaker — “Hi, Mommy”**. Confirm that you actually hear it; a moving face/status does not establish audibility. The included greeting is generated placeholder speech, replaceable with your own recording.
3. Under **Real microphone wake phrases**, click **Start microphone**, then grant the browser's permission. No microphone starts at page load.
4. By default the adapter requires browser on-device recognition (`processLocally`). A supported browser and an installed English recognition model are necessary. If unavailable, it refuses to start instead of silently sending audio online. Model installation is not automatic.
5. If you accept the privacy trade-off, enable **Allow browser speech service**, then click Start again. This uses the browser's recognition service, which **may send audio to its provider and need internet**. Browser/provider behavior varies; this is not an offline guarantee and there is no automatic fallback.
6. Say **“Moni”**, **“Hi, Moni”**, or **“Hi, Daddy”** as a complete phrase. Only final recognition results matching a normalized phrase trigger wake. Other speech does not. The recognizer may mis-transcribe an unusual name; inspect “Heard” and retry. We intentionally do not match arbitrary substrings or guess sound-alike words.
7. In normal IDLE it plays the recorded greeting when enabled. To try the existing withdrawn → look-up → blush → snuggle sequence, first use **Preview left-alone mood**, then Start microphone and say the phrase.

The Start click unlocks browser audio and begins preparing the greeting. Autoplay restrictions, permissions, unsupported formats or unavailable recognition are reported rather than replaced with fake success. Speaker output routes to the browser/OS-selected device; select the correct speaker/headphones in system settings.

## Listening lifecycle and privacy

- `preview/wake-mic.js` owns the real `SpeechRecognition` / `webkitSpeechRecognition` session. It uses final English transcripts, not injected text, in normal operation.
- This is browser full speech recognition plus phrase matching, **not a trained always-on low-power keyword spotter**. Do not treat it as a measured wake-word accuracy/latency result.
- Listening stops immediately when a wake phrase is recognized and **before either audio player starts output**. This half-duplex design reduces hearing its own greeting. Use headphones for additional isolation.
- Press **Start microphone** to re-arm. Browsers can end sessions themselves; we show that state and do not start endless retry loops. This preview cannot promise unattended/background listening.
- Stop microphone, Home/cancel, changing the online-service consent, or hiding the page stops capture. Permission, capture, network and language-model errors stop safely. Old callbacks from aborted sessions cannot trigger wake.
- The preview does not record/save microphone files or upload them through its own backend. The latest final transcript is displayed in the page only. Online browser-service consent has the separate provider caveat above.
- The old typed wake test remains available and explicitly labeled. AI-question input/replies remain mocks; this change is wake-phrase recognition, not an AI conversation system.

## Verification boundary

Automated tests cover phrase matching, local-only policy, explicit online consent, final-result filtering, cancellation, stale callback rejection, recognition failures, and the existing face/audio lifecycle. Injected recognizer tests test adapter behavior, **not acoustic recognition**. Canvas tests test rendering, not sound.

A person must still test actual microphone pickup, recognition accuracy, speaker audibility, echo, permissions and browser support on their own device. No physical microphone/speaker is attached to this development sandbox for such verification.

For ESP32-S3, the future hardware path is: microphone driver/PCM capture → compatible on-device keyword engine → wake event → existing state logic → stored recording decoder → audio output driver/amplifier/speaker. Actual pins, sample rates, microphone/output interfaces, model/runtime availability, memory budget and dependency licenses must be selected against the eventual modules. The existing Wokwi/C++ checkpoint remains IDLE-only; this browser adapter does not implement those drivers or validate them.

## Permission allowed, but recognition returns `not-allowed` — revision 24

Microphone capture permission and permission/availability of a speech recognition service are distinct. An embedded preview's Permissions Policy may also block microphone or on-device recognition even with site permission enabled. The error code alone does not identify which of these happened.

1. Refresh to **Face studio · 24**. Use **open this preview directly in a new tab** and allow the microphone for that preview URL (not only the parent Arena site).
2. Click **Check microphone access**. This explicitly calls `getUserMedia({audio:true})` and immediately releases all tracks. It checks capture access only: no recording is saved, and success does not establish audible input or speech recognition support.
3. If capture is blocked, check the browser's site settings and macOS **System Settings → Privacy & Security → Microphone** for your browser. Check Speech Recognition permissions too if your OS/browser exposes them. Insecure origins and exposed iframe microphone policy restrictions are reported separately.
4. If capture succeeds but recognition fails, the problem is on the recognition side: browser/service restrictions, embedded policies, or local recognition support. Try a supported up-to-date browser directly, check whether its English on-device model is available, or explicitly opt into its browser speech service if acceptable. That service is not guaranteed to work in every browser/environment.
5. If it still fails, report your browser/version, OS, whether the preview is a separate tab, whether online speech service is selected, and the capture-check result. Do not repeatedly reset microphone permission without identifying which path is failing.

There is no automatic online fallback and no bypass of browser/OS permissions. Automated tests cover these diagnostics and stream cleanup; they cannot reproduce every user's browser policy or verify a physical microphone.
