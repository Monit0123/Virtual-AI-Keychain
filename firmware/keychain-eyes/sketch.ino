/*
  Virtual AI Keychain - Phase 1: Animated Face
  ============================================

  Runs on an ESP32-S3 in the Wokwi simulator, and later on the real keychain.

  HARDWARE IN THE SIMULATOR
    ESP32-S3-DevKitC-1
    ILI9341 320x240 colour TFT (SPI)
    Button A on GPIO4   -> next expression (hold 0.7 s: sleep / wake)
    Button B on GPIO5   -> "poke" (surprised, then happy)

  LIBRARIES (add them in Wokwi's Library Manager, or via libraries.txt)
    Adafruit GFX Library
    Adafruit ILI9341

  WHAT TO LOOK FOR
    - Blinking every few seconds, sometimes twice in a row
    - Small random eye movements ("saccades") while idle
    - Press Button A to cycle neutral -> happy -> sad -> angry -> surprised
    - Press Button B for a poke reaction
    - Hold Button A for a second to put the keychain to sleep, and again to
      wake it up

  Open the Serial Monitor at 115200 baud to see what the face is "thinking".
*/

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

#include "eye_engine.h"

/* ------------------------------------------------------------------ *
 *  Wiring - change these numbers if you wire the display differently.
 * ------------------------------------------------------------------ */
#define PIN_TFT_CS   10
#define PIN_TFT_DC    9
#define PIN_TFT_RST  14

#define PIN_BTN_A     4   // next expression / long press = sleep
#define PIN_BTN_B     5   // poke

#define SCREEN_W    320   // landscape after setRotation(1)
#define SCREEN_H    240

#define TARGET_FPS   40   // the ESP32-S3 can do more, the SPI display cannot
#define LONG_PRESS_MS 700

Adafruit_ILI9341 tft(PIN_TFT_CS, PIN_TFT_DC, PIN_TFT_RST);
eye::Face face;

/* ------------------------------------------------------------------ *
 *  A very small, very boring button helper.
 *  Returns: 0 = nothing, 1 = short press, 2 = long press.
 * ------------------------------------------------------------------ */
class Button {
 public:
  explicit Button(uint8_t pin) : pin_(pin) {}

  void begin() {
    pinMode(pin_, INPUT_PULLUP);
    raw_ = stable_ = (digitalRead(pin_) == LOW);
    changedAt_ = pressedAt_ = millis();
  }

  int update() {
    bool pressed = (digitalRead(pin_) == LOW);
    uint32_t now = millis();

    if (pressed != raw_) {          // contact is bouncing or really changed
      raw_ = pressed;
      changedAt_ = now;
    }

    if (now - changedAt_ > 25 && pressed != stable_) {   // settled
      stable_ = pressed;
      if (stable_) {
        pressedAt_ = now;
        longFired_ = false;
      } else if (!longFired_) {
        return 1;                   // released before the long-press time
      }
    }

    if (stable_ && !longFired_ && now - pressedAt_ > LONG_PRESS_MS) {
      longFired_ = true;
      return 2;
    }
    return 0;
  }

 private:
  uint8_t pin_;
  bool raw_ = false;
  bool stable_ = false;
  bool longFired_ = false;
  uint32_t changedAt_ = 0;
  uint32_t pressedAt_ = 0;
};

Button buttonA(PIN_BTN_A);
Button buttonB(PIN_BTN_B);

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
static eye::Expression lastShown = eye::EXPR_COUNT;   // "nothing shown yet"

static void announceIfChanged() {
  eye::Expression now = face.expression();
  bool asleep = face.isAsleep();
  if (now != lastShown) {
    lastShown = now;
    Serial.print("expression: ");
    Serial.println(asleep ? "asleep" : eye::expressionName(now));
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("Virtual AI Keychain - animated face");
  Serial.println("  Button A: next expression  (hold 0.7s = sleep/wake)");
  Serial.println("  Button B: poke");

  buttonA.begin();
  buttonB.begin();

  tft.begin();
  tft.setRotation(1);                 // landscape: 320 x 240
  tft.fillScreen(eye::COL_BG);

  // Seed the random number generator so two keychains never blink in sync.
  uint32_t seed = (uint32_t)micros() ^ ((uint32_t)millis() << 16);
  face.begin(SCREEN_W, SCREEN_H, seed);
}

void loop() {
  static uint32_t lastFrame = 0;
  static uint32_t fpsTimer = 0;
  static uint16_t frames = 0;

  uint32_t now = millis();
  float dt = (now - lastFrame) / 1000.0f;

  // Frame limiter: skip until it is time for the next frame.
  if (dt < 1.0f / TARGET_FPS) return;
  lastFrame = now;

  // ---- buttons ----
  int a = buttonA.update();
  if (a == 1) face.nextExpression();
  else if (a == 2) face.toggleSleep();

  int b = buttonB.update();
  if (b == 1) face.poke();

  // ---- animate ----
  face.update(dt);
  face.draw(tft);
  announceIfChanged();

  // ---- a little telemetry so you can see it is healthy ----
  frames++;
  if (now - fpsTimer >= 3000) {
    Serial.print("fps: ");
    Serial.print(frames * 1000.0f / (now - fpsTimer), 1);
    Serial.print("   expression: ");
    Serial.println(face.isAsleep() ? "asleep" : eye::expressionName(face.expression()));
    fpsTimer = now;
    frames = 0;
  }
}
