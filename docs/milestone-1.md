# Milestone 1 — Central state manager and IDLE

## Inspection findings

- Firmware language: **Arduino C++**, using SPI, Adafruit GFX and an Adafruit display driver.
- Browser preview language: JavaScript/HTML/CSS. It is a separate graphics prototype, not ESP32 firmware execution.
- Intended physical target: **ESP32-S3** and a **1.5-inch diagonal, 128 × 128 RGB OLED**. The exact board and OLED controller have not been confirmed; SSD1351 is a possible controller, not an established hardware fact.
- Existing Wokwi diagram: **classic ESP32 DevKit v1 + ILI9341 TFT**, not S3 + SSD1351. The square 128 × 128 face occupies part of a larger rectangular simulated display. This checkpoint preserves that known diagram rather than inventing a supported OLED part.
- Do not use these simulator pins on an S3 board: GPIO23 does not exist on S3, and other selected pins may be reserved by a physical module. No physical pin map is final.
- Simulation cannot establish real display size, audio quality, battery life, charging safety, waterproofing, or S3 timing/memory performance. This implementation requires no paid API, local installation, or hardware purchase to try in Wokwi.

## Scope: milestone 1 only

The eight primary-state names and named event types are declared, but **only IDLE is enabled**. There is exactly one private current-state value. No mutable state reference or public `setState`/`enter` method is exposed.

Expression, photo, voice and listening requests are intentionally rejected with `NOT_IMPLEMENTED`. Completion events, including AI responses, are invalid in IDLE and cannot change it. The later state modules, retries, error state, request IDs and response pagination are **not implemented in this checkpoint**. The prior browser mock is retained as a design reference, not presented as meeting the new architecture requirements.

### Files and responsibilities

| File | Responsibility |
| --- | --- |
| `wokwi/milestone-1-idle/AppState.h` | Portable state/event enums, validation, lifecycle sequencing, generation counter and injected debugging hooks. No Arduino or graphics dependencies. |
| `wokwi/milestone-1-idle/sketch.ino` | Adapter wiring: button input, serial input, idle-face animation/rendering and lifecycle/debug hooks. Small named components are kept together for easy copying; later modules can be extracted when needed. |
| `wokwi/milestone-1-idle/diagram.json` | Existing supported simulator stand-ins and two buttons (A on GPIO18, B on GPIO25; simulator-only). |
| `wokwi/milestone-1-idle/libraries.txt` | Required free display libraries. |
| `tests/cpp/milestone1.cpp` | Host assertions for the actual portable C++ state manager. |

### Design decisions

1. **Central ownership:** other components call `dispatch(Event, now)` rather than assigning state. State is a scoped enum; arbitrary integer events are rejected too.
2. **Explicit startup:** `begin(now)` enters IDLE exactly once. A second begin is logged and rejected without repeating cleanup/entry.
3. **Entry/exit procedures:** startup runs cleanup then idle entry. Home/cancel deliberately re-enters IDLE: exit → increment owner generation → cleanup → entry. Cleanup has no audio or network work yet because those services do not exist.
4. **No animation-driven transitions:** blinking and gaze updates never send state-change events. Ordinary idle movement must not imply EXPRESSING. There is no automatic temporary-expression cycling in this checkpoint.
5. **Cooperative loop:** every pass checks the button and at most one serial byte. A `millis()` check limits rendering to about 30 fps without `delay()`. SPI display transfer itself takes time; this is not a claim of zero-latency or asynchronous drawing.
6. **Ownership groundwork:** the lifetime generation advances at startup/home/cancel. Future operations will pair it with unique request IDs. No asynchronous service is present, so generation alone is not advertised as a finished stale-response solution.
7. **Debugging:** each external event attempt is logged with timestamp, from/to state, event/result numeric codes and generation. Reentrant dispatch is rejected synchronously without invoking logging recursively. Hooks must be short, non-blocking and must not dispatch events.
8. **Bounded embedded footprint:** the manager uses no heap, event queue or tasks; rendering uses a 32 KiB RGB565 canvas. No PSRAM or second core is required by the manager. Host tests may use dynamic containers; those are not firmware dependencies.
9. **Shutdown:** explicitly returns `UNSUPPORTED`; no power-control hardware is assumed and no ninth primary state is introduced.

## Run in Wokwi on your Mac

