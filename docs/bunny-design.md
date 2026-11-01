# Little Orbit — Bunny edition

The user-supplied expression sheet is the visual reference. The implementation uses original resolution-independent Canvas paths rather than cropping or shipping the reference sheet.

## Face language

- Lavender oval eyes containing a small rabbit-body silhouette and two rounded ears.
- Permanent pink triple-stroke cheek accents, a small optional-style mouth, restrained glow on a near-black background.
- Eight selectable expressions: neutral/blink, happy arches, sad tilted eyes, surprised tall eyes, sleepy lids, playful angry wedges, excited stars and love hearts.
- Listening side arcs, thinking dots, and a speaking equalizer accent. These are state indicators, not proof of microphone pickup or audio synchronization. Existing response/error text screens remain readable.
- Existing slow transition/blink clocks, independent eye/mouth follow-through and snuggle transforms are retained. Silhouettes crossfade during expression morphs; reduced motion freezes accent motion.

The studio uses an ink/lilac palette and a champagne frame. The actual display stays 128×128, with supersampling for anti-aliasing; the case is a visual study, not a manufactured enclosure design. Gallery photos still reveal through the existing cloud and ultimately cover the full screen, without a bunny overlay obscuring them.

## Behavior retained

Exactly eight primary application states. Excited and Love are additional expressions, not new states. Random memory selection, explicit gallery navigation, recording import/persistence, native Mac speech and continuous listening are unchanged. Going offline still removes the green connectivity dot entirely.

## Validation

`npm test` includes eight-expression pose/controller coverage, distinct vector rasterization, eye visibility during memory animation, full-screen photo coverage, context restoration and reduced-motion tests. The standalone native app must be rebuilt to receive this skin; an already-installed DMG does not update automatically.
