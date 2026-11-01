# Little Orbit — Bunny edition

The user-supplied expression sheet is the visual reference. The implementation uses original resolution-independent Canvas paths rather than cropping or shipping the reference sheet.

## Face language

- Lavender oval eyes containing a small rabbit-body silhouette and two rounded ears.
- Permanent pink triple-stroke cheek accents, a small optional-style mouth, restrained glow on a near-black background.
- Eight selectable expressions: neutral/blink, happy arches, sad tilted eyes, surprised tall eyes, sleepy lids, playful angry wedges, excited stars and love hearts.
- Listening side arcs, thinking dots, and a speaking equalizer accent. These are state indicators, not proof of microphone pickup or audio synchronization. Existing response/error text screens remain readable.
- Existing slow transition/blink clocks, independent eye/mouth follow-through and snuggle transforms are retained. Silhouette weights interpolate during expression morphs; reduced motion freezes accent motion.

The studio uses an ink/lilac palette and a champagne frame. The actual display stays 128×128, with supersampling for anti-aliasing; the case is a visual study, not a manufactured enclosure design. Gallery photos still reveal through the existing cloud and ultimately cover the full screen, without a bunny overlay obscuring them.

## Behavior retained

Exactly eight primary application states. Excited and Love are additional expressions, not new states. Random memory selection, explicit gallery navigation, recording import/persistence, native Mac speech and continuous listening are unchanged. Going offline still removes the green connectivity dot entirely.

## Validation

`npm test` includes eight-expression pose/controller coverage, distinct vector rasterization, eye visibility during memory animation, full-screen photo coverage, context restoration and reduced-motion tests. The standalone native app must be rebuilt to receive this skin; an already-installed DMG does not update automatically.

## Complete living-face studio (v1.2 / studio 27)

All 13 rows of the reference now have their own clickable control: Idle / Blink, Happy, Excited, Surprised, Sleepy, Sad, Angry, Love, Listening, Thinking, Speaking, Showing Photo and Error. `preview/living-face.js` defines eight named animation beats per design, with slow anticipation, follow-through, hold and recovery rather than a shared generic animation. Loop lengths are 4.8–7.6 seconds. Motion is a visual interpretation of the reference, not an extracted sprite sheet.

The renderer now includes actual drooping sad silhouettes, filled sleepy lids, a curious surprised recoil, smaller listening pupils and travelling ripples, three alternating thinking dots, a smiling-eyes-to-central-voice-ribbon speaking sequence, the miniature framed-picture/heart design, and a bunny-to-warning-to-reassurance error sequence. Excitement has two small hops and sparkles. Love has a soft lean and independently drifting hearts. Blinking compresses the entire eye, including bunny pupils. A subtle breathing clock is independent of the eight-beat expression clock.

### Interaction contract

- Clicking any design opens an explicitly labeled **visual study**, with no microphone or speaker side effect. It cancels an old real action through Home first, then loops the selected design.
- **Play all 13** tours the designs; **Return to live companion** exits immediately. Rapid changes morph over 850 ms without adding primary FSM states.
- Listening intent is preserved but microphone capture pauses while studying designs; returning live permits automatic re-arming. Actual Start microphone, playback, Home and other product actions leave the visual study.
- Real idle, emotion, listening, thinking and speaking states use the same complete face renderer. Native greeting playback also selects the speaking design. Existing snuggle and memory-cloud choreography retain their dedicated renderer; full-screen photos remain unobscured. Real error/reply text remains readable rather than being replaced with decorative icons.
- **Tiny mouth** is optional; reduced motion freezes animation but keeps every design recognizable. State/beat captions and buttons remain outside the 128×128 device.
- Ambient mood changes are now off by default: the creature breathes, blinks and looks around without randomly cycling moods. Users can explicitly enable mood changes. The aim is a calm, attentive presence—not a busy screensaver.

Automated checks cover all 13 distinct designs, all eight key beats, loop/tour behavior, interruptions, reduced motion and actual page-button integration, in addition to retained product tests. Visual speech movement does not establish audio synchronization or physical audibility.

## Anti-aliasing / Retina presentation (v1.2.1)

`preview/face-surface.js` separates the 128×128 logical face coordinates from the preview's actual backing pixels. Paths render at 4×–8× resolution and are filtered **once directly to the screen-density backing buffer**, instead of shrinking to 128×128 and then enlarging again through CSS. At 288 CSS pixels on a 2× display the presentation is 576×576 and the source is 640×640. Buffer dimensions are bounded to avoid unlimited GPU/memory allocation.

Resizing the window or moving between screen densities reconfigures the surface; the render transform remains in 128×128 logical coordinates. Button thumbnails also use screen-density backing buffers. Rounded path joins/caps, curved-vector coverage and restrained glow remain; the whole image is not blurred as a substitute for anti-aliasing. Actual 128×128 output remains covered by the raster tests. The enlarged desktop preview is deliberately smoother than an actual physical OLED grid and is not proof of hardware pixel quality.


## Continuous expression transitions (v1.2.2)

The previous button handler cleared the study through Home before selecting its replacement, discarding the outgoing pose. The handler now captures the visible frame before cleanup and hands it to the next selection. Returning to live mode transfers the same snapshot to the live renderer.

Transitions interpolate eye dimensions, lid angles, pupil gaze, openness, smile/open-mouth geometry, body lean/scale and individual effect weights over 850 ms with a smooth zero-slope easing curve. The mouth follows the eyes by 65 ms. The whole face is never faded out or replaced by a transparent card; cheeks remain present while the eye shapes change. Thinking dots, voice ribbon, photo and warning motifs acquire/release ownership gradually. Rapid clicks capture the already-interpolated visible pose, not the previous expression's starting keyframe. Tours and actual live state changes use the same transition controller. Reduced motion settles directly and clears stale transition snapshots.

Regression tests verify exact first-frame raster continuity, interruption continuity, geometry/effect interpolation, live/study handoffs, preserved cheek coverage and the actual page handler's source snapshot across all 13 buttons.


## Persistent contour renderer (v1.3.0 — supersedes silhouette blending)

The earlier renderer still crossfaded eye silhouettes and hid both eyes entirely during thinking, speech and warning beats. That was not a continuous shape morph. Each eye now has one 64-vertex, smoothed, closed contour. Matching vertices interpolate between bunny, smiling, sleepy, sad, angry, star and heart geometry, at constant outline opacity. Pupils retract geometrically inside the clipped contour. No opacity/compositing writes occur anywhere in the living-face renderer. Eye centres stay at (39,48) and (89,48); breathing and tiny leaning motions are anchored at the face centre, without translating the whole face. Even blinks retain a closed-eye slit.

All 13 expressions keep both eyes and the mouth. Thinking dots sit above the head, the voice ribbon below the mouth, the picture below the chin and the warning above the head; none replaces the face. Supporting marks grow/shrink geometrically. The anger vein mark is red (#ff3b45), with inward-facing corners reflected correctly across both axes. The legacy social/memory renderer shares this contour and anger-mark implementation.

Expression controls: changed asset version keys to prevent loading stale renderer APIs. Native assets now use no-store and the main page bypasses cache on launch. Very quick DOM A taps/Enter activations are no longer dropped between sampled frames; the hardware model retains 30 ms debounce, hold and chord rules. Regression checks cover every design/intermediate eye region, zero opacity-compositing writes, anchored rendering, red symmetric anger corners, and quick expression activation.
