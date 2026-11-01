# Tiny-display interface — Face studio · 13

## Scope and layout

The browser prototype now renders these views on its existing **128 × 128 canvas**. It is still a visual/interaction simulator, not ESP32-S3 firmware or an SSD1351 electronics simulation. The surrounding webpage controls are explicitly labelled simulator controls, not a proposed smartphone-like device interface.

Home stays minimal: animated eyes/mouth, emotional animations when appropriate, and a small top-right Wi-Fi symbol. No dashboard, notification cards, desktop navigation bar, or multi-icon home menu is added.

| View | Display | Controls |
| --- | --- | --- |
| Home | Face and tiny Wi-Fi status | A tap cycles emotions; B tap bounded personal surprise. |
| Photo gallery | Four thumbnails per page; selected border and count. Helpful empty-gallery message if no photos. | A selects next with wraparound; B opens. |
| Photo viewer | Existing thinking/cloud reveal, then full-bleed photo without Wi-Fi/text overlays | A next / B previous, wraparound; navigation shows the new photo without replaying the eight-second introduction. |
| Voice | Talking face, small **silent mock** label, thin playback progress | Hold A to cancel. No actual audio playback implied. |
| Listening | Attentive face, small pulse and **Listening · typed** label | Type below the simulated device, then explicitly submit; hold A cancels. No microphone capture. |
| Waiting | Thinking face, subtle pulse, **Thinking · mock** and softly pulsing Wi-Fi icon | Hold A cancels. No actual network reconnection is performed. |
| AI response | Readable 8-pixel monospaced text, word wrapping, page count and navigation hints | A next / B previous; pages clamp at ends. Hold A returns home. No automatic dismissal while reading. |
| Error | Friendly message, clear dismiss/home instruction | B dismisses; hold A returns home. Safe retry remains an explicit simulator control. |
| Settings | Two rows only: Motion and Greeting voice | A selects row; B toggles. Hold A exits. Settings are session-local. |

A hold and A+B always return home. B hold now opens the **gallery**, rather than immediately opening one photo. Personal surprise may still open a random preloaded photo directly using the memory-cloud animation. These are deliberate contextual-control refinements to the earlier provisional layout.

## State management

There remain exactly eight primary states. `SHOWING_PHOTO` owns `gallery` and `viewer` presentation; Settings is an IDLE-owned subview. Home/exit always resets the view to `face`. Gallery/settings/navigation events are defined in `preview/companion.js`; renderers do not assign primary state.

Gallery updates provide a count, and selected photo metadata updates the index through a named event. Navigation is bounded or wrapped in the controller. The response pagination helper is shared between controller validation and the renderer. AI responses no longer close after the earlier fifteen-second demonstration timer.

The new `preview/screens.js` owns small-display drawing and word wrapping. It draws full gallery/settings/response/error screens or lightweight voice/listening/Wi-Fi overlays. The existing face/affection/memory modules are retained. The photo viewer's final full-screen coverage is unchanged; no status chrome is drawn over it. This intentionally supersedes the earlier face-only response/error study: readable replies and understandable error messages now get dedicated screens, while Home remains expressive and uncluttered.

## Try it

1. Refresh the live port-8080 preview to **Face studio · 13**.
2. Hold B or select **Photo gallery**. Without photos, verify the helpful empty message and hold A to exit.
3. Preload several photos below the device; hold B again. A moves the selected border, B opens it. Use A/B to navigate the full-screen photos.
4. Return home, select **Ask AI (mock)**, type a question and submit. The prewritten reply appears on paginated text pages. Use A/B, then hold A to return home.
5. Try **Play voice (mock)**, **Test error**, and **Settings**. Toggle simulated internet to see the tiny home Wi-Fi icon change; this is not measured hardware signal strength.

Motion and greeting speech settings remain synchronized with the existing simulator checkboxes. No Wi-Fi passwords or configuration secrets are requested. Simulated connection status is controlled outside the device, not represented as a real working connection manager. Reconnecting animation is only an indicator, not networking implementation.

## Verification and limits

Run `npm ci && npm test` if developer dependencies are not installed. All **55 tests** pass, including gallery/viewer state ownership, empty gallery, wraparound, settings toggles, long/unbroken response text, page boundaries, screen rasterization and context restoration. Existing raster checks continue to verify both eyes beneath the memory cloud and full-screen final image coverage.

Actual readability on a physical 1.5-inch OLED, touch/keyboard behaviour in a real browser, real microphone/audio/network operation, persistent storage and ESP32-S3 performance remain unverified. The C++ milestone-1 checkpoint has not been extended by this interface study.
