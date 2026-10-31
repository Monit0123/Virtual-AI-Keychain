// Renders the keychain face on a PC so the animation can be checked and tuned
// without any hardware. Writes PPM frames; tools/preview/make_gif.py turns them
// into the GIF / PNGs used in the docs.
//
//   make && ./preview frames ../../docs/_frames
//   make && ./preview sheet  ../../docs/_sheet
//
// It compiles the exact same eye_engine.h that runs on the ESP32.

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <sys/stat.h>

#include "canvas.h"
#include "../../firmware/keychain-eyes/eye_engine.h"

static const int W = 320;
static const int H = 240;

static void writePPM(const Canvas& c, const std::string& path) {
  FILE* f = fopen(path.c_str(), "wb");
  if (!f) {
    fprintf(stderr, "cannot write %s\n", path.c_str());
    exit(1);
  }
  fprintf(f, "P6\n%d %d\n255\n", c.w, c.h);
  for (int i = 0; i < c.w * c.h; ++i) {
    uint16_t v = c.px[i];
    unsigned char rgb[3] = {
        (unsigned char)(((v >> 11) & 0x1F) * 255 / 31),
        (unsigned char)(((v >> 5) & 0x3F) * 255 / 63),
        (unsigned char)((v & 0x1F) * 255 / 31)};
    fwrite(rgb, 1, 3, f);
  }
  fclose(f);
}

static void mkdirp(const std::string& p) { mkdir(p.c_str(), 0755); }

int main(int argc, char** argv) {
  std::string mode = argc > 1 ? argv[1] : "frames";
  std::string out = argc > 2 ? argv[2] : ".";

  eye::Face face;
  Canvas canvas(W, H);

  if (mode == "sheet") {
    mkdirp(out);
    for (int e = 0; e < eye::EXPR_COUNT; ++e) {
      face.begin(W, H, 12345);
      face.showExpression((eye::Expression)e, -1.0f);
      // Let the springs settle, then keep the pose.
      for (int i = 0; i < 90; ++i) face.update(1.0f / 60.0f);
      canvas.clear();
      face.draw(canvas);
      char name[256];
      snprintf(name, sizeof name, "%s/%s.ppm", out.c_str(), eye::expressionName((eye::Expression)e));
      writePPM(canvas, name);
    }
    // One mid-blink frame, for the docs.
    face.begin(W, H, 7);
    for (int i = 0; i < 200; ++i) {
      face.update(1.0f / 60.0f);
      if (i > 150) {  // a blink will happen somewhere in here
        canvas.clear();
        face.draw(canvas);
      }
    }
    canvas.clear();
    face.draw(canvas);
    writePPM(canvas, out + "/idle.ppm");
    return 0;
  }

  // ---- animated demo ----
  // A scripted "first date" with the face: idle, each expression, a poke and
  // finally sleep mode. This is only for the preview render.
  mkdirp(out);
  face.begin(W, H, 2024);

  const float fps = 20.0f;
  const float dt = 1.0f / fps;
  const int totalFrames = (int)(14.0f * fps);

  struct Event { float t; int action; };
  // action: 0..5 = expression index, 100 = poke, 101 = sleep, 102 = wake
  const Event events[] = {
      {1.0f, 100},        // poke -> surprised, then happy
      {4.2f, eye::EXPR_SAD},
      {6.0f, eye::EXPR_ANGRY},
      {7.6f, eye::EXPR_SURPRISED},
      {9.2f, eye::EXPR_HAPPY},
      {10.6f, eye::EXPR_NEUTRAL},
      {11.6f, 101},       // fall asleep
      {13.0f, 102},       // wake up
  };
  int nextEvent = 0;

  float t = 0.0f;
  for (int frame = 0; frame < totalFrames; ++frame, t += dt) {
    while (nextEvent < (int)(sizeof(events) / sizeof(events[0])) && t >= events[nextEvent].t) {
      int a = events[nextEvent].action;
      if (a == 100) face.poke();
      else if (a == 101) face.toggleSleep();
      else if (a == 102) face.toggleSleep();
      else face.showExpression((eye::Expression)a, 3.0f);
      nextEvent++;
    }
    face.update(dt);
    canvas.clear();
    face.draw(canvas);
    char name[256];
    snprintf(name, sizeof name, "%s/f%04d.ppm", out.c_str(), frame);
    writePPM(canvas, name);
  }
  printf("wrote %d frames to %s\n", totalFrames, out.c_str());
  return 0;
}
