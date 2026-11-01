# State, event, interruption and recovery rules

## Scope

These rules are implemented in `preview/companion.js` for the **browser prototype**. `preview/index.html` sends events and renders the selected state; facial motion and memory reveal remain in their existing separate modules. The C++/Wokwi checkpoint in `wokwi/milestone-1-idle` intentionally still enables only IDLE. This is not a claim that all eight states are implemented or tested on ESP32-S3 hardware.

## Exactly one primary state

`STATES` and `EVENTS` are frozen named-value definitions. The controller's `#state` is private and exposed through a read-only getter. Only its private entry method changes it. No renderer should assign state or call an entry method directly.

| State | Purpose | Accepted state-changing events |
| --- | --- | --- |
| IDLE | Animated home face | `EXPRESSION_REQUESTED` → EXPRESSING; `PHOTO_SELECTED` → SHOWING_PHOTO (or ERROR if missing); `VOICE_MESSAGE_SELECTED` → PLAYING_VOICE; `LISTENING_REQUESTED` → LISTENING |
| EXPRESSING | Temporary parameterised emotion | `EXPRESSION_FINISHED` → IDLE |
| SHOWING_PHOTO | Thinking face/cloud/photo reveal | Home/cancel → IDLE; missing memory on selection → ERROR |
| PLAYING_VOICE | Silent timed playback mock | `PLAYBACK_FINISHED` → IDLE |
| LISTENING | Explicit typed input, no microphone | `INPUT_CAPTURED` → WAITING_FOR_AI, or ERROR for empty/offline/expired input; `RECORDING_TIMEOUT` → ERROR |
| WAITING_FOR_AI | Non-blocking timed mock | `AI_RESPONSE_RECEIVED` → SHOWING_RESPONSE; failure, timeout, invalid response or disconnect → ERROR |
| SHOWING_RESPONSE | Facial talking presentation; readable mock reply below device | `RESPONSE_FINISHED` → IDLE (15-second prototype timer) |
| ERROR | Concerned face; structured message below device | `RETRY_REQUESTED` → failed operation if safe; `DISMISS_ERROR` → IDLE |

`HOME_REQUESTED` and `CANCEL_REQUESTED` work from **every** state, including ERROR and IDLE. An explicit serious `FAILURE` can enter ERROR from any state. Background `NETWORK_CHANGED` and `MEMORY_LOADED` do not ordinarily interrupt local features. Losing the simulated network while waiting for AI enters ERROR.

Temporary expressions are admitted only from IDLE. Busy controls are disabled; a different action requires Home first. Ordinary blinking and gaze are animation-only, not primary-state transitions. Existing automatic *temporary-expression* demonstrations remain an optional scheduler that explicitly dispatches an expression request only from IDLE.

## Priority means event arbitration, not competing screens

There is no simultaneous "photo state versus audio state" rendering race: only one primary state owns presentation. For events collected in one event-loop turn, call `dispatchBatch([{event, payload}, ...], now)`:

1. Home / cancel / dismiss — user recovery wins.
2. Serious explicit failure — interrupts normal activity.
3. Network status update — evaluate connectivity before accepting AI completion.
4. Timeout or AI failure — takes precedence over success.
5. Ordinary owned completion.
6. New user action / retry / media preload.

Equal priorities keep arrival order. Once a transition occurs, remaining events from that batch are logged as superseded, not applied to the new state. Immediate `dispatch` is synchronous and processed in call order; it cannot retroactively reorder already processed events. The existing DOM controls use immediate dispatch, while the batch API is available for collected events and is tested. AI success checks its deadline even when submitted directly, so a response at/after timeout cannot bypass timeout handling.

## Entry, exit and ownership

Every transition:

1. Marks the old owner cancelled.
2. Releases its mock audio, recording and AI activity flags.
3. Increments the operation lifetime ID.
4. Enters exactly one new state and initializes its owned flags/timestamp.

Home additionally clears temporary question, response, error and retry data, without deleting the preloaded local photo or changing simulated connectivity. No timers or promise callbacks are left to redraw a cancelled activity: `tick(now)` advances only the active state. Audio, microphone and AI remain **mocks**; there are no physical resources or actual network requests to stop. Future real adapters must actually stop/abort/release their devices in the exit path, not merely clear flags.

Completion events carry `{owner: companion.requestId}`. AI success additionally carries `text`. Wrong/expired owner IDs, duplicates and completions in the wrong state are rejected. Home, error, timeout and retry all create a new owner lifetime. Named AI failure events are owned too; a late failure cannot replace an unrelated screen. The prototype's typed `INPUT_CAPTURED` is an explicit synchronous submit, not a microphone callback; a future microphone adapter must add owned capture completions before accepting async input. Generic `FAILURE` is reserved for current explicit application/test faults, not arbitrary unowned async callbacks.

## Recoverable errors

`errorInfo` stores category, failed state/operation, retryability and a friendly message. Transition logs hold event/state/owner diagnostics separately without recording photo data or question/response contents.

- Errors never automatically retry.
- Voice, listening and waiting-for-AI failures may be retried **once per operation chain**.
- Retrying AI requires simulated connectivity; it allocates a fresh owner and uses the already explicitly submitted question.
- A second failure disables retry. Home/dismiss always remains available, allowing a fresh user-initiated action.
- Missing photos require choosing a photo, so they offer dismissal rather than an unsafe retry.
- Returning home clears temporary error data and resets the retry budget.
- Debug history is capped at 100 entries.

Preview buttons: **Dismiss error** returns home; **Retry once** is enabled only for a retryable error. Status and friendly messages stay outside the facial display.

## Verification

Run `npm ci` if dependencies are not already installed, then `npm test`. No installation is needed just to open the browser preview.

New tests in `tests/companion.test.cjs` cover read-only state ownership; invalid transitions while expressing; home/cancel from all eight states; cleanup flags; late, wrong-owner and duplicate responses; success arriving at timeout; cancellation/error/completion arbitration; explicit bounded retry; structured invalid-response errors; and 10,000 repeated recoveries with bounded logs. Existing animation tests still check idle motion, and canvas tests check eye visibility and final full-screen memory coverage.

Manual preview check: refresh to **Face studio · 07**, start an action, cancel it and wait past its original completion deadline. It must not reappear. Test error → dismiss; submit a question then toggle simulated internet off → ERROR; restore it and retry once. Offline memory/face/mock voice should remain usable after returning home.

Limitations: this change does not add a real audio player, microphone, network transport, persistent gallery, response pagination, physical shutdown, or hardware error recovery. Resource checks verify mock lifecycle flags and owner invalidation, not physical device shutdown. Those integrations require their own future milestones and tests.
