#!/usr/bin/env python3
"""
Turns the PPM frames rendered by ./preview into the images used in the docs.

    cd tools/preview
    make                      # builds ./preview
    ./preview frames ../../docs/_frames
    ./preview sheet  ../../docs/_sheet
    python3 make_gif.py       # writes docs/preview.gif + docs/expressions.png

Needs Pillow:  python3 -m pip install --user pillow
"""

import glob
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is missing. Install it with:  python3 -m pip install --user pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.normpath(os.path.join(HERE, "..", "..", "docs"))

NAMES = ["neutral", "happy", "sad", "angry", "surprised", "sleepy"]


def build_gif():
    frames_dir = os.path.join(DOCS, "_frames")
    files = sorted(glob.glob(os.path.join(frames_dir, "f*.ppm")))
    if not files:
        sys.exit(f"no frames in {frames_dir} - run ./preview frames {frames_dir}")

    frames = [Image.open(f).convert("RGB") for f in files]
    # One shared palette keeps the colours perfectly stable between frames.
    palette = frames[0].quantize(colors=16)
    frames = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]

    out = os.path.join(DOCS, "preview.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=50, loop=0,
                   optimize=True)
    print(f"wrote {out}  ({len(frames)} frames, {os.path.getsize(out) // 1024} KB)")


def build_sheet():
    sheet_dir = os.path.join(DOCS, "_sheet")
    images = []
    for n in NAMES:
        path = os.path.join(sheet_dir, n + ".ppm")
        if not os.path.exists(path):
            sys.exit(f"missing {path} - run ./preview sheet {sheet_dir}")
        images.append(Image.open(path).convert("RGB"))

    w, h = images[0].size
    scale = 2
    tw, th = w * scale // 2, h * scale // 2
    pad = 8
    cols, rows = 2, 3
    sheet = Image.new("RGB", (tw * cols + pad * (cols + 1), th * rows + pad * (rows + 1)),
                      (18, 18, 18))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(zip(NAMES, images)):
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + pad)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x + 8, y + 6), name, fill=(150, 150, 150))
    out = os.path.join(DOCS, "expressions.png")
    sheet.save(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    os.makedirs(DOCS, exist_ok=True)
    build_sheet()
    build_gif()
