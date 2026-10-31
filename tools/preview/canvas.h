// A tiny software "screen" that mimics the three Adafruit_GFX calls the eye
// engine uses, so the animation can be rendered on a PC without hardware.
#pragma once

#include <algorithm>
#include <cstdint>
#include <vector>

struct Canvas {
  int w, h;
  std::vector<uint16_t> px;

  Canvas(int width, int height) : w(width), h(height), px((size_t)width * height, 0) {}

  void clear(uint16_t c = 0) { std::fill(px.begin(), px.end(), c); }

  void fillRect(int x, int y, int ww, int hh, uint16_t c) {
    int x0 = std::max(0, x), y0 = std::max(0, y);
    int x1 = std::min(w, x + ww), y1 = std::min(h, y + hh);
    for (int yy = y0; yy < y1; ++yy)
      for (int xx = x0; xx < x1; ++xx) px[(size_t)yy * w + xx] = c;
  }

  void drawFastHLine(int x, int y, int ww, uint16_t c) {
    if (y < 0 || y >= h) return;
    int x0 = std::max(0, x), x1 = std::min(w, x + ww);
    for (int xx = x0; xx < x1; ++xx) px[(size_t)y * w + xx] = c;
  }

  // Same algorithm Adafruit_GFX uses, so the PC preview matches the TFT.
  void drawFastVLine(int x, int y, int hh, uint16_t c) {
    if (x < 0 || x >= w) return;
    int y0 = std::max(0, y), y1 = std::min(h, y + hh);
    for (int yy = y0; yy < y1; ++yy) px[(size_t)yy * w + x] = c;
  }

  void fillTriangle(int x0, int y0, int x1, int y1, int x2, int y2, uint16_t c) {
    if (y0 > y1) { std::swap(y0, y1); std::swap(x0, x1); }
    if (y1 > y2) { std::swap(y2, y1); std::swap(x2, x1); }
    if (y0 > y1) { std::swap(y0, y1); std::swap(x0, x1); }

    if (y0 == y2) {  // all on one line
      int a = x0, b = x1, cc = x2;
      if (a > b) std::swap(a, b);
      if (b > cc) std::swap(b, cc);
      if (a > b) std::swap(a, b);
      drawFastHLine(a, y0, b - a + 1, c);
      return;
    }

    int dx01 = x1 - x0, dy01 = y1 - y0;
    int dx02 = x2 - x0, dy02 = y2 - y0;
    int dx12 = x2 - x1, dy12 = y2 - y1;
    int32_t sa = 0, sb = 0;
    int y, last;

    if (y1 == y2) last = y1;      // include y1 scanline
    else          last = y1 - 1;  // skip it

    for (y = y0; y <= last; y++) {
      int a = x0 + sa / dy01;
      int b = x0 + sb / dy02;
      sa += dx01;
      sb += dx02;
      if (a > b) std::swap(a, b);
      drawFastHLine(a, y, b - a + 1, c);
    }

    sa = (int32_t)dx12 * (y - y1);
    sb = (int32_t)dx02 * (y - y0);
    for (; y <= y2; y++) {
      int a = x1 + sa / dy12;
      int b = x0 + sb / dy02;
      sa += dx12;
      sb += dx02;
      if (a > b) std::swap(a, b);
      drawFastHLine(a, y, b - a + 1, c);
    }
  }
};
