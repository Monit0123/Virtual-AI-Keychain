# Phase 1: get the animated face running in Wokwi

Goal: a pair of eyes that blink, look around and change expression, running in
your browser. No hardware, no installation, no money.

Time: about 10 minutes the first time.

---

## Before you start

You need:

* A browser (Safari or Chrome on your Mac is fine).
* The four files from `firmware/keychain-eyes/` in this repository:
  * `diagram.json`
  * `libraries.txt` (optional - you can let Wokwi create it)
  * `sketch.ino`
  * `eye_engine.h`

Open them in your editor now, you will copy and paste from them.

---

## Step 1 - create the project

1. Go to **<https://wokwi.com/projects/new/esp32-s3>**
   (or open <https://wokwi.com>, click **+ New Project → ESP32-S3**).
2. You get a simulator window on the left and a code editor on the right with a
   single file called `sketch.ino`.

> Signing in is free and optional. If you sign in, your project is saved and you
> can come back to it later. Without signing in, keep the browser tab open.

---

## Step 2 - paste the wiring

1. In the code editor, click the **diagram.json** tab (next to `sketch.ino`).
2. Select everything (`Ctrl/Cmd + A`) and delete it.
3. Paste the whole contents of `firmware/keychain-eyes/diagram.json`.
4. Press **Ctrl/Cmd + S** or just click back on `sketch.ino`. The simulator
   on the left should now show an ESP32-S3, a 2.8" TFT and two buttons.

The wiring, in words:

| ESP32-S3 pin | goes to | why |
|---|---|---|
| 3V3 | TFT VCC + TFT LED | power, and backlight on |
| GND | TFT GND | ground |
| GPIO12 | TFT SCK | SPI clock |
| GPIO11 | TFT MOSI | SPI data out |
| GPIO10 | TFT CS | display select |
| GPIO9  | TFT D/C | data/command select |
| GPIO14 | TFT RST | display reset |
| GPIO4  | Button A → GND | next expression (hold = sleep) |
| GPIO5  | Button B → GND | poke |

The TFT `MISO` pin is not connected: the ESP32 only sends pixels, it never reads
them back.

---

## Step 3 - add the two libraries

1. Click the **Library Manager** tab in the editor (in older Wokwi versions it
   is the **+** button next to the file tabs, then "Library Manager").
2. Search for `Adafruit GFX` and click **Adafruit GFX Library** to add it.
3. Search for `Adafruit ILI9341` and add that too.
4. A new file called `libraries.txt` appears in your project - that is normal,
   it is just the list of what to install.

If you get stuck, you can create `libraries.txt` yourself with the **+** button
and paste the two lines from `firmware/keychain-eyes/libraries.txt`.

---

## Step 4 - the code

1. Click the **sketch.ino** tab, select all, delete, and paste the whole of
   `firmware/keychain-eyes/sketch.ino`.
2. Click the **+** button next to the file tabs → **New file** → name it
   exactly `eye_engine.h` → paste the whole of
   `firmware/keychain-eyes/eye_engine.h`.

You should end up with four tabs: `sketch.ino`, `eye_engine.h`, `diagram.json`
and `libraries.txt`.

> Why two files? `eye_engine.h` is the animation brain and contains no hardware
> code at all. That is what lets the very same file also run on your Mac (see
> `tools/preview/`) so you can tweak the eyes without the simulator.

---

## Step 5 - run it

1. Press the green ▶ **Play** button at the top of the simulator.
2. The TFT turns black, then two eyes appear and start blinking. First compile
   takes a minute; after that it is instant.
3. Click **Button A** (green) - the expression changes:
   `neutral → happy → sad → angry → surprised → neutral`.
4. Click **Button B** (blue) - the eye gets poked: surprised, then delighted.
5. Hold **Button A** for about a second - the keychain falls asleep.
   Hold it again to wake it up.
6. Open the **Serial Monitor** (bottom of the editor) to see the expressions and
   the frame rate:

```
Virtual AI Keychain - animated face
  Button A: next expression  (hold 0.7s = sleep/wake)
  Button B: poke
expression: neutral
fps: 38.4   expression: neutral
```

---

## What good looks like

* Blinking every 2-5 seconds, sometimes twice in a row.
* Small eye movements while idle - the eyes wander around instead of staring.
* Every expression change *glides* into place and slightly overshoots.
* Pressing a button never "snaps" the face; it eases.

If the frame rate is under about 8 fps in the simulator, that is the simulator
being slow (it emulates the SPI bus pixel by pixel), not your code. Real
hardware will run this considerably faster. You can check the numbers in the
Serial Monitor.

---

## Troubleshooting

**The screen stays black.**
Check that the `diagram.json` was pasted correctly - the display must be wired
to GPIO 9, 10, 11, 12, 14 exactly as in Step 2. Then check the Serial Monitor for
the banner; if you see the banner but no eyes, the display wiring is the problem.

**`Adafruit_ILI9341.h: No such file or directory`.**
The libraries were not added. Redo Step 3 and make sure both libraries are
listed in `libraries.txt`.

**`eye_engine.h: No such file or directory`.**
The file must be named exactly `eye_engine.h` (lower case, `.h`) and live in the
same project as `sketch.ino`. Recheck Step 4.2.

**It compiles but the buttons do nothing.**
Click the button in the *simulator*, not the code. The button part must be
connected to GPIO4 / GPIO5. Also hold it for at least ~30 ms - a click in the
simulator is very short.

**The eyes are white blobs without pupils.**
That is what `happy` looks like on purpose (squeezed-shut smiling eyes), and
also what a blink looks like. Press Button A to get back to `neutral`.

---

## Saving and sharing

* Signed in: your project is saved automatically and has a URL you can share.
* The Wokwi free tier is enough for this project.
* Keep the four files in this repository as the source of truth: when you change
  something in Wokwi that you like, copy it back here.

---

## Next: make it yours

Once it runs, the fun part is tuning. Everything about the personality lives in
two places in `eye_engine.h`:

* `EXPR_STYLES[]` - the six expressions, as a table of numbers.
* the timing constants in `Face::startBlink()` / `scheduleNextBlink()` -
  how often it blinks.

`docs/02-how-the-eyes-work.md` explains exactly what each number does, with a
cheat sheet you can experiment with.
