/*
  eye_engine.h - the "brains" behind the keychain's animated face.

  This file contains ZERO hardware code on purpose. It only asks the screen for
  three primitive drawing calls:
      fillRect(x, y, w, h, color)
      drawFastVLine(x, y, h, color)
      fillTriangle(x0,y0, x1,y1, x2,y2, color)   (only used by the demos)
  Every colour display library (Adafruit_GFX, TFT_eSPI, ...) has these, so the
  same animation code runs on the ESP32 in Wokwi, on the real keychain later,
  and on a laptop for quick previews (see tools/preview).

  HOW THE ANIMATION WORKS (read this - it is the whole trick):

    1. An expression is just a small bundle of numbers (EyeStyle): how wide the
       eye is, how much the upper/lower lid covers, where the pupil looks, etc.
    2. Every frame the current numbers glide towards the target numbers using a
       *spring*. Springs overshoot a little, which is what makes motion feel
       alive instead of robotic.
    3. Blinking is a tiny scripted state machine that squashes the eye height.
    4. Drawing: for every pixel column we work out how tall the eye is at that
       column, then clamp that span with the upper and lower eyelid curves.
       Clamping (instead of painting black shapes on top) means zero overdraw,
       smooth curved lids, and no flicker.

  Everything is float maths on integers, no framebuffer: a 320x240x16-bit frame
  would need 150 KB of RAM, which the ESP32-S3 does not have to spare here.
*/

#ifndef EYE_ENGINE_H
#define EYE_ENGINE_H

#include <math.h>
#include <stdint.h>

