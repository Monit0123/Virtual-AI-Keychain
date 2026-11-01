// Intended physical MCU: ESP32-S3. This sketch currently uses classic-ESP32
// simulator pins, NOT an S3 pin map. GPIO23 does not exist on S3; GPIO26/27
// may be reserved. Verify the exact S3 board schematic before hardware use.
// Standalone Phase 1 demo, written independently of the reference sketches.
#include <SPI.h>
#include <Adafruit_GFX.h>
// Leave at 0 in Wokwi. Set to 1 only for a verified SSD1351 hardware module.
#define USE_SSD1351_OLED 0
#if USE_SSD1351_OLED
#include <Adafruit_SSD1351.h>
#else
#include <Adafruit_ILI9341.h>
#endif
#include <math.h>

constexpr uint8_t BUTTON_PIN = 18;
// SPI: SCK=18 would clash with the button; use GPIO14 for SCK instead.
constexpr uint8_t TFT_CS = 5, TFT_DC = 27, TFT_RST = 26;
constexpr uint16_t BLACK = 0x0000;
uint16_t faceColor = 0x07FF;
constexpr uint32_t FRAME_MS = 33;
constexpr uint16_t FACE_WIDTH = 128, FACE_HEIGHT = 128;
#if USE_SSD1351_OLED
Adafruit_SSD1351 screen(FACE_WIDTH, FACE_HEIGHT, &SPI, TFT_CS, TFT_DC, TFT_RST);
#else
Adafruit_ILI9341 screen(TFT_CS, TFT_DC, TFT_RST);
#endif
// Render a square 128x128 RGB565 face, suitable for a typical 1.5-inch OLED.
// Wokwi uses a TFT stand-in; the optional hardware backend uses SSD1351.
GFXcanvas16 display(FACE_WIDTH, FACE_HEIGHT);

enum Expression { NEUTRAL, HAPPY, SAD, SLEEPY, SURPRISED, ANGRY, EXPRESSION_COUNT };
const char* const names[] = {"neutral", "happy", "sad", "sleepy", "surprised", "angry"};
Expression expression = NEUTRAL;
uint32_t lastFrame = 0, lastExpression = 0, lastLook = 0;
uint32_t nextBlink = 2000, blinkStart = 0;
bool blinking = false;
float gazeX = 0, gazeY = 0;
int targetX = 0, targetY = 0;
bool rawButton = HIGH, stableButton = HIGH;
uint32_t buttonChanged = 0;

void advanceExpression(uint32_t now) {
  expression = static_cast<Expression>((expression + 1) % EXPRESSION_COUNT);
  lastExpression = now;
  Serial.print("Expression: ");
  Serial.println(names[expression]);
}

void updateButton(uint32_t now) {
  const bool reading = digitalRead(BUTTON_PIN);
  if (reading != rawButton) {
    rawButton = reading;
    buttonChanged = now;
  }
  if (now - buttonChanged >= 30 && stableButton != rawButton) {
    stableButton = rawButton;
    if (stableButton == LOW) advanceExpression(now);
  }
}

void drawEye(int cx, int cy, bool left, float openness) {
  int width = 32, height = 28;
  if (expression == SLEEPY) height = 12;
  if (expression == SURPRISED) { width = 27; height = 36; }
  height = max(2, static_cast<int>(height * openness));
  int x = cx - width / 2, y = cy - height / 2;
  if (expression == HAPPY && openness > 0.5f) {
    // A black inset creates a cheerful upward arch.
    display.fillRoundRect(x, y, width, height, 10, faceColor);
    display.fillRoundRect(x - 1, y + 9, width + 2, height, 10, BLACK);
    return;
  }
  display.fillRoundRect(x, y, width, height, min(7, height / 2), faceColor);
  if (openness < 0.5f) return;
  if (expression == ANGRY) {
    // Inner corners lowered for an angry slant.
    if (left) display.fillTriangle(x, y, x + width, y, x + width, y + 12, BLACK);
    else display.fillTriangle(x, y, x + width, y, x, y + 12, BLACK);
  } else if (expression == SAD) {
    if (left) display.fillTriangle(x, y, x + width, y, x, y + 11, BLACK);
    else display.fillTriangle(x, y, x + width, y, x + width, y + 11, BLACK);
  }
}

// Quadratic smile/frown curve, with a three-pixel stroke.
void mouthCurve(bool smile) {
  for (int x = 46; x <= 82; ++x) {
    float u = (x - 64) / 18.0f;
    int y = smile ? lroundf(96 - 10 * u * u) : lroundf(86 + 10 * u * u);
    display.fillCircle(x, y, 1, faceColor);
  }
}

void drawMouth() {
  switch (expression) {
    case HAPPY: mouthCurve(true); break;
    case SAD: mouthCurve(false); break;
    case SURPRISED:
      display.fillCircle(64, 91, 9, faceColor);
      display.fillCircle(64, 91, 5, BLACK);
      break;
    case SLEEPY:
      display.fillRoundRect(58, 89, 12, 7, 3, faceColor);
      break;
    case ANGRY:
      display.drawLine(48, 94, 64, 88, faceColor);
      display.drawLine(64, 88, 80, 94, faceColor);
      display.drawLine(48, 95, 64, 89, faceColor);
      display.drawLine(64, 89, 80, 95, faceColor);
      break;
    default: display.fillRoundRect(49, 90, 30, 3, 1, faceColor); break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  SPI.begin(14, 19, 23, TFT_CS);
  screen.begin();
  screen.fillScreen(BLACK);
  randomSeed(esp_random());
  Serial.println("Face ready! Button: next expression. Auto-change: every 6 seconds.");
}

void loop() {
  // Cooperative, non-blocking scheduling: never wait for an animation to finish.
  // Service inputs on every pass, even when the next frame is not due yet.
  // Unsigned elapsed-time subtraction remains safe across millis() rollover.
  const uint32_t now = millis();
  updateButton(now);
  if (now - lastExpression >= 6000) advanceExpression(now);
  if (now - lastLook >= 1800) {
    lastLook = now;
    targetX = random(-7, 8);
    targetY = random(-3, 4);
  }
  if (!blinking && now - blinkStart >= nextBlink) {
    blinking = true;
    blinkStart = now;
  }
  float openness = 1.0f;
  if (blinking) {
    uint32_t elapsed = now - blinkStart;
    if (elapsed >= 180) {
      blinking = false;
      blinkStart = now;
      nextBlink = random(2200, 5000);
    } else {
      openness = fabsf(static_cast<float>(elapsed) - 90.0f) / 90.0f;
    }
  }
  if (now - lastFrame < FRAME_MS) return;
  lastFrame = now;
  gazeX += (targetX - gazeX) * 0.15f;
  gazeY += (targetY - gazeY) * 0.15f;
  const uint16_t colors[] = {0x07FF, 0xFFE0, 0x051F, 0xA81F, 0xFFFF, 0xF800};
  faceColor = colors[expression];
  display.fillScreen(BLACK);
  drawEye(39 + lroundf(gazeX), 46 + lroundf(gazeY), true, openness);
  drawEye(89 + lroundf(gazeX), 46 + lroundf(gazeY), false, openness);
  drawMouth();
  // The OLED fills its 128x128 panel; Wokwi centres it on a larger TFT.
  screen.drawRGBBitmap((screen.width() - FACE_WIDTH) / 2,
                       (screen.height() - FACE_HEIGHT) / 2,
                       display.getBuffer(), FACE_WIDTH, FACE_HEIGHT);
}
