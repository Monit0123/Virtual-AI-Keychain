// Milestone 1 only. Intended physical target: ESP32-S3 + 128x128 RGB OLED.
// This diagram uses classic ESP32 + ILI9341 simulation stand-ins.
// GPIO23 does not exist on ESP32-S3. These are NOT physical S3 pin assignments.
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <math.h>
#include "AppState.h"
#include "Buttons.h"

constexpr uint8_t BUTTON_A = 18, BUTTON_B = 25; // Simulator-only pin map.
void onGesture(keychain::Gesture gesture);
keychain::Buttons buttons(onGesture);
constexpr uint32_t FRAME_MS = 33;
Adafruit_ILI9341 screen(5, 27, 26);
GFXcanvas16 face(128, 128); // RGB565: 32 KiB; no PSRAM assumption.

// Facial animation owns only its pose/timing, never the application state.
struct IdleFace {
  uint32_t lastFrame = 0, blinkAt = 0, blinkStart = 0, lookAt = 0, blinkWait = 2800;
  bool blinking = false;
  float x = 0, y = 0;
  int targetX = 0, targetY = 0;
  void begin(uint32_t now) {
    lastFrame = blinkAt = lookAt = now;
    blinking = false;
    blinkWait = 2800;
    x = y = 0;
    targetX = targetY = 0;
  }
  void stop() { blinking = false; }
  void update(uint32_t now) {
    if (now - lastFrame < FRAME_MS) return;
    const uint32_t elapsed = now - lastFrame;
    lastFrame = now;
    if (!blinking && now - blinkAt >= blinkWait) {
      blinking = true;
      blinkStart = now;
    }
    float openness = 1;
    if (blinking) {
      const uint32_t t = now - blinkStart;
      if (t >= 240) { blinking = false; blinkAt = now; blinkWait = random(2800, 4401); }
      else {
        float u = t < 85 ? t / 85.0f : (t - 85) / 155.0f;
        u = u * u * (3 - 2 * u);
        openness = t < 85 ? 1 - u : u;
      }
    }
    if (now - lookAt >= 2400) {
      lookAt = now;
      targetX = random(-4, 5);
      targetY = random(-2, 3);
    }
    const float follow = 1 - expf(-min(elapsed, uint32_t(100)) / 200.0f);
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;
    face.fillScreen(0);
    const int h = max(2, int(26 * openness));
    const uint16_t color = 0xB7BC;
    for (int i = 0; i < 2; ++i) {
      const int cx = i == 0 ? 39 : 89;
      face.fillRoundRect(cx - 13 + lroundf(x), 48 - h / 2 + lroundf(y),
                         27, h, min(8, h / 2), color);
    }
    face.fillRoundRect(55, 89, 18, 3, 1, color);
    // A/B pressed indicators and hold progress, separate from face animation.
    for(int i=0;i<2;++i){
      face.drawCircle(8+i*112,8,4,color);
      if(buttons.pressed(i))face.fillCircle(8+i*112,8,3,color);
      face.fillRect(3+i*105,16,min(uint32_t(17),buttons.heldMs(i,now)*17/700),2,color);
    }
    screen.drawRGBBitmap(56, 96, face.getBuffer(), 128, 128);
  }
} idleFace;

struct ApplicationHooks : keychain::Hooks {
  void exitIdle() override { idleFace.stop(); }
  void cleanup() override {
    // No audio, microphone or AI resources exist in milestone 1.
    // Future adapters will stop/cancel their owned operations here/on exit.
  }
  void enterIdle(uint32_t now) override {
    face.fillScreen(0);
    screen.drawRGBBitmap(56, 96, face.getBuffer(), 128, 128);
    idleFace.begin(now);
  }
  void debug(const keychain::DebugRecord& r) override {
    Serial.printf("[state] ms=%lu from=IDLE to=IDLE event=%u result=%u generation=%llu\n",
      (unsigned long)r.at, unsigned(r.event), unsigned(r.result),
      (unsigned long long)r.generation);
  }
} hooks;
keychain::StateManager app(hooks);

// M1 recognises gestures but does not enable later application states.
void onGesture(keychain::Gesture gesture) {
  const uint32_t now=millis();
  Serial.printf("[buttons] gesture=%u (0=A tap,1=A hold,2=B tap,3=B hold,4=both)\n",unsigned(gesture));
  switch(gesture){
    case keychain::Gesture::A_SHORT: app.dispatch(keychain::Event::EXPRESSION_REQUESTED,now);break;
    case keychain::Gesture::B_SHORT: app.dispatch(random(2)?keychain::Event::EXPRESSION_REQUESTED:keychain::Event::VOICE_MESSAGE_SELECTED,now);break;
    case keychain::Gesture::B_LONG: app.dispatch(keychain::Event::PHOTO_SELECTED,now);break;
    default: app.dispatch(keychain::Event::HOME_REQUESTED,now);break;
  }
}
void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_A, INPUT_PULLUP);
  pinMode(BUTTON_B, INPUT_PULLUP);
  SPI.begin(14, 19, 23, 5);
  screen.begin();
  screen.fillScreen(0);
  randomSeed(esp_random());
  app.begin(millis());
  Serial.println("M1 IDLE: A/B hold=700ms, both=home. Short/special requests remain unavailable; h=home, c=cancel, e=expression request (not implemented).");
  Serial.println("Results: 0 accepted, 1 not started, 2 already started, 3 not implemented, 4 invalid, 5 unsupported, 6 reentrant.");
}
void loop() {
  const uint32_t now = millis();
  buttons.update(digitalRead(BUTTON_A)==LOW,digitalRead(BUTTON_B)==LOW,now);
  // At most one serial byte per pass: input cannot monopolise the loop.
  if (Serial.available()) {
    switch (Serial.read()) {
      case 'h': app.dispatch(keychain::Event::HOME_REQUESTED, now); break;
      case 'c': app.dispatch(keychain::Event::CANCEL_REQUESTED, now); break;
      case 'e': app.dispatch(keychain::Event::EXPRESSION_REQUESTED, now); break;
    }
  }
  if (app.started() && app.current() == keychain::State::IDLE) idleFace.update(now);
}