namespace eye {

/* ------------------------------------------------------------------ *
 *  Palette (16-bit RGB565, the format every small TFT uses)
 * ------------------------------------------------------------------ */
static const uint16_t COL_BG    = 0x0000;  // black background
static const uint16_t COL_EYE   = 0xFFDE;  // warm white sclera
static const uint16_t COL_PUPIL = 0x18E3;  // dark blue-grey pupil
static const uint16_t COL_SHINE = 0xFFFF;  // pure white catch-light

/* ------------------------------------------------------------------ *
 *  Tiny maths helpers
 * ------------------------------------------------------------------ */
inline float clampf(float v, float lo, float hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

// Ease in and out: slow, fast, slow. Feels much better than linear.
inline float easeInOut(float t) {
  t = clampf(t, 0.0f, 1.0f);
  return t < 0.5f ? 2.0f * t * t : 1.0f - 2.0f * (1.0f - t) * (1.0f - t);
}

/* ------------------------------------------------------------------ *
 *  Xorshift random numbers.
 *  We bring our own so the animation behaves identically on the ESP32,
 *  in the browser preview and on a laptop. Seed it from millis().
 * ------------------------------------------------------------------ */
class Rng {
 public:
  void seed(uint32_t s) { state_ = s ? s : 0x9E3779B9u; }
  uint32_t next() {
    state_ ^= state_ << 13;
    state_ ^= state_ >> 17;
    state_ ^= state_ << 5;
    return state_;
  }
  float unit() { return (next() >> 8) * (1.0f / 16777216.0f); }  // 0..1
  float range(float lo, float hi) { return lo + (hi - lo) * unit(); }
  bool chance(float p) { return unit() < p; }

 private:
  uint32_t state_ = 0x9E3779B9u;
};

/* ------------------------------------------------------------------ *
 *  Spring: the thing that makes movement feel organic.
 *
 *  Picture a small weight tied to the target value with a rubber band.
 *  k (stiffness) is the strength of the band, d (damping) is friction.
 *  When d < 2*sqrt(k) the weight overshoots slightly, and that tiny
 *  overshoot is exactly what reads as "alive" instead of "animated".
 * ------------------------------------------------------------------ */
struct Spring {
  float value = 0;
  float velocity = 0;
  float target = 0;
  float k = 150.0f;
  float d = 18.0f;

  Spring() {}
  Spring(float v, float vel, float tgt, float stiffness, float damping)
      : value(v), velocity(vel), target(tgt), k(stiffness), d(damping) {}

  void step(float dt) {
    float accel = k * (target - value) - d * velocity;
    velocity += accel * dt;
    value += velocity * dt;
  }
  void snap(float v) {
    value = v;
    velocity = 0;
    target = v;
  }
  void kick(float v) { velocity += v; }
};

/* ------------------------------------------------------------------ *
 *  Expressions
 * ------------------------------------------------------------------ */
enum Expression {
  EXPR_NEUTRAL = 0,
  EXPR_HAPPY,
  EXPR_SAD,
  EXPR_ANGRY,
  EXPR_SURPRISED,
  EXPR_SLEEPY,
  EXPR_COUNT
};

/*
  The shape of one eye, described by numbers.

    w, h        width / height multiplier of the whole eye
    topLid      how far the upper lid has come down in the middle (0 = open)
    topEdge     how far it comes down at the outer corners. A bigger edge value
                than middle value gives the natural almond shape.
    topSlant    tilts the lid. Positive = the inner corner is covered more,
                which is what turns "neutral" into "angry".
    botLid      how far the lower lid has come up in the middle
    botEdge     ... and at the corners. A big edge value with a small middle
                value is what makes the happy upward crescent.
    botSlant    tilts the lower lid
    pupil       pupil size, 0 = no pupil (the happy crescent is a solid shape)
    yOff        shift the whole eye up/down in pixels
    gazeX/gazeY where the pupil rests for this mood (-1..1)

  Lid values are "how much of the eye height is covered", 0..1.
*/
struct EyeStyle {
  float w, h;
  float topLid, topEdge, topSlant;
  float botLid, botEdge, botSlant;
  float pupil, yOff, gazeX, gazeY;
};

static const EyeStyle EXPR_STYLES[EXPR_COUNT] = {
  //          w      h     topLid topEdge topSlant  botLid botEdge botSlant  pupil  yOff  gazeX  gazeY
  /* NEUTRAL */ { 1.00f, 1.00f, 0.02f, 0.30f,  0.00f,  0.00f, 0.18f,  0.00f,  1.00f,  0.0f,  0.00f,  0.00f },
  /* HAPPY   */ { 1.10f, 1.00f, 0.00f, 0.04f,  0.00f,  0.44f, 0.56f,  0.00f,  0.00f, -3.0f,  0.00f, -0.20f },
  /* SAD     */ { 0.96f, 0.96f, 0.16f, 0.40f, -0.14f,  0.00f, 0.12f,  0.00f,  1.00f,  3.0f,  0.10f,  0.55f },
  /* ANGRY   */ { 1.00f, 0.94f, 0.10f, 0.22f,  0.52f,  0.00f, 0.10f,  0.00f,  0.90f, -1.0f,  0.00f,  0.10f },
  /* SURPRISED*/{ 1.10f, 1.14f, 0.00f, 0.06f,  0.00f,  0.00f, 0.06f,  0.00f,  0.50f, -4.0f,  0.00f, -0.05f },
  /* SLEEPY  */ { 1.00f, 0.96f, 0.34f, 0.52f,  0.06f,  0.06f, 0.22f,  0.00f,  0.90f,  4.0f,  0.00f,  0.40f },
};

inline const char* expressionName(Expression e) {
  switch (e) {
    case EXPR_NEUTRAL:   return "neutral";
    case EXPR_HAPPY:     return "happy";
    case EXPR_SAD:       return "sad";
    case EXPR_ANGRY:     return "angry";
    case EXPR_SURPRISED: return "surprised";
    case EXPR_SLEEPY:    return "sleepy";
    default:             return "?";
  }
}

/* ------------------------------------------------------------------ *
 *  One spring per number in EyeStyle, so every expression change
 *  glides into place instead of snapping.
 * ------------------------------------------------------------------ */
struct StyleSprings {
  Spring w, h, topLid, topEdge, topSlant, botLid, botEdge, botSlant, pupil, yOff,
      gazeX, gazeY;

  void setTarget(const EyeStyle& s) {
    w.target = s.w;
    h.target = s.h;
    topLid.target = s.topLid;
    topEdge.target = s.topEdge;
    topSlant.target = s.topSlant;
    botLid.target = s.botLid;
    botEdge.target = s.botEdge;
    botSlant.target = s.botSlant;
    pupil.target = s.pupil;
    yOff.target = s.yOff;
    gazeX.target = s.gazeX;
    gazeY.target = s.gazeY;
  }

  void snapTo(const EyeStyle& s) {
    w.snap(s.w);
    h.snap(s.h);
    topLid.snap(s.topLid);
    topEdge.snap(s.topEdge);
    topSlant.snap(s.topSlant);
    botLid.snap(s.botLid);
    botEdge.snap(s.botEdge);
    botSlant.snap(s.botSlant);
    pupil.snap(s.pupil);
    yOff.snap(s.yOff);
    gazeX.snap(s.gazeX);
    gazeY.snap(s.gazeY);
  }

  void step(float dt) {
    w.step(dt);
    h.step(dt);
    topLid.step(dt);
    topEdge.step(dt);
    topSlant.step(dt);
    botLid.step(dt);
    botEdge.step(dt);
    botSlant.step(dt);
    pupil.step(dt);
    yOff.step(dt);
    gazeX.step(dt);
    gazeY.step(dt);
  }
};

/* ------------------------------------------------------------------ *
 *  Eyelids, described relative to one eye.
 *
 *  For any column x we can answer "where does the upper lid sit?" and
 *  "where does the lower lid sit?". Everything the eye draws is clamped
 *  to that band, which is what makes lids look like they wrap the eye.
 * ------------------------------------------------------------------ */
struct LidMask {
  float cx = 0, cy = 0, rx = 1, ry = 1;
  float topLid = 0, topEdge = 0, topSlant = 0;
  float botLid = 0, botEdge = 0, botSlant = 0;

  float topAt(float x) const {
    float u = clampf((x - cx) / rx, -1.0f, 1.0f);
    float cover = topLid + (topEdge - topLid) * u * u + topSlant * u;
    return cy - ry + 2.0f * ry * cover;
  }
  float botAt(float x) const {
    float u = clampf((x - cx) / rx, -1.0f, 1.0f);
    float cover = botLid + (botEdge - botLid) * u * u + botSlant * u;
    return cy + ry - 2.0f * ry * cover;
  }
};

/* ------------------------------------------------------------------ *
 *  Drawing primitives (templates, so any display object works)
 * ------------------------------------------------------------------ */

// Solid ellipse, one vertical line at a time.
template <typename Canvas>
void fillEllipse(Canvas& c, float cx, float cy, float rx, float ry, uint16_t color) {
  if (rx < 0.5f || ry < 0.5f) return;
  int x0 = (int)ceilf(cx - rx);
  int x1 = (int)floorf(cx + rx);
  for (int x = x0; x <= x1; ++x) {
    float u = (x - cx) / rx;
    float t = 1.0f - u * u;
    if (t <= 0.0f) continue;
    float dy = ry * sqrtf(t);
    int ya = (int)ceilf(cy - dy);
    int yb = (int)floorf(cy + dy);
    if (yb >= ya) c.drawFastVLine(x, ya, yb - ya + 1, color);
  }
}

// Same ellipse, but clipped to the eyelids. Used for every part of the eye so
// the pupil can never poke out through a lid.
template <typename Canvas>
void fillEllipseClipped(Canvas& c, float cx, float cy, float rx, float ry,
                        const LidMask& lid, uint16_t color) {
  if (rx < 0.5f || ry < 0.5f) return;
  int x0 = (int)ceilf(cx - rx);
  int x1 = (int)floorf(cx + rx);
  for (int x = x0; x <= x1; ++x) {
    float u = (x - cx) / rx;
    float t = 1.0f - u * u;
    if (t <= 0.0f) continue;
    float dy = ry * sqrtf(t);
    float top = cy - dy;
    float bot = cy + dy;
    float lt = lid.topAt((float)x);
    float lb = lid.botAt((float)x);
    if (lt > top) top = lt;
    if (lb < bot) bot = lb;
    int ya = (int)ceilf(top);
    int yb = (int)floorf(bot);
    if (yb >= ya) c.drawFastVLine(x, ya, yb - ya + 1, color);
  }
}

/* ------------------------------------------------------------------ *
 *  Face - the whole character.
 * ------------------------------------------------------------------ */
class Face {
 public:
  // Call once. w/h are the screen size in pixels (320x240 in our project).
  void begin(int screenW, int screenH, uint32_t seed) {
    rng_.seed(seed);

    // Layout is relative to the screen, so the same code works on a 320x240
    // TFT today and on a 240x240 square panel later.
    rx_ = screenW * 0.118f;
    ry_ = rx_ * 1.28f;
    cy_ = screenH * 0.52f;
    float halfGap = rx_ * 1.30f;
    cxL_ = screenW * 0.5f - halfGap - rx_ * 0.5f;
    cxR_ = screenW * 0.5f + halfGap + rx_ * 0.5f;

    // Reset everything, so begin() can be called again (the preview tool
    // rebuilds the face for every still frame).
    sp_.setTarget(EXPR_STYLES[EXPR_NEUTRAL]);
    sp_.snapTo(EXPR_STYLES[EXPR_NEUTRAL]);
    mood_ = EXPR_NEUTRAL;
    moodTimer_ = -1.0f;
    reaction_ = REACT_NONE;
    reactionT_ = 0.0f;
    blinkPhase_ = BLINK_IDLE;
    blinkT_ = 0.0f;
    blinkNext_ = rng_.range(1.5f, 3.5f);
    blinksQueued_ = 0;
    openness_ = 1.0f;
    sleepingTarget_ = false;
    sleepAmount_ = 0.0f;
    saccadeX_.snap(0.0f);
    saccadeY_.snap(0.0f);
    gazeNext_ = rng_.range(0.8f, 2.0f);
    bounce_.snap(0.0f);
    breathing_ = 0.0f;
    drawOpen_ = 1.0f;
    drawBounce_ = 0.0f;
    hasDrawn_ = false;
  }

  /* ---------------- user interaction ---------------- */

  // Cycle to the next expression and hold it for a few seconds.
  void nextExpression() {
    if (sleepAmount_ > 0.5f) {
      wake();
      return;
    }
    int next = ((int)mood_ + 1) % EXPR_COUNT;
    if (next == EXPR_SLEEPY) next = EXPR_NEUTRAL;  // sleep is its own mode
    setMood((Expression)next, 6.0f);
  }

  // Jump straight to a specific expression (used by the demo script).
  void showExpression(Expression e, float holdSeconds = -1.0f) {
    if (sleepAmount_ > 0.5f) return;
    reaction_ = REACT_NONE;
    setMood(e, holdSeconds);
  }

  // A "poke": surprised, then delighted, with a little bounce.
  void poke() {
    if (sleepAmount_ > 0.5f) {
      wake();
      return;
    }
    reaction_ = REACT_SURPRISE;
    reactionT_ = 0.0f;
    bounce_.kick(26.0f);
    blinksQueued_ = 0;
  }

  void toggleSleep() {
    if (sleepAmount_ > 0.5f) {
      wake();
    } else {
      sleepingTarget_ = true;
      moodTimer_ = -1.0f;
      reaction_ = REACT_NONE;
    }
  }

  bool isAsleep() const { return sleepingTarget_; }
  Expression expression() const { return mood_; }

  /* ---------------- animation ---------------- */

  void update(float dt) {
    if (dt > 0.1f) dt = 0.1f;  // ignore absurd frame gaps
    if (dt <= 0.0f) return;

    updateSleep(dt);
    updateMood(dt);
    updateBlink(dt);
    updateGaze(dt);

    // Breathing: a very slow sine wave on the eye height. Too subtle to notice
    // consciously, but a still face suddenly looks dead without it.
    breathing_ += dt;
    float breath = sinf(breathing_ * 1.6f) * 0.012f;

    EyeStyle target;
    if (reaction_ == REACT_SURPRISE) {
      target = EXPR_STYLES[EXPR_SURPRISED];
    } else if (reaction_ == REACT_DELIGHT) {
      target = EXPR_STYLES[EXPR_HAPPY];
    } else {
      target = EXPR_STYLES[mood_];
    }
    target.h += breath;

    sp_.setTarget(target);
    sp_.step(dt);
    bounce_.step(dt);
    saccadeX_.step(dt);
    saccadeY_.step(dt);

    // Blinking squashes the eye; being asleep keeps it squashed.
    float o = openness_ * (1.0f - sleepAmount_);
    drawOpen_ = 0.06f + 0.94f * o;  // never exactly 0: a thin line reads
                                    // as a closed eye
    drawBounce_ = bounce_.value;
  }

  /* ---------------- rendering ---------------- */

  template <typename Canvas>
  void draw(Canvas& c) {
    drawEye(c, cxL_, +1, 0);  // mirror +1 = left eye (inner corner on right)
    drawEye(c, cxR_, -1, 1);  // mirror -1 = right eye (inner corner on left)
    hasDrawn_ = true;
  }

  // The area the face can ever touch, useful for clearing the screen once.
  int boundsTop() const { return (int)(cy_ - ry_ - 14); }
  int boundsBottom() const { return (int)(cy_ + ry_ + 14); }
  int boundsLeft() const { return (int)(cxL_ - rx_ - 14); }
  int boundsRight() const { return (int)(cxR_ + rx_ + 14); }

 private:
  enum Reaction { REACT_NONE, REACT_SURPRISE, REACT_DELIGHT };

  struct Rect {
    int x0, y0, x1, y1;
  };

  void setMood(Expression e, float holdSeconds) {
    mood_ = e;
    moodTimer_ = holdSeconds;
  }

  void wake() {
    sleepingTarget_ = false;
    mood_ = EXPR_NEUTRAL;
    moodTimer_ = -1.0f;
    blinkNext_ = rng_.range(0.3f, 0.8f);
  }

  void updateSleep(float dt) {
    float target = sleepingTarget_ ? 1.0f : 0.0f;
    // Plain exponential ease: eyelids should not bounce.
    float k = 1.0f - expf(-dt * (sleepingTarget_ ? 2.5f : 3.5f));
    sleepAmount_ += (target - sleepAmount_) * k;
    if (sleepAmount_ < 0.001f) sleepAmount_ = 0.0f;
    if (sleepAmount_ > 0.999f) sleepAmount_ = 1.0f;
  }

  void updateMood(float dt) {
    // Timed expressions drift back to neutral on their own.
    if (moodTimer_ > 0.0f) {
      moodTimer_ -= dt;
      if (moodTimer_ <= 0.0f) {
        moodTimer_ = -1.0f;
        mood_ = EXPR_NEUTRAL;
      }
    }

    // Reactions (poke) are short scripted sequences.
    if (reaction_ != REACT_NONE) {
      reactionT_ += dt;
      if (reaction_ == REACT_SURPRISE && reactionT_ > 0.32f) {
        reaction_ = REACT_DELIGHT;
        reactionT_ = 0.0f;
      } else if (reaction_ == REACT_DELIGHT && reactionT_ > 1.20f) {
        reaction_ = REACT_NONE;
      }
    }
  }

  void startBlink() {
    blinkPhase_ = BLINK_CLOSING;
    blinkT_ = 0.0f;
    closeDur_ = rng_.range(0.055f, 0.085f);
    openDur_ = rng_.range(0.10f, 0.16f);
  }

  void scheduleNextBlink() {
    if (blinksQueued_ > 0) {  // second blink of a double blink
      blinksQueued_--;
      blinkNext_ = rng_.range(0.08f, 0.16f);
      return;
    }
    if (rng_.chance(0.18f)) blinksQueued_ = 1;
    blinkNext_ = rng_.range(2.2f, 5.5f);
    if (rng_.chance(0.12f)) blinkNext_ += rng_.range(2.0f, 4.0f);  // long stare
  }

  void updateBlink(float dt) {
    if (sleepAmount_ > 0.5f) {  // asleep: no blinking
      openness_ = 1.0f;
      return;
    }
    switch (blinkPhase_) {
      case BLINK_CLOSING:
        blinkT_ += dt;
        openness_ = 1.0f - easeInOut(blinkT_ / closeDur_);
        if (blinkT_ >= closeDur_) {
          openness_ = 0.0f;
          blinkPhase_ = BLINK_OPENING;
          blinkT_ = 0.0f;
        }
        break;
      case BLINK_OPENING:
        blinkT_ += dt;
        openness_ = easeInOut(blinkT_ / openDur_);
        if (blinkT_ >= openDur_) {
          openness_ = 1.0f;
          blinkPhase_ = BLINK_IDLE;
          scheduleNextBlink();
        }
        break;
      default:
        openness_ = 1.0f;
        break;
    }

    if (blinkPhase_ == BLINK_IDLE) {
      blinkNext_ -= dt;
      if (blinkNext_ <= 0.0f) startBlink();
    }
  }

  void updateGaze(float dt) {
    if (sleepAmount_ > 0.5f) {
      saccadeX_.target = 0.0f;
      saccadeY_.target = 0.0f;
      return;
    }
    gazeNext_ -= dt;
    if (gazeNext_ > 0.0f) return;

    // Mostly small glances, now and then a bigger look around. That mix is
    // what real eyes do, and it reads as curiosity.
    if (rng_.chance(0.25f)) {
      saccadeX_.target = rng_.range(-0.55f, 0.55f);
      saccadeY_.target = rng_.range(-0.32f, 0.40f);
      gazeNext_ = rng_.range(1.2f, 3.0f);
    } else {
      saccadeX_.target = rng_.range(-0.28f, 0.28f);
      saccadeY_.target = rng_.range(-0.20f, 0.25f);
      gazeNext_ = rng_.range(0.5f, 2.2f);
    }
  }

  /* Draw one eye.
     mirror is +1 for the left eye and -1 for the right eye: it flips the lid
     slants so both eyes stay symmetric.
     slot is only used to remember where this eye was drawn last frame. */
  template <typename Canvas>
  void drawEye(Canvas& c, float cx, int mirror, int slot) {
    float rx = rx_ * sp_.w.value;
    float ry = ry_ * sp_.h.value * drawOpen_;
    float cy = cy_ + sp_.yOff.value + drawBounce_ + (1.0f - drawOpen_) * 3.0f;
    if (rx < 1.0f || ry < 0.5f) return;

    LidMask lid;
    lid.cx = cx;
    lid.cy = cy;
    lid.rx = rx;
    lid.ry = ry;
    lid.topLid = sp_.topLid.value;
    lid.topEdge = sp_.topEdge.value;
    lid.topSlant = sp_.topSlant.value * mirror;
    lid.botLid = sp_.botLid.value;
    lid.botEdge = sp_.botEdge.value;
    lid.botSlant = sp_.botSlant.value * mirror;

    // Erase where this eye was last frame and where it is now, so movement
    // leaves no trail. Both rectangles are usually identical.
    Rect now;
    now.x0 = (int)floorf(cx - rx) - 2;
    now.x1 = (int)ceilf(cx + rx) + 2;
    now.y0 = (int)floorf(cy - ry) - 2;
    now.y1 = (int)ceilf(cy + ry) + 2;

    if (hasDrawn_) {
      Rect& prev = prevRect_[slot];
      int x0 = now.x0 < prev.x0 ? now.x0 : prev.x0;
      int y0 = now.y0 < prev.y0 ? now.y0 : prev.y0;
      int x1 = now.x1 > prev.x1 ? now.x1 : prev.x1;
      int y1 = now.y1 > prev.y1 ? now.y1 : prev.y1;
      c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, COL_BG);
    } else {
      c.fillRect(now.x0, now.y0, now.x1 - now.x0 + 1, now.y1 - now.y0 + 1, COL_BG);
    }
    prevRect_[slot] = now;

    // 1) the white of the eye
    fillEllipseClipped(c, cx, cy, rx, ry, lid, COL_EYE);

    // 2) pupil + catch-light
    //    gaze = this mood's resting look (spring) + a random glance (saccade).
    //    Both eyes always look the same way, so no mirroring here.
    //    The pupil fades out as the lid closes, otherwise a dark dot would
    //    still be visible inside a "closed" eye.
    float pupilFade = clampf((drawOpen_ - 0.14f) / 0.30f, 0.0f, 1.0f);
    float pupilScale = sp_.pupil.value * pupilFade;
    if (pupilScale > 0.03f) {
      float prx = rx * 0.38f * pupilScale;
      float pry = ry * 0.38f * pupilScale;
      float gx = clampf(sp_.gazeX.value + saccadeX_.value, -1.0f, 1.0f);
      float gy = clampf(sp_.gazeY.value + saccadeY_.value, -1.0f, 1.0f);
      float px = cx + gx * (rx - prx);
      float py = cy + gy * (ry - pry);
      fillEllipseClipped(c, px, py, prx, pry, lid, COL_PUPIL);

      // That one bright dot is what makes eyes look alive.
      float hr = prx * 0.30f;
      if (hr > 0.9f) {
        fillEllipseClipped(c, px - prx * 0.32f, py - pry * 0.36f, hr, hr * 0.94f, lid,
                           COL_SHINE);
      }
    }
  }

  /* ---------------- state ---------------- */
  Rng rng_;

  // eye layout
  float rx_ = 38, ry_ = 48, cy_ = 124, cxL_ = 104, cxR_ = 216;

  StyleSprings sp_;
  Spring bounce_{0.0f, 0.0f, 0.0f, 260.0f, 17.0f};

  Expression mood_ = EXPR_NEUTRAL;
  float moodTimer_ = -1.0f;

  Reaction reaction_ = REACT_NONE;
  float reactionT_ = 0.0f;

  // blinking
  enum BlinkPhase { BLINK_IDLE, BLINK_CLOSING, BLINK_OPENING };
  BlinkPhase blinkPhase_ = BLINK_IDLE;
  float blinkT_ = 0.0f;
  float blinkNext_ = 3.0f;
  float closeDur_ = 0.07f;
  float openDur_ = 0.13f;
  int blinksQueued_ = 0;
  float openness_ = 1.0f;

  // sleep
  bool sleepingTarget_ = false;
  float sleepAmount_ = 0.0f;

  // gaze: the mood's resting look (sp_.gazeX/Y) plus a quick random glance.
  // Saccades are stiff and well damped because real eyes snap, not glide.
  Spring saccadeX_{0.0f, 0.0f, 0.0f, 420.0f, 34.0f};
  Spring saccadeY_{0.0f, 0.0f, 0.0f, 420.0f, 34.0f};
  float gazeNext_ = 1.5f;

  // misc
  float breathing_ = 0.0f;
  float drawOpen_ = 1.0f;
  float drawBounce_ = 0.0f;
  bool hasDrawn_ = false;
  Rect prevRect_[2] = {{0, 0, 0, 0}, {0, 0, 0, 0}};
};

}  // namespace eye

#endif  // EYE_ENGINE_H
