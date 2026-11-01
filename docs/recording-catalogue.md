# Recording catalogue — Face studio · 22

Record on your Mac or phone whenever you are ready. The four included recordings are **generated placeholders**, not your voice. You do not need to record anything to try this version.

## Organization

- Files: `preview/voice/voice_001.wav`, `voice_002.wav`, and so on.
- Separate index: **`preview/voice/index.js`**. This is a small data-only catalogue, not playback/state-machine code.
- Each row has a stable identifier, file path, title, duration in **milliseconds**, optional category, and role. `generated` distinguishes placeholder speech from your own recordings.
- Categories provided: `encouragement`, `good_morning`, `good_night`, `playful`, `special_occasions`. Categories with no recordings are allowed; the preview disables playback for an empty selection. Omit `category` if you do not need one; that recording appears under All categories.
- `role:'personal'` recordings can be selected or randomized. Exactly one optional `role:'greeting'` recording supplies the affectionate “Hi, Mommy” cue; it is not included in random messages. The role, **not a hardcoded filename**, determines the greeting.

The selectors, category filter, random choices and preload list are generated from this index. No fixed number of recordings is built into those controls. Old internal IDs (`comfort`, `hello`, `proud`, `greeting`) remain accepted as aliases; filenames now use the consistent numbering.

## First: try a recording without editing any files

1. Record a short message using **Voice Memos** on your iPhone or Mac, or your phone's existing recorder. On Mac, drag/export the recording to a local folder. On a phone, share/export the audio file and transfer it to your Mac.
2. In the preview, return Home and choose the recording ID you want to replace.
3. Use **Replace selected message with your own local recording** and select the exported file. M4A often works in modern browsers, but support varies. A successfully decoded replacement is used immediately; an invalid one preserves the previous playable recording.
4. Click **Play selected voice**. Browser decoding measures the real duration automatically.

Nothing is uploaded by the file picker. This replacement lasts **only until the page reloads**. Choose `voice_004` to try your own short “Hi, Mommy” greeting. The limit is 40 MiB per picked audio file.

## Permanent local replacement

For the most portable stored format, use **WAV, signed 16-bit PCM, mono**. A 24 kHz sample rate matches the included clips; 16 kHz is also reasonable for speech. Voice Memos commonly exports M4A rather than WAV. You can test that export directly in the browser picker; conversion is needed only if you want the recommended WAV format. A free local editor such as Audacity can export PCM WAV if you already have or choose to use it; no paid tool is required.

1. Keep a private backup of your original recording outside this repository.
2. Replace, for example, `preview/voice/voice_001.wav` with your own exported WAV. **Keep its ID and filename** so references remain stable.
3. Edit its row in `preview/voice/index.js`: update `durationMs`, title/category if wanted, and set `generated:false`.
4. From the repository root, run:

   ```sh
   npm run voices:check
   ```

   The checker validates the index, checks files exist, and compares WAV sample duration with `durationMs`. If it reports “durationMs should be 6250”, enter `6250` in that row and run it again. WAV checks allow 25 ms rounding tolerance. MP3/M4A/OGG paths are also permitted when named after the ID; their durations must be entered manually, and successful browser decoding is still required.
5. Refresh the preview, click **Enable sound / load recordings**, and play the clip.

Real playback ends using the decoded audio clock, not a guessed metadata timeout. Keeping the index duration accurate is still important for catalogue/export/mock tests.

## Add another recording

Copy your next recording to `preview/voice/voice_005.wav`. Add a comma after the preceding row, then insert this row inside the index's `recordings:[ ... ]` array (replace the example duration with your actual duration):

```js
{id:'voice_005',file:'voice/voice_005.wav',title:'Good night',durationMs:6250,category:'good_night',role:'personal',generated:false}
```

Run `npm run voices:check`, refresh, and select **good night**. The new recording appears automatically and is eligible for random selection within that category. IDs must be unique `voice_` plus at least three digits; use the next unused number and avoid renumbering existing recordings. Durations must be positive. Use one greeting role at most. To add a new category, also add its slug to the `categories` array.

For portable JSON (no JavaScript wrapper), run:

```sh
node scripts/voice-index.cjs --json > /your/private/folder/voice-index.json
```

Replace that output path with an existing folder on your machine. `npm run voices:index` also prints JSON, but direct `node` invocation avoids npm's command banner when redirecting to a file.

## ESP32-S3 boundary and privacy

This implements the **browser catalogue and asset workflow**, not an ESP32-S3 audio driver or a firmware asset updater. The intended embedded arrangement is unchanged playback code plus replaceable local audio files and a separate index on flash/SD. The portable JSON export can feed that future loader. Hardware storage, parsing, decoder, I2S/speaker and an update mechanism must still be implemented and tested. We cannot yet promise recording changes without reflashing on the current firmware checkpoint.

No cloud account, Wi-Fi or paid speech service is needed for playback. The browser needs the local preview server to load assets initially; decoded buffers work without further downloads during that page session. It is not a cold-offline-installable PWA. **Do not commit, push, or share private recordings in a public repository or simulator.** The temporary picker is safer for experimenting without changing repository assets.
