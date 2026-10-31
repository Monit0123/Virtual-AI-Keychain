# How the animated face works

This is the "why" behind `firmware/keychain-eyes/eye_engine.h`. You do not need
it to run the project, but it is the file you will edit to change the
personality, so it is worth ten minutes.

---

## The big picture

```
   sketch.ino  ──────────────┐
   (ESP32 hardware:          │   "draw these two eyes"
    display, buttons)        ▼
                        eye_engine.h  ── knows nothing about hardware ──
                             │
                             └──► asks the display for fillRect / drawFastVLine

   tools/preview/main.cpp ──► same eye_engine.h ──► a canvas on your Mac
```

`eye_engine.h` contains no `Arduino.h`, no pin numbers and no display library.
It only needs an object that can do `fillRect` and `drawFastVLine`, which both
the real TFT and the Mac preview provide. That is why the preview can render
exactly the same animation as the device.

There are four moving parts:

1. **The expression table** - a mood is just twelve numbers.
2. **Springs** - how those numbers move from one value to another.
3. **The behaviour layer** - blinking, glancing, reacting, sleeping.
4. **The renderer** - turning the numbers into pixels.

---

## 1. An expression is just numbers

```c
struct EyeStyle {
  float w, h;                                  // eye size
  float topLid, topEdge, topSlant;             // upper eyelid
  float botLid, botEdge, botSlant;             // lower eyelid
  float pupil, yOff, gazeX, gazeY;             // pupil and position
};
```

`topLid` and `botLid` are **how much of the eye height the lid covers**, from `0`
(wide open) to `1` (fully covered). `topEdge`/`botEdge` are the same thing at the
*outer corners* of the eye. That one extra number is what makes an eye look like
an eye instead of an oval:

```
   topLid 0.00, topEdge 0.00        topLid 0.00, topEdge 0.30
   ┌───────────┐                    ╭───────────╮
   │  ( ) ( )  │     vs.           (   ( ) ( )   )     <- corners tucked in
   └───────────┘                    ╰───────────╯
```

A positive `topSlant` pushes the lid down on the **inner** corner (the side
facing the other eye). That single trick turns a neutral face into an angry one.
`botEdge` bigger than `botLid` pulls the lower lid up at the corners, which is
what makes the happy "^ ^" crescent.

### Cheat sheet

| you want... | change |
|---|---|
| bigger eyes | `w`, `h` up |
| angry | `topSlant` up (0.4 - 0.7) |
| sad / worried | `topLid` up a bit, `topSlant` slightly negative, `gazeY` positive (look down) |
| sleepy | `topLid` 0.35 - 0.5, `gazeY` positive |
| surprised | `w`/`h` up, `pupil` down (small pupil) |
| laughing | `botLid` way up (0.4+), `pupil` 0 |

---

## 2. Springs: why it feels alive

Every one of those twelve numbers has a spring attached:

```c
float accel = k * (target - value) - d * velocity;
velocity += accel * dt;
value    += velocity * dt;
```

That is a mass on a rubber band with friction. `k` is how stiff the band is, `d`
is how much friction there is.

* `d >= 2*sqrt(k)` → no overshoot, everything glides politely to a stop.
* `d <  2*sqrt(k)` → it **overshoots a tiny bit and settles back**.

That tiny overshoot is the whole trick. Eyes that glide perfectly look like a
PowerPoint transition; eyes that overshoot look like they belong to something
alive. The defaults (`k = 150`, `d = 18`) are deliberately slightly
under-damped.

Because the maths uses the real elapsed time (`dt`), the animation looks the same
whether the ESP32 is drawing 40 frames per second or 12.

Two spare springs add life on top of the expressions:

* `bounce_` is kicked when the face is poked, which makes the whole eye dip and
  spring back.
* `saccadeX_`/`saccadeY_` are the quick random glances. They are much stiffer
  (`k = 420`) because real eyes *snap* to a new target rather than drift there.

---

## 3. Behaviour: blinking, glancing, moods

**Blinking** is a small state machine, not a spring (springs make blinks mushy):

```
IDLE ──timer runs out──► CLOSING (55-85 ms) ──► OPENING (100-160 ms) ──► IDLE
```

The next blink lands 2.2 - 5.5 s later. There is an 18 % chance of a double
blink, and a 12 % chance of a longer "stare" first. Every one of those numbers is
randomised, which is why it never looks like a loop.

**Glancing**: every 0.5 - 3 s the eyes pick a new direction. 75 % of the time it
is a small glance, 25 % a bigger look around.

**Moods** have a timer: pressing Button A shows an expression and holds it for
6 seconds, then the face drifts back to neutral on its own. A "poke" instead
plays a short script: surprised for 0.32 s, then delighted for 1.2 s.

**Sleep** is separate from moods: the eyelids ease shut and stay there, and
blinking is suspended. It is the state the keychain will be in most of the time
once it runs on a battery.

---

## 4. Rendering: no framebuffer, no flicker

A full 320x240 frame at 16 bits is 150 KB. The ESP32-S3 has 512 KB of RAM and
Wokwi's board does not enable PSRAM by default, so allocating a framebuffer would
be a bad idea. Instead the engine draws straight to the screen:

```
for every pixel column x of the eye:
    how tall is the ellipse at this x?          -> [top, bottom]
    clamp it with the upper lid line at x        -> [max(top, lidTop(x)), ...]
    clamp it with the lower lid line at x
    draw that one vertical line
```

Two things fall out of this design:

* **Lids curve.** `lidTop(x)` is a parabola, so the eyelid wraps around the eye
  instead of slicing it with a straight line.
* **Nothing is overdrawn.** The pupil is drawn with the *same* clipper, so it can
  never poke out through the eyelid - no black patches, no flicker.

The only erasing that happens is the eye's own bounding box (plus the previous
frame's box if the eye moved), cleared once per frame.

**Frame budget** (on real hardware, at 40 MHz SPI): roughly 30 000 pixels per
frame, about 10-15 ms. Wokwi is several times slower because it emulates the SPI
bus, so do not judge the speed from the simulator.

If you ever want more speed: the design already tracks where each eye was drawn,
so the next optimisation would be to only redraw the rows that actually changed.

---

## Things worth trying (each is a 1-line edit)

| experiment | where |
|---|---|
| blink more often | `scheduleNextBlink()`: `rng_.range(2.2f, 5.5f)` |
| bouncier expression changes | `StyleSprings`: lower the damping on a spring |
| bigger eyes | `Face::begin()`: `rx_ = screenW * 0.118f` |
| different colours | `COL_EYE`, `COL_PUPIL`, `COL_SHINE` at the top |
| a new expression | add a row to `EXPR_STYLES[]`, add it to `enum Expression`, add it to `expressionName()` |
| slower sleep | `updateSleep()`: the `2.5f` / `3.5f` rates |

After any change, re-run the Mac preview (see `tools/preview/`) to check the
result at your desk - it is much faster than the simulator.

---

## What is *not* in here yet (on purpose)

* No face "body", no mouth, no eyebrows. Six expressions are plenty to start.
* No WiFi, no audio, no photos - those are later phases, and each one has to be
  built so that the eyes keep working when it fails.
* No framebuffer and no LVGL. Both are worth revisiting for the photo gallery,
  where drawing is a different problem.
