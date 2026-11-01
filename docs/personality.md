# Companion personality — gentle, familiar, a little playful

## Principles

- Warm and reassuring, without pretending a mock is a real recording or an AI conversation.
- User controls are stable; only the explicitly labelled **B surprise** chooses a reaction.
- Idle behaviour is quiet and spontaneous. It never starts a recording, plays a message, opens a memory or submits a question on its own.
- Existing smooth, bouncy face rendering and the eight-second memory reveal are unchanged.

## Predictable controls

| Control | Meaning |
| --- | --- |
| A tap | Next expression in the fixed six-expression sequence. |
| A hold | Home, always. |
| B tap | One of the currently available reactions below. |
| B hold | Memory viewer, always; not randomized. |
| A+B | Home, always. |

Short actions first cancel any old state via the state manager's Home event. No personality code assigns application state. The fixed long-press shortcuts are preserved from the previous layout rather than silently changing B hold to a different menu.

## Reaction collection

| Reaction | Behaviour | Availability |
| --- | --- | --- |
| Happy | Warm happy face for 3 seconds | Always |
| Playful | Surprised face for 2.6 seconds | Always |
| Sleepy | Brief sleepy face for 1.8 seconds | Always |
| Memory | Random preloaded local photo through the thought-cloud animation | At least one photo loaded |
| Voice | One of three named **silent mock** message slots, 3.5–5 seconds | Always in this mock prototype |
| Status | One of four short reassuring messages outside the device, with a neutral face for 3 seconds | Always |
| AI invitation | Attentive LISTENING face and typed question interface | Simulated internet is on |

Selecting AI does **not** automatically submit input or contact a service. The user must finish the explicit typed submission step. Responses remain prewritten mocks. Voice titles are placeholders, not recordings of a person; actual playback remains unimplemented. Text/status stays below the device to preserve the face-first presentation.

## Randomization rules

`preview/personality.js` is independent of the DOM and application state. It returns named event plans and parameters.

- A Fisher–Yates shuffle bag contains each **available reaction once**. Consume the bag before reshuffling, so one reaction cannot dominate just by chance.
- Do not immediately repeat the last reaction at a bag boundary.
- Rebuild the bag immediately when online/photo availability changes; never offer a currently unavailable reaction.
- Voice and status variants avoid immediate repetition.
- Random photo selection avoids the currently selected photo when there is more than one. With only one image, that image is necessarily reused.
- Idle pauses vary from 6.5 to 11 seconds after an initial eight-second pause. Idle may choose neutral, happy, surprised or a short sleepy expression, avoiding immediate repeated idle choices. Blinking/gaze remain ordinary background animation.

## Preload memories locally

In Face studio · 09, choose multiple JPEG/PNG/WebP files in the existing preload input. Up to **12 photos** are held in the current page session; individual files over 8 MB and undecodable images are skipped. Repeated selection adds photos until the cap. B tap may then select a random photo; B hold opens the current photo. No upload, remote image service or persistent storage is used. The files are browser-memory assets, **not ESP32 flash/SD storage**; the current limits are not an S3 memory budget.

Loading more memories does not replace an image during an active cloud reveal. Reloading the page clears the collection. No personal photos or real recordings are bundled.

## Completion checks

Run `npm test` for the automated suite. New tests verify all seven reactions once per online/photo-enabled bag, no immediate repeats, five local reactions when offline with no photos, capability changes, voice/status variants, local memory selection, state-manager admission, explicit AI submission boundaries and restricted idle actions.

Manual checks:

1. Refresh to Face studio · 09. A taps should follow a fixed expression order; A hold always returns home.
2. B taps should show a clearly labelled reaction outside the device, without immediately repeating the previous reaction.
3. With simulated internet off and no loaded photos, use B repeatedly: expect only happy, playful, sleepy, silent voice mock or status—not AI or a missing-photo error.
4. Preload several images and restore simulated internet. Over a full seven-reaction bag, expect one memory and one AI invitation. Home cancels either action.
5. Repeated voice selections should vary named mock slots. Do not expect sound; real audio is not implemented.
6. Leave the device idle: expect blinks, occasional looks and gentle expression changes. It must not unexpectedly open photos, play voice or submit AI input.
7. Hold B repeatedly: it should always open the memory viewer, not draw another random reaction.

Verified here: automated personality, state, animation, input and raster-rendering tests pass. Real-browser touch/keyboard UX, audio, physical ESP32-S3 operation and user preference for timing still require testing. The separate C++ milestone-1 checkpoint has **not** gained the personality selector or later states.
