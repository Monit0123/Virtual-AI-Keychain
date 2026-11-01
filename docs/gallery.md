# One-photo gallery — Face studio · 15

## Use it

1. Refresh the live port-8080 preview to **Face studio · 15**.
2. Preload JPEG, PNG or WebP photos with the file picker. They remain in this browser session, not uploaded.
3. Hold B or click **Photo gallery**. One selected photo fills the gallery's image area; only a title, count and small button hint surround it.
4. Use A / **Next photo** and B / **Previous photo**. Both wrap around.
5. **Random photo** selects an image other than the current selection when at least two are loaded. With one photo it necessarily remains on that photo.
6. **Home / cancel**, A hold, or A+B returns home from gallery/viewer/error states.

The existing **Show memory** action still uses the cloud reveal and ends in a full-screen viewer. Its A/B/next/previous/random controls show new photos immediately without replaying the long introduction. B hold returns to the one-photo gallery. The earlier four-thumbnail layout is superseded.

## Error handling

`preview/photos.js` validates before decoding:

- JPEG, PNG, WebP only; unsupported types (including GIF/HEIC) get a useful message.
- Missing and empty files are rejected.
- Files over 8 MiB are rejected.
- When the browser supplies no MIME type, supported filename extensions are accepted provisionally; decoding still must succeed.
- Decoding exceptions or zero-dimension decoded images return a friendly error.
- Every created object URL is released after success or failure.

Valid photos in a mixed selection remain usable; invalid files are skipped with an explanation below the preload input. If no readable image is available, an understandable recoverable error is shown. A gallery without photos shows the existing empty message. If a stored image is missing or fails during rendering, the gallery shows **Photo unavailable / Try next or previous**, rather than crashing. A failed cloud-viewer drawing enters the central recoverable error state; canvas clips/transforms are released even when drawing throws.

The pool remains capped at 12 session-local images. This is not persistent flash/SD storage and does not establish an ESP32-S3 memory budget.

## Verification

Run `npm test` (or `npm ci && npm test` if dependencies are missing). All **62 tests** pass.

New automated cases in `tests/photos.test.cjs`:

| Case | Expected result |
| --- | --- |
| Missing/empty file | Validation fails before decoding. |
| Unsupported type | Helpful JPEG/PNG/WebP guidance; no decode attempt. |
| Oversized image | Rejected safely. |
| Valid image | Returned as a local decoded photo; object URL released. |
| Decoder throws | Friendly failure; URL still released. |
| Decoded image has no dimensions | Rejected safely. |
| Missing/broken gallery image | Placeholder drawn; canvas state restored; Home still works. |
| Selected-image navigation | Raster shows only the selected photo; next/previous wrap. |
| Cloud draw failure | Nested canvas state restored so the error view can draw normally. |

Existing tests cover random selection without immediate repeats and empty/single/multiple-photo collections. Manual browser checks: choose a valid photo, unsupported file and corrupted `.png`; browse surviving valid files; verify next/previous/random and return home. Actual file-picker behaviour is not browser-automated here; decoding failures are tested with injected decoders and rendering uses a real canvas. The ESP32-S3 firmware checkpoint remains unchanged.

## Ready-to-use samples and face preservation (Face studio · 16)

Three actual bundled sample photographs load automatically: **Coffee break**, **Rocket launch**, and **Distant stars**. You can open the gallery immediately without selecting private files. Names explicitly identify them as samples; provenance and licence notes are in `preview/samples/ATTRIBUTION.md`. They are same-origin local assets with no external runtime image requests. Failed sample loads are skipped; remaining photos and manual local preload still work. The 12-image session limit includes the three samples.

Opening the gallery or direct memory viewer captures a home-face snapshot (expression, current/target pose, gaze, active blink and scheduling deadlines). Home/cancel/dismiss restores that snapshot and shifts its animation timestamps by the gallery's elapsed duration. The face resumes rather than starting a new blink or skipping an unfinished expression morph. The primary application state returns to IDLE; this does not resume an interrupted microphone/audio/AI action. Explicit Motion setting changes made while browsing take precedence over the saved motion preference. Other normal button interactions retain their defined behaviour.

Snapshot storage is separate from gallery navigation, so next/previous/random do not replace it. Central state-manager events still own navigation and Home. New tests decode all bundled JPEGs, handle a missing sample, wrap through all three, verify exact blink/gaze/morph restoration, and exercise the actual preview's gallery-to-home dispatch path. All **64 tests** pass. Real-browser file/image loading and ESP32-S3 storage/performance remain separate verification tasks.

## Multi-select and whole-folder imports (Face studio · 17)

This supersedes the old 12-image limit. The file picker accepts **multiple photos at once**, and a second picker accepts a **whole folder including subfolders**, using the browser's `webkitdirectory` support. Folder availability depends on the browser; multi-select remains the fallback. There is **no application-imposed image-count cap** in the collection, importer or state-manager gallery count.

Imports decode sequentially, yield between small batches, and show processed/added/skipped progress. **Cancel import** stops at the current asynchronous decode boundary; completed photos remain available, and the incomplete result is discarded. Selecting another folder after completion adds to the collection. Relative folder paths are retained in metadata. Non-images and unsupported/corrupt images are skipped with a helpful reason. Personal imports stay in the page session and are not uploaded or persisted.

Decoded originals are resized to at most **384 pixels on their longest edge** before retention, reducing memory use for this 128×128 visual prototype. The original files on your Mac are unchanged. JPEG/PNG/WebP and the existing **8 MiB per-file** validation remain; this is a file-size limit, not an image-count limit. Browser memory, OS resources and decoding performance impose practical limits, so arbitrarily large libraries are not guaranteed. No unlimited-storage claim is made for browser or ESP32-S3 hardware.

Tests cover a 240-photo nested-folder batch, sequential decoding, cooperative yielding, counts greater than 12, skipped files, cancellation during decode, retaining completed imports, repeat imports and concurrent-import rejection. Collection tests add over 1,000 entries. All **67 tests** pass. Actual OS folder-picker behaviour and very large real-world photo collections are not browser-automated here.
