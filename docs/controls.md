# Two-button controls — provisional layout

## Browser preview

Refresh to **Face studio · 08**. Use the two buttons below the square display with mouse/touch, or keyboard **A** and **B**. Space/Enter work on a focused button. Typing in an input field does not operate device controls.

| Gesture | Action |
| --- | --- |
| A short | Cycle neutral/happy/sad/surprised/sleepy/angry expressions; first tap selects happy. |
| A long (700 ms) | Cleanly cancel current action and return to IDLE. |
| B short | Random happy/surprised expression or personal-message **silent mock**. No recording is played. |
| B long (700 ms) | Cleanly cancel current action and open the preloaded memory viewer. Missing photo produces the existing recoverable error. |
| Both pressed | Return home once and suppress individual actions until both are released. |

A/B short actions intentionally go through Home/cancellation before requesting a new interaction. They do not bypass the state manager's IDLE-only action admission. This gives a predictable interruption path. Photo navigation/menu cycling is not added here; there is currently one preloaded memory.

### Input rules

- Both transitions (press and release) must be stable for **30 ms**.
- A short action fires only on release; a long action fires once at **700 ms after the debounced press**. The corresponding release never fires a short action.
- A held button never repeats.
- If the second button arrives before a long action, the chord suppresses both individual actions. If it arrives after a long action already fired, the long action cannot be undone; the subsequent chord returns home once.
- If a first short tap has already finished before the second press, these are separate gestures, not a chord.
- Browser focus loss, hidden page, or pointer cancellation discards unfinished input rather than accidentally triggering a short action.
- Pressed shading and a hold-progress bar show button feedback. A text status explains the action outside the device screen. The face animation keeps running during a hold.
- Direct assistive-technology click activation is treated as a short gesture; pointer/keyboard holds use the sampled debouncer.

`preview/buttons.js` owns input timing only. It emits gesture names; `handleGesture` in `preview/index.html` translates them into named application events. Neither module directly changes primary state. The existing animation and memory timing remains unchanged.

## Wokwi milestone-1 checkpoint

Copy **five files** from `wokwi/milestone-1-idle`: `sketch.ino`, `AppState.h`, **`Buttons.h`**, `diagram.json`, `libraries.txt`. Add both headers as editor tabs. The diagram connects A to GPIO18/GND and B to GPIO25/GND with internal pull-ups. These are classic-ESP32 simulator pins, **not a final ESP32-S3 wiring plan**.

`Buttons.h` uses non-blocking unsigned elapsed-time checks, including millis rollover. The sketch samples both buttons every loop. Corner circles and hold bars provide display feedback; serial logs identify gestures. A long press and both-button chord return home. The other gestures generate expression/voice/photo requests which the milestone-1 state manager deliberately rejects as `NOT_IMPLEMENTED`. This preserves the IDLE-only firmware milestone; do not expect the browser's memory or voice mock to run in this sketch.

## Verification

- `npm test`: debounce bounce rejection, one action per press, both short and long gestures, staggered/simultaneous chords, suppression until release, cancellation, feedback bounds, plus existing state/animation/rendering tests.
- Optional portable C++ check (if a compiler is already installed):
  `g++ -std=c++11 -Wall -Wextra -Werror -pedantic tests/cpp/buttons.cpp -o /tmp/keychain-buttons && /tmp/keychain-buttons`
- Manual: tap each button; hold each for 2 seconds; release after a long action; hold both; release them separately; switch away while holding. There should be no duplicate release action. Press A/B while typing a question: text input should not trigger controls.

Verified here: 34 JavaScript tests and portable C++ button tests pass, including rollover. The actual Wokwi sketch has not been compiled/run here; mouse/touch/keyboard behaviour is implemented but has not been checked in a real browser automation session. Physical switches and the final ESP32-S3 board remain untested.