1. Open https://wokwi.com/projects/new/esp32 in your browser.
2. Replace `sketch.ino` with the **complete contents** of `wokwi/milestone-1-idle/sketch.ino`.
3. Add files named **`AppState.h`** and **`Buttons.h`** using the editor's file/tab menu. Paste their complete contents from `wokwi/milestone-1-idle/`. Capitalisation matters.
4. Replace `diagram.json` with `wokwi/milestone-1-idle/diagram.json`.
5. Add `libraries.txt` from that folder, or add **Adafruit GFX Library**, **Adafruit ILI9341**, and **Adafruit BusIO** in Library Manager.
6. Start the simulation. Open the serial monitor.
7. Watch for two neutral eyes and a small mouth. Wait at least 30 seconds to check blinking and gaze changes. The face should stay neutral/IDLE.
8. Hold green **A** for at least 0.7 seconds, or press **A and B together**, to return home. The face resets and resumes idle animation. A/B taps and B hold log future-feature requests as not implemented; no later state is enabled. Small corner circles and bars show pressed/hold feedback.
9. If the serial monitor supports input, send `e`: it requests an expression but should be rejected with result `3`, leaving IDLE active. Send `h` or `c` to test home/cancel (result `0`). Newlines are ignored.

Do **not** replace only the sketch while leaving the old diagram or header behind. Missing `AppState.h` means step 3 was missed. Missing Adafruit headers means the libraries were not added. If compilation fails, share the first error. This checkpoint has not been compiled or run in Wokwi in the agent environment.

The existing live browser preview is unchanged and still runs the earlier exploratory state mock. It is not evidence that the C++ checkpoint runs on an ESP32-S3.

## Tests and expected results

Portable core test (only if a C++ compiler is already installed; not required for the Wokwi path):

```sh
# Run from the repository root. The executable is temporary, not a source file.
g++ -std=c++11 -Wall -Wextra -Werror -pedantic tests/cpp/milestone1.cpp -o /tmp/keychain-milestone1
/tmp/keychain-milestone1
```

On macOS, an existing `clang++` can be used instead of `g++`. You do not need to install it just to use Wokwi.

| Test | Initial condition / event | Expected state and visible behaviour | Verification |
| --- | --- | --- | --- |
| Startup | Not started; `begin` | IDLE, cleanup then entry; neutral face | Core automated; face manual |
| Duplicate startup | IDLE; `begin` again | IDLE; no extra entry/reset | Automated |
| Pre-start event | Not started; home | Rejected, no lifecycle effects | Automated |
| Idle blinking | IDLE; no event for 30 seconds | IDLE, repeated blinks; no screen change | Manual Wokwi |
| Idle gaze | IDLE; no event for 30 seconds | IDLE, subtle gaze movement | Manual Wokwi |
| Home | IDLE; Home button/event | IDLE, exit/cleanup/entry once; animation restarts | Core automated; button manual |
| Cancel | IDLE; cancel | IDLE, same cleanup sequence | Automated; serial manual |
| Future feature | IDLE; expression/photo/voice/listening request | IDLE; `NOT_IMPLEMENTED`; no rendering/resource change | Automated; `e` manual |
| Unowned completion | IDLE; AI response/playback/expression completion | IDLE; invalid event, no side effects | Automated |
| Invalid enum value | IDLE; unknown event value | IDLE; rejected | Automated |
| Shutdown | IDLE; shutdown request | IDLE; unsupported, no pretend power-off | Automated |
| Hook reentrancy | Lifecycle/debug hook attempts dispatch/begin | Rejected; no recursive transition | Automated |
| Repeat interactions | 10,000 home events | IDLE throughout; one lifecycle sequence per accepted event | Automated |
| Timestamp wrap | Events near `UINT32_MAX` | State validation unaffected | Automated; animation rollover not tested |

Verified here: C++ core compiled with warnings treated as errors and all assertions passed; all 15 existing JavaScript tests also passed. JSON parsing and Git whitespace checks passed. **Not verified here:** Arduino compilation, Wokwi rendering/button behaviour, physical S3 operation or OLED-driver compatibility.

## Next milestone (not implemented)

Milestone 2 will add a typed expression parameter, IDLE-only admission to EXPRESSING, non-blocking animation completion and `EXPRESSION_FINISHED`/cancel back to IDLE. We stop here so this checkpoint can be checked before enabling another state.
